import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy,Component,Input,OnChanges,OnInit,SimpleChanges,ViewChild,ElementRef,computed,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {finalize,Observable} from 'rxjs';
import {PermissionService} from '../../../../../../core/access/permission.service';
import {UotContextStore} from '../../../../../uot/state/uot-context.store';
import {PaginatorComponent} from '../../../../../../shared/data-display/paginator/paginator';
import {LoadingStateComponent} from '../../../../../../shared/data-display/loading-state/loading-state';
import {EmptyStateComponent} from '../../../../../../shared/data-display/empty-state/empty-state';
import {ActionConfirmDialogComponent} from '../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import {ToastService} from '../../../../../../shared/feedback/toast-center/toast.service';
import {mapOpenApiError} from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {ExpedienteE1UseCase} from '../../../../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import type {PredioE1} from '../../../../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import {EvidencePanelComponent} from '../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import {PlantasE3UseCase} from '../../../application/use-case/plantas-e3.use-case';
import {AmbitoE3,CatalogosE3,DetalleE3,DocumentoPredioE3,EstadoE3,FilaE3,LoteResultadoE3,MedicionE3,PaginaE3,TipoActuacionE3,TipoProduccionE3} from '../../../domain/planta-paltera.model';

type Pestaña='historial'|'sanidad'|'tratamientos'|'produccion'|'mediciones'|'evidencias';
@Component({selector:'app-plantas-e3-page',standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,PaginatorComponent,LoadingStateComponent,EmptyStateComponent,ActionConfirmDialogComponent,EvidencePanelComponent],
 templateUrl:'./plantas-e3.html',styleUrl:'./plantas-e3.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class PlantasE3Page implements OnInit,OnChanges {
 @Input() convenioId=0;
 @Input() predioInicial=0;
 @Input() predioFijo=false;
 @Input() vistaIntegrada=false;
 @ViewChild(ActionConfirmDialogComponent) private confirmation?:ActionConfirmDialogComponent;
 @ViewChild('loteDialog') private loteDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('expedienteDialog') private expedienteDialog?:ElementRef<HTMLDialogElement>;
 abrirLote():void{if(!this.saving()&&this.puedeCrear())this.loteDialog?.nativeElement.showModal();}
 cerrarLote():void{if(!this.saving()&&this.loteDialog?.nativeElement.open)this.loteDialog.nativeElement.close();}
 cerrarExpediente():void{if(!this.saving()&&this.expedienteDialog?.nativeElement.open)this.expedienteDialog.nativeElement.close();}
 private readonly route=inject(ActivatedRoute);
 private readonly uot=inject(UotContextStore);
 private readonly service=inject(PlantasE3UseCase);
 private readonly prediosApi=inject(ExpedienteE1UseCase);
 private readonly permissions=inject(PermissionService);
 private readonly toast=inject(ToastService);
 readonly predios=signal<{predioId:number;nombre:string}[]>([]);
 readonly loading=signal(false);
 readonly saving=signal(false);
 readonly error=signal<string|null>(null);
 readonly catalogs=signal<CatalogosE3>({variedades:[],diagnosticos:[],parcelas:[],socios:[]});
 readonly page=signal<PaginaE3>({total:0,items:[],resumen:[],anioResumen:new Date().getFullYear(),resumenParcelas:[]});
 readonly detail=signal<DetalleE3|null>(null);
 readonly result=signal<LoteResultadoE3|null>(null);
 readonly mediciones=signal<MedicionE3[]>([]);
 readonly documentos=signal<DocumentoPredioE3[]>([]);
 readonly seleccionadas=signal<readonly number[]>([]);
 readonly tab=signal<Pestaña>('historial');
 readonly puedeEditar=computed(()=>this.permissions.has('APAPPSS_PREDIOS_EDITAR'));
 readonly puedeCrear=computed(()=>this.permissions.has('APAPPSS_PREDIOS_CREAR'));
 readonly puedeCorregir=computed(()=>this.permissions.has('APAPPSS_PLANTAS_CORREGIR'));
 readonly puedeActuar=computed(()=>this.puedeEditar()&&!!this.visitaId);
 readonly totalPaginas=computed(()=>Math.max(1,Math.ceil(this.page().total/this.tamano)));
 readonly totalFundo=computed(()=>this.page().resumen.reduce((sum,r)=>sum+r.cantidad,0));
 predioId=0;socioId=0;buscar='';estadoFiltro='';variedadFiltro=0;pagina=1;tamano=20;
 filas:FilaE3[]=[{variedadId:0,cantidad:0}];
 masivoTipo:TipoActuacionE3='PREVENTIVO';masivoObservacion='';masivoResultado='';
 estadoNuevo:EstadoE3['estado']='SANA';diagnosticoId=0;observacionEstado='';correccionMotivo='';
 descripcionTratamiento='';resultadoTratamiento='';seguimiento='';seguimientoResultado='';seguimientoTipo:TipoActuacionE3='PREVENTIVO';
 fechaPlantacion='';edadReferencia:number|null=null;
 anio=new Date().getFullYear();tipoProduccion:TipoProduccionE3='ESTIMACION';produccionKg:number|null=null;
 fechaProduccion=new Date().toISOString().slice(0,10);observacionProduccion='';
 materiaSeca:number|null=null;medicionObservacion='';archivoId:number|null=null;eventoEvidencia=0;
 readonly visitaId=Number(this.route.snapshot.queryParamMap.get('visitaId'))||undefined;
 ngOnInit():void{
  if(!this.convenioId)this.convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||0;
  if(!this.predioInicial)this.predioInicial=Number(this.route.snapshot.paramMap.get('predioId'))||0;
  this.loadPredios();
 }
 ngOnChanges(changes:SimpleChanges):void{
  if((changes['convenioId']&&!changes['convenioId'].firstChange)||(changes['predioInicial']&&!changes['predioInicial'].firstChange))this.loadPredios();
 }
 private context():AmbitoE3|null{
  const uotId=this.uot.selectedId();
  return uotId&&this.convenioId>0&&this.predioId>0?{uotId,convenioId:this.convenioId,predioId:this.predioId}:null;
 }
 loadPredios():void{
  const uotId=this.uot.selectedId();
  this.detail.set(null);this.page.set({total:0,items:[],resumen:[],anioResumen:new Date().getFullYear(),resumenParcelas:[]});
  if(!uotId||!this.convenioId){this.error.set('Seleccione UOT y convenio.');return;}
  this.loading.set(true);this.error.set(null);
  this.prediosApi.buscarPredios(uotId,'',this.convenioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:(items:PredioE1[])=>{
    this.predios.set(items.map(p=>({predioId:p.predioId,nombre:p.nombre})));
    const encontrado=items.some(p=>p.predioId===this.predioInicial);
    this.predioId=this.predioFijo?(encontrado?this.predioInicial:0):(encontrado?this.predioInicial:items[0]?.predioId??0);
    if(this.predioFijo&&!this.predioId)this.error.set('El predio no pertenece a este convenio o no está disponible.');
    if(this.predioId)this.loadCatalogos();
   },error:(e:unknown)=>this.error.set(mapOpenApiError(e).message)
  });
 }
 cambiarPredio():void{
  this.pagina=1;this.socioId=0;this.detail.set(null);this.result.set(null);
  this.seleccionadas.set([]);this.mediciones.set([]);this.documentos.set([]);this.loadCatalogos();
 }
 loadCatalogos():void{
  const a=this.context();if(!a)return;
  this.service.catalogos(a).subscribe({next:c=>{
   this.catalogs.set(c);
   this.socioId=c.socios.length===1?c.socios[0].id:0;
  },error:e=>this.error.set(mapOpenApiError(e).message)});
  this.listar();
 }
 listar():void{
  const a=this.context();if(!a)return;
  this.loading.set(true);this.error.set(null);
  this.service.listar(a,{buscar:this.buscar.trim()||undefined,estado:this.estadoFiltro||undefined,
   variedadId:this.variedadFiltro||undefined,pagina:this.pagina,tamano:this.tamano})
   .pipe(finalize(()=>this.loading.set(false))).subscribe({next:p=>this.page.set(p),error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 filtrar():void{this.pagina=1;this.seleccionadas.set([]);this.listar();}
 pageChanged(value:number):void{this.pagina=value;this.seleccionadas.set([]);this.listar();}
 sizeChanged(value:number):void{this.tamano=value;this.pagina=1;this.seleccionadas.set([]);this.listar();}
 agregarFila():void{this.filas.push({variedadId:0,cantidad:0});}
 quitarFila(index:number):void{if(this.filas.length>1)this.filas.splice(index,1);}
 validLote():boolean{
  const keys=this.filas.map(f=>f.variedadId);
  return this.filas.length>0&&new Set(keys).size===keys.length&&
   (this.catalogs().socios.length===1||this.socioId>0)&&
   this.filas.every(f=>f.variedadId>0&&Number.isInteger(f.cantidad)&&f.cantidad>0&&f.cantidad<=1000)&&
   this.filas.reduce((s,f)=>s+f.cantidad,0)<=2000;
 }
 crearLote():void{
  const a=this.context();if(!a||!this.validLote()||this.saving())return;
  const socioId=this.catalogs().socios.length===1?undefined:this.socioId;
  this.mutate(this.service.lote(a,this.filas.map(x=>({...x,parcelaCultivoId:x.parcelaCultivoId||undefined})),socioId),r=>{
   this.result.set(r);this.loteDialog?.nativeElement.close();this.toast.success(`Se generaron ${r.total} plantas con códigos individuales`);
   this.filas=[{variedadId:0,cantidad:0}];this.listar();
  });
 }
 seleccionar(id:number,checked:boolean):void{
  this.seleccionadas.update(current=>checked?[...new Set([...current,id])].slice(0,100):current.filter(x=>x!==id));
 }
 seguimientoSeleccion():void{
  const a=this.context(),ids=[...this.seleccionadas()];
  if(!a||!this.visitaId||!this.masivoObservacion.trim()||ids.length===0||this.saving())return;
  this.mutate(this.service.seguimientoMasivo(a,{plantasIds:ids,observacion:this.masivoObservacion.trim(),
   tipo:this.masivoTipo,resultado:this.masivoResultado.trim()||undefined,visitaId:this.visitaId}),r=>{
   this.toast.success(`Actuación registrada en ${r.procesadas} plantas`);
   this.seleccionadas.set([]);this.masivoObservacion='';this.masivoResultado='';this.listar();
   const d=this.detail();if(d)this.abrir(d.plantaId,false);
  });
 }
 registrarMateriaSeca():void{
  const a=this.context(),d=this.detail();
  if(!a||!d||!this.visitaId||this.materiaSeca===null||this.materiaSeca<0||this.materiaSeca>100||d.estado==='MUERTA')return;
  this.mutate(this.service.medir(a,d.plantaId,{porcentaje:this.materiaSeca,visitaId:this.visitaId,
   observacion:this.medicionObservacion.trim()||undefined}),()=>{
    this.toast.success('Medición registrada');this.materiaSeca=null;this.medicionObservacion='';this.abrir(d.plantaId,false);
  });
 }
 abrir(plantaId:number,resetTab=true):void{
  const a=this.context();if(!a)return;
  this.service.ver(a,plantaId).subscribe({next:d=>{
   this.detail.set(d);if(resetTab)this.tab.set('historial');
   if(!this.expedienteDialog?.nativeElement.open)this.expedienteDialog?.nativeElement.showModal();
   this.fechaPlantacion=d.fechaPlantacion??'';this.edadReferencia=d.edadReferenciaAnios??null;
   this.estadoNuevo=d.estado==='MUERTA'?'SIN_EVALUAR':'SANA';
   this.service.mediciones(a,plantaId).subscribe({next:items=>this.mediciones.set(items),
    error:e=>this.error.set(mapOpenApiError(e).message)});
   this.loadDocumentos();
  },error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 cerrarDetalle():void{if(this.saving())return;this.cerrarExpediente();this.detail.set(null);}
 cambiarTab(tab:Pestaña):void{this.tab.set(tab);if(tab==='evidencias')this.loadDocumentos();}
 loadDocumentos():void{
  const a=this.context();if(!a)return;
  this.service.documentos(a).subscribe({next:docs=>this.documentos.set(docs),error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 private mutate<T>(request:Observable<T>,after:(r:T)=>void):void{
  if(this.saving())return;this.saving.set(true);this.error.set(null);
  request.pipe(finalize(()=>this.saving.set(false))).subscribe({next:after,error:e=>{
   const m=mapOpenApiError(e).message;this.error.set(m);this.toast.error('No se pudo registrar',m);
  }});
 }
 private refreshDetail(id:number):void{this.abrir(id,false);this.listar();}
 async cambiarEstado():Promise<void>{
  const a=this.context(),d=this.detail();if(!a||!d||this.saving())return;
  const correccion=d.estado==='MUERTA';
  if(correccion&&!this.puedeCorregir())return;
  if(correccion&&this.estadoNuevo!=='SANA'&&this.estadoNuevo!=='SIN_EVALUAR')return;
  if(this.estadoNuevo==='ENFERMA'&&!this.diagnosticoId){this.error.set('Seleccione el diagnóstico.');return;}
  if((this.estadoNuevo==='MUERTA'||correccion)&&!this.observacionEstado.trim()){
   this.error.set('Describa los motivos de este cambio.');return;
  }
  if(correccion&&this.correccionMotivo.trim().length<15){this.error.set('Indique el motivo autorizado de la rectificación.');return;}
  const confirmed=await this.confirmation?.show({title:correccion?'Rectificación excepcional':'Confirmar evaluación',
   message:`¿Registrar cambio de ${d.estado} a ${this.estadoNuevo} para ${d.codigo}? Se conservará el historial.`,
   tone:this.estadoNuevo==='MUERTA'?'danger':'warning',confirmLabel:correccion?'Rectificar estado':'Registrar estado'});
  if(!confirmed?.confirmed)return;
  const payload:EstadoE3={version:d.version,estado:this.estadoNuevo,
   diagnosticoId:this.estadoNuevo==='ENFERMA'?this.diagnosticoId:undefined,
   observacion:this.observacionEstado.trim()||undefined,visitaId:this.visitaId,
   correccionExcepcional:correccion||undefined,motivoCorreccion:correccion?this.correccionMotivo.trim():undefined};
  this.mutate(this.service.estado(a,d.plantaId,payload),()=>{
   this.toast.success('Cambio de estado registrado');this.observacionEstado='';this.correccionMotivo='';this.refreshDetail(d.plantaId);
  });
 }
 guardarFicha():void{
  const a=this.context(),d=this.detail();if(!a||!d||this.saving()||(!this.fechaPlantacion&&this.edadReferencia===null))return;
  this.mutate(this.service.ficha(a,d.plantaId,{version:d.version,fechaPlantacion:this.fechaPlantacion||undefined,
   edadReferenciaAnios:this.fechaPlantacion?undefined:this.edadReferencia??undefined}),()=>{
    this.toast.success('Ficha actualizada con historial');this.refreshDetail(d.plantaId);
  });
 }
 tratar():void{
  const a=this.context(),d=this.detail();if(!a||!d||d.estado!=='ENFERMA'||!this.descripcionTratamiento.trim())return;
  this.mutate(this.service.tratar(a,d.plantaId,{descripcion:this.descripcionTratamiento.trim(),
   resultado:this.resultadoTratamiento.trim()||undefined,visitaId:this.visitaId}),()=>{
    this.toast.success('Tratamiento registrado');this.descripcionTratamiento='';this.resultadoTratamiento='';this.refreshDetail(d.plantaId);
  });
 }
 seguir():void{
  const a=this.context(),d=this.detail();if(!a||!d||d.estado==='MUERTA'||!this.seguimiento.trim())return;
  this.mutate(this.service.seguir(a,d.plantaId,{observacion:this.seguimiento.trim(),
   tipo:this.seguimientoTipo,resultado:this.seguimientoResultado.trim()||undefined,visitaId:this.visitaId}),()=>{
    this.toast.success('Actuación registrada');this.seguimiento='';this.seguimientoResultado='';this.refreshDetail(d.plantaId);
  });
 }
 guardarProduccion():void{
  const a=this.context(),d=this.detail();
  if(!a||!d||this.produccionKg===null||!Number.isFinite(this.produccionKg)||this.produccionKg<0||
     this.anio<2000||this.anio>2200||!this.fechaProduccion||Number(this.fechaProduccion.slice(0,4))!==this.anio)return;
  const data={anio:this.anio,tipo:this.tipoProduccion,
   estimadoKg:this.tipoProduccion==='ESTIMACION'?this.produccionKg:undefined,
   realKg:this.tipoProduccion==='COSECHA'?this.produccionKg:undefined,
   fechaEvento:this.fechaProduccion,visitaId:this.visitaId,observacion:this.observacionProduccion.trim()||undefined};
  this.mutate(this.service.produccion(a,d.plantaId,data),()=>{
   this.toast.success(this.tipoProduccion==='COSECHA'?'Cosecha agregada':'Estimación actualizada');
   this.produccionKg=null;this.observacionProduccion='';this.refreshDetail(d.plantaId);
  });
 }
 asociarArchivo():void{
  const a=this.context(),d=this.detail();if(!a||!d||!this.archivoId||this.archivoId<=0)return;
  this.mutate(this.service.evidencia(a,d.plantaId,this.archivoId,this.eventoEvidencia||undefined),()=>{
   this.toast.success('Evidencia vinculada');this.archivoId=null;this.eventoEvidencia=0;this.refreshDetail(d.plantaId);
  });
 }
}
