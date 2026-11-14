import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy,Component,ElementRef,Input,OnChanges,SimpleChanges,ViewChild,computed,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPen,faPlus,faTrash,faXmark} from '@fortawesome/free-solid-svg-icons';
import {finalize} from 'rxjs';
import {PermissionService} from '../../../../../../../core/access/permission.service';
import {ToastService} from '../../../../../../../shared/feedback/toast-center/toast.service';
import {mapOpenApiError} from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {RecordCardComponent} from '../../../../../../../shared/data-display/record-card/record-card';
import {PaginatorComponent} from '../../../../../../../shared/data-display/paginator/paginator';
import {ListViewSwitchComponent,type ListViewMode} from '../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import {ActionConfirmDialogComponent} from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import {AmbitoE3} from '../../../../domain/planta-paltera.model';
import {DatosMateriaSecaFundo,E3ExpedienteE4Service,InformeGlobalE4,SecaPredioE4} from './e3-expediente-e4.service';

@Component({selector:'app-e3-materia-seca',standalone:true,
 imports:[CommonModule,FormsModule,FaIconComponent,RecordCardComponent,PaginatorComponent,ListViewSwitchComponent,ActionConfirmDialogComponent],
 templateUrl:'./e3-materia-seca.html',styleUrl:'./e3-materia-seca.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class E3MateriaSecaComponent implements OnChanges {
 @Input({required:true}) ambito!:AmbitoE3;
 @Input() editable=false;
 @ViewChild('formDialog') private formDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild(ActionConfirmDialogComponent) private confirmation?:ActionConfirmDialogComponent;
 private readonly api=inject(E3ExpedienteE4Service);
 private readonly permissions=inject(PermissionService);
 private readonly toast=inject(ToastService);
 private secuencia=0;
 readonly addIcon=faPlus;readonly editIcon=faPen;readonly deleteIcon=faTrash;
 readonly closeIcon=faXmark;
 readonly cargando=signal(false);readonly guardando=signal(false);readonly error=signal<string|null>(null);
 readonly global=signal<SecaPredioE4|null>(null);
 readonly vista=signal<ListViewMode>('table');
 readonly pagina=signal(1);
 readonly tamanoPagina=signal(10);
 readonly editarId=signal<number|null>(null);
 readonly registros=computed(()=>(this.global()?.items??[]).filter(i=>i.activo));
 readonly totalPaginas=computed(()=>Math.ceil(this.registros().length/this.tamanoPagina()));
 readonly paginaActual=computed(()=>Math.min(this.pagina(),Math.max(1,this.totalPaginas())));
 readonly registrosPagina=computed(()=>{
  const inicio=(this.paginaActual()-1)*this.tamanoPagina();
  return this.registros().slice(inicio,inicio+this.tamanoPagina());
 });
 readonly ultimoActivo=computed(()=>this.registros()[0]??null);
 readonly totalActivos=computed(()=>this.registros().length);
 readonly hoyLocal=this.hoy();
 porcentaje:number|null=null;
 fechaMuestreo=this.hoy();
 cantidadPlantas:number|null=null;
 coberturaPorcentaje:number|null=null;
 cantidadFrutos:number|null=null;
 metodo='LABORATORIO';
 informe='';motivoEdicion='';todas=false;
 private hoy():string{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 puedeVer():boolean{return this.permissions.has('APAPPSS_PREDIOS_VER');}
 puedeCrear():boolean{return this.editable&&this.permissions.has('APAPPSS_PREDIOS_SECA_LOTE');}
 puedeEditar():boolean{return this.editable&&this.permissions.has('APAPPSS_PREDIOS_SECA_EDITAR');}
 puedeEliminar():boolean{return this.editable&&this.permissions.has('APAPPSS_PREDIOS_SECA_ELIMINAR');}
 ngOnChanges(changes:SimpleChanges):void{if(changes['ambito']){this.pagina.set(1);this.global.set(null);this.cargar();}}
 cambiarPagina(pagina:number):void{if(Number.isInteger(pagina)&&pagina>=1&&pagina<=this.totalPaginas())this.pagina.set(pagina);}
 cambiarTamanoPagina(tamano:number):void{
  if(![10,20,50,100].includes(tamano))return;
  this.tamanoPagina.set(tamano);this.pagina.set(1);
 }
 cargar():void{
  const secuencia=++this.secuencia;
  const a=this.ambito;
  this.cargando.set(false);this.error.set(null);
  if(!a||!a.predioId||!a.uotId||!a.convenioId){
   this.global.set(null);this.error.set('No se encontró el fundo.');return;
  }
  if(!this.puedeVer()){
   this.global.set(null);this.error.set('Sin acceso a esta información.');return;
  }
  this.cargando.set(true);
  this.api.secaPredio(a).pipe(finalize(()=>{if(secuencia===this.secuencia)this.cargando.set(false);})).subscribe({
   next:result=>{
    if(secuencia!==this.secuencia)return;
    this.global.set({totalPlantasActivas:result.totalPlantasActivas,
     items:result.items.map(i=>({...i,activo:i.activo!==false,version:i.version??0}))
       .sort((a,b)=>b.fechaMuestreo.localeCompare(a.fechaMuestreo)||b.informeId-a.informeId)});
   },error:(e:unknown)=>{
    if(secuencia!==this.secuencia)return;
    this.global.set(null);
    const err=mapOpenApiError(e);
    // El mensaje visible sigue siendo breve; diagnóstico solo en consola.
    console.warn('[APAPPSS materia seca]',{status:err.status,codigo:err.code,correlacionId:err.correlationId});
    this.error.set(err.status===401?'Inicia sesión nuevamente.':
     err.status===403?'Sin acceso a esta información.':
     err.status===404?'No se encontró el fundo.':'No se pudo cargar la información.');
   }
  });
 }
 private limpiar():void{
  this.porcentaje=null;this.fechaMuestreo=this.hoy();this.cantidadPlantas=null;
  this.coberturaPorcentaje=null;this.cantidadFrutos=null;this.metodo='LABORATORIO';this.informe='';this.motivoEdicion='';
  this.todas=false;this.editarId.set(null);this.error.set(null);
 }
 abrirNuevo():void{
  if(!this.puedeCrear()||this.guardando()||!this.global()||this.global()!.totalPlantasActivas<1)return;
  this.limpiar();this.formDialog?.nativeElement.showModal();
 }
 abrirEditar(item:InformeGlobalE4):void{
  if(!item.activo||!this.puedeEditar()||this.guardando())return;
  this.limpiar();this.editarId.set(item.informeId);
  this.porcentaje=item.porcentaje;this.fechaMuestreo=item.fechaMuestreo;
  this.cantidadPlantas=item.cantidadPlantas;
  this.coberturaPorcentaje=this.calcularCobertura(item.cantidadPlantas);
  this.cantidadFrutos=item.cantidadFrutos??null;
  this.metodo=item.metodo??'LABORATORIO';this.informe=item.informe;
  this.todas=item.cobertura==='TOTAL';
  this.formDialog?.nativeElement.showModal();
 }
 cerrarModal():void{if(!this.guardando()&&this.formDialog?.nativeElement.open)this.formDialog.nativeElement.close();}
 private calcularCobertura(cantidad:number|null):number|null{
  const total=this.global()?.totalPlantasActivas??0;
  if(cantidad===null||!Number.isInteger(cantidad)||cantidad<1||cantidad>total||total<1)return null;
  return Number((cantidad*100/total).toFixed(2));
 }
 cambiarCantidadPlantas(valor:number|null):void{
  this.cantidadPlantas=valor;
  this.coberturaPorcentaje=this.calcularCobertura(valor);
  this.todas=valor!==null&&valor===this.global()?.totalPlantasActivas;
 }
 cambiarCobertura(valor:number|null):void{
  this.coberturaPorcentaje=valor;
  const total=this.global()?.totalPlantasActivas??0;
  if(valor===null||!Number.isFinite(valor)||valor<=0||valor>100||total<1){
   this.cantidadPlantas=null;this.todas=false;return;
  }
  const cantidad=Math.max(1,Math.min(total,Math.round(total*valor/100)));
  this.cantidadPlantas=cantidad;
  this.coberturaPorcentaje=this.calcularCobertura(cantidad);
  this.todas=cantidad===total;
 }
 cambiarTodas(value:boolean):void{
  this.todas=value;
  if(value){
   this.cantidadPlantas=this.global()?.totalPlantasActivas??null;
   this.coberturaPorcentaje=this.calcularCobertura(this.cantidadPlantas);
  }
 }
 private fechaMilisegundos(iso:string):number{return Date.parse(iso+'T12:00:00Z');}
 conflictoSemanal():boolean{
  if(!this.fechaMuestreo)return false;
  const actual=this.global()?.items??[];
  const vigente=actual.find(i=>i.informeId===this.editarId());
  if(vigente?.fechaMuestreo===this.fechaMuestreo)return false;
  const fecha=this.fechaMilisegundos(this.fechaMuestreo);
  return actual.some(i=>i.activo&&i.informeId!==this.editarId()&&
   Math.abs(this.fechaMilisegundos(i.fechaMuestreo)-fecha)<7*86400000);
 }
 valido():boolean{
  const total=this.global()?.totalPlantasActivas??0;
  const puede=this.editarId()===null?this.puedeCrear():this.puedeEditar();
  return puede&&!this.guardando()&&total>0&&this.porcentaje!==null&&Number.isFinite(this.porcentaje)&&
   this.porcentaje>=0.001&&this.porcentaje<=100&&this.fechaMuestreo.length===10&&
   this.fechaMuestreo<=this.hoyLocal&&this.cantidadPlantas!==null&&
   Number.isInteger(this.cantidadPlantas)&&this.cantidadPlantas>=1&&this.cantidadPlantas<=total&&
   this.coberturaPorcentaje!==null&&Number.isFinite(this.coberturaPorcentaje)&&
   this.coberturaPorcentaje===this.calcularCobertura(this.cantidadPlantas)&&
   this.cantidadFrutos!==null&&Number.isInteger(this.cantidadFrutos)&&
   this.cantidadFrutos>=1&&this.cantidadFrutos<=10000&&
   ['LABORATORIO','HORNO','MICROONDAS','NIR','OTRO'].includes(this.metodo)&&
   this.informe.trim().length>0&&this.informe.trim().length<=2000&&
   (this.editarId()===null||this.motivoEdicion.trim().length>=10&&this.motivoEdicion.trim().length<=500)&&
   !this.conflictoSemanal();
 }
 guardar():void{
  if(!this.valido())return;
  const id=this.editarId();
  const previo=this.global()?.items.find(i=>i.informeId===id);
  if(id!==null&&!previo)return;
  const datos:DatosMateriaSecaFundo={porcentaje:this.porcentaje!,fechaMuestreo:this.fechaMuestreo,
   cantidadPlantas:this.cantidadPlantas!,cantidadFrutos:this.cantidadFrutos!,metodo:this.metodo,
   informe:this.informe.trim(),...(previo?{version:previo.version,motivoEdicion:this.motivoEdicion.trim()}:{})};
  this.guardando.set(true);this.error.set(null);
  const request=id===null?this.api.registrarSecaGlobal(this.ambito,datos):this.api.editarSecaGlobal(this.ambito,id,datos);
  request.pipe(finalize(()=>this.guardando.set(false))).subscribe({
   next:()=>{this.guardando.set(false);this.toast.success(id===null?'Materia seca registrada':'Materia seca actualizada');
    this.cerrarModal();this.limpiar();this.pagina.set(1);this.cargar();},
   error:(e:unknown)=>this.error.set(mapOpenApiError(e).message)
  });
 }
 async eliminar(item:InformeGlobalE4):Promise<void>{
  if(!item.activo||!this.puedeEliminar()||this.guardando())return;
  const confirmacion=await this.confirmation?.show({title:'Eliminar materia seca',
   message:'El registro dejará de mostrarse.',
   confirmLabel:'Eliminar',tone:'danger',requiresReason:true,
   reasonLabel:'Motivo de eliminación',minimumReasonLength:10,maximumReasonLength:500});
  if(!confirmacion?.confirmed||!confirmacion.reason||this.guardando())return;
  this.guardando.set(true);this.error.set(null);
  this.api.eliminarSecaGlobal(this.ambito,item.informeId,item.version,confirmacion.reason)
   .pipe(finalize(()=>this.guardando.set(false))).subscribe({
    next:()=>{this.toast.success('Registro eliminado');this.cargar();},
    error:(e:unknown)=>this.error.set(mapOpenApiError(e).message)
   });
 }
}
