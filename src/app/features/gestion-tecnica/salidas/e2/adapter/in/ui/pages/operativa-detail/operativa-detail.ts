import { ChangeDetectionStrategy, Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Observable, finalize } from 'rxjs';
import { faRoute, faArrowLeft, faPlus, faTrash, faMagnifyingGlass, faXmark, faRotate, faClipboardList, faMapLocationDot, faScrewdriverWrench, faUserGroup, faFileLines, faCamera, faClockRotateLeft, faCheck, faPen } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { PermissionDirective } from '../../../../../../../../../core/access/permission.directive';
import { RecordCardComponent } from '../../../../../../../../../shared/data-display/record-card/record-card';
import { PaginatorComponent } from '../../../../../../../../../shared/data-display/paginator/paginator';
import { EvidencePanelComponent } from '../../../../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { CatalogosE2, CorreccionE2, DetalleE2, DestinoEntradaE2, RecursoEntradaE2, EstadoBienE2, ResultadoE2, RecursoOpcionE2 } from '../../../../../domain/salida-operativa.model';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';
import { SalidaDocumentoApiService, DocumentoSalida } from '../../../../../../../../../shared/files/salida-documento-api.service';
import { switchMap } from 'rxjs';
import { PrediosSalidaApi } from '../../../../out/http/predios-salida.api';

function localDateInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime()-date.getTimezoneOffset()*60000)
    .toISOString().slice(0,16);
}

