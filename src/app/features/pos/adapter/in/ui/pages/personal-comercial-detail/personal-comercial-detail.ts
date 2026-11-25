import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarPlus, faPen, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { ComercialBloque, ComercialPlanilla, ComercialPlantilla, HorarioComercialApiService } from '../../../../../shared/horario-comercial-api.service';

const DIAS = [
  { id: 1, nombre: 'Lunes' }, { id: 2, nombre: 'Martes' }, { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' }, { id: 5, nombre: 'Viernes' }, { id: 6, nombre: 'Sábado' },
  { id: 7, nombre: 'Domingo' },
] as const;

@Component({
  selector: 'app-personal-comercial-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FaIconComponent, PageHeaderComponent, ActionConfirmDialogComponent],
  templateUrl: './personal-comercial-detail.html',
  styleUrl: './personal-comercial-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalComercialDetail {
  @ViewChild('horarioDialog') private horarioDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog?: ActionConfirmDialogComponent;
  readonly route = inject(ActivatedRoute);
  readonly uot = inject(UotContextStore);
  readonly perms = inject(PermissionService);
  private readonly api = inject(HorarioComercialApiService);
  private readonly toast = inject(ToastService);

  readonly icon = faUsers;
  readonly pencil = faPen;
  readonly remove = faTrash;
  readonly add = faCalendarPlus;
  readonly dias = DIAS;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly sheet = signal<ComercialPlanilla | null>(null);
  readonly bloques = signal<ComercialBloque[]>([]);
  readonly plantillas = signal<ComercialPlantilla[]>([]);
  readonly plantillaError = signal<string | null>(null);
  readonly tipoTurno = signal('personalizado');
  readonly selectedDays = signal<number[]>([]);
  readonly editor = signal<'batch' | 'day'>('batch');
  readonly editDay = signal(1);
  readonly editIndex = signal(-1);
  readonly agregarFranja = signal(false);
  horaInicio = '07:00';
  horaFin = '20:00';
  autorizarCoincidencia = false;
  motivoCoincidencia = '';

  readonly empleadoId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  readonly empleado = computed(() => this.sheet()?.empleados.find(e => e.empleadoId === this.empleadoId) ?? null);
  readonly canEdit = computed(() => !!this.empleado()?.habilitadoPos && this.perms.has('PERSONAL_COMERCIAL_EDITAR'));
  readonly horario = computed(() => DIAS.map(d => ({
    dia: d.id,
    nombre: d.nombre,
    bloques: this.bloques().filter(b => b.diaSemana === d.id)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    completo: this.jornadaCompleta(d.id,this.bloques().filter(b => b.diaSemana === d.id)),
  })));

  // Cada tramo indica cuántos compañeros cubren la atención; no representa un cupo máximo.
  readonly coberturaEquipo = computed(() => {
    const plan = this.sheet();
    if (!plan) return [];
    const empleados = plan.empleados.filter(e => e.habilitadoPos && e.empleadoId !== this.empleadoId);
    const ids = new Set(empleados.map(e => e.empleadoId));
    return DIAS.map(d => {
      const atencion=this.atencionDia(d.id);
      const inicio = this.minutos(atencion.horaInicio);
      const fin = this.minutos(atencion.horaFin);
      const ocupados = plan.turnos.filter(t => t.diaSemana === d.id && ids.has(t.empleadoId))
        .map(t => ({ ...t, nombre: empleados.find(e => e.empleadoId === t.empleadoId)?.nombre ?? 'Empleado' }));
      const propios = this.empleado()?.habilitadoPos
        ? this.bloques().filter(b => b.diaSemana === d.id) : [];
      const puntos = new Set<number>([inicio, fin]);
      for (const t of [...ocupados, ...propios]) {
        puntos.add(this.minutos(t.horaInicio));
        puntos.add(this.minutos(t.horaFin));
      }
      const lista = [...puntos].filter(v => v >= inicio && v <= fin).sort((a, b) => a - b);
      const tramos: { desde: string; hasta: string; ocupacion: number; propio: boolean }[] = [];
      for (let i = 1; i < lista.length; i++) {
        const a = lista[i - 1], b = lista[i];
        if (a >= b) continue;
        const ocupacion = new Set(ocupados.filter(t => this.minutos(t.horaInicio) < b &&
          this.minutos(t.horaFin) > a).map(t => t.empleadoId)).size;
        const propio = propios.some(t => this.minutos(t.horaInicio) < b && this.minutos(t.horaFin) > a);
        tramos.push({ desde: this.formato(a), hasta: this.formato(b), ocupacion, propio });
      }
      return { dia: d.id, nombre: d.nombre, ocupados, tramos,
        completo: tramos.length > 0 && tramos.every(t => t.propio || t.ocupacion > 0) };
    });
  });

  private minutos(value: string): number {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  }
  private formato(value: number): string {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }
  // Un turno único y varios consecutivos se evalúan igual; la jornada depende de la configuración vigente.
  atencionDia(dia:number):{horaInicio:string;horaFin:string} {
    const plan=this.sheet();
    return plan?.diasAtencion?.find(d=>d.diaSemana===dia)??plan?.atencion??{horaInicio:'07:00',horaFin:'20:00'};
  }
  private jornadaCompleta(dia:number,bloques: readonly ComercialBloque[]): boolean {
    const atencion = this.atencionDia(dia);
    if (!atencion || !bloques.length) return false;
    const inicio = this.minutos(atencion.horaInicio);
    const fin = this.minutos(atencion.horaFin);
    if (inicio >= fin) return false;
    const rangos = bloques.map(b => ({ inicio: this.minutos(b.horaInicio), fin: this.minutos(b.horaFin) }))
      .filter(b => b.fin > inicio && b.inicio < fin)
      .sort((a, b) => a.inicio - b.inicio);
    let hasta = inicio;
    for (const rango of rangos) {
      if (rango.inicio > hasta) return false;
      hasta = Math.max(hasta, rango.fin);
      if (hasta >= fin) return true;
    }
    return false;
  }
  readonly coberturaActual = computed(() => this.coberturaEquipo().find(d => d.dia === this.editDay()));

  avisosCoincidencia(): string[] {
    const dias = this.editor() === 'batch' ? this.selectedDays() : [this.editDay()];
    return this.coberturaEquipo().filter(d => dias.includes(d.dia))
      .flatMap(d => d.ocupados.filter(b => b.horaInicio < this.horaFin && b.horaFin > this.horaInicio)
        .map(b => `${d.nombre}: ${b.nombre} (${b.horaInicio}–${b.horaFin})`));
  }

  private last = 0;
  constructor() {
    effect(() => {
      const id = this.uot.isGeneral() ? 0 : this.uot.selectedId() ?? 0;
      untracked(() => {
        if (id === this.last) return;
        this.last = id;
        this.sheet.set(null);
        this.bloques.set([]);
        this.plantillas.set([]);
        this.plantillaError.set(null);
        this.horarioDialog?.nativeElement.close();
        this.confirmDialog?.cancel();
        if (id && this.empleadoId) { this.reload(); this.cargarPlantillas(id); }
      });
    });
  }
  get uotId(): number { return this.uot.isGeneral() ? 0 : this.uot.selectedId() ?? 0; }
  reload(): void {
    const id = this.uotId;
    if (!id || !this.empleadoId || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.planilla(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: data => {
        if (id !== this.uotId) return;
        this.sheet.set(data ?? null);
        this.bloques.set((data?.turnos ?? []).filter(t => t.empleadoId === this.empleadoId)
          .map(t => ({ diaSemana: t.diaSemana, horaInicio: t.horaInicio, horaFin: t.horaFin })));
      },
      error: e => { if (id === this.uotId) this.error.set(mapOpenApiError(e).message); },
    });
  }

  private cargarPlantillas(uotId: number): void {
    this.api.plantillas(uotId).subscribe({
      next: items => {
        if (uotId === this.uotId) { this.plantillas.set([...(items ?? [])].sort((a,b)=>
            a.horaInicio.localeCompare(b.horaInicio)||a.nombre.localeCompare(b.nombre)));
          this.plantillaError.set(null); }
      },
      error: () => {
        if (uotId === this.uotId) this.plantillaError.set('No se pudieron cargar los turnos guardados.');
      },
    });
  }
  seleccionarPlantilla(clave: string): void {
    this.tipoTurno.set(clave);
    if (clave === 'personalizado') return;
    const plantilla = this.plantillas().find(t => String(t.plantillaId) === clave);
    if (!plantilla) { this.tipoTurno.set('personalizado'); return; }
    this.horaInicio = plantilla.horaInicio;
    this.horaFin = plantilla.horaFin;
    this.modalError.set(null);
  }
  marcarPersonalizado(): void { this.tipoTurno.set('personalizado'); }
  nombreTurno(desde: string, hasta: string): string {
    return this.plantillas().find(t => t.horaInicio === desde && t.horaFin === hasta)?.nombre ?? 'Personalizado';
  }
  private reconocerTurno(): void {
    const p = this.plantillas().find(t => t.horaInicio === this.horaInicio && t.horaFin === this.horaFin);
    this.tipoTurno.set(p ? String(p.plantillaId) : 'personalizado');
  }

  private prepararEditor(): void {
    this.modalError.set(null);
    this.autorizarCoincidencia = false;
    this.motivoCoincidencia = '';
  }
  openBatch(): void {
    if (!this.canEdit()) return;
    const c = this.sheet()?.atencion;
    this.horaInicio = c?.horaInicio ?? '07:00';
    this.horaFin = c?.horaFin ?? '20:00';
    this.editor.set('batch');
    this.reconocerTurno();
    this.selectedDays.set([]);
    this.prepararEditor();
    this.horarioDialog?.nativeElement.showModal();
  }
  openDay(dia: number, desde: string, hasta: string): void {
    if (!this.canEdit()) return;
    const index = this.bloques().findIndex(b => b.diaSemana === dia &&
      b.horaInicio === desde && b.horaFin === hasta);
    if (index < 0) return;
    this.horaInicio = desde;
    this.horaFin = hasta;
    this.editIndex.set(index);
    this.reconocerTurno();
    this.agregarFranja.set(false);
    this.editor.set('day');
    this.editDay.set(dia);
    this.prepararEditor();
    this.horarioDialog?.nativeElement.showModal();
  }
  openAdditional(dia: number, desde?: string, hasta?: string): void {
    if (!this.canEdit()) return;
    const c = this.atencionDia(dia);
    this.horaInicio = desde ?? c.horaInicio;
    this.horaFin = hasta ?? c.horaFin;
    this.editIndex.set(-1);
    this.reconocerTurno();
    this.agregarFranja.set(true);
    this.editor.set('day');
    this.editDay.set(dia);
    this.prepararEditor();
    this.horarioDialog?.nativeElement.showModal();
  }
  sugerir(dia: number, desde: string, hasta: string): void {
    this.openAdditional(dia, desde, hasta);
  }
  toggle(dia: number): void {
    this.selectedDays.update(days => days.includes(dia) ? days.filter(d => d !== dia) : [...days, dia]);
  }
  seleccionarTodos(): void { this.selectedDays.set(DIAS.map(d => d.id)); }
  nombreDia(dia: number): string { return DIAS.find(d => d.id === dia)?.nombre ?? 'Día'; }
  rangoValido(): boolean {
    const dias=this.editor()==='batch'?this.selectedDays():[this.editDay()];
    return !!dias.length && !!this.horaInicio && !!this.horaFin && this.horaInicio < this.horaFin &&
      dias.every(d=>{const c=this.atencionDia(d);return this.horaInicio>=c.horaInicio&&this.horaFin<=c.horaFin;});
  }
  conflictoPropio(): boolean {
    if (!this.rangoValido()) return false;
    const dias = this.editor() === 'batch' ? this.selectedDays() : [this.editDay()];
    return this.bloques().some((b, i) => (this.editor() === 'batch' || i !== this.editIndex()) &&
      dias.includes(b.diaSemana) && b.horaInicio < this.horaFin && b.horaFin > this.horaInicio);
  }
  private saveBloques(next: ComercialBloque[]): void {
    if (this.saving() || !this.uotId || !this.canEdit()) return;
    const enModal = this.horarioDialog?.nativeElement.open ?? false;
    this.saving.set(true);
    this.modalError.set(null);
    this.error.set(null);
    const registrarMotivo = enModal && this.autorizarCoincidencia && this.avisosCoincidencia().length > 0;
    this.api.guardar(this.uotId, this.empleadoId, next, registrarMotivo,
      registrarMotivo ? this.motivoCoincidencia.trim() : '').pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.horarioDialog?.nativeElement.close();
        this.toast.success('Horario guardado');
        this.reload();
      },
      error: e => {
        const mensaje = mapOpenApiError(e).message;
        if (enModal) this.modalError.set(mensaje);
        else this.error.set(mensaje);
      },
    });
  }
  guardar(): void {
    if (!this.rangoValido()) { this.modalError.set('Revisa las horas seleccionadas.'); return; }
    const dias = this.editor() === 'batch' ? this.selectedDays() : [this.editDay()];
    if (!dias.length) { this.modalError.set('Selecciona al menos un día.'); return; }
    if (this.conflictoPropio()) { this.modalError.set('Este empleado ya tiene un turno en esas horas.'); return; }
    // Editar sustituye un solo turno; asignar varios días agrega sin borrar los existentes.
    const conservar = this.editor() === 'day' && !this.agregarFranja()
      ? this.bloques().filter((_, i) => i !== this.editIndex())
      : this.bloques();
    const nuevos = [...conservar, ...dias.map(diaSemana => ({
      diaSemana, horaInicio: this.horaInicio, horaFin: this.horaFin,
    }))];
    if (nuevos.length > 28) { this.modalError.set('Se permite un máximo de 28 turnos por empleado.'); return; }
    this.saveBloques(nuevos);
  }
  async borrarFranja(dia: number, desde: string, hasta: string): Promise<void> {
    if (!this.canEdit() || this.saving() || !this.uotId) return;
    const uotId = this.uotId;
    const turno = this.bloques().find(b => b.diaSemana === dia &&
      b.horaInicio === desde && b.horaFin === hasta);
    if (!turno) return;
    const respuesta = await this.confirmDialog?.show({
      title: 'Quitar turno',
      message: `${this.nombreDia(dia)} · ${desde}–${hasta}.`,
      confirmLabel: 'Quitar',
      tone: 'danger',
    });
    if (!respuesta?.confirmed || this.saving() || !this.canEdit() || uotId !== this.uotId) return;
    if (!this.bloques().some(b => b.diaSemana === dia && b.horaInicio === desde && b.horaFin === hasta)) return;
    this.saveBloques(this.bloques().filter(b => !(b.diaSemana === dia &&
      b.horaInicio === desde && b.horaFin === hasta)));
  }
  async borrarDia(dia: number): Promise<void> {
    if (!this.canEdit() || this.saving() || !this.uotId) return;
    const uotId = this.uotId;
    if (!this.bloques().some(b => b.diaSemana === dia)) return;
    const respuesta = await this.confirmDialog?.show({
      title: 'Quitar horarios del día',
      message: `Se quitarán todos los turnos del ${this.nombreDia(dia)}.`,
      confirmLabel: 'Quitar día',
      tone: 'danger',
    });
    if (!respuesta?.confirmed || this.saving() || !this.canEdit() || uotId !== this.uotId) return;
    if (!this.bloques().some(b => b.diaSemana === dia)) return;
    this.saveBloques(this.bloques().filter(b => b.diaSemana !== dia));
  }
}
