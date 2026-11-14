import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen, faRotate, faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ListViewSwitchComponent } from '../../../shared/data-display/list-view-switch/list-view-switch';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { CampaignSaleProcessApiService, SaleCrate, SaleCratesPage, SaleGrade, SaleProcessDetail } from './campaign-sale-process-api.service';
import { calibreRangeText } from './campaign-calibre-ranges';
import { CampaignSanctionsPanel } from './campaign-sanctions-panel';
import { SalePartnerSanction } from './campaign-sanctions-api.service';

type View = 'table' | 'cards';
type Filter = 'all' | 'filled' | 'empty';

@Component({
  selector: 'app-campaign-sale-partner-detail', standalone: true,
  imports: [CommonModule, FaIconComponent, ListViewSwitchComponent, PaginatorComponent, RecordCardComponent,
    EmptyStateComponent, LoadingStateComponent, ErrorStateComponent, PageHeaderComponent, ActionConfirmDialogComponent, CampaignSanctionsPanel],
  templateUrl: './campaign-sale-partner-detail.html', styleUrl: './campaign-sale-partner-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSalePartnerDetailPage implements OnInit {
  @Input() embedded = false;
  @Input() readOnly = false;
  @Input() campaignContextId: number | null = null;
  @Input() participantContextId: number | null = null;
  @Output() backRequest = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CampaignSaleProcessApiService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly scaleIcon = faScaleBalanced;
  readonly editIcon = faPen;
  readonly reloadIcon = faRotate;
  readonly id = signal(0);
  readonly participationId = signal(0);
  readonly detail = signal<SaleProcessDetail | null>(null);
  readonly pageInfo = signal<SaleCratesPage | null>(null);
  readonly page = signal(1);
  readonly size = signal(20);
  readonly view = signal<View>('table');
  readonly filter = signal<Filter>('all');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly correction = signal<SaleCrate | null>(null);
  readonly nextNumber = signal(1);
  readonly weight = signal('');
  readonly observation = signal('');
  readonly gradeId = signal<number | null>(null);
  readonly varietyId = signal<number | null>(null);
  readonly reason = signal('');
  readonly activeSanction = signal<SalePartnerSanction | null>(null);
  readonly sanctionPreview = computed(() => {
    const a = this.activeSanction()?.asignacion;
    const grade = this.grades().find(g => g.calibreId === this.gradeId());
    const number = this.nextNumber();
    if (this.correction() || !a?.activo || !grade || this.weightNumber() <= 0 ||
        number < a.desdeNumero || a.hastaNumero != null && number > a.hastaNumero) return null;
    const original = Number(grade.precioKg), discount = Number(a.descuentoKg);
    if (!Number.isFinite(original) || !Number.isFinite(discount) || original <= discount) return null;
    return { original, discount, final: original - discount };
  });
  readonly partner = computed(() => this.detail()?.socios.find(s => s.participacionId === this.participationId()) ?? null);
  readonly grades = computed(() => this.detail()?.calibres ?? []);
  readonly varieties = computed(() => {
    const names = new Map<number, string>();
    for (const grade of this.grades()) {
      names.set(grade.variedadPaltaId, grade.nombreVariedad || `Variedad ${grade.variedadPaltaId}`);
    }
    return [...names].map(([id, nombre]) => ({ id, nombre }));
  });
  readonly availableGrades = computed(() => this.grades().filter(g => g.variedadPaltaId === this.varietyId()));
  readonly onlyVariety = computed(() => this.varieties().length === 1 ? this.varieties()[0] : null);
  readonly onlyGrade = computed(() => this.availableGrades().length === 1 ? this.availableGrades()[0] : null);
  readonly complete = computed(() => !!this.partner() && this.partner()!.asignadas === this.partner()!.devueltas);
  readonly confirmed = computed(() => this.partner()?.recepcionConfirmada === true);
  readonly canConfirm = computed(() => !this.readOnly && this.complete() && !this.confirmed() && !this.correction() &&
    this.detail()?.vigente === true && this.permissions.has('JABAS_CREAR') && !this.busy() && !this.loading());
  readonly totalPages = computed(() => Math.max(1, Math.ceil((this.partner()?.asignadas ?? 0) / this.size())));
  readonly records = computed(() => new Map((this.pageInfo()?.registros ?? []).map(row => [row.numero, row])));
  readonly filteredRecords = computed(() => (this.pageInfo()?.registros ?? []).filter(row => {
    const query = this.search().trim().toLocaleLowerCase('es');
    return (!query || String(row.numero).includes(query) || (row.observacion ?? '').toLocaleLowerCase('es').includes(query))
      && (this.filter() === 'all' || this.filter() === 'empty' && Number(row.pesoBrutoKg) === 0
          || this.filter() === 'filled' && Number(row.pesoBrutoKg) > 0);
  }));
  // Una jaba vacía (0 kg) no requiere calibre. Solo las jabas con peso positivo
  // necesitan un calibre activo de la campaña. El permiso continúa verificándose
  // tanto aquí como en el controlador y en el procedimiento almacenado.
  readonly canWeigh = computed(() => !this.readOnly && !!this.detail()?.vigente && this.permissions.has('JABAS_CREAR') &&
    !!this.partner() && !this.confirmed());
  readonly weighingBlockMessage = computed(() => {
    if (!this.detail() || !this.partner()) return null;
    if (this.readOnly) return 'Campaña en modo de consulta.';
    if (!this.detail()?.vigente) return 'La campaña no está vigente.';
    if (!this.permissions.has('JABAS_CREAR')) return 'No tiene permiso para registrar jabas en la unidad seleccionada.';
    if (this.confirmed()) return 'La recepción ya fue confirmada y no permite nuevas modificaciones.';
    return null;
  });
  readonly netWeight = computed(() => {
    const value = Number(this.weight());
    const tare = Number(this.detail()?.descuentoJabaKg ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.max(0, value - tare) : 0;
  });
  readonly canSave = computed(() => {
    if (!this.canWeigh() || this.busy() || this.loading()) return false;
    const raw = this.weight().trim();
    if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) return false;
    const weight = Number(raw);
    if (weight > 999999 || weight > 0 && weight < Number(this.detail()?.descuentoJabaKg ?? 0)) return false;
    const grade = weight === 0 ? null : this.gradeId();
    if (weight > 0 && (!this.varietyId() || !this.availableGrades().some(g => g.calibreId === grade))) return false;
    if (this.observation().trim().length > 400) return false;
    const existing = this.correction();
    if (existing) return this.reason().trim().length >= 10 &&
      (Number(existing.pesoBrutoKg) !== weight || existing.calibreId !== grade ||
        (existing.observacion ?? '') !== this.observation().trim());
    return !this.complete() && this.nextNumber() >= 1 && this.nextNumber() <= (this.partner()?.asignadas ?? 0) &&
      !this.records().has(this.nextNumber());
  });

  ngOnInit(): void {
    if (this.embedded) {
      const id = Number(this.campaignContextId), partnerId = Number(this.participantContextId);
      if (Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(partnerId) && partnerId > 0) {
        this.id.set(id);
        this.participationId.set(partnerId);
        this.page.set(1);
        this.load(true);
      } else this.error.set('Seleccione un socio participante válido.');
      return;
    }
    // Enlaces anteriores: conservar compatibilidad y abrir el flujo unificado.
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      const partnerId = Number(params.get('participacionId'));
      if (Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(partnerId) && partnerId > 0) {
        void this.router.navigate(['/gestion-comercial/campanias', id],
          { queryParams: { tab: 'venta', socio: partnerId }, replaceUrl: true });
      } else void this.router.navigate(['/gestion-comercial/campanias']);
    });
  }
  back(): void {
    if (this.embedded) this.backRequest.emit();
    else void this.router.navigate(['/gestion-comercial/campanias', this.id()], { queryParams: { tab: 'venta' } });
  }
  gradeTitle(grade: SaleGrade): string {
    const name = `${grade.calibre.charAt(0)}${grade.calibre.slice(1).toLowerCase()}`;
    return `${name} · ${calibreRangeText(grade.gramosDesde, grade.gramosHasta)}`;
  }
  gradePrice(grade: SaleGrade): string { return `S/ ${Number(grade.precioKg).toFixed(2)}/kg`; }
  gradeName(grade: SaleGrade): string { return `${this.gradeTitle(grade)} · ${this.gradePrice(grade)}`; }
  gradeLabel(id: number | null): string {
    const grade = this.grades().find(g => g.calibreId === id);
    return grade ? `${grade.nombreVariedad || `Variedad ${grade.variedadPaltaId}`} · ${this.gradeName(grade)}` : '—';
  }
  setVariety(value: string): void {
    const next = Number(value) || null;
    this.varietyId.set(next);
    const matching = this.grades().filter(g => g.variedadPaltaId === next);
    this.gradeId.set(matching.length === 1 ? matching[0].calibreId : null);
  }
  setGrade(value: string): void { this.gradeId.set(Number(value) || null); }
  private selectDefaults(): void {
    const only = this.onlyVariety();
    if (!only) return;
    if (this.varietyId() !== only.id) this.setVariety(String(only.id));
    const grades = this.grades().filter(grade => grade.variedadPaltaId === only.id);
    if (grades.length === 1 && this.gradeId() !== grades[0].calibreId && this.weightNumber() !== 0) {
      this.gradeId.set(grades[0].calibreId);
    }
  }
  weightNumber(): number { return Number(this.weight()) || 0; }
  setWeight(value: string): void {
    this.weight.set(value);
    if (Number(value) === 0 && value.trim() !== '') this.gradeId.set(null);
    else if (Number(value) > 0) this.selectDefaults();
  }
  private clearForm(): void {
    this.correction.set(null);
    this.weight.set(''); this.observation.set(''); this.reason.set('');
    this.varietyId.set(null);
    this.gradeId.set(null);
    this.selectDefaults();
  }
  load(resetForm = false): void {
    if (resetForm) this.clearForm();
    this.loading.set(true); this.error.set(null);
    forkJoin({ detail: this.api.detail(this.id()), page: this.api.crates(this.id(), this.participationId(), this.page(), this.size()) })
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: result => {
          const data = { ...result.detail, socios: result.detail.socios ?? [], calibres: result.detail.calibres ?? [] };
          this.detail.set(data); this.pageInfo.set(result.page);
          if (!this.correction()) this.selectDefaults();
          if (!data.socios.some(s => s.participacionId === this.participationId())) { this.error.set('Socio no disponible en esta campaña.'); return; }
          if (!this.correction()) this.locateNext();
        },
        error: err => this.error.set(mapOpenApiError(err).message),
      });
  }
  private locateNext(): void {
    const partner = this.partner();
    if (!partner || partner.devueltas >= partner.asignadas) return;
    const from = (this.page() - 1) * this.size() + 1;
    const to = Math.min(partner.asignadas, this.page() * this.size());
    for (let n = from; n <= to; n++) {
      if (!this.records().has(n)) { this.nextNumber.set(n); return; }
    }
    if (this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.fetchPage(true);
    } else if (this.page() !== 1) {
      this.page.set(1);
      this.fetchPage(true);
    }
  }
  private fetchPage(findPending = false): void {
    this.loading.set(true);
    this.api.crates(this.id(), this.participationId(), this.page(), this.size()).pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: response => { this.pageInfo.set(response); if (findPending) this.locateNext(); },
        error: err => this.toast.error('No se pudieron consultar las jabas', mapOpenApiError(err).message) });
  }
  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || this.loading() || this.busy()) return;
    this.page.set(page); this.fetchPage();
  }
  changeSize(size: number): void { this.size.set(size); this.page.set(1); this.fetchPage(); }
  searchFor(value: string): void {
    this.search.set(value);
    if (/^\d+$/.test(value.trim())) {
      const target = Number(value.trim());
      if (target >= 1 && target <= (this.partner()?.asignadas ?? 0)) {
        const newPage = Math.ceil(target / this.size());
        if (newPage !== this.page()) { this.page.set(newPage); this.fetchPage(); }
      }
    }
  }
  beginCorrection(row: SaleCrate): void {
    if (!this.canWeigh() || this.busy() || this.loading()) return;
    this.correction.set(row);
    this.nextNumber.set(row.numero);
    this.setWeight(String(row.pesoBrutoKg));
    this.observation.set(row.observacion ?? '');
    const chosen = this.grades().find(g => g.calibreId === row.calibreId);
    this.varietyId.set(chosen?.variedadPaltaId ?? null);
    this.gradeId.set(row.calibreId);
    this.reason.set('');
  }
  cancelCorrection(): void { this.clearForm(); }
  save(): void {
    if (this.busy() || this.loading()) return;
    if (!this.canWeigh()) {
      this.toast.error('No se puede registrar el pesaje',
        this.weighingBlockMessage() ?? 'Revise los datos del socio.');
      return;
    }
    const rawWeight = this.weight().trim();
    if (!/^\d+(?:\.\d{1,3})?$/.test(rawWeight) || Number(rawWeight) > 999999) {
      this.toast.error('Peso no válido', 'Ingrese un peso en kilogramos, con hasta tres decimales. Puede ser 0.');
      return;
    }
    const typedWeight = Number(rawWeight);
    if (typedWeight > 0 && typedWeight < Number(this.detail()?.descuentoJabaKg ?? 0)) {
      this.toast.error('Peso no válido', 'El peso no puede ser menor que la tara de jaba.');
      return;
    }
    if (typedWeight > 0 && (!this.varietyId() || !this.availableGrades().some(grade => grade.calibreId === this.gradeId()))) {
      this.toast.error('Seleccione una variedad y calibre',
        this.grades().length === 0 ? 'Registre primero una variedad y un calibre en la campaña.' :
        'Elija una variedad y un calibre de esta campaña.');
      return;
    }
    if (this.observation().trim().length > 400) {
      this.toast.error('Observación demasiado larga', 'La observación admite hasta 400 caracteres.');
      return;
    }
    if (this.correction() && this.reason().trim().length < 10) {
      this.toast.error('Motivo requerido', 'Para corregir un pesaje, indique un motivo de al menos 10 caracteres.');
      return;
    }
    if (!this.canSave()) {
      this.toast.error('No hay cambios para guardar', 'Revise los datos registrados.');
      return;
    }
    const existing = this.correction();
    const n = existing?.numero ?? this.nextNumber();
    const weight = Number(this.weight());
    const grade = weight === 0 ? null : this.gradeId();
    const observation = this.observation().trim();
    const request = existing
      ? this.api.correct(this.id(), this.participationId(), n, weight, grade, existing.version, this.reason().trim(), observation)
      : this.api.weigh(this.id(), this.participationId(), n, weight, grade, null, observation);
    this.busy.set(true);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.toast.success(existing ? 'Corrección guardada' : `Jaba ${n} registrada`);
        this.clearForm();
        if (!existing) this.page.set(Math.ceil((n + 1) / this.size()) || 1);
        if (this.page() > this.totalPages()) this.page.set(this.totalPages());
        this.load();
        this.changed.emit();
      },
      error: err => this.toast.error('No se pudo guardar el pesaje', mapOpenApiError(err).message),
    });
  }
  async confirmDelivery(): Promise<void> {
    const partner = this.partner();
    if (!partner || !this.canConfirm()) return;
    const answer = await this.confirm.show({ title: 'Confirmar entrega de jabas',
      message: `¿Confirma las ${partner.asignadas} jabas registradas de ${partner.socioNombre}?`,
      confirmLabel: 'Confirmar entrega', tone: 'primary' });
    if (!answer.confirmed || !this.canConfirm()) return;
    this.busy.set(true);
    this.api.confirmReception(this.id(), partner.participacionId).pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: () => { this.toast.success('Entrega confirmada'); this.load(); this.changed.emit(); },
        error: err => this.toast.error('No se pudo confirmar la entrega', mapOpenApiError(err).message) });
  }
}
