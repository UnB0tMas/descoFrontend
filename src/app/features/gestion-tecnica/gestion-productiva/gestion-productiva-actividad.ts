import { ResourceDatePipe } from '../../../shared/formatting/resource-date.pipe';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faClipboardCheck, faClipboardList, faLeaf, faPen, faPlus, faRotate, faSearch, faStethoscope, faTableCellsLarge, faTableList, faEye, faTrash, faFlagCheckered } from '@fortawesome/free-solid-svg-icons';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { GpActividadResponse } from '../../../infrastructure/openapi/generated/model/gpActividadResponse';
import { GpCensoResponse } from '../../../infrastructure/openapi/generated/model/gpCensoResponse';
import { GpEventoResponse } from '../../../infrastructure/openapi/generated/model/gpEventoResponse';
import { GpActividadRevisionResponse } from '../../../infrastructure/openapi/generated/model/gpActividadRevisionResponse';
import { GpCatalogoResponse } from '../../../infrastructure/openapi/generated/model/gpCatalogoResponse';
import { DataTableComponent } from '../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { GpGeneralFacade } from './gp-general.facade';
import { GpAccionModal } from './gp-accion-modal';
import { GpIncidenciasPanel } from './gp-incidencias-panel';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';

type Section = 'informacion' | 'historial' | 'modificaciones' | 'censos' | 'incidencias';
type Category = 'TODOS' | 'CULTIVO' | 'CRIANZA';
type InfoRow = { campo: string; valor: string };
@Component({
  selector: 'app-gestion-productiva-actividad', standalone: true,
  imports: [ResourceDatePipe,RecordCardComponent, DatePipe, FormsModule, RouterLink, FaIconComponent, PermissionDirective,
    PageHeaderComponent, DataTableComponent, PaginatorComponent,
    EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, GpAccionModal, GpIncidenciasPanel, ActionConfirmDialogComponent],
  templateUrl: './gestion-productiva-actividad.html', styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaActividad implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gp = inject(GpGeneralFacade);
  private readonly uot = inject(UotContextStore);
  private readonly permissions = inject(PermissionService);
  private readonly toast=inject(ToastService);
  private readonly subscriptions = new Subscription();
  private detailsSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  @ViewChild(GpAccionModal) private modal!: GpAccionModal;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog!:ActionConfirmDialogComponent;

  readonly predioId = Number(this.route.snapshot.paramMap.get('predioId'));
  readonly parcelaId = Number(this.route.snapshot.paramMap.get('parcelaId'));
  readonly actividadId = Number(this.route.snapshot.paramMap.get('actividadId'));
  readonly pageIcon = faLeaf;
  readonly backIcon = faArrowLeft;
  readonly refreshIcon = faRotate;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly searchIcon = faSearch;
  readonly censusIcon = faClipboardList;
  readonly eventsIcon = faStethoscope;
  readonly evaluationIcon = faClipboardCheck;
  readonly tableIcon=faTableList;readonly cardsIcon=faTableCellsLarge;
  readonly detailsIcon=faEye;readonly deleteIcon=faTrash;readonly finishIcon=faFlagCheckered;
  readonly activityView=signal<'tabla'|'tarjetas'>('tabla');
  readonly infoView=signal<'tabla'|'tarjetas'>('tarjetas');
  readonly historyView=signal<'tabla'|'tarjetas'>('tabla');
  readonly censusView=signal<'tabla'|'tarjetas'>('tabla');
  readonly revisionsView=signal<'tabla'|'tarjetas'>('tabla');
  readonly showDetails=signal(false);
  readonly lifecycleBusy=signal(false);
  readonly lifecycleError=signal<string|null>(null);
  readonly infoColumns:readonly DataTableColumn<InfoRow>[]=[
    {key:'campo',label:'Dato'}, {key:'valor',label:'Información'},
  ];
  readonly historyColumns:readonly DataTableColumn<GpEventoResponse>[]=[
    {key:'eventoId',label:'Registro',format:v=>`#${v}`},
    {key:'fechaRegistro',label:'Registrado',format:v=>v?this.formatDateTime(String(v)):'—'},
    {key:'fechaHecho',label:'Fecha del hecho',format:v=>v?this.formatDate(String(v)):'—'},
    {key:'tipo',label:'Tipo'}, {key:'problema',label:'Problema',format:v=>String(v??'—')},
    {key:'tratamiento',label:'Tratamiento',format:v=>String(v??'—')},
    {key:'cantidadAfectada',label:'Cantidad afectada',format:(v,row)=>v==null?'—':`${v}${row.afectadosAproximado?' (aprox.)':''}`},
    {key:'observacion',label:'Descripción'},
    {key:'respuestaAId',label:'Responde a',format:v=>v==null?'—':`#${v}`},
    {key:'usuarioNombre',label:'Registrado por',format:(v,row)=>String(v||`Usuario #${row.usuarioId}`)},
     {key:'fotos',label:'Evidencias'},
  ];
  readonly revisionColumns:readonly DataTableColumn<GpActividadRevisionResponse>[]=[
    {key:'revisionId',label:'Revisión',format:v=>`#${v}`},
    {key:'fechaRegistro',label:'Fecha',format:v=>v?this.formatDateTime(String(v)):'—'},
    {key:'nombreAnterior',label:'Nombre anterior',format:v=>String(v??'—')},
    {key:'nombreNuevo',label:'Nombre nuevo',format:v=>String(v??'—')},
    {key:'estadoAnterior',label:'Estado anterior',format:v=>v?'Activo':'Inactivo'},
    {key:'estadoNuevo',label:'Estado nuevo',format:v=>v?'Activo':'Inactivo'},
    {key:'motivo',label:'Motivo'},
    {key:'usuarioId',label:'Técnico',format:v=>`#${v}`},
  ];
  readonly activityColumns:readonly DataTableColumn<GpActividadResponse>[]=[
    {key:'nombre',label:'Actividad'}, {key:'rubro',label:'Rubro'}, {key:'superficieExactaM2',label:'Superficie (m²)',align:'right'},
    {key:'estadoProceso',label:'Estado'}, {key:'acciones',label:'Acciones',align:'right'}
  ];
  readonly loading = signal(true);
  readonly detailsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detailsError = signal<string | null>(null);
  readonly parcelaNombre = signal('Parcela');
  readonly parcelaAreaM2 = signal<number|null>(null);
  readonly actividades = signal<GpActividadResponse[]>([]);
  readonly catalogos = signal<GpCatalogoResponse[]>([]);
  readonly selectedId = signal<number | null>(this.actividadId);
  readonly censos = signal<GpCensoResponse[]>([]);
  readonly revisiones = signal<GpActividadRevisionResponse[]>([]);
  readonly eventos = signal<GpEventoResponse[]>([]);
  readonly fotos = signal<Record<number,string>>({});
  private readonly fotoSolicitudes = new Set<number>();
  readonly section = signal<Section>(this.route.snapshot.queryParamMap.get('seccion')==='incidencias'?'incidencias':'informacion');
  readonly activitySearch = signal('');
  readonly category = signal<Category>('TODOS');
  readonly estadoFiltro=signal<'TODOS'|'ACTIVA'|'FINALIZADA'>('TODOS');
  readonly activityPage = signal(1);
  readonly activitySize = signal(10);
  readonly historyPage = signal(1);
  readonly historySize = signal(10);
  readonly censusPage = signal(1);
  readonly censusSize = signal(10);
  revisionSearchInput='';historySearchInput='';censusSearchInput='';
  readonly revisionSearch=signal('');
  readonly historySearch=signal('');
  readonly censusSearch=signal('');
  searchRevisions():void{this.revisionSearch.set(this.revisionSearchInput.trim());}
  searchHistory():void{this.historySearch.set(this.historySearchInput.trim());this.historyPage.set(1);}
  searchCensuses():void{this.censusSearch.set(this.censusSearchInput.trim());this.censusPage.set(1);}
  readonly filteredRevisions=computed(()=>{
    const q=this.revisionSearch().toLocaleLowerCase('es-PE');return this.revisiones().filter(r=>!q||
      [r.revisionId,r.nombreAnterior,r.nombreNuevo,r.motivo,r.fechaRegistro].some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q)));
  });
  readonly comentarios = computed(() => this.eventos().filter(e => e.tipo === 'OBSERVACION'));
  readonly filteredHistory=computed(()=>{
    const q=this.historySearch().toLocaleLowerCase('es-PE');return this.eventos().filter(e=>!q||
      [e.eventoId,e.tipo,e.problema,e.tratamiento,e.observacion,e.fechaHecho,e.usuarioNombre].some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q)));
  });
  readonly filteredCensuses=computed(()=>{
    const q=this.censusSearch().toLocaleLowerCase('es-PE');return this.censos().filter(c=>!q||
      [c.censoId,c.fecha,c.observacion,c.usuarioId].some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q)));
  });

  readonly censusColumns:readonly DataTableColumn<GpCensoResponse>[]=[
    {key:'censoId',label:'Versión',format:v=>`#${v}`},
    {key:'fechaRegistro',label:'Registro',format:v=>v?this.formatDateTime(String(v)):'—'},
    {key:'fecha',label:'Fecha de medición',format:v=>v?this.formatDate(String(v)):'—'},
    {key:'cantidadAproximada',label:'Animales aprox.',align:'right',format:v=>v==null?'—':String(v)},
    {key:'superficieAproximadaM2',label:'Superficie aprox. (m²)',align:'right',format:v=>v==null?'—':String(v)},
    {key:'cantidadExacta',label:'Animales',align:'right',format:v=>v==null?'—':String(v)},
    {key:'superficieExactaM2',label:'Superficie (m²)',align:'right',format:v=>v==null?'—':String(v)},
    {key:'variacion',label:'Variación',value:v=>this.variacionCenso(v)},
    {key:'distribucion',label:'Razas / variedades',value:v=>this.distribucionCenso(v)},
    {key:'observacion',label:'Motivo / observación',format:v=>String(v||'—')},
    {key:'usuarioId',label:'Técnico',format:v=>`#${v}`},
  ];
  readonly cropCensusColumns=this.censusColumns.filter(column=>column.key!=='cantidadExacta' && column.key!=='cantidadAproximada');
  readonly animalCensusColumns=this.censusColumns;
  readonly infoRows=computed<InfoRow[]>(()=>{
    const a=this.selected();if(!a)return [];
    const rows:InfoRow[]=[
      {campo:'Actividad',valor:a.nombre},
      {campo:'Rubro',valor:a.rubro==='CULTIVO'?'Agricultura':'Crianza animal'},
      {campo:'Inicio',valor:a.fechaInicio?this.formatDate(a.fechaInicio):'—'},
      {campo:'Estado',valor:!a.estado?'Inactiva':a.estadoProceso==='FINALIZADA'?'Finalizada':'Activa'},
      {campo:'Superficie exacta',valor:a.superficieExactaM2!=null?`${a.superficieExactaM2} m²`:'—'},
      {campo:'Superficie aproximada',valor:a.superficieAproximadaM2!=null?`${a.superficieAproximadaM2} m²`:'—'},
    ];
    if(a.rubro==='CULTIVO'){
      rows.push({campo:'Variedad',valor:a.variedadId?(a.variedadNombre||this.varietyName(a.variedadId)):'Sin variedad especificada'});
    }else{
      rows.push({campo:'Animales exactos',valor:a.cantidadExacta==null?'—':String(a.cantidadExacta)});
      rows.push({campo:'Animales aproximados',valor:a.cantidadAproximada==null?'—':String(a.cantidadAproximada)});
    }
    rows.push({campo:'Mediciones registradas',valor:String(this.censos().length)});
    rows.push({campo:'Última medición',valor:a.fechaUltimoCenso?this.formatDate(a.fechaUltimoCenso):'—'});
    return rows;
  });
  readonly selected = computed(() => this.actividades().find(a => a.actividadId === this.selectedId()) ?? null);
  readonly crops = computed(() => this.actividades().filter(a => a.rubro === 'CULTIVO' && a.estadoProceso!=='FINALIZADA'));
  readonly animals = computed(() => this.actividades().filter(a => a.rubro === 'CRIANZA' && a.estadoProceso!=='FINALIZADA'));
  readonly filteredActivities = computed(() => {
    const term = this.activitySearch().trim().toLocaleLowerCase();
    const category = this.category();
    return this.actividades().filter(a => (category === 'TODOS' || a.rubro === category) &&
      (this.estadoFiltro()==='TODOS'||(a.estadoProceso??'ACTIVA')===this.estadoFiltro()) &&
      (!term || a.nombre.toLocaleLowerCase().includes(term)));
  });
  readonly activityPages = computed(() => Math.ceil(this.filteredActivities().length / this.activitySize()));
  readonly visibleActivities = computed(() => this.filteredActivities().slice(
    (this.activityPage() - 1) * this.activitySize(), this.activityPage() * this.activitySize()));
  readonly historyPages = computed(() => Math.max(1,Math.ceil(this.filteredHistory().length / this.historySize())));
  readonly visibleHistory = computed(() => this.filteredHistory().slice(
    (this.historyPage() - 1) * this.historySize(), this.historyPage() * this.historySize()));
  readonly censusPages = computed(() => Math.max(1,Math.ceil(this.filteredCensuses().length / this.censusSize())));
  readonly visibleCensuses = computed(() => this.filteredCensuses().slice(
    (this.censusPage() - 1) * this.censusSize(), this.censusPage() * this.censusSize()));

  canComment(): boolean { return this.permissions.has('PREDIOS_EDITAR'); }
  canCreateEvent(): boolean {
    return ['PREDIOS_EDITAR', 'SANIDAD_CREAR', 'EVALUACIONES_CREAR'].some(code => this.permissions.has(code));
  }
  ngOnInit(): void {
    if (!Number.isInteger(this.predioId) || this.predioId < 1 ||
        !Number.isInteger(this.parcelaId) || this.parcelaId < 1 || !Number.isInteger(this.actividadId) || this.actividadId < 1) {
      this.loading.set(false); this.error.set('Parcela no válida.'); return;
    }
    this.refresh();
  }
  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe(); this.detailsSubscription?.unsubscribe(); this.subscriptions.unsubscribe();
    Object.values(this.fotos()).forEach(url=>URL.revokeObjectURL(url));
  }
  verFoto(id:number):void {
    if(this.fotos()[id] || this.fotoSolicitudes.has(id)) return;
    const uot=this.uot.selectedId();if(!uot)return;
    this.fotoSolicitudes.add(id);
    this.subscriptions.add(this.gp.verFoto(uot,id).pipe(finalize(()=>this.fotoSolicitudes.delete(id))).subscribe({
      next:blob=>this.fotos.update(x=>({...x,[id]:URL.createObjectURL(blob)})),
      error:e=>this.detailsError.set(mapOpenApiError(e).message)
    }));
  }
  refresh(): void {
    const uot = this.uot.selectedId();
    if (!uot) { this.loading.set(false); this.error.set('Selecciona una UOT para consultar este expediente.'); return; }
    this.refreshSubscription?.unsubscribe();
    this.loading.set(true); this.error.set(null);
    this.refreshSubscription = forkJoin({
      parcelas: this.gp.parcelas(uot, this.predioId),
      actividades: this.gp.actividades(uot, this.parcelaId),
      catalogos: this.gp.catalogos(uot),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        const parcela = result.parcelas.find(row => row.parcelaId === this.parcelaId);
        if (!parcela) { this.error.set('La parcela no pertenece al predio seleccionado.'); this.actividades.set([]); return; }
        this.parcelaNombre.set(parcela.nombre);
        this.parcelaAreaM2.set(parcela.areaHa==null?null:Number(parcela.areaHa)*10000);
        this.catalogos.set(result.catalogos);
        this.actividades.set([...result.actividades].sort((a, b) => b.actividadId - a.actividadId));
        this.activityPage.set(Math.max(1, Math.min(this.activityPage(), this.activityPages())));
        if (!result.actividades.some(a => a.actividadId === this.actividadId)) {
          this.error.set('La actividad no está disponible en esta parcela.'); return;
        }
        this.loadActivity();
      },
      error: err => this.error.set(mapOpenApiError(err).message),
    });
  }

  setView(value:'tabla'|'tarjetas'):void{this.activityView.set(value);}
  changeEstado(value:'TODOS'|'ACTIVA'|'FINALIZADA'):void{this.estadoFiltro.set(value);this.activityPage.set(1);}
  changeSearch(value: string): void { this.activitySearch.set(value); this.activityPage.set(1); }
  changeCategory(value: Category): void { this.category.set(value); this.activityPage.set(1); }
  setActivityPage(page: number): void { if (page >= 1 && page <= this.activityPages()) this.activityPage.set(page); }
  setActivitySize(size: number): void { this.activitySize.set(size); this.activityPage.set(1); }
  setHistoryPage(page: number): void { if (page >= 1 && page <= this.historyPages()) this.historyPage.set(page); }
  setHistorySize(size: number): void { this.historySize.set(size); this.historyPage.set(1); }
  setCensusPage(page: number): void { if (page >= 1 && page <= this.censusPages()) this.censusPage.set(page); }
  setCensusSize(size: number): void { this.censusSize.set(size); this.censusPage.set(1); }
  changeSection(value: Section): void { this.section.set(value); }
  formatDateTime(value:string):string {const utc=/Z$|[+-]\d{2}:?\d{2}$/.test(value)?value:value+'Z';return new Date(utc).toLocaleString('es-PE', {dateStyle:'short', timeStyle:'short'});}

  loadActivity(): void {
    this.detailsSubscription?.unsubscribe();
    const uot = this.uot.selectedId(), id = this.selectedId();
    if (!uot || !id) { this.censos.set([]); this.eventos.set([]); this.revisiones.set([]); this.detailsLoading.set(false); return; }
    this.detailsLoading.set(true); this.detailsError.set(null);
    this.detailsSubscription = forkJoin({ censos: this.gp.censos(uot, id), eventos: this.gp.eventos(uot, id), revisiones: this.gp.revisiones(uot, id) })
      .pipe(finalize(() => this.detailsLoading.set(false)))
      .subscribe({
        next: result => {
          this.revisiones.set(result.revisiones);
          this.censos.set([...result.censos].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro) || b.censoId - a.censoId));
          this.eventos.set([...result.eventos].sort((a, b) => b.fechaHecho.localeCompare(a.fechaHecho) || b.eventoId - a.eventoId));
          this.historyPage.set(1); this.censusPage.set(1);
        },
        error: err => this.detailsError.set(mapOpenApiError(err).message),
      });
  }
  medidaResumen(a: GpActividadResponse): string {
    const area=a.superficieExactaM2??a.superficieAproximadaM2;
    if(a.rubro==='CULTIVO')return area==null?'Superficie sin registrar':`${area} m² sembrados`;
    const total=a.cantidadExacta??a.cantidadAproximada;
    return `${total==null?'Censo sin registrar':total+' animales'} · ${area==null?'Superficie pendiente':area+' m²'}`;
  }
  /** Superficie libre compartida entre cultivos y crianzas, sin duplicar la actividad editada. */
  disponibleSuperficie(actividadId?:number):number|null{
    const total=this.parcelaAreaM2();if(total===null)return null;
    const ocupado=this.actividades().filter(a=>a.estado&&a.actividadId!==actividadId)
      .reduce((sum,a)=>sum+Number(a.superficieExactaM2??a.superficieAproximadaM2??0),0);
    return Math.max(0,Math.round((total-ocupado)*100)/100);
  }
  variacionCenso(actual:GpCensoResponse):string{
    const idx=this.censos().findIndex(x=>x.censoId===actual.censoId);
    const anterior=idx<0?null:this.censos()[idx+1]??null;
    if(!anterior)return 'Registro inicial';
    const actualCantidad=actual.cantidadExacta, anteriorCantidad=anterior.cantidadExacta;
    const actualArea=actual.superficieExactaM2,anteriorArea=anterior.superficieExactaM2;
    const datos:string[]=[];
    if(actualCantidad!=null && anteriorCantidad!=null){
      const diferencia=actualCantidad-anteriorCantidad;
      datos.push(`${diferencia>0?'+':''}${diferencia} animales`);
    }
    if(actualArea!=null && anteriorArea!=null){
      const diferencia=Math.round((actualArea-anteriorArea)*100)/100;
      datos.push(`${diferencia>0?'+':''}${diferencia} m²`);
    }
    return datos.length?datos.join(' · '):'Sin medición comparable';
  }
  distribucionCenso(v:GpCensoResponse):string{
    const a=this.selected();if(!a)return '—';
    if(a.rubro==='CRIANZA'){
      return v.razas?.length?v.razas.map(r=>`${r.nombre||'Raza #'+r.razaId}: ${r.cantidadExacta??r.cantidadAproximada??0}`).join(' · '):'Sin razas detalladas';
    }
    return v.variedades?.length?v.variedades.map(x=>`${x.nombre}: ${x.superficieM2} m²`).join(' · '):'Sin variedades detalladas';
  }
  fotoIds(e:GpEventoResponse):number[]{return [...new Set([...(e.fotosIds??[]),...(e.fotoId?[e.fotoId]:[])])];}
  formatDate(value: string): string {
    const date = /^\d{4}-(\d{2})-(\d{2})/.exec(value);
    return date ? `${date[2]}/${date[1]}/${value.slice(0, 4)}` : value;
  }
  createActivity(): void { this.modal.show('actividad', this.parcelaId, null, this.catalogos(), [], () => this.refresh(),null,this.disponibleSuperficie()); }
  editActivity(): void { const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA') this.modal.show('editar', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh()); }
  newCensus(): void { const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA') this.modal.show('censo', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh(), this.censos()[0]??null,this.disponibleSuperficie(a.actividadId)); }
  newEvent(): void { const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA') this.modal.show('evento', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh()); }
  newComment(): void { const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA' && this.canComment()) this.modal.show('comentario', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh()); }
  async changeLifecycle(accion:'finalizar'|'eliminar'):Promise<void>{
    const a=this.selected(),uot=this.uot.selectedId();if(!a||!uot||this.lifecycleBusy())return;
    if(accion==='finalizar' && a.estadoProceso==='FINALIZADA')return;
    if (accion==='finalizar' && a.rubro==='CRIANZA' && (a.cantidadExacta??a.cantidadAproximada??0)>0) {
      this.lifecycleError.set('No puedes cerrar una crianza con animales registrados. Actualiza primero el censo hasta cero, justificando la salida de los animales.');
      return;
    }
    const crop=a.rubro==='CULTIVO';
    const confirmation=await this.confirmDialog.show({
      title:accion==='eliminar'?'Eliminar actividad':crop?'Finalizar ciclo agrícola':'Cerrar crianza',
      message:accion==='eliminar'?'Se ocultará la actividad de las consultas normales. La información permanece en la base de datos para auditoría.':crop
        ?'Se registrará el fin del ciclo del cultivo y se liberará su superficie para una nueva siembra. Su historial quedará disponible.'
        :'Solo se puede cerrar la crianza sin animales vigentes. Los censos, tratamientos y seguimientos permanecen para consulta.',
      tone:accion==='finalizar'?'warning':'danger',confirmLabel:accion==='eliminar'?'Eliminar':crop?'Finalizar cultivo':'Cerrar crianza',
      requiresReason:true,minimumReasonLength:3,maximumReasonLength:1000,
      reasonLabel:'Motivo',reasonPlaceholder:accion==='eliminar'?'Explica la eliminación lógica':crop?'Cosecha, fin del ciclo o renovación':'Venta, traslado u otro motivo del cierre'
    });
    if(!confirmation.confirmed||!confirmation.reason)return;
    this.lifecycleBusy.set(true);this.lifecycleError.set(null);
    (accion==='finalizar'?this.gp.finalizarActividad(uot,a.actividadId,confirmation.reason):this.gp.eliminarActividad(uot,a.actividadId,confirmation.reason))
      .pipe(finalize(()=>this.lifecycleBusy.set(false))).subscribe({next:()=>{this.toast.success(accion==='finalizar'?(a.rubro==='CULTIVO'?'Ciclo agrícola finalizado':'Crianza cerrada'):'Actividad eliminada lógicamente'); if(accion==='eliminar'){void this.router.navigate(['/gestion-tecnica/gestion-productiva/predios',this.predioId,'parcelas',this.parcelaId]);}else{this.refresh();}},
      error:e=>this.lifecycleError.set(mapOpenApiError(e).message)});
  }
  varietyName(id:number):string {return this.catalogos().find(x=>x.tipo==='VARIEDAD' && x.id===id)?.nombre??`#${id}`;}

}
