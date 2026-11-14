import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCashRegister, faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { RegistrarCobroCompradorUseCase } from '../../../../../application/use-case/registrar-cobro-comprador.use-case';
import { SubirDocumentoEvidenciaUseCase } from '../../../../../../../documentos-evidencias/application/use-case/subir-documento-evidencia.use-case';
export interface CobroCompradorFormResult { saved:boolean; id?:number; }
@Component({selector:'app-cobro-comprador-form',standalone:true,imports:[ReactiveFormsModule,FaIconComponent],
 templateUrl:'./cobro-comprador-form.html',styleUrl:'./cobro-comprador-form.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class CobroCompradorFormComponent {
 @ViewChild('dialog',{static:true}) private dialog!:ElementRef<HTMLDialogElement>;
 private readonly fb=inject(FormBuilder);
 private readonly create=inject(RegistrarCobroCompradorUseCase);
 private readonly evidence=inject(SubirDocumentoEvidenciaUseCase);
 private readonly toast=inject(ToastService);
 private resolver:((r:CobroCompradorFormResult)=>void)|null=null;
 readonly saving=signal(false);readonly campaniaFijada=signal(false);readonly compradorNombre=signal('');
 readonly error=signal<string|null>(null);readonly pageIcon=faCashRegister;readonly saveIcon=faFloppyDisk;readonly closeIcon=faXmark;
 readonly tope=signal<number|null>(null);readonly archivo=signal<File|null>(null);
 readonly medios=['TRANSFERENCIA','DEPOSITO','YAPE','PLIN','EFECTIVO'] as const;
 readonly form=this.fb.nonNullable.group({campaniaVentaId:[0,[Validators.required,Validators.min(1)]],
  operativoVentaId:[0],importe:[0,[Validators.required,Validators.min(.01)]],moneda:['PEN',[Validators.required]],
  medioPago:['TRANSFERENCIA',[Validators.required]],numeroOperacion:['',[Validators.maxLength(120)]]});
 readonly efectivo=signal(false);
 constructor(){this.form.controls.medioPago.valueChanges.subscribe(m=>{
  const cash=m==='EFECTIVO';this.efectivo.set(cash);
  if(cash)this.form.controls.numeroOperacion.setValue('',{emitEvent:false});
 });}
 open(campaniaVentaId=0,operativoVentaId=0,comprador='',saldoMax?:number):Promise<CobroCompradorFormResult>{
  this.form.reset({campaniaVentaId,operativoVentaId,importe:0,moneda:'PEN',medioPago:'TRANSFERENCIA',numeroOperacion:''});
  this.efectivo.set(false);this.archivo.set(null);this.tope.set(saldoMax===undefined?null:Math.max(0,saldoMax));
  this.campaniaFijada.set(campaniaVentaId>0);this.compradorNombre.set(comprador);this.error.set(null);
  this.dialog.nativeElement.showModal();return new Promise(r=>this.resolver=r);
 }
 seleccionarArchivo(event:Event):void{const input=event.target as HTMLInputElement;this.archivo.set(input.files?.[0]??null);}
 close():void{if(!this.saving())this.finish({saved:false});}
 submit():void{
  const v=this.form.getRawValue();const importe=Number(v.importe);
  if(this.form.invalid||this.saving()||!Number.isFinite(importe)||importe<=0||Math.abs(Math.round(importe*100)-importe*100)>0.000001||
     (this.tope()!==null && importe>this.tope()!+0.000001)){
   this.error.set('Indica un importe válido, en céntimos y sin superar el saldo disponible.');this.form.markAllAsTouched();return;
  }
  const medio=v.medioPago.trim().toUpperCase();
  if(!this.medios.some(m=>m===medio)) {this.error.set('Medio de cobro no válido.');return;}
  const operacion=medio==='EFECTIVO'?undefined:v.numeroOperacion.trim()||undefined;
  if(medio!=='EFECTIVO'&&!operacion){this.error.set('Ingresa el número de operación del cobro.');return;}
  const file=this.archivo();
  if(file && (!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size>10*1024*1024)){
   this.error.set('Adjunta un PDF o imagen JPG, PNG o WebP de máximo 10 MB.');return;
  }
  this.saving.set(true);this.error.set(null);
  this.create.execute({campaniaVentaId:v.campaniaVentaId,operativoVentaId:v.operativoVentaId>0?v.operativoVentaId:undefined,
   importe,moneda:'PEN',medioPago:medio,numeroOperacion:operacion}).subscribe({
    next:id=>{
     if(!file){this.toast.success('Cobro registrado');this.saving.set(false);this.finish({saved:true,id});return;}
     this.evidence.execute({file,tipoEvidencia:'COMPROBANTE',categoria:'COMPROBANTE',
      contexto:{tipo:'COBRO',id}}).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success('Cobro y comprobante registrados');this.finish({saved:true,id});},
      error:e=>{this.toast.error('Cobro registrado, pero no se pudo adjuntar el comprobante',mapOpenApiError(e).message);
       this.finish({saved:true,id});}
     });
    },
    error:e=>{this.saving.set(false);const m=mapOpenApiError(e).message;this.error.set(m);this.toast.error('No se pudo registrar el cobro',m);}
  });
 }
 private finish(r:CobroCompradorFormResult):void{if(this.dialog.nativeElement.open)this.dialog.nativeElement.close();this.resolver?.(r);this.resolver=null;}
}
