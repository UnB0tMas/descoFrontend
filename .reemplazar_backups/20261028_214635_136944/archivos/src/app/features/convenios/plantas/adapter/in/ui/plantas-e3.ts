import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy,Component,Input,OnChanges,OnInit,SimpleChanges,ViewChild,inject,signal,computed} from '@angular/core';
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
import {PlantasE3UseCase} from '../../../application/use-case/plantas-e3.use-case';
import {CatalogosE3,DetalleE3,FilaE3,PaginaE3,EstadoE3,AmbitoE3,LoteResultadoE3} from '../../../domain/planta-paltera.model';
@Component({selector:'app-plantas-e3-page',standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,PaginatorComponent,LoadingStateComponent,EmptyStateComponent,ActionConfirmDialogComponent],
 templateUrl:'./plantas-e3.html',styleUrl:'./plantas-e3.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class PlantasE3Page implements OnInit,OnChanges {
 @Input() convenioId=0;
 @Input() predioInicial=0;
 @ViewChild(ActionConfirmDialogComponent) private confirmation?:ActionConfirmDialogComponent;
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
 readonly catalogs=signal<CatalogosE3>({variedades:[],diagnosticos:[],parcelas:[]});
 readonly page=signal<PaginaE3>({total:0,items:[],resumen:[]});
 readonly detail=signal<DetalleE3|null>(null);
 readonly result=signal<LoteResultadoE3|null>(null);
 readonly tab=signal<'historial'|'sanidad'|'tratamientos'|'produccion'|'evidencias'>('historial');
 readonly puedeEditar=computed(()=>this.permissions.has('APAPPSS_PREDIOS_EDITAR'));
 readonly puedeCrear=computed(()=>this.permissions.has('APAPPSS_PREDIOS_CREAR'));
 readonly totalPaginas=computed(()=>Math.ceil(this.page().total/this.tamano));
 readonly totalFundo=computed(()=>this.page().resumen.reduce((sum,row)=>sum+row.cantidad,0));
 predioId=0;buscar='';estadoFiltro='';variedadFiltro=0;pagina=1;tamano=20;
 filas:FilaE3[]=[{variedadId:0,cantidad:0},{variedadId:0,cantidad:0}];
 estadoNuevo:'SANA'|'ENFERMA'|'MUERTA'='SANA';diagnosticoId=0;observacionEstado='';
 descripcionTratamiento='';resultadoTratamiento='';seguimiento='';
 fechaPlantacion='';edadReferencia:number|null=null;
 anio=new Date().getFullYear();estimado:number|null=null;real:number|null=null;observacionProduccion='';
 archivoId:number|null=null;eventoEvidencia=0;
 readonly visitaId=Number(this.route.snapshot.queryParamMap.get('visitaId'))||undefined;
 ngOnInit():void{
  if(!this.convenioId)this.convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||0;
  if(!this.predioInicial)this.predioInicial=Number(this.route.snapshot.paramMap.get('predioId'))||0;
  this.loadPredios();
 }
 ngOnChanges(changes:SimpleChanges):void{
  if(changes['convenioId']&&!changes['convenioId'].firstChange)this.loadPredios();
 }
 private context():AmbitoE3|null{
  const uotId=this.uot.selectedId();if(!uotId||this.convenioId<=0||this.predioId<=0)return null;
  return {uotId,convenioId:this.convenioId,predioId:this.predioId};
 }
 loadPredios():void{
  const uot=this.uot.selectedId();
  this.detail.set(null);this.page.set({total:0,items:[],resumen:[]});
  if(!uot||!this.convenioId){this.error.set('Seleccione UOT y convenio.');return;}
  this.loading.set(true);this.error.set(null);
  this.prediosApi.buscarPredios(uot,'',this.convenioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:(items:PredioE1[])=>{
    this.predios.set(items.map((p:PredioE1)=>({predioId:p.predioId,nombre:p.nombre})));
    this.predioId=items.some((p:PredioE1)=>p.predioId===this.predioInicial)?this.predioInicial:items[0]?.predioId??0;
    if(this.predioId)this.loadCatalogos();
   },
   error:(error:unknown)=>this.error.set(mapOpenApiError(error).message),
  });
 }
 cambiarPredio():void{this.pagina=1;this.detail.set(null);this.result.set(null);this.loadCatalogos();}
 loadCatalogos():void{
  const a=this.context();if(!a)return;
  this.service.catalogos(a).subscribe({next:r=>this.catalogs.set(r),error:e=>this.error.set(mapOpenApiError(e).message)});
  this.listar();
 }
 listar():void{
  const a=this.context();if(!a)return;
  this.loading.set(true);this.error.set(null);
  this.service.listar(a,{buscar:this.buscar||undefined,estado:this.estadoFiltro||undefined,variedadId:this.variedadFiltro||undefined,pagina:this.pagina,tamano:this.tamano})
   .pipe(finalize(()=>this.loading.set(false))).subscribe({next:p=>this.page.set(p),error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 filtrar():void{this.pagina=1;this.listar();}
 pageChanged(value:number):void{this.pagina=value;this.listar();}
 sizeChanged(value:number):void{this.tamano=value;this.pagina=1;this.listar();}
 agregarFila():void{this.filas.push({variedadId:0,cantidad:0});}
 quitarFila(index:number):void{if(this.filas.length>1)this.filas.splice(index,1);}
 validLote():boolean{
  const ids=this.filas.map(f=>f.variedadId);
  return this.filas.length>0 && new Set(ids).size===ids.length && this.filas.every(f=>f.variedadId>0&&Number.isInteger(f.cantidad)&&f.cantidad>0&&f.cantidad<=1000)
   && this.filas.reduce((s,f)=>s+f.cantidad,0)<=2000;
 }
 crearLote():void{
  const a=this.context();if(!a||!this.validLote()||this.saving())return;
  this.mutate(this.service.lote(a,this.filas.map(x=>({...x,parcelaCultivoId:x.parcelaCultivoId||undefined}))),
   r=>{this.result.set(r);this.toast.success('Plantas registradas: '+r.total);this.listar();});
 }
 abrir(plantaId:number):void{
  const a=this.context();if(!a)return;
  this.service.ver(a,plantaId).subscribe({next:x=>{this.detail.set(x);this.tab.set('historial');
   this.fechaPlantacion=x.fechaPlantacion??'';this.edadReferencia=x.edadReferenciaAnios??null;},
   error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 cerrarDetalle():void{this.detail.set(null);}
 private mutate<T>(request:Observable<T>,after:(result:T)=>void):void{
  if(this.saving())return;this.saving.set(true);this.error.set(null);
  request.pipe(finalize(()=>this.saving.set(false))).subscribe({next:r=>after(r),error:e=>{
   const m=mapOpenApiError(e).message;this.error.set(m);this.toast.error('No se pudo registrar',m);
  }});
 }
 private refreshDetail(id:number):void{this.abrir(id);this.listar();}
 async cambiarEstado():Promise<void>{
  const a=this.context(),d=this.detail();if(!a||!d||this.saving()||d.estado==='MUERTA')return;
  if(this.estadoNuevo==='ENFERMA'&&!this.diagnosticoId){this.error.set('Seleccione el diagnóstico.');return;}
  if(this.estadoNuevo==='MUERTA'&&!this.observacionEstado.trim()){this.error.set('Indique la observación de muerte.');return;}
  const confirmed=await this.confirmation?.show({title:'Confirmar evaluación',message:`Cambiar ${d.codigo} de ${d.estado} a ${this.estadoNuevo}?`,tone:this.estadoNuevo==='MUERTA'?'danger':'warning',confirmLabel:'Registrar estado'});
  if(!confirmed?.confirmed)return;
  const data:EstadoE3={version:d.version,estado:this.estadoNuevo,diagnosticoId:this.estadoNuevo==='ENFERMA'?this.diagnosticoId:undefined,
   observacion:this.observacionEstado||undefined,visitaId:this.visitaId};
  this.mutate(this.service.estado(a,d.plantaId,data),()=>{this.toast.success('Estado registrado');this.refreshDetail(d.plantaId);});
 }
 guardarFicha():void{
  const a=this.context(),d=this.detail();if(!a||!d||this.saving())return;
  if(!this.fechaPlantacion&&this.edadReferencia==null)return;
  this.mutate(this.service.ficha(a,d.plantaId,{version:d.version,fechaPlantacion:this.fechaPlantacion||undefined,
    edadReferenciaAnios:this.fechaPlantacion?undefined:this.edadReferencia??undefined}),()=>{this.toast.success('Ficha completada');this.refreshDetail(d.plantaId);});
 }
 tratar():void{
  const a=this.context(),d=this.detail();if(!a||!d||d.estado!=='ENFERMA'||!this.descripcionTratamiento.trim())return;
  this.mutate(this.service.tratar(a,d.plantaId,{descripcion:this.descripcionTratamiento.trim(),resultado:this.resultadoTratamiento||undefined,visitaId:this.visitaId}),
  ()=>{this.toast.success('Tratamiento registrado');this.descripcionTratamiento='';this.resultadoTratamiento='';this.refreshDetail(d.plantaId);});
 }
 seguir():void{
  const a=this.context(),d=this.detail();if(!a||!d||!this.seguimiento.trim())return;
  this.mutate(this.service.seguir(a,d.plantaId,{observacion:this.seguimiento.trim(),visitaId:this.visitaId}),
    ()=>{this.toast.success('Seguimiento registrado');this.seguimiento='';this.refreshDetail(d.plantaId);});
 }
 guardarProduccion():void{
  const a=this.context(),d=this.detail();if(!a||!d||this.estimado==null&&this.real==null||this.anio<2000)return;
  this.mutate(this.service.produccion(a,d.plantaId,{anio:this.anio,estimadoKg:this.estimado??undefined,
   realKg:this.real??undefined,observacion:this.observacionProduccion.trim()||undefined}),
   ()=>{this.toast.success('Producción registrada');this.refreshDetail(d.plantaId);});
 }
 asociarArchivo():void{
  const a=this.context(),d=this.detail();if(!a||!d||!this.archivoId||this.archivoId<=0)return;
  this.mutate(this.service.evidencia(a,d.plantaId,this.archivoId,this.eventoEvidencia||undefined),()=>{this.toast.success('Evidencia vinculada');this.archivoId=null;this.eventoEvidencia=0;this.refreshDetail(d.plantaId);});
 }
}
