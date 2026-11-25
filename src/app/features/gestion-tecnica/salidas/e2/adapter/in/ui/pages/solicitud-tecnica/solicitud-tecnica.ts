import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, forkJoin, from, concatMap, toArray, switchMap, finalize } from 'rxjs';
import { faRoute } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { ModalShellComponent } from '../../../../../../../../../shared/feedback/modal-shell/modal-shell';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { E3FileDropzoneComponent } from '../../../../../../../../../shared/files/file-dropzone/file-dropzone';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { GestionDocumentariaApi } from '../../../../../../../../gestion-documentaria/gestion-documentaria.api';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';
import { CatalogosE2, DestinoEntradaE2, ParticipanteEntradaE2, RecursoEntradaE2, RecursoOpcionE2, SolicitudE2 } from '../../../../../domain/salida-operativa.model';
import { verificarDisponibilidadE2, claveRecursoE2 } from '../../../../../domain/salida-operativa-stock';
import { PrediosSalidaApi, PredioSalida } from '../../../../out/http/predios-salida.api';
import { SalidasTecnicasApi } from '../../../../out/http/salidas-tecnicas.api';

function localInput(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? '' :
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

@Component({
  selector: 'app-solicitud-salida-tecnica-modal', standalone: true,
  imports: [FormsModule, ModalShellComponent, LoadingStateComponent, ErrorStateComponent, E3FileDropzoneComponent],
  providers: [...provideSalidasE2()],
  templateUrl: './solicitud-tecnica.html', styleUrl: './solicitud-tecnica.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SolicitudSalidaTecnicaModal {
  @ViewChild('solicitudModal', {static:true}) private modal!: ModalShellComponent;
  @ViewChild('wizardBody') private wizardBody?: ElementRef<HTMLDivElement>;
  @Output() readonly completed = new EventEmitter<void>();
  private openedUotId: number | null = null;
  private requestSequence = 0;
  private readonly e2 = inject(SalidasE2UseCase);
  private readonly documental = inject(SalidasTecnicasApi);
  private readonly documentos = inject(GestionDocumentariaApi);
  private readonly prediosApi = inject(PrediosSalidaApi);
  readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly icon = faRoute;
  readonly uotId = this.uot.selectedId;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly tieneAprobador = signal(false);
  readonly catalogos = signal<CatalogosE2>({motivos: [], tiposVisita: [], bienes: [], participantes: []});
  readonly predios = signal<PredioSalida[]>([]);
  readonly destinos = signal<DestinoEntradaE2[]>([]);
  readonly recursos = signal<RecursoEntradaE2[]>([]);
  readonly participantes = signal<ParticipanteEntradaE2[]>([]);
  readonly files = signal<File[]>([]);
  readonly borradorId = signal<number | null>(null);
  readonly paso = signal(0);
  readonly participantesDisponibles = computed(() => {
    const usados = new Set(this.participantes().map(item => item.empleadoId));
    return this.catalogos().participantes.filter(item => !usados.has(item.id));
  });
  readonly recursosDisponibles = computed(() => {
    const usados = new Set(this.recursos().map(item =>
      item.bienId != null ? `BIEN:${item.bienId}` : `CONSUMIBLE:${item.suministroId}`));
    return this.catalogos().bienes.filter(item => !usados.has(item.tipo === 'CONSUMIBLE'
      ? `CONSUMIBLE:${item.id}` : `BIEN:${item.id}`));
  });
  readonly recursosSinStock = computed(() => this.recursos().some(item =>
    !this.recursoValido(item)));
  seleccionSinStock(): boolean {
    const elegido = this.recursoSeleccionado();
    return elegido != null && !verificarDisponibilidadE2(elegido, Number(this.cantidad)).valido;
  }
  avanceRestringido(): boolean {
    return this.paso() === 2 && (this.recursosSinStock() || this.seleccionSinStock());
  }
  readonly pasos = [
    { titulo: 'Datos' }, { titulo: 'Destinos' },
    { titulo: 'Equipo y recursos' }, { titulo: 'Revisar y enviar' }
  ] as const;
  progreso(): number { return Math.round((this.paso() + 1) / this.pasos.length * 100); }
  nombreMotivo(): string {
    return this.catalogos().motivos.find(x => x.id === this.motivoId)?.nombre ?? 'Sin seleccionar';
  }
  fechaVisible(value: string): string {
    const [fecha, hora = ''] = value.split('T');
    const partes = fecha.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]} ${hora}` : value;
  }
  private validarPaso(indice: number): boolean {
    if (indice === 0) {
      const start = new Date(this.inicio);
      const end = new Date(this.fin);
      if (!this.nombre.trim() || !this.motivoId || !this.inicio || !this.fin
        || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        this.error.set('Completa el nombre, el motivo y un horario de inicio y término válido.');
        return false;
      }
    }
    if (indice === 1 && (!this.destinos().length || this.destinos().some(x => !x.predioId || !x.actividadPrevista?.trim())
      || new Set(this.destinos().map(x => x.predioId)).size !== this.destinos().length)) {
      this.error.set('Añade al menos un predio e indica la actividad que realizarás.');
      return false;
    }
    if (indice === 2) {
      const empleados = this.participantes().map(item => item.empleadoId);
      if (new Set(empleados).size !== empleados.length) {
        this.error.set('Hay acompañantes repetidos.'); return false;
      }
      const ids = this.recursos().map(item => item.bienId != null
        ? `BIEN:${item.bienId}` : `CONSUMIBLE:${item.suministroId}`);
      if (new Set(ids).size !== ids.length) {
        this.error.set('Hay materiales o equipos repetidos.'); return false;
      }
      if (this.recursosSinStock() || this.seleccionSinStock()) {
        this.error.set('Revisa la disponibilidad de los materiales y equipos.'); return false;
      }
    }
    return true;
  }
  irPaso(indice: number): void {
    if (this.loading() || this.saving() || indice < 0 || indice >= this.pasos.length) return;
    if (indice > this.paso()) {
      for (let i = 0; i < indice; i++) {
        if (!this.validarPaso(i)) { this.paso.set(i); this.wizardBody?.nativeElement.parentElement?.scrollTo(0, 0); return; }
      }
    }
    this.paso.set(indice);
    this.error.set(null);
    this.wizardBody?.nativeElement.parentElement?.scrollTo({ top: 0, behavior: 'auto' });
  }
  siguiente(): void { this.irPaso(this.paso() + 1); }
  anterior(): void { this.irPaso(this.paso() - 1); }
  intentarEnvio(): void {
    if (this.paso() !== this.pasos.length - 1) { this.siguiente(); return; }
    this.enviar();
  }
  nombre = '';
  descripcion = '';
  motivoId = 0;
  inicio = localInput(undefined);
  fin = '';
  buscarPredio = '';
  predioId = 0;
  actividad = '';
  recursoId = '';
  cantidad = '1';
  empleadoId = 0;
  funcion = '';

  open(borradorId?: number): void {
    if (this.saving()) return;
    const u = this.uotId();
    this.openedUotId = u ?? null;
    this.requestSequence++;
    const token = this.requestSequence;
    this.error.set(null);
    this.paso.set(0);
    this.loading.set(true);
    this.tieneAprobador.set(false);
    this.catalogos.set({motivos:[],tiposVisita:[],bienes:[],participantes:[]});
    this.predios.set([]);
    this.destinos.set([]);
    this.recursos.set([]);
    this.participantes.set([]);
    this.files.set([]);
    this.borradorId.set(null);
    this.nombre=''; this.descripcion=''; this.motivoId=0;
    this.inicio=localInput(undefined); this.fin='';
    this.buscarPredio='';this.predioId=0;this.actividad='';
    this.recursoId='';this.cantidad='1';this.empleadoId=0;this.funcion='';
    this.modal.open();
    if (!u) { this.error.set('Seleccione una UOT.'); this.loading.set(false); return; }
    forkJoin({
      contexto: this.documental.contexto(u),
      catalogos: this.e2.catalogos(u),
      predios: this.prediosApi.listar(u)
    }).pipe(finalize(() => {if(token===this.requestSequence)this.loading.set(false);})).subscribe({
      next: r => {
        if(token!==this.requestSequence) return;
        if (!r.contexto.habilitado) {
          this.error.set('No tiene acceso para solicitar salidas técnicas.'); return;
        }
        this.tieneAprobador.set(r.contexto.tieneAprobador || r.contexto.autorizacionPropiaAdmin === true);
        this.catalogos.set(r.catalogos);
        this.predios.set(r.predios);
        if (borradorId) this.abrirBorrador(u, borradorId);
      }, error: e => {if(token===this.requestSequence)this.error.set(mapOpenApiError(e).message);}
    });
  }

  cerrar(): void {
    if(this.saving()) return;
    this.requestSequence++;
    this.modal.close();
  }

  private abrirBorrador(u: number, id: number): void {
    this.loading.set(true);
    const token = this.requestSequence;
    this.e2.ver(u, id).pipe(finalize(() => {if(token===this.requestSequence)this.loading.set(false);})).subscribe({
      next: d => {
        if(token!==this.requestSequence) return;
        if (d.estado !== 'BORRADOR' || d.convenioId) {
          this.error.set('El borrador no está disponible.'); return;
        }
        this.borradorId.set(id);
        this.nombre = d.nombre;
        this.descripcion = d.descripcion ?? '';
        this.motivoId = d.motivoSalidaId;
        this.inicio = localInput(d.fechaInicioPrevista);
        this.fin = localInput(d.fechaFinPrevista);
        this.destinos.set(d.destinos.map(x => ({predioId: x.predioId, actividadPrevista: x.actividadPrevista})));
        this.recursos.set(d.bienes.map(x => ({bienId:x.bienId, suministroId:x.suministroId, cantidad:x.cantidadSolicitada})));
        this.participantes.set(d.participantes.filter(x=>!x.responsable).map(x=>({empleadoId:x.empleadoId,funcion:x.funcion})));
      }, error: e => {if(token===this.requestSequence)this.error.set(mapOpenApiError(e).message);} 
    });
  }

  prediosFiltrados(): PredioSalida[] {
    const query = this.buscarPredio.trim().toLocaleLowerCase();
    const usados = new Set(this.destinos().map(item => item.predioId));
    return this.predios().filter(x => !usados.has(x.predioId)
      && (!query || `${x.nombre} ${x.codigo}`.toLocaleLowerCase().includes(query))).slice(0, 80);
  }
  agregarDestino(): void {
    if (!this.predioId || !this.actividad.trim()) {
      this.error.set('Seleccione el predio e indique la actividad.'); return;
    }
    if (this.destinos().some(x=>x.predioId===this.predioId)) {
      this.error.set('Este predio ya está incluido.'); return;
    }
    if (!this.predios().some(x => x.predioId === this.predioId)) {
      this.error.set('Selecciona un predio válido.'); return;
    }
    this.destinos.update(rows => [...rows, {predioId:this.predioId,actividadPrevista:this.actividad.trim()}]);
    this.predioId=0;this.actividad='';this.error.set(null);
  }
  eliminarDestino(index: number): void { this.destinos.update(rows=>rows.filter((_,i)=>i!==index)); }
  nombrePredio(id: number | undefined): string {
    return this.predios().find(p=>p.predioId===id)?.nombre ?? `Predio #${id ?? ''}`;
  }
  recursoSeleccionado(): RecursoOpcionE2 | undefined {
    return this.recursosDisponibles().find(x => claveRecursoE2(x) === this.recursoId);
  }
  private recursoValido(item: RecursoEntradaE2): boolean {
    const opcion = this.catalogos().bienes.find(x => x.id === (item.bienId ?? item.suministroId)
      && (item.bienId != null ? x.tipo !== 'CONSUMIBLE' : x.tipo === 'CONSUMIBLE'));
    return opcion != null && verificarDisponibilidadE2(opcion, Number(item.cantidad)).valido;
  }
  disponibleSeleccionado(): string {
    const opcion = this.recursoSeleccionado();
    if (!opcion) return '';
    const resultado = verificarDisponibilidadE2(opcion, Number(this.cantidad));
    if (!resultado.valido) return resultado.mensaje;
    return resultado.trasladoComercial
      ? 'El material se trasladará de almacén comercial a suministros al aprobar la salida.'
      : 'Disponible para la salida.';
  }
  puedeAgregarRecurso(): boolean {
    const opcion = this.recursoSeleccionado();
    return opcion != null && verificarDisponibilidadE2(opcion, Number(this.cantidad)).valido;
  }
  agregarRecurso(): void {
    const opcion = this.recursoSeleccionado();
    const cantidad = Number(this.cantidad);
    if (!opcion) {
      this.error.set('Selecciona un material o equipo.');
      return;
    }
    const validacion = verificarDisponibilidadE2(opcion, cantidad);
    if (!validacion.valido) {
      this.error.set(validacion.mensaje);
      return;
    }
    if (this.recursos().some(x => opcion.tipo!=='CONSUMIBLE' ? x.bienId===opcion.id : x.suministroId===opcion.id)) {
      this.error.set('Este recurso ya está incluido.'); return;
    }
    this.recursos.update(rows=>[...rows, opcion.tipo!=='CONSUMIBLE'
      ? {bienId:opcion.id,cantidad:1} : {suministroId:opcion.id,cantidad}]);
    this.recursoId='';this.cantidad='1';this.error.set(null);
  }
  eliminarRecurso(index:number):void { this.recursos.update(rows=>rows.filter((_,i)=>i!==index)); }
  nombreRecurso(item:RecursoEntradaE2):string {
    return this.catalogos().bienes.find(x=>x.id===(item.bienId??item.suministroId)
      && (item.bienId?x.tipo!=='CONSUMIBLE':x.tipo==='CONSUMIBLE'))?.nombre ?? 'Recurso';
  }
  unidadRecurso(item:RecursoEntradaE2):string {
    return this.catalogos().bienes.find(x=>x.id===(item.bienId??item.suministroId)
      && (item.bienId?x.tipo!=='CONSUMIBLE':x.tipo==='CONSUMIBLE'))?.unidad ?? 'und';
  }
  agregarParticipante(): void {
    if (!this.empleadoId || !this.funcion.trim() || !this.participantesDisponibles().some(x => x.id === this.empleadoId)) {
      this.error.set('Seleccione un participante y su función.'); return;
    }
    this.participantes.update(rows=>[...rows,{empleadoId:this.empleadoId,funcion:this.funcion.trim()}]);
    this.empleadoId=0;this.funcion='';this.error.set(null);
  }
  eliminarParticipante(index:number):void { this.participantes.update(rows=>rows.filter((_,i)=>i!==index)); }
  nombreParticipante(id:number):string {
    return this.catalogos().participantes.find(x=>x.id===id)?.nombre??'Empleado';
  }

  private contenido(enviar:boolean):SolicitudE2 | null {
    const start=new Date(this.inicio);
    const end=this.fin?new Date(this.fin):null;
    if (!this.nombre.trim() || !this.motivoId || !Number.isFinite(start.getTime())
      || (end && (!Number.isFinite(end.getTime()) || end<=start))) {
      this.error.set('Complete la información y revise las fechas.'); return null;
    }
    if (enviar && (!end || !this.destinos().length || this.destinos().some(x=>!x.actividadPrevista))) {
      this.error.set('Indique las fechas y al menos un destino con actividad.');return null;
    }
    if (enviar && this.recursosSinStock()) {
      this.error.set('Algunos materiales o equipos ya no están disponibles.'); return null;
    }
    return {nombre:this.nombre.trim(),motivoSalidaId:this.motivoId,
      fechaInicioPrevista:start.toISOString(), fechaFinPrevista:end?.toISOString(),
      descripcion:this.descripcion.trim(), destinos:this.destinos(), bienes:this.recursos(),
      participantes:this.participantes(), borrador:!enviar};
  }

  enviar(): void {
    const u = this.openedUotId;
    if (!u || this.saving() || this.loading()) return;
    if (this.uotId() !== u) {
      this.error.set('La unidad de trabajo cambió. Cierra la solicitud y ábrela nuevamente.');
      return;
    }
    for (let i = 0; i < this.pasos.length - 1; i++) {
      if (!this.validarPaso(i)) { this.paso.set(i); this.wizardBody?.nativeElement.parentElement?.scrollTo(0, 0); return; }
    }
    if (!this.tieneAprobador()) {
      this.error.set('Por el momento no es posible enviar la solicitud. Consulta con tu unidad de trabajo.');
      return;
    }
    const datos = this.contenido(true);
    if (!datos) { this.paso.set(0); return; }
    this.saving.set(true); this.error.set(null);
    const id = this.borradorId();
    // La disponibilidad puede cambiar mientras se completa el asistente.
    this.e2.catalogos(u).pipe(
      switchMap(actualizados => {
        if (this.openedUotId !== u || this.uotId() !== u) {
          this.error.set('La unidad de trabajo cambió. Abre nuevamente la solicitud.');
          return EMPTY;
        }
        this.catalogos.set(actualizados);
        if (!this.validarPaso(2)) {
          this.paso.set(2);
          return EMPTY;
        }
        return from(this.files()).pipe(
          concatMap(file => this.documentos.subirAdjunto(u, file)),
          toArray(),
          switchMap(archivos => {
            const archivoIds = archivos.map(x => x?.archivoId)
              .filter((x): x is number => typeof x === 'number');
            return id !== null
              ? this.documental.enviarBorrador(u, id, {...datos, enviar:true, archivoIds})
              : this.documental.solicitar(u, {...datos, archivoIds});
          })
        );
      }),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: () => {
        this.toast.success('Solicitud enviada');
        this.completed.emit();
        this.modal.close(true);
        void this.router.navigate(['/gestion-tecnica/visitas']);
      },
      error: e => this.error.set(mapOpenApiError(e).message)
    });
  }
}
