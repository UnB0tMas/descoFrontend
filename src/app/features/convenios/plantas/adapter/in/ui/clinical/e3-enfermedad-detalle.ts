import {CommonModule} from '@angular/common';
import {AfterViewInit,ChangeDetectionStrategy,Component,ElementRef,EventEmitter,Input,OnInit,Output,ViewChild,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {AppButtonComponent} from '../../../../../../../shared/actions/app-button/app-button';
import {AppRadioGroupComponent,AppRadioOption} from '../../../../../../../shared/forms/app-radio-group/app-radio-group';
import {Observable,finalize} from 'rxjs';
import {ToastService} from '../../../../../../../shared/feedback/toast-center/toast.service';
import {mapOpenApiError} from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {AmbitoE3,CatalogosE3,EstadoPlantaE3} from '../../../../domain/planta-paltera.model';
import {E3ClinicalService,EnfermedadDetalleE3} from './e3-clinical.service';

type AccionEnfermedad='editar'|'recuperar'|'eliminar'|null;
@Component({selector:'app-e3-enfermedad-detalle',standalone:true,imports:[CommonModule,FormsModule,AppButtonComponent,AppRadioGroupComponent],
 templateUrl:'./e3-enfermedad-detalle.html',styleUrl:'./e3-enfermedad-detalle.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class E3EnfermedadDetalleComponent implements OnInit,AfterViewInit {
 @Input({required:true}) ambito!:AmbitoE3;
 @Input({required:true}) plantaId!:number;
 @Input({required:true}) episodioId!:number;
 @Input({required:true}) catalogos!:CatalogosE3;
 @Input({required:true}) estadoPlanta!:EstadoPlantaE3;
 @Input() editable=false;
 @Input() accionInicial:'editar'|'recuperar'|'eliminar'|null=null;
 @Output() changed=new EventEmitter<void>();
 @Output() closed=new EventEmitter<void>();
 @ViewChild('modal',{static:true}) modal!:ElementRef<HTMLDialogElement>;
 private readonly service=inject(E3ClinicalService);
 private readonly toast=inject(ToastService);
 readonly detalle=signal<EnfermedadDetalleE3|null>(null);
 readonly loading=signal(true);readonly saving=signal(false);
 readonly error=signal<string|null>(null);
 readonly accion=signal<AccionEnfermedad>(null);
 diagnosticoId=0;observacion='';motivo='';fechaCuracion='';comentarioCierre='';resultadoCierre:''|'CONTROLADA'|'NO_CONTROLADA'='';
 ngOnInit():void{this.accion.set(this.accionInicial);this.cargar();}
 ngAfterViewInit():void{this.modal.nativeElement.showModal();}
 private today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 readonly hoy=this.today();
 readonly closeIcon=faXmark;
 opcionesCierre():readonly AppRadioOption[]{return [
  {value:'CONTROLADA',label:'Controlada',disabled:!this.detalle()?.tratamientos.length},
  {value:'NO_CONTROLADA',label:'No controlada (muerte de la planta)',disabled:this.estadoPlanta!=='ENFERMA'}
 ];}
 seleccionarResultado(value:string):void{
  if(this.saving()||!this.puedeModificar()||this.accion()!=='recuperar')return;
  if(value!=='CONTROLADA'&&value!=='NO_CONTROLADA')return;
  if(this.opcionesCierre().find(x=>x.value===value)?.disabled)return;
  if(this.resultadoCierre===value)return;
  this.resultadoCierre=value;this.fechaCuracion='';this.comentarioCierre='';this.error.set(null);
 }
 readonly puedeModificar=()=>this.editable&&this.estadoPlanta!=='MUERTA'&&this.estadoPlanta!=='ELIMINADA'&&this.detalle()?.estado==='VIGENTE';
 cargar():void{
  this.loading.set(true);this.error.set(null);
  this.service.detalleEnfermedad(this.ambito,this.plantaId,this.episodioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:d=>{this.detalle.set({...d,tratamientos:d.tratamientos??[]});this.diagnosticoId=d.diagnosticoId;this.observacion=d.observacion??'';},
   error:e=>this.error.set(mapOpenApiError(e).message),
  });
 }
 private mutation(request:Observable<unknown>,mensaje:string){
  if(this.saving())return;this.saving.set(true);this.error.set(null);
  // La suscripción se completa en la respuesta HTTP; nunca presumir éxito antes de recibirla.
  request.pipe(finalize(()=>this.saving.set(false))).subscribe({
   next:()=>{this.toast.success(mensaje);this.accion.set(null);this.changed.emit();this.cargar();},
   error:(e:unknown)=>this.error.set(mapOpenApiError(e).message)
  });
 }
 iniciarAccion(accion:AccionEnfermedad){if(this.saving())return;this.accion.set(accion);this.error.set(null);if(accion==='recuperar'){this.resultadoCierre='';this.fechaCuracion='';this.comentarioCierre='';}}
 puedeFinalizar():boolean{const d=this.detalle();return this.puedeModificar()&&!this.saving()&&!!this.resultadoCierre&&(this.resultadoCierre==='NO_CONTROLADA'?this.estadoPlanta==='ENFERMA'&&this.comentarioCierre.trim().length>=5:!!d?.tratamientos.length);}
 guardarEdicion():void{
  if(!this.puedeModificar()||this.diagnosticoId<1)return;
  this.mutation(this.service.editarEnfermedad(this.ambito,this.plantaId,this.episodioId,this.diagnosticoId,this.observacion.trim()||undefined),'Enfermedad actualizada');
 }
 recuperar():void{
  if(!this.puedeFinalizar()||!this.resultadoCierre)return;
  const muerte=this.resultadoCierre==='NO_CONTROLADA';
  const fecha=!muerte&&this.fechaCuracion&&this.fechaCuracion!==this.today()?`${this.fechaCuracion}T12:00:00Z`:undefined;
  this.mutation(this.service.recuperarEnfermedad(this.ambito,this.plantaId,this.episodioId,fecha,this.comentarioCierre.trim()||undefined,this.resultadoCierre),muerte?'Enfermedad no controlada. Planta registrada como muerta.':'Recuperación registrada');
 }
 eliminar():void{
  if(!this.puedeModificar()||this.motivo.trim().length<5)return;
  this.mutation(this.service.eliminarEnfermedad(this.ambito,this.plantaId,this.episodioId,this.motivo.trim()),'Enfermedad retirada del registro activo');
 }
 cerrar(){if(this.saving())return;this.modal.nativeElement.close();this.closed.emit();}
}
