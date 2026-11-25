import { BreadcrumbComponent } from '../../../shared/layout/breadcrumb/breadcrumb';
import { ListViewSwitchComponent } from '../../../shared/data-display/list-view-switch/list-view-switch';
import { ResourceDatePipe } from '../../../shared/formatting/resource-date.pipe';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { AppButtonComponent } from '../../../shared/actions/app-button/app-button';
import { ChartCardComponent } from '../../../shared/charts/chart-card/chart-card';
import { ChartCardData } from '../../../shared/charts/chart-card/chart-card.types';
import { ChartPresetsService } from '../../../shared/charts/chart-presets.service';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faClipboardCheck, faClipboardList, faLeaf, faPen, faPlus, faRotate, faSearch, faStethoscope, faTableCellsLarge, faTableList, faEye, faTrash, faFlagCheckered, faComments, faReply, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Subscription, finalize, firstValueFrom, forkJoin } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { GpActividadResponse } from '../../../infrastructure/openapi/generated/model/gpActividadResponse';
import { GpCensoResponse } from '../../../infrastructure/openapi/generated/model/gpCensoResponse';
import { GpResumenPeriodo, GpResumenResponse, GpResumenTipoEvento } from '../../../infrastructure/openapi/generated/model/gpResumenResponse';
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
import { ProtectedFileViewerComponent } from '../../../shared/files/protected-file-viewer/protected-file-viewer';
import { ModalShellComponent } from '../../../shared/feedback/modal-shell/modal-shell';
import { GpGeneralFacade } from './gp-general.facade';
import { GpAccionModal } from './gp-accion-modal';
import { GpIncidenciasPanel } from './gp-incidencias-panel';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';