@Component({selector:'app-operativa-detail',standalone:true,
  imports:[DatePipe,FormsModule,RouterLink,FaIconComponent,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent,
    ActionConfirmDialogComponent,PermissionDirective,EvidencePanelComponent,RecordCardComponent,PaginatorComponent],
  providers:[...provideSalidasE2()],
  templateUrl:'./operativa-detail.html',styleUrl:'./operativa-detail.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativaDetailPage implements OnInit {
  private readonly api=inject(SalidasE2UseCase);
  readonly archivos=inject(SalidaDocumentoApiService);
  private readonly prediosApi=inject(PrediosSalidaApi);
  private readonly uot=inject(UotContextStore);
  private readonly route=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private readonly toast=inject(ToastService);
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  @ViewChild('operationDialog') private operationDialog!:ElementRef<HTMLDialogElement>;
  readonly icon=faRoute;readonly backIcon=faArrowLeft;readonly addIcon=faPlus;readonly removeIcon=faTrash;readonly searchIcon=faMagnifyingGlass;readonly refreshIcon=faRotate;readonly closeIcon=faXmark;readonly checkIcon=faCheck;readonly editIcon=faPen;
  readonly id=Number(this.route.snapshot.paramMap.get('id'));
  readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||undefined;
  readonly uotId=this.uot.selectedId;
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly activeTab=signal<'resumen'|'destinos'|'recursos'|'participantes'|'seguimiento'|'historial'|'evidencias'|'documentos'>('resumen');
  readonly tabs=[{id:'resumen',name:'Resumen',icon:faClipboardList},{id:'destinos',name:'Destinos y actividades',icon:faMapLocationDot},
    {id:'recursos',name:'Recursos',icon:faScrewdriverWrench},{id:'participantes',name:'Participantes',icon:faUserGroup},
    {id:'seguimiento',name:'Seguimiento',icon:faRoute},{id:'documentos',name:'Documentos',icon:faFileLines},
    {id:'evidencias',name:'Evidencias',icon:faCamera},{id:'historial',name:'Historial',icon:faClockRotateLeft}] as const;
  readonly operation=signal<'cancelar'|'decision'|'destino'|'vincular'|'visita'|'finalizar'|'retorno'|'inspeccion'|'fecha'|null>(null);
  buscarRecurso='';filtroRecurso='';buscarParticipante='';filtroParticipante='';
  buscarVisita='';
  readonly pendingSelection=signal(false);
  vistaRecursos:'tabla'|'tarjetas'='tabla';vistaParticipantes:'tabla'|'tarjetas'='tabla';vistaDocumentos:'tabla'|'tarjetas'='tabla';
  paginaRecursos=1;paginaParticipantes=1;readonly pageSize=10;soloSeleccionados=false;
  readonly docsSearch=signal('');

  readonly detail=signal<DetalleE2|null>(null);
  readonly documentos=signal<DocumentoSalida[]>([]);
  readonly documentosBusy=signal(false);
  readonly observacionEntrega=signal<Record<number,string>>({});
  readonly catalogos=signal<CatalogosE2>({motivos:[],tiposVisita:[],bienes:[],participantes:[]});
  decision:'APROBADA'|'OBSERVADA'|'RECHAZADA'='APROBADA';motivoDecision='';
  nombreCorreccion='';descripcionCorreccion='';motivoCancelar='';
  motivoCorreccion=0;inicioCorreccion='';finCorreccion='';
  destinoEditIndex:number|null=null;predioModal=0;actividadModal='';
  recursoClave='';cantidadNuevo=1;tipoRecurso='TODOS';participanteSeleccionado=0;funcionParticipante='';
  readonly destinosCorreccion=signal<DestinoEntradaE2[]>([]);
  readonly bienesCorreccion=signal<RecursoEntradaE2[]>([]);
  readonly participantesCorreccion=signal<{empleadoId:number;funcion?:string}[]>([]);
  readonly cantidadesDevueltas=signal<Record<number,number>>({});
  fechaFinRegularizada='';
  buscarPredio='';destinoVincular=0;predioVincular=0;
  readonly candidatos=signal<{predioId:number;nombre:string}[]>([]);
  destinoId=0;tipoVisitaId=0;objetivo='';
  visitaFinalizar=0;resumen='';
  observacionGeneral='';observacionInspeccion='';
  readonly observacionesBien=signal<Record<number,string>>({});
  readonly resultadoDeclarado=signal<Record<number,EstadoBienE2['resultado']>>({});
  readonly resultadoInspeccion=signal<Record<number,EstadoBienE2['resultado']>>({});
  ngOnInit():void {this.load();this.loadCatalogs();this.buscarPredios();}
  load():void {
    const uot=this.uotId();if(!uot){this.error.set('Seleccione una UOT.');this.loading.set(false);return;}
    this.loading.set(true);this.error.set(null);
    this.api.ver(uot,this.id,this.convenioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:d=>{this.detail.set(d);this.nombreCorreccion=d.nombre;this.descripcionCorreccion=d.descripcion??'';
        this.motivoCorreccion=d.motivoSalidaId;
        this.inicioCorreccion=localDateInput(d.fechaInicioPrevista);
        this.finCorreccion=localDateInput(d.fechaFinPrevista);
        this.fechaFinRegularizada=localDateInput(d.fechaFinPrevista ?? d.fechaFinReal);
        this.destinosCorreccion.set(d.destinos.map(x=>({predioId:x.predioId,actividadPrevista:x.actividadPrevista})));
        this.bienesCorreccion.set(d.bienes.map(x=>({bienId:x.bienId,suministroId:x.suministroId,cantidad:x.cantidadSolicitada})));
        this.participantesCorreccion.set(d.participantes.filter(x=>!x.responsable).map(x=>({empleadoId:x.empleadoId,funcion:x.funcion})));
        this.cantidadesDevueltas.set(Object.fromEntries(d.bienes.map(x=>[x.solicitudRecursoId,x.cantidadDevueltaValidada ?? x.cantidadDevueltaDeclarada ?? x.cantidadSolicitada])));
        this.observacionesBien.set(Object.fromEntries(d.bienes.map(x=>[x.solicitudRecursoId,x.observacion??''])));
        this.loadDocumentos();
        this.resultadoDeclarado.set(Object.fromEntries(d.bienes.map(b=>[b.solicitudRecursoId,
         (b.resultadoDeclarado??'CONFORME') as EstadoBienE2['resultado']])));
        this.resultadoInspeccion.set(Object.fromEntries(d.bienes.map(b=>[b.solicitudRecursoId,
         (b.resultadoValidado??b.resultadoDeclarado??'CONFORME') as EstadoBienE2['resultado']]))) ;
      },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  loadDocumentos():void {
    const u=this.uotId();if(!u)return;
    this.archivos.listar(u,this.id).subscribe({next:r=>this.documentos.set(r),
      error:e=>this.toast.error('No se pudieron consultar los documentos',mapOpenApiError(e).message)});
  }
  generarWord():void {
    const u=this.uotId();if(!u||this.documentosBusy())return;
    this.documentosBusy.set(true);
    this.archivos.generar(u,this.id).pipe(finalize(()=>this.documentosBusy.set(false)))
      .subscribe({next:()=>{this.toast.success('Solicitud Word disponible');this.loadDocumentos();},
        error:e=>this.toast.error('No se pudo generar Word',mapOpenApiError(e).message)});
  }
  adjuntarDocumento(input:HTMLInputElement,tipo:'SOLICITUD_FIRMADA'|'EVIDENCIA_SALIDA'):void {
    const file=input.files?.item(0);input.value='';const u=this.uotId();
    if(!file||!u||this.documentosBusy())return;
    if(file.size>25*1024*1024||file.size<1){this.toast.error('Archivo permitido hasta 25 MB');return;}
    this.documentosBusy.set(true);
    this.archivos.adjuntar(u,this.id,file,tipo).pipe(finalize(()=>this.documentosBusy.set(false)))
      .subscribe({next:()=>{this.toast.success('Documento registrado');this.loadDocumentos();},
        error:e=>this.toast.error('No se pudo subir documento',mapOpenApiError(e).message)});
  }
  observacionDeEntrega(id:number,text:string):void {
    this.observacionEntrega.update(items=>({...items,[id]:text}));
  }
  loadCatalogs():void {const uot=this.uotId();if(uot)this.api.catalogos(uot,this.convenioId).subscribe({
    next:c=>this.catalogos.set(c),error:e=>this.toast.error('No se pudieron cargar los catálogos',mapOpenApiError(e).message)});}
  run(action:Observable<ResultadoE2>,message:string):void {
    if(this.saving())return;
    this.saving.set(true);
    action.pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success(message);this.pendingSelection.set(false);this.closeOperation(true);this.load();},
      error:e=>this.toast.error('No se pudo completar la acción',mapOpenApiError(e).message),
    });
  }
  motivoNombre(id:number):string {return this.catalogos().motivos.find(x=>x.id===id)?.nombre??('Motivo #'+id);}
  editable():boolean {return this.detail()?.estado==='BORRADOR';}
  puedeVerEvidencias():boolean {return ['APROBADA','EN_EJECUCION','EN_RETORNO','CERRADA'].includes(this.detail()?.estado??'');}
  puedeVerSeguimiento():boolean {return this.puedeVerEvidencias();}
  seccionCantidad(tab:typeof this.tabs[number]['id']):number|null {
    const d=this.detail();if(!d)return null;
    switch(tab){
      case 'destinos':return this.editable()?this.destinosCorreccion().length:d.destinos.length;
      case 'recursos':return this.editable()?this.bienesCorreccion().length:d.bienes.length;
      case 'participantes':return this.editable()?this.participantesCorreccion().length+1:d.participantes.length;
      case 'documentos':return this.documentos().length;
      case 'historial':return d.historial.length;
      default:return null;
    }
  }
  abrirDestino(index:number|null=null):void {
    if(!this.editable()||this.saving())return;
    const original=index===null?null:this.destinosCorreccion()[index];
    if(index!==null&&!original)return;
    this.destinoEditIndex=index;
    this.predioModal=original?.predioId??0;
    this.actividadModal=original?.actividadPrevista??'';
    this.buscarPredio='';this.buscarPredios();
    this.openOperation('destino');
  }
  guardarDestino():void {
    if(!this.editable()||this.saving())return;
    const predioId=Number(this.predioModal),actividadPrevista=this.actividadModal.trim();
    if(!predioId||!actividadPrevista){this.toast.error('Seleccione un predio e indique la actividad prevista.');return;}
    const actuales=this.destinosCorreccion();
    if(actuales.some((x,i)=>x.predioId===predioId&&i!==this.destinoEditIndex)){
      this.toast.error('Este predio ya está registrado.');return;
    }
    const registro={predioId,actividadPrevista};
    this.destinosCorreccion.set(this.destinoEditIndex===null?[...actuales,registro]:
      actuales.map((x,i)=>i===this.destinoEditIndex?registro:x));
    this.pendingSelection.set(true);
    this.corregir(false);
  }
  async quitarDestino(index:number):Promise<void> {
    if(!this.editable()||this.saving()||!this.destinosCorreccion()[index])return;
    const answer=await this.confirm.show({title:'Quitar destino',message:'El predio se retirará de este borrador.',
      confirmLabel:'Quitar destino',tone:'warning'});
    if(!answer.confirmed||this.saving()||!this.editable())return;
    this.removeCorrectionDestination(index);
    this.corregir(false);
  }
  cambiarTab(tab:typeof this.tabs[number]['id']):void {
    if(tab==='evidencias'&&!this.puedeVerEvidencias())return;
    if(tab==='seguimiento'&&!this.puedeVerSeguimiento())return;
    this.activeTab.set(tab);
  }
  recursosPaginados():RecursoOpcionE2[]{return this.searchedResources().slice((this.paginaRecursos-1)*this.pageSize,this.paginaRecursos*this.pageSize);}
  participantesPaginados():CatalogosE2['participantes']{return this.searchedParticipants().slice((this.paginaParticipantes-1)*this.pageSize,this.paginaParticipantes*this.pageSize);}
  paginasRecursos():number {return Math.max(1,Math.ceil(this.searchedResources().length/this.pageSize));}
  paginasParticipantes():number {return Math.max(1,Math.ceil(this.searchedParticipants().length/this.pageSize));}
  buscarRecursos():void {this.filtroRecurso=this.buscarRecurso.trim();this.paginaRecursos=1;}
  buscarParticipantes():void {this.filtroParticipante=this.buscarParticipante.trim();this.paginaParticipantes=1;}
  documentosFiltrados():DocumentoSalida[]{const q=this.docsSearch().trim().toLocaleLowerCase();return q?this.documentos().filter(d=>d.nombreOriginal.toLocaleLowerCase().includes(q)):this.documentos();}
  puedeEnviar():boolean {
    return this.editable()&&this.destinosCorreccion().length>0&&this.destinosCorreccion().every(x=>!!x.predioId&&!!x.actividadPrevista?.trim());
  }
  openOperation(kind:NonNullable<ReturnType<typeof this.operation>>):void {
    if(this.saving())return;
    this.operation.set(kind);this.operationDialog.nativeElement.showModal();
  }
  closeOperation(force=false):void {
    if(this.saving()&&!force)return;
    if(this.operationDialog?.nativeElement.open)this.operationDialog.nativeElement.close();
    this.operation.set(null);
  }
  selectedResource(x:RecursoOpcionE2):boolean {
    return this.bienesCorreccion().some(b=>this.resourceKey(b)===`${x.tipo==='CONSUMIBLE'?'S':'B'}:${x.id}`);
  }
  selectedQty(x:RecursoOpcionE2):number {
    const found=this.bienesCorreccion().find(b=>this.resourceKey(b)===`${x.tipo==='CONSUMIBLE'?'S':'B'}:${x.id}`);
    return found?.cantidad??1;
  }
  toggleResource(x:RecursoOpcionE2,checked:boolean):void {
    if(!this.editable())return;
    if(checked&&x.disponible<=0){this.toast.error('No hay disponibilidad de este recurso.');return;}
    const key=`${x.tipo==='CONSUMIBLE'?'S':'B'}:${x.id}`;
    if(!checked){this.bienesCorreccion.update(a=>a.filter(b=>this.resourceKey(b)!==key));}
    else if(!this.selectedResource(x)){
      const item:RecursoEntradaE2=x.tipo==='CONSUMIBLE'?{suministroId:x.id,cantidad:1}:{bienId:x.id,cantidad:1};
      this.bienesCorreccion.update(a=>[...a,item]);
    }
    this.pendingSelection.set(true);
  }
  changeResourceQty(x:RecursoOpcionE2,value:number):void {
    const key=`${x.tipo==='CONSUMIBLE'?'S':'B'}:${x.id}`;
    this.bienesCorreccion.update(a=>a.map(r=>this.resourceKey(r)===key?{...r,cantidad:Number(value)}:r));
    this.pendingSelection.set(true);
  }
  searchedResources():RecursoOpcionE2[]{
    const q=this.filtroRecurso.toLocaleLowerCase();
    return this.catalogos().bienes.filter(x=>(!this.soloSeleccionados||this.selectedResource(x))&&(this.tipoRecurso==='TODOS'||x.tipo===this.tipoRecurso
     ||this.tipoRecurso==='BIEN'&&x.tipo!=='VEHICULO'&&x.tipo!=='CONSUMIBLE')
     &&(!q||(x.nombre+' '+(x.codigo??'')).toLocaleLowerCase().includes(q)));
  }
  selectedParticipant(id:number):boolean{return this.participantesCorreccion().some(p=>p.empleadoId===id);}
  toggleParticipant(id:number,checked:boolean):void {
    if(!this.editable())return;
    const owner=this.detail()?.participantes.find(x=>x.responsable)?.empleadoId;
    if(id===owner)return;
    if(checked&&!this.selectedParticipant(id))this.participantesCorreccion.update(a=>[...a,{empleadoId:id,funcion:'Técnico'}]);
    if(!checked)this.participantesCorreccion.update(a=>a.filter(p=>p.empleadoId!==id));
    this.pendingSelection.set(true);
  }
  searchedParticipants():CatalogosE2['participantes']{
    const q=this.filtroParticipante.toLocaleLowerCase();
    return this.catalogos().participantes.filter(p=>!q||(p.nombre+' '+(p.codigo??'')).toLocaleLowerCase().includes(q));
  }
  selectedCount():number{return this.bienesCorreccion().length;}
  async eliminarBorrador():Promise<void> {
    const d=this.detail(),u=this.uotId();if(!d||!u||d.estado!=='BORRADOR'||this.saving())return;
    const answer=await this.confirm.show({title:'Eliminar borrador',
      message:'El borrador dejará de aparecer en el listado. Esta acción no requiere motivo.',
      confirmLabel:'Eliminar borrador',tone:'danger'});
    if(!answer.confirmed||this.saving())return;
    this.saving.set(true);
    // El PA valida propietario, UOT y estado BORRADOR. El marcador NO es un motivo del usuario.
    this.api.cancelar(u,this.id,'BORRADOR_DESCARTADO',this.convenioId).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success('Borrador eliminado');void this.router.navigate(['/gestion-tecnica/salidas/operativas'],
        {queryParams:this.convenioId?{convenioId:this.convenioId}:undefined});},
      error:e=>this.toast.error('No se pudo eliminar el borrador',mapOpenApiError(e).message)
    });
  }
  removeCorrectionDestination(index:number):void {
    this.destinosCorreccion.update(items=>items.filter((_,i)=>i!==index));this.pendingSelection.set(true);
  }
  resourceKey(b:RecursoEntradaE2):string{return b.bienId!=null?`B:${b.bienId}`:`S:${b.suministroId}`;}
  resourceOf(b:RecursoEntradaE2):RecursoOpcionE2|undefined {
    return this.catalogos().bienes.find(x=>this.resourceKey(b)===
      `${x.tipo==='CONSUMIBLE'?'S':'B'}:${x.id}`);
  }
  resourceChoices():RecursoOpcionE2[]{
    return this.catalogos().bienes.filter(x=>this.tipoRecurso==='TODOS'
      ||(this.tipoRecurso==='BIEN'&&x.tipo!=='VEHICULO'&&x.tipo!=='CONSUMIBLE')
      ||x.tipo===this.tipoRecurso);
  }
  addCorrectionBien():void {
    const resource=this.catalogos().bienes.find(x=>`${x.tipo==='CONSUMIBLE'?'S':'B'}:${x.id}`===this.recursoClave);
    if(!resource){this.toast.error('Seleccione un recurso.');return;}
    const qty=resource.tipo==='CONSUMIBLE'?Number(this.cantidadNuevo):1;
    if(!Number.isFinite(qty)||qty<=0||qty>resource.disponible){
      this.toast.error('La cantidad supera la disponibilidad.');return;
    }
    if(this.bienesCorreccion().some(x=>this.resourceKey(x)===this.recursoClave))return;
    const item:RecursoEntradaE2=resource.tipo==='CONSUMIBLE'?{suministroId:resource.id,cantidad:qty}:
      {bienId:resource.id,cantidad:1};
    this.bienesCorreccion.update(x=>[...x,item]);this.recursoClave='';this.cantidadNuevo=1;
  }
  removeCorrectionBien(item:RecursoEntradaE2):void {
    this.bienesCorreccion.update(x=>x.filter(b=>this.resourceKey(b)!==this.resourceKey(item)));
  }
  addParticipant():void {
    if(!this.participanteSeleccionado||this.participantesCorreccion().some(x=>x.empleadoId===this.participanteSeleccionado))return;
    const leader=this.detail()?.participantes.find(x=>x.responsable)?.empleadoId;
    if(this.participanteSeleccionado===leader)return;
    this.participantesCorreccion.update(x=>[...x,{empleadoId:this.participanteSeleccionado,
      funcion:this.funcionParticipante.trim()||undefined}]);
    this.participanteSeleccionado=0;this.funcionParticipante='';
  }
  removeParticipant(id:number):void {this.participantesCorreccion.update(x=>x.filter(v=>v.empleadoId!==id));}
  participantName(id:number):string {
    return this.catalogos().participantes.find(x=>x.id===id)?.nombre
      ??this.detail()?.participantes.find(x=>x.empleadoId===id)?.nombre??`#${id}`;
  }
  corregir(enviar=true):void {
    if(!this.editable())return;
    const u=this.uotId();const d=this.detail();if(!u||!d||this.saving())return;
    if(!this.nombreCorreccion.trim()||!this.inicioCorreccion||!this.finCorreccion||!this.motivoCorreccion){
      this.toast.error('Complete los datos principales.');return;
    }
    if(enviar&&(!this.destinosCorreccion().length||this.destinosCorreccion().some(x=>!x.predioId||!x.actividadPrevista?.trim()))){
      this.toast.error('Complete los destinos y la actividad de cada uno.');return;
    }
    const inicio=new Date(this.inicioCorreccion);const fin=this.finCorreccion?new Date(this.finCorreccion):null;
    if(Number.isNaN(inicio.getTime())||!fin||Number.isNaN(fin.getTime())||fin<=inicio){
      this.toast.error('Revise las fechas previstas.');return;
    }
    const entrada:CorreccionE2={nombre:this.nombreCorreccion.trim(),
      descripcion:this.descripcionCorreccion.trim()||undefined,motivoSalidaId:this.motivoCorreccion,
      fechaInicioPrevista:inicio.toISOString(),fechaFinPrevista:fin?.toISOString(),
      destinos:this.destinosCorreccion(),bienes:this.bienesCorreccion(),
      participantes:this.participantesCorreccion(),enviar};
    if((entrada.bienes??[]).some(b=>!Number.isFinite(b.cantidad)||b.cantidad<=0||
      (b.suministroId&&b.cantidad>(this.catalogos().bienes.find(x=>x.tipo==='CONSUMIBLE'&&x.id===b.suministroId)?.disponible??0)))){
      this.toast.error('Revise las cantidades y la disponibilidad de los recursos.');return;
    }
    this.run(this.api.corregir(u,this.id,entrada,this.convenioId),enviar?'Solicitud enviada para aprobación':'Cambios guardados');
  }
  async decidir():Promise<void> {const u=this.uotId();if(!u||this.saving())return;
    if(this.decision!=='APROBADA'&&!this.motivoDecision.trim()){
      this.toast.error('Ingrese el motivo de la decisión.');return;}
    const answer=await this.confirm.show({title:'Confirmar decisión',
      message:this.decision==='APROBADA'?'Se autorizarán la salida y los recursos solicitados.':
        'Se guardará la decisión y su motivo en el expediente.',confirmLabel:'Confirmar decisión',
      tone:this.decision==='RECHAZADA'?'warning':'primary'});
    if(!answer.confirmed||this.saving())return;
    this.run(this.api.decidir(u,this.id,this.decision,this.motivoDecision.trim()||undefined,this.convenioId),'Decisión registrada');}
  async entregar():Promise<void> {
    const u=this.uotId();const d=this.detail();if(!u||!d||this.saving())return;
    const pending=d.bienes.filter(x=>x.estado==='SOLICITADO');
    const notas=pending.map(x=>({solicitudRecursoId:x.solicitudRecursoId,
       observacion:this.observacionEntrega()[x.solicitudRecursoId]?.trim()??''}));
    if(notas.some(x=>!x.observacion)){
      this.toast.error('Indique la condición de entrega de cada recurso antes del despacho.');return;
    }
    const answer=await this.confirm.show({title:'Confirmar despacho físico',
      message:'Se registrarán las observaciones de entrega y se ocuparán los recursos asignados.',
      confirmLabel:'Confirmar entrega'});
    if(!answer.confirmed||this.saving())return;
    this.run(this.archivos.registrarEstadoEntrega(u,this.id,notas)
      .pipe(switchMap(()=>this.api.entregar(u,this.id,this.convenioId))), 'Entrega registrada');
  }
  iniciar():void {const u=this.uotId();if(u)this.run(this.api.iniciar(u,this.id,this.convenioId),'Salida iniciada');}
  visitar():void {const u=this.uotId();if(!u||!this.destinoId||!this.tipoVisitaId){this.toast.error('Seleccione destino y tipo de visita.');return;}
    this.run(this.api.visitar(u,this.id,this.destinoId,this.tipoVisitaId,this.objetivo.trim()||undefined,this.convenioId),'Visita iniciada');}
  finalizarVisita():void {const u=this.uotId();if(!u||!this.visitaFinalizar||!this.resumen.trim()){
    this.toast.error('Seleccione visita e indique qué se hizo.');return;}
    this.run(this.api.finalizarVisita(u,this.id,this.visitaFinalizar,this.resumen.trim(),this.convenioId),'Visita finalizada');}
  buscarPredios():void {
    const u=this.uotId();if(!u)return;
    this.prediosApi.listar(u,this.buscarPredio).subscribe({
      next:r=>this.candidatos.set(r.map(p=>({predioId:p.predioId,nombre:p.nombre}))),
      error:e=>this.toast.error('No se pudieron consultar predios',mapOpenApiError(e).message),
    });
  }
  predioNombre(id?:number):string {
    return id?this.candidatos().find(p=>p.predioId===id)?.nombre??`Predio #${id}`:'Sin predio';
  }
  vincular():void {const u=this.uotId();if(!u||!this.destinoVincular||!this.predioVincular)return;
    this.run(this.api.vincularDestino(u,this.id,this.destinoVincular,this.predioVincular,this.convenioId),'Destino asociado al predio');}
  async cancelar():Promise<void> {
    const u=this.uotId();
    const motivo=this.motivoCancelar.trim();
    if(this.saving())return;
    if(!u||!motivo){
      this.toast.error('Ingrese un motivo para cancelar.');
      return;
    }
    const confirmation=await this.confirm.show({
      title:'Cancelar solicitud de salida',
      message:'La solicitud quedará cancelada y conservará su historial de decisiones.',
      confirmLabel:'Cancelar solicitud',
      tone:'danger',
    });
    if(!confirmation.confirmed||this.saving())return;
    this.run(this.api.cancelar(u,this.id,motivo,this.convenioId),'Solicitud cancelada');
  }
  hasPendingDestinations(detail:DetalleE2):boolean {return detail.destinos.some(x=>!x.predioId);}
  changeDeclarado(id:number,value:EstadoBienE2['resultado']):void {this.resultadoDeclarado.update(s=>({...s,[id]:value}));}
  changeObservacionBien(id:number,value:string):void {
    this.observacionesBien.update(x=>({...x,[id]:value}));
  }
  regularizarFin():void {
    const u=this.uotId();if(!u||!this.fechaFinRegularizada)return;
    const planned=new Date(this.fechaFinRegularizada);
    if(Number.isNaN(planned.getTime()))return;
    this.run(this.api.regularizarFin(u,this.id,planned.toISOString(),this.convenioId),
      'Fecha final prevista regularizada');
  }
  changeCantidad(id:number,value:number):void {this.cantidadesDevueltas.update(x=>({...x,[id]:value}));}
  changeInspeccion(id:number,value:EstadoBienE2['resultado']):void {this.resultadoInspeccion.update(s=>({...s,[id]:value}));}
  retornar():void {const u=this.uotId();const d=this.detail();if(!u||!d||!this.observacionGeneral.trim()){
     this.toast.error('Escriba una observación general del retorno.');return;}
     const pendientes=d.bienes.filter(x=>x.estado==='ENTREGADO');
     if(pendientes.some(b=>!this.observacionesBien()[b.solicitudRecursoId]?.trim())){
       this.toast.error('Registre el estado de devolución de cada recurso.');return;
     }
     const bienes=d.bienes.filter(x=>x.estado==='ENTREGADO').map(b=>({
       solicitudRecursoId:b.solicitudRecursoId,resultado:this.resultadoDeclarado()[b.solicitudRecursoId]??'CONFORME',
       cantidadDevuelta:b.suministroId?this.cantidadesDevueltas()[b.solicitudRecursoId]:undefined,
       observacion:this.observacionesBien()[b.solicitudRecursoId]?.trim()||undefined}));
     this.run(this.api.retornar(u,this.id,this.observacionGeneral.trim(),bienes,this.convenioId),'Retorno declarado');}
  async inspeccionar():Promise<void> {const u=this.uotId();const d=this.detail();if(!u||!d||this.saving())return;
     const bienes=d.bienes.filter(x=>x.estado==='ENTREGADO').map(b=>({
       solicitudRecursoId:b.solicitudRecursoId,resultado:this.resultadoInspeccion()[b.solicitudRecursoId]??'FALTANTE',
       cantidadDevuelta:b.suministroId?this.cantidadesDevueltas()[b.solicitudRecursoId]:undefined}));
     const answer=await this.confirm.show({title:'Validar resultados físicos',
       message:'Solo los bienes marcados como conformes volverán a estar disponibles.',
       confirmLabel:'Registrar inspección'});
     if(answer.confirmed&&!this.saving())this.run(this.api.inspeccionar(u,this.id,bienes,
       this.observacionInspeccion.trim()||undefined,this.convenioId),'Inspección registrada');}
  hasUndeliveredGoods(detail:DetalleE2):boolean {
    return detail.bienes.some(b=>b.estado==='SOLICITADO');
  }
  hasPendingInspection(detail:DetalleE2):boolean {
    return detail.bienes.some(b=>b.estado==='ENTREGADO');
  }
  cerrar():void {const u=this.uotId();if(u)this.run(this.api.cerrar(u,this.id,this.convenioId),'Salida cerrada');}
}
