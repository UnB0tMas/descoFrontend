import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AccessStore } from '../../../../../core/access/access.store';
import { PermissionService } from '../../../../../core/access/permission.service';
import { SessionStore } from '../../../../../core/session/session.store';
import { UotContextStore } from '../../../../uot/state/uot-context.store';
import { BASE_PATH } from '../../../../../infrastructure/openapi/generated';
import { ToastService } from '../../../../../shared/feedback/toast-center/toast.service';
import { EspecialJob, EspecialReportService } from '../../../dashboard/adapter/in/ui/pages/dashboard-bi/apappss-insights.service';
import { ExcelJob, ExcelReportService } from '../../adapter/out/http/excel-report.service';

type ReportKind = 'EXCEL' | 'ESPECIAL';
type ReportState = 'LISTO' | 'ERROR';
interface FinishedEvent { id: number; tipo: ReportKind; estado: ReportState; }

/** Un solo canal por pestaña y ámbito, abierto exclusivamente mientras haya trabajos activos. */
@Injectable({ providedIn: 'root' })
export class ReportJobEventService {
  private readonly excel = inject(ExcelReportService);
  private readonly specials = inject(EspecialReportService);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessStore);
  private readonly uot = inject(UotContextStore);
  private readonly perms = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = String(inject(BASE_PATH)).replace(/\/$/, '') + '/api/v1/reportes/trabajos/eventos';
  private readonly active = computed(() =>
    this.excel.trabajos().some(job => this.pending(job.estado)) ||
    this.specials.trabajos().some(job => this.pending(job.estado)));
  private controller: AbortController | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private scope = '';
  private attempts = 0;
  private readonly knownFinished = new Map<string, ReportState>();
  private readonly notified = new Set<string>();

  constructor() {
    effect(() => {
      const unidad = this.uot.selectedId();
      const usuario = this.access.user();
      const scope = this.uot.isSpecific() && unidad !== null && this.session.authenticated() &&
        this.perms.has('REPORTES_CONTROL_VER') && this.perms.has('REPORTES_LISTAR') &&
        usuario?.sesionPublicaId
        ? `${usuario.usuarioId}:${usuario.sesionPublicaId}:${unidad}` : '';
      const active = this.active();
      if (!this.isBrowser || !scope || !active) {
        this.disconnect();
        return;
      }
      if (scope !== this.scope) {
        this.disconnect();
        this.scope = scope;
      }
      this.connect();
    });
  }

  private pending(state: string): boolean {
    return state === 'PENDIENTE' || state === 'PROCESANDO';
  }

  private disconnect(): void {
    if (this.retry !== null) clearTimeout(this.retry);
    this.retry = null;
    this.controller?.abort();
    this.controller = null;
    this.scope = '';
    this.attempts = 0;
    this.knownFinished.clear();
    this.notified.clear();
  }

  private valid(scope: string): boolean {
    return this.scope === scope && this.active() && this.session.authenticated() &&
      this.uot.isSpecific() && this.uot.selectedId() !== null &&
      this.perms.has('REPORTES_CONTROL_VER') && this.perms.has('REPORTES_LISTAR');
  }

  private connect(): void {
    if (!this.isBrowser || this.controller || this.retry !== null || !this.active()) return;
    const token = this.session.accessToken();
    if (!token) return;
    const controller = new AbortController();
    const scope = this.scope;
    this.controller = controller;
    void this.read(scope, token, controller);
  }

  private async read(scope: string, token: string, controller: AbortController): Promise<void> {
    try {
      const response = await fetch(this.url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('Canal no disponible');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!controller.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let boundary = buffer.search(/\r?\n\r?\n/);
        while (boundary >= 0) {
          const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? '\n\n';
          const frame = buffer.slice(0, boundary).replace(/\r\n/g, '\n');
          buffer = buffer.slice(boundary + separator.length);
          this.receive(scope, frame);
          boundary = buffer.search(/\r?\n\r?\n/);
        }
        // Los eventos son pequeños: evitar retener respuestas inesperadamente grandes.
        if (buffer.length > 16_384) throw new Error('Evento inválido');
      }
    } catch (error) {
      if (!controller.signal.aborted && this.valid(scope)) {
        console.warn('No se pudo mantener el canal de informes.', error);
      }
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        if (this.valid(scope)) {
          // HTTP normal permite renovar la sesión antes de reconectar SSE.
          this.sync(scope);
          const wait = Math.min(30_000, 1_000 * (2 ** Math.min(this.attempts++, 5)));
          this.retry = setTimeout(() => {
            this.retry = null;
            if (this.valid(scope)) this.connect();
          }, wait);
        }
      }
    }
  }

  private receive(scope: string, frame: string): void {
    if (!this.valid(scope)) return;
    const event = frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim();
    if (event === 'conectado') {
      this.attempts = 0;
      // Reconciliar los trabajos terminados entre el POST y la apertura del canal.
      this.sync(scope);
      return;
    }
    if (event !== 'finalizado') return;
    const data = frame.split('\n').filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim()).join('\n');
    try {
      const message: unknown = JSON.parse(data);
      if (!this.isFinished(message)) return;
      this.knownFinished.set(`${message.tipo}:${message.id}`, message.estado);
      this.markFinished(message.tipo, message.id, message.estado);
      this.sync(scope, message.tipo);
    } catch {
      console.warn('No se pudo interpretar una notificación de informe.');
    }
  }

  private isFinished(value: unknown): value is FinishedEvent {
    if (value === null || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return typeof v['id'] === 'number' && Number.isSafeInteger(v['id']) && v['id'] > 0 &&
      (v['tipo'] === 'EXCEL' || v['tipo'] === 'ESPECIAL') &&
      (v['estado'] === 'LISTO' || v['estado'] === 'ERROR');
  }

  private markFinished(tipo: ReportKind, id: number, estado: ReportState): void {
    const key = `${tipo}:${id}`;
    if (tipo === 'EXCEL') {
      const previous = this.excel.trabajos().find(job => job.id === id);
      if (!previous || !this.pending(previous.estado)) return;
      this.excel.trabajos.update(jobs => jobs.map(job => job.id === id ? { ...job, estado } : job));
    } else {
      const previous = this.specials.trabajos().find(job => job.id === id);
      if (!previous || !this.pending(previous.estado)) return;
      this.specials.trabajos.update(jobs => jobs.map(job => job.id === id ? { ...job, estado } : job));
    }
    this.notify(tipo, id, estado);
  }

  private notify(tipo: ReportKind, id: number, estado: ReportState): void {
    const key = `${tipo}:${id}`;
    if (this.notified.has(key)) return;
    this.notified.add(key);
    if (estado === 'LISTO') this.toast.success('Informe listo', 'Ya puedes descargar tu archivo.');
    else this.toast.error('No se pudo preparar el informe.');
  }

  private sync(scope: string, kind?: ReportKind): void {
    if (!this.valid(scope)) return;
    if (kind !== 'ESPECIAL' && this.excel.trabajos().some(job => this.pending(job.estado))) {
      const pending = new Set(this.excel.trabajos().filter(job => this.pending(job.estado)).map(job => job.id));
      this.excel.actualizar().subscribe({
        next: jobs => { if (this.validScope(scope)) this.reconcile('EXCEL', jobs, pending); },
        error: () => console.warn('No se pudieron actualizar los informes.'),
      });
    }
    if (kind !== 'EXCEL' && this.specials.trabajos().some(job => this.pending(job.estado))) {
      const pending = new Set(this.specials.trabajos().filter(job => this.pending(job.estado)).map(job => job.id));
      this.specials.actualizar().subscribe({
        next: jobs => { if (this.validScope(scope)) this.reconcile('ESPECIAL', jobs, pending); },
        error: () => console.warn('No se pudieron actualizar los informes.'),
      });
    }
  }

  private validScope(scope: string): boolean {
    return this.scope === scope && this.uot.isSpecific() && this.session.authenticated();
  }

  private reconcile(kind: ReportKind, jobs: readonly ExcelJob[] | readonly EspecialJob[], pending: ReadonlySet<number>): void {
    // El estado confirmado por SSE nunca retrocede por una respuesta HTTP más antigua.
    if (kind === 'EXCEL') {
      for (const job of jobs as readonly ExcelJob[]) {
        if (pending.has(job.id) && (job.estado === 'LISTO' || job.estado === 'ERROR')) {
          this.knownFinished.set(`EXCEL:${job.id}`, job.estado);
          this.notify('EXCEL', job.id, job.estado);
        }
      }
      this.excel.trabajos.update(items => items.map(item => {
        const estado = this.knownFinished.get(`EXCEL:${item.id}`);
        return estado ? { ...item, estado } : item;
      }));
    } else {
      for (const job of jobs as readonly EspecialJob[]) {
        if (pending.has(job.id) && (job.estado === 'LISTO' || job.estado === 'ERROR')) {
          this.knownFinished.set(`ESPECIAL:${job.id}`, job.estado);
          this.notify('ESPECIAL', job.id, job.estado);
        }
      }
      this.specials.trabajos.update(items => items.map(item => {
        const estado = this.knownFinished.get(`ESPECIAL:${item.id}`);
        return estado ? { ...item, estado } : item;
      }));
    }
  }
}