type Section = 'informacion' | 'historial' | 'modificaciones' | 'censos' | 'incidencias';
type Category = 'TODOS' | 'CULTIVO' | 'CRIANZA';
@Component({
  selector: 'app-gestion-productiva-actividad', standalone: true,
  imports: [BreadcrumbComponent, ModalShellComponent, ProtectedFileViewerComponent, ListViewSwitchComponent, ResourceDatePipe, RecordCardComponent, AppButtonComponent, ChartCardComponent, DatePipe, FormsModule, RouterLink, FaIconComponent, PermissionDirective,
    PageHeaderComponent, DataTableComponent, PaginatorComponent,
    EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, GpAccionModal, GpIncidenciasPanel, ActionConfirmDialogComponent],
  templateUrl: './gestion-productiva-actividad.html', styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaActividad implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gp = inject(GpGeneralFacade);
  private readonly chartPresets = inject(ChartPresetsService);
  private readonly uot = inject(UotContextStore);
  private readonly permissions = inject(PermissionService);
  private readonly toast=inject(ToastService);
  private readonly subscriptions = new Subscription();
  private detailsSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  private resumenSubscription?: Subscription;
  @ViewChild(GpAccionModal) private modal!: GpAccionModal;
  @ViewChild('hiloModal') private hiloModal!: ModalShellComponent;
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
  readonly repliesIcon=faComments;readonly replyIcon=faReply;readonly downloadIcon=faDownload;
  readonly activityView=signal<'tabla'|'tarjetas'>('tabla');
  readonly historyView=signal<'tabla'|'tarjetas'>('tabla');
  readonly censusView=signal<'tabla'|'tarjetas'>('tabla');
  readonly revisionsView=signal<'tabla'|'tarjetas'>('tabla');
  readonly showDetails=signal(false);
  readonly lifecycleBusy=signal(false);
  readonly lifecycleError=signal<string|null>(null);
  readonly historyColumns:readonly DataTableColumn<GpEventoResponse>[]=[
    {key:'eventoId',label:'Registro',format:v=>`#${v}`},
    {key:'fechaRegistro',label:'Registrado',format:v=>v?this.formatDateTime(String(v)):'—'},
    {key:'fechaHecho',label:'Fecha del hecho',format:v=>v?this.formatDate(String(v)):'—'},
    {key:'tipo',label:'Tipo'}, {key:'problema',label:'Problema',format:v=>String(v??'—')},
    {key:'tratamiento',label:'Tratamiento',format:v=>String(v??'—')},
    {key:'cantidadAfectada',label:'Cantidad afectada',format:(v,row)=>v==null?'—':`${v}${row.afectadosAproximado?' (aprox.)':''}`},
    {key:'observacion',label:'Descripción'},
    {key:'respuestas',label:'Respuestas'},
    {key:'usuarioNombre',label:'Registrado por',format:(v,row)=>String(v||'No identificado')},
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
    {key:'usuarioNombre',label:'Técnico',format:v=>String(v||'No identificado')},
  ];
  readonly activityColumns:readonly DataTableColumn<GpActividadResponse>[]=[
    {key:'nombre',label:'Actividad'}, {key:'rubro',label:'Rubro'}, {key:'superficieExactaM2',label:'Superficie (m²)',align:'right'},
    {key:'estadoProceso',label:'Estado'}, {key:'acciones',label:'Acciones',align:'right'}
  ];
  readonly actuacionPermitida=signal(false);
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
  private readonly fotosGuardadas = new Map<number,Blob>();
  readonly evidenciaEnVista=signal<{blob:Blob;name:string;mime:string}|null>(null);
  readonly hiloAbierto=signal<number|null>(null);
  readonly descargaEnCurso=signal<number|null>(null);
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
      [r.revisionId,r.nombreAnterior,r.nombreNuevo,r.motivo,r.fechaRegistro,r.usuarioNombre].some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q)));
  });
  readonly comentarios = computed(() => this.eventos().filter(e => e.tipo === 'OBSERVACION'));
  /** Agrupa las respuestas de cualquier profundidad bajo su primera actuación. */
  readonly hilosTecnicos=computed(()=>{
    const eventos=this.eventos();
    const byId=new Map(eventos.map(e=>[e.eventoId,e]));
    const principales:GpEventoResponse[]=[];
    const respuestas=new Map<number,GpEventoResponse[]>();
    for(const evento of eventos){
      if(evento.tipo!=='RESPUESTA'||!evento.respuestaAId){principales.push(evento);continue;}
      const vistos=new Set<number>([evento.eventoId]);
      let actual=evento;
      while(actual.tipo==='RESPUESTA'&&actual.respuestaAId){
        const padre=byId.get(actual.respuestaAId);
        if(!padre||vistos.has(padre.eventoId))break;
        vistos.add(padre.eventoId);
        actual=padre;
      }
      if(actual.eventoId===evento.eventoId){
        principales.push(evento); // Respuesta huérfana: permanece accesible.
        continue;
      }
      const grupo=respuestas.get(actual.eventoId)??[];
      grupo.push(evento);
      respuestas.set(actual.eventoId,grupo);
    }
    for(const grupo of respuestas.values()){
      grupo.sort((a,b)=>a.fechaRegistro.localeCompare(b.fechaRegistro)||a.eventoId-b.eventoId);
    }
    return {principales,respuestas};
  });
  readonly filteredHistory=computed(()=>{
    const q=this.historySearch().toLocaleLowerCase('es-PE');
    return this.hilosTecnicos().principales.filter(e=>{
      const coincide=(registro:GpEventoResponse)=>
        [registro.eventoId,registro.tipo,registro.problema,registro.tratamiento,registro.observacion,registro.fechaHecho,registro.usuarioNombre]
          .some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q));
      return !q || coincide(e) || (this.hilosTecnicos().respuestas.get(e.eventoId)??[]).some(coincide);
    });
  });
  readonly filteredCensuses=computed(()=>{
    const q=this.censusSearch().toLocaleLowerCase('es-PE');return this.censos().filter(c=>!q||
      [c.censoId,c.fecha,c.observacion,c.usuarioNombre].some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q)));
  });

  readonly censusColumns:readonly DataTableColumn<GpCensoResponse>[]=[
    {key:'censoId',label:'Versión',format:v=>`#${v}`},
    {key:'fechaRegistro',label:'Registro',format:v=>v?this.formatDateTime(String(v)):'—'},
    {key:'fecha',label:'Fecha de medición',format:v=>v?this.formatDate(String(v)):'—'},
    {key:'cantidadAproximada',label:'Animales aprox.',align:'right',format:v=>v==null?'—':String(v)},
    {key:'cantidadExacta',label:'Animales',align:'right',format:v=>v==null?'—':String(v)},
    {key:'superficieExactaM2',label:'Superficie (m²)',align:'right',format:v=>v==null?'—':String(v)},
    {key:'variacion',label:'Variación',value:v=>this.variacionCenso(v)},
    {key:'distribucion',label:'Razas / variedades',value:v=>this.distribucionCenso(v)},
    {key:'observacion',label:'Motivo / observación',format:v=>String(v||'—')},
    {key:'usuarioNombre',label:'Técnico',format:v=>String(v||'No identificado')},
  ];
  readonly cropCensusColumns=this.censusColumns.filter(column=>column.key!=='cantidadExacta' && column.key!=='cantidadAproximada');
  readonly animalCensusColumns=this.censusColumns;
  readonly selected = computed(() => this.actividades().find(a => a.actividadId === this.selectedId()) ?? null);
  readonly resumen=signal<GpResumenResponse|null>(null);
  readonly resumenLoading=signal(false);
  readonly resumenError=signal<string|null>(null);
  readonly resumenPeriodo=signal<GpResumenPeriodo>('12M');
  readonly resumenTipo=signal<GpResumenTipoEvento>('TODOS');
  readonly resumenIndicadores=computed(()=>{
    const a=this.selected(),r=this.resumen();
    if(!a)return [];
    const principal=a.rubro==='CRIANZA'?a.cantidadExacta??a.cantidadAproximada:a.superficieExactaM2??a.superficieAproximadaM2;
    const format=(v:number|null|undefined)=>v==null?'—':Number(v).toLocaleString('es-PE',{maximumFractionDigits:2});
    return [
      {label:a.rubro==='CRIANZA'?(a.cantidadExacta==null?'Animales aprox.':'Animales actuales'):(a.superficieExactaM2==null?'Superficie aprox.':'Superficie actual'),
       value:principal==null?'—':format(principal)+(a.rubro==='CRIANZA'?'':' m²')},
      {label:'Mediciones del período',value:r?format(r.mediciones):'—'},
      {label:'Registros técnicos',value:r?format(r.seguimientos):'—'},
      {label:'Incidencias abiertas',value:r?format(r.incidenciasAbiertas):'—'},
    ];
  });
  readonly graficoEvolucion=computed<ChartCardData>(()=>{
    const a=this.selected(),r=this.resumen();
    const puntos=r?.evolucion??[];
    const tipo=a?.rubro==='CRIANZA'?'Animales':'Superficie (m²)';
    const base=this.chartPresets.area([{name:tipo,data:puntos.map(p=>p.valor)}],puntos.map(p=>this.formatDate(p.fecha)));
    return {
      title:a?.rubro==='CRIANZA'?'Evolución del censo':'Evolución de la superficie',
      subtitle:'Mediciones registradas en el período',icon:this.censusIcon,
      options:{...base,chart:{...base.chart,type:'area',height:280,toolbar:{show:false}},
        dataLabels:{enabled:false},stroke:{curve:'smooth',width:3}},
      loading:this.resumenLoading(),empty:!puntos.length,
      emptyMessage:'No hay mediciones para este período.'
    };
  });
  readonly graficoRegistros=computed<ChartCardData>(()=>{
    const rows=this.resumen()?.tiposSeguimiento??[];
    const nombres:Record<string,string>={OBSERVACION:'Observaciones',EVALUACION:'Evaluaciones',
      INCIDENCIA:'Incidencias',TRATAMIENTO:'Tratamientos',RESPUESTA:'Respuestas'};
    const base=this.chartPresets.bar([{name:'Registros',data:rows.map(r=>r.total)}],
      rows.map(r=>nombres[r.tipo]??r.tipo));
    return {
      title:'Actividad técnica por tipo',subtitle:'Registros del período seleccionado',icon:this.eventsIcon,
      options:{...base,chart:{...base.chart,type:'bar',height:280,toolbar:{show:false}},
        dataLabels:{enabled:true,style:{fontSize:'11px',fontWeight:600}}},
      loading:this.resumenLoading(),empty:!rows.length,
      emptyMessage:'No hay registros técnicos para estos filtros.'
    };
  });

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

  canComment(): boolean { return this.actuacionPermitida() && this.permissions.has('PREDIOS_EDITAR'); }
  canCreateEvent(): boolean {
    return this.actuacionPermitida() && ['PREDIOS_EDITAR', 'SANIDAD_CREAR', 'EVALUACIONES_CREAR'].some(code => this.permissions.has(code));
  }
  ngOnInit(): void {
    if (!Number.isInteger(this.predioId) || this.predioId < 1 ||
        !Number.isInteger(this.parcelaId) || this.parcelaId < 1 || !Number.isInteger(this.actividadId) || this.actividadId < 1) {
      this.loading.set(false); this.error.set('Parcela no válida.'); return;
    }
    this.refresh();
  }
  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe(); this.detailsSubscription?.unsubscribe(); this.resumenSubscription?.unsubscribe(); this.subscriptions.unsubscribe();
    Object.values(this.fotos()).forEach(url=>URL.revokeObjectURL(url));
    this.fotosGuardadas.clear();
    this.evidenciaEnVista.set(null);
  }
  /** Las evidencias se obtienen con autorización y se muestran en el visor reusable de shared. */
  abrirEvidencia(id:number):void {
    const cached=this.fotosGuardadas.get(id);
    if(cached){this.mostrarEvidencia(id,cached);return;}
    if(this.fotoSolicitudes.has(id))return;
    const uot=this.uot.selectedId();if(!uot)return;
    this.fotoSolicitudes.add(id);
    this.subscriptions.add(this.gp.verFoto(uot,id).pipe(finalize(()=>this.fotoSolicitudes.delete(id))).subscribe({
      next:blob=>{
        this.fotosGuardadas.set(id,blob);
        this.fotos.update(x=>({...x,[id]:URL.createObjectURL(blob)}));
        this.mostrarEvidencia(id,blob);
      },
      error:()=>this.toast.error('No se pudo abrir la evidencia.')
    }));
  }
  private mostrarEvidencia(id:number,blob:Blob):void {
    const mime=blob.type||'image/jpeg';
    const extension=mime.includes('png')?'png':mime.includes('webp')?'webp':mime.includes('gif')?'gif':'jpg';
    this.evidenciaEnVista.set({blob,mime,name:`Evidencia-${id}.${extension}`});
  }
  cerrarEvidencia():void {this.evidenciaEnVista.set(null);}
  respuestasDe(eventoId:number):GpEventoResponse[]{
    return this.hilosTecnicos().respuestas.get(eventoId)??[];
  }
  abrirHilo(eventoId:number):void {
    this.hiloAbierto.set(eventoId);
    this.hiloModal.open();
  }
  cerrarHilo():void {this.hiloAbierto.set(null);}
  eventoPorId(id:number):GpEventoResponse|undefined {return this.eventos().find(e=>e.eventoId===id);}
  responderA(eventoId:number):void {
    const actual=this.selected();
    if(!actual||actual.estadoProceso==='FINALIZADA'||!this.canCreateEvent())return;
    this.hiloModal.close(true);
    this.modal.showReplyTo(this.parcelaId,actual,this.catalogos(),this.eventos(),eventoId,()=>this.refresh());
  }
  descargarEvidencia(id:number):void {
    if(this.descargaEnCurso()!==null)return;
    const guardada=this.fotosGuardadas.get(id);
    if(guardada){this.descargarBlob(id,guardada);return;}
    const uot=this.uot.selectedId();if(!uot)return;
    this.descargaEnCurso.set(id);
    this.subscriptions.add(this.gp.verFoto(uot,id).pipe(finalize(()=>this.descargaEnCurso.set(null))).subscribe({
      next:blob=>{this.fotosGuardadas.set(id,blob);this.descargarBlob(id,blob);},
      error:()=>this.toast.error('No se pudo descargar la evidencia.')
    }));
  }
  private descargarBlob(id:number,blob:Blob):void {
    const mime=blob.type;
    const ext=mime.includes('png')?'png':mime.includes('webp')?'webp':'jpg';
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=`Evidencia-${id}.${ext}`;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  actuacionTitulo(e:GpEventoResponse):string {
    const base=e.problema||e.tratamiento||e.observacion||'Sin descripción';
    return `#${e.eventoId} · ${e.tipo} · ${base.slice(0,70)}`;
  }

  refresh(): void {
    const uot = this.uot.selectedId();
    if (!uot) { this.loading.set(false); this.error.set('Selecciona una UOT para consultar este expediente.'); return; }
    this.refreshSubscription?.unsubscribe();
    this.actuacionPermitida.set(false);
    this.loading.set(true); this.error.set(null);
    this.refreshSubscription = forkJoin({
      autorizacion: this.gp.puedeActuar(uot, this.predioId),
      parcelas: this.gp.parcelas(uot, this.predioId),
      actividades: this.gp.actividades(uot, this.parcelaId),
      catalogos: this.gp.catalogos(uot),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.actuacionPermitida.set(result.autorizacion);
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
  changeResumenPeriodo(value:string):void{
    if(value!=='90D'&&value!=='12M'&&value!=='TODO')return;
    this.resumenPeriodo.set(value);this.loadResumen();
  }
  changeResumenTipo(value:string):void{
    if(!['TODOS','OBSERVACION','EVALUACION','INCIDENCIA','TRATAMIENTO','RESPUESTA'].includes(value))return;
    this.resumenTipo.set(value as GpResumenTipoEvento);this.loadResumen();
  }
  loadResumen():void{
    this.resumenSubscription?.unsubscribe();
    const uot=this.uot.selectedId(),id=this.selectedId();
    if(!uot||!id){this.resumen.set(null);this.resumenLoading.set(false);return;}
    this.resumenLoading.set(true);this.resumenError.set(null);
    this.resumenSubscription=this.gp.resumen(uot,id,this.resumenPeriodo(),this.resumenTipo())
      .pipe(finalize(()=>this.resumenLoading.set(false)))
      .subscribe({next:r=>this.resumen.set(r),error:e=>{this.resumen.set(null);this.resumenError.set(mapOpenApiError(e).message);}});
  }
  formatDateTime(value:string):string {const utc=/Z$|[+-]\d{2}:?\d{2}$/.test(value)?value:value+'Z';return new Date(utc).toLocaleString('es-PE', {dateStyle:'short', timeStyle:'short'});}

  loadActivity(): void {
    this.detailsSubscription?.unsubscribe();
    const uot = this.uot.selectedId(), id = this.selectedId();
    if (!uot || !id) { this.censos.set([]); this.eventos.set([]); this.revisiones.set([]); this.detailsLoading.set(false); return; }
    this.detailsLoading.set(true); this.detailsError.set(null);
    this.loadResumen();
    this.detailsSubscription = forkJoin({ censos: this.gp.censos(uot, id), eventos: this.gp.eventos(uot, id), revisiones: this.gp.revisiones(uot, id) })
      .pipe(finalize(() => this.detailsLoading.set(false)))
      .subscribe({
        next: result => {
          this.revisiones.set(result.revisiones);
          this.censos.set([...result.censos].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro) || b.censoId - a.censoId));
          this.eventos.set([...result.eventos].sort((a, b) => b.fechaHecho.localeCompare(a.fechaHecho) || b.eventoId - a.eventoId));
          this.cerrarHilo();
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
    const ocupado=this.actividades().filter(a=>a.estado&&a.estadoProceso==='ACTIVA'&&a.actividadId!==actividadId)
      .reduce((sum,a)=>sum+Number(a.superficieExactaM2??a.superficieAproximadaM2??0),0);
    return Math.max(0,Math.round((total-ocupado)*100)/100);
  }
  private censoOrdenado():GpCensoResponse[]{
    return [...this.censos()].sort((a,b)=>
      (a.fechaRegistro||'').localeCompare(b.fechaRegistro||'') || a.censoId-b.censoId);
  }
  numeroCenso(actual:GpCensoResponse):number{
    const index=this.censoOrdenado().findIndex(v=>v.censoId===actual.censoId);
    return index<0?1:index+1;
  }
  cambioCenso(actual:GpCensoResponse):{valor:string;detalle:string;tono:'positivo'|'negativo'|'neutro'|'inicial'}{
    const ordenados=this.censoOrdenado();
    const index=ordenados.findIndex(v=>v.censoId===actual.censoId);
    if(index<=0)return {valor:'Registro inicial',detalle:'Punto de partida de la actividad',tono:'inicial'};
    const anterior=ordenados[index-1];
    const crianza=this.selected()?.rubro==='CRIANZA';
    const actualMedida=crianza?(actual.cantidadExacta??actual.cantidadAproximada):(actual.superficieExactaM2??actual.superficieAproximadaM2);
    const anteriorMedida=crianza?(anterior.cantidadExacta??anterior.cantidadAproximada):(anterior.superficieExactaM2??anterior.superficieAproximadaM2);
    if(actualMedida==null||anteriorMedida==null)return {valor:'Sin comparación',detalle:'Faltan mediciones comparables',tono:'neutro'};
    const diferencia=crianza?actualMedida-anteriorMedida:Math.round((actualMedida-anteriorMedida)*100)/100;
    const unidad=crianza?'animales':'m²';
    if(diferencia===0)return {valor:`0 ${unidad}`,detalle:'Sin cambios respecto al registro anterior',tono:'neutro'};
    return {valor:`${diferencia>0?'+':''}${diferencia} ${unidad}`,
      detalle:diferencia>0?'Aumento respecto al registro anterior':'Reducción respecto al registro anterior',
      tono:diferencia>0?'positivo':'negativo'};
  }
  variacionCenso(actual:GpCensoResponse):string{
    return this.cambioCenso(actual).valor;
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
  createActivity(): void { this.modal.show('actividad', this.parcelaId, null, this.catalogos(), [], () => this.refresh(),null,this.disponibleSuperficie(),this.parcelaAreaM2()); }
  editActivity(): void { const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA') this.modal.show('editar', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh(), null, this.disponibleSuperficie(a.actividadId), this.parcelaAreaM2()); }
  newCensus(): void { if(!this.actuacionPermitida())return; const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA') this.modal.show('censo', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh(), this.censos()[0]??null,this.disponibleSuperficie(a.actividadId),this.parcelaAreaM2()); }
  newEvent(): void { if(!this.actuacionPermitida())return; const a = this.selected(); if (a && a.estadoProceso!=='FINALIZADA') this.modal.show('evento', this.parcelaId, a, this.catalogos(), this.eventos(), () => this.refresh()); }
  newComment(): void { if (this.canComment()) this.newEvent(); }
  async changeLifecycle(accion:'finalizar'|'eliminar'):Promise<void>{ if(!this.actuacionPermitida())return;
    const a=this.selected(),uot=this.uot.selectedId();
    if(!a||!uot||this.lifecycleBusy())return;
    if(accion==='finalizar' && a.estadoProceso==='FINALIZADA')return;
    if(accion==='finalizar' && a.rubro==='CRIANZA' && (a.cantidadExacta??a.cantidadAproximada??0)>0){
      this.lifecycleError.set('Actualiza el censo a cero animales antes de cerrar la crianza.');
      return;
    }
    this.lifecycleBusy.set(true);
    this.lifecycleError.set(null);
    try {
      const crop=a.rubro==='CULTIVO';
      let abiertas=0;
      if(accion==='finalizar' && crop){
        const incidencias=await firstValueFrom(this.gp.incidencias(uot,a.actividadId));
        abiertas=incidencias.filter(i=>i.estado==='ABIERTA').length;
      }
      const advertencia=abiertas>0
        ? `Hay ${abiertas} ${abiertas===1?'incidencia abierta':'incidencias abiertas'}. Al finalizar el ciclo, se cerrarán automáticamente junto con sus tratamientos. Se conservará el historial.`
        : 'Se conservará el historial de la actividad.';
      const confirmation=await this.confirmDialog.show({
        title:accion==='eliminar'?'Eliminar actividad':crop?'Finalizar ciclo agrícola':'Cerrar crianza',
        message:accion==='eliminar'?'La actividad dejará de mostrarse en los listados habituales.':
          crop?`${advertencia} Se liberará la superficie para una nueva siembra.`:
          'El cierre conserva los censos, tratamientos y seguimientos.',
        tone:accion==='finalizar'?'warning':'danger',
        confirmLabel:accion==='eliminar'?'Eliminar':crop?'Finalizar ciclo':'Cerrar crianza',
        requiresReason:true,minimumReasonLength:3,maximumReasonLength:1000,
        reasonLabel:'Motivo',reasonPlaceholder:accion==='eliminar'?'Motivo de eliminación':crop?'Cosecha, renovación o fin del ciclo':'Venta, traslado u otro motivo'
      });
      if(!confirmation.confirmed||!confirmation.reason)return;
      if(accion==='finalizar'){
        await firstValueFrom(this.gp.finalizarActividad(uot,a.actividadId,confirmation.reason));
        this.toast.success(crop?'Ciclo finalizado':'Crianza cerrada');
        this.refresh();
      }else{
        await firstValueFrom(this.gp.eliminarActividad(uot,a.actividadId,confirmation.reason));
        this.toast.success('Actividad eliminada');
        await this.router.navigate(['/gestion-tecnica/gestion-productiva/predios',this.predioId,'parcelas',this.parcelaId]);
      }
    }catch(e){this.lifecycleError.set(mapOpenApiError(e).message);}
    finally{this.lifecycleBusy.set(false);}
  }
  varietyName(id:number):string {return this.catalogos().find(x=>x.tipo==='VARIEDAD' && x.id===id)?.nombre??`#${id}`;}

}
