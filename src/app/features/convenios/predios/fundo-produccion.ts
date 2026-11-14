import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, finalize } from 'rxjs';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';

interface Respuesta<T> { datos?:T; exitoso?:boolean; mensaje?:string; }
interface Periodo { anio:number; estimadoPlantasKg:number; cosechaPlantasKg:number; entregasKg:number; }
interface Detalle {
 predioId:number; anio:number; plantasActivas:number; plantasConEstimacion:number; plantasConCosecha:number;
 estimadoPlantasKg:number; cosechaPlantasKg:number; promedioCosechaHistoricaKg:number;
 promedioEntregasHistoricasKg:number; sugeridoKg:number; fuenteSugerencia:string; calidadEstimacion:string;
 estado:string|null; cantidadKg:number|null; version:number; fechaDesde:string|null; fechaHasta:string|null;
 observacion:string|null; actualizadoEn:string|null; historial:Periodo[];
}
type Estado = 'DISPONIBLE'|'PARCIAL'|'NO_DISPONIBLE';
@Component({
 selector:'app-fundo-produccion',standalone:true,imports:[CommonModule,FormsModule],
 templateUrl:'./fundo-produccion.html',styleUrl:'./fundo-produccion.css',
 changeDetection:ChangeDetectionStrategy.OnPush,
})
export class FundoProduccionComponent implements OnInit {
 @ViewChild('disponibilidadDialog') private disponibilidadDialog?:ElementRef<HTMLDialogElement>;
 @Input({required:true}) convenioId=0;
 @Input({required:true}) predioId=0;
 @Input() editable=false;
 private readonly http=inject(HttpClient);
 private readonly keys=inject(IdempotencyKeyService);
 private readonly uot=inject(UotContextStore);
 private readonly url=`${inject(BASE_PATH).replace(/\/$/,'')}/api/v1/apappss/fundos`;
 readonly data=signal<Detalle|null>(null);
 readonly loading=signal(false);
 readonly saving=signal(false);
 readonly error=signal<string|null>(null);
 readonly message=signal<string|null>(null);
 anio=new Date().getFullYear();
 anioSeleccionado=this.anio;
 estado:Estado='NO_DISPONIBLE';
 cantidadKg=0;
 fechaDesde=`${this.anio}-01-01`;
 fechaHasta=`${this.anio}-12-31`;
 observacion='';
 ngOnInit():void{this.cargar();}
 private params():HttpParams {
  return new HttpParams().set('uotId',this.uot.selectedId()??0).set('convenioId',this.convenioId);
 }
 private path():string{return `${this.url}/${this.predioId}/produccion`;}
 private unwrap<T>(value:Respuesta<T>):T {
  if(!value.exitoso||!value.datos)throw new Error(value.mensaje||'No se recibió la información del fundo.');
  return value.datos;
 }
 cargar():void{
  if(this.loading()||this.saving()||!this.predioId||!this.convenioId||!this.uot.selectedId())return;
  this.loading.set(true);this.error.set(null);this.message.set(null);
  this.http.get<Respuesta<Detalle>>(this.path(),{params:this.params().set('anio',this.anio),transferCache:false})
   .pipe(map(x=>this.unwrap(x)),finalize(()=>this.loading.set(false))).subscribe({
    next:r=>{
     this.data.set(r);
     this.estado=(r.estado as Estado)||'NO_DISPONIBLE';
     this.cantidadKg=r.cantidadKg??0;
     this.fechaDesde=r.fechaDesde||`${this.anio}-01-01`;
     this.fechaHasta=r.fechaHasta||`${this.anio}-12-31`;
     this.observacion=r.observacion||'';
    },error:e=>this.error.set(mapOpenApiError(e).message||String(e)),
   });
 }
 cambiarEstado(value:Estado):void{
  this.estado=value;
  if(value==='NO_DISPONIBLE')this.cantidadKg=0;
 }
 consultarAnio():void{
  const value=Number(this.anioSeleccionado);
  if(!Number.isInteger(value)||value<2000||value>2200)return;
  this.anio=value;this.data.set(null);this.cargar();
 }
 abrirDisponibilidad():void{
  if(!this.editable||!this.data()||this.saving())return;
  const d=this.data()!;
  this.estado=(d.estado as Estado)||'NO_DISPONIBLE';
  this.cantidadKg=d.cantidadKg??0;
  this.fechaDesde=d.fechaDesde||`${this.anio}-01-01`;
  this.fechaHasta=d.fechaHasta||`${this.anio}-12-31`;
  this.observacion=d.observacion||'';
  this.error.set(null);
  this.disponibilidadDialog?.nativeElement.showModal();
 }
 cerrarDisponibilidad():void{
  if(!this.saving()&&this.disponibilidadDialog?.nativeElement.open)this.disponibilidadDialog.nativeElement.close();
 }
 utilizarSugerencia():void{
  const d=this.data();if(!d||!this.editable)return;
  this.cantidadKg=d.sugeridoKg;
  this.estado=this.cantidadKg>0?'DISPONIBLE':'NO_DISPONIBLE';
 }
 guardar():void{
  const kg=Number(this.cantidadKg);
  if(!this.editable||this.saving()||!this.data()||!this.uot.selectedId())return;
  if(!this.fechaDesde||!this.fechaHasta||this.fechaDesde>this.fechaHasta||
   this.fechaDesde.slice(0,4)!==String(this.anio)||this.fechaHasta.slice(0,4)!==String(this.anio)||
   !Number.isFinite(kg)||kg<0||kg>9999999999||
   (this.estado==='NO_DISPONIBLE'?kg!==0:kg<=0)){
   this.error.set('Revisa las fechas, el estado y la cantidad en kilogramos.');return;
  }
  const payload={anio:this.anio,version:this.data()?.version??0,fechaDesde:this.fechaDesde,fechaHasta:this.fechaHasta,
   estado:this.estado,cantidadKg:kg,observacion:this.observacion.trim()||null};
  this.saving.set(true);this.error.set(null);this.message.set(null);
  const scope=`PUT:${this.path()}:${this.uot.selectedId()}:${this.convenioId}:${this.anio}`;
  this.keys.idempotent(scope,payload,key=>this.http.put<Respuesta<Detalle>>(this.path(),payload,{
    params:this.params(),headers:new HttpHeaders({'X-Idempotency-Key':key}),
   }).pipe(map(x=>this.unwrap(x))))
   .pipe(finalize(()=>this.saving.set(false))).subscribe({
    next:r=>{this.saving.set(false);this.data.set(r);this.message.set('Disponibilidad guardada.');this.cerrarDisponibilidad();},
    error:e=>this.error.set(mapOpenApiError(e).message||String(e)),
   });
 }
}
