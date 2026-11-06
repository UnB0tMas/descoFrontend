import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSliders, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ResourceStockResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { DialogBackdropDirective } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { notBlankValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { ResourceApiService, WarehouseProductOperation } from '../../../../../../shared/resource-api.service';

@Component({
  selector:'app-almacen-producto-form',standalone:true,
  imports:[ReactiveFormsModule,FaIconComponent,DialogBackdropDirective,FormErrorComponent],
  templateUrl:'./almacen-producto-form.html',
  styles:[':host{display:contents}.warehouse-product-summary{grid-column:1/-1;display:grid;gap:.25rem;padding:.85rem;border:1px solid var(--desco-border);border-radius:.85rem;background:var(--desco-surface-soft)}.warehouse-product-summary small{color:var(--desco-text-muted)}'],
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class AlmacenProductoFormComponent {
  @ViewChild('dialog',{static:true}) private dialog!:ElementRef<HTMLDialogElement>;
  private readonly fb=inject(FormBuilder);private readonly api=inject(ResourceApiService);private readonly toast=inject(ToastService);
  readonly item=signal<ResourceStockResponse|null>(null);readonly operation=signal<WarehouseProductOperation>('EDITAR');
  readonly saving=signal(false);readonly error=signal<string|null>(null);readonly icon=faSliders;readonly closeIcon=faXmark;
  private uotId=0;private resolver:((saved:boolean)=>void)|null=null;
  readonly form=this.fb.nonNullable.group({
    stockMinimo:[0,[Validators.required,Validators.min(0),Validators.pattern(/^\d+(?:\.\d{1,3})?$/)]],
    motivo:['',[Validators.required,notBlankValidator,Validators.maxLength(500)]],
  });
  title():string{return {EDITAR:'Editar configuración',DESACTIVAR:'Desactivar producto del almacén',REACTIVAR:'Reactivar producto del almacén',RETIRAR:'Retirar producto del almacén'}[this.operation()];}
  actionLabel():string{return {EDITAR:'Guardar',DESACTIVAR:'Desactivar',REACTIVAR:'Reactivar',RETIRAR:'Retirar'}[this.operation()];}
  show(item:ResourceStockResponse,uotId:number,operation:WarehouseProductOperation):Promise<boolean>{
    this.item.set(item);this.uotId=uotId;this.operation.set(operation);this.error.set(null);
    this.form.reset({stockMinimo:item.stockMinimo??0,motivo:''});
    this.form.controls.stockMinimo[operation==='EDITAR'?'enable':'disable']({emitEvent:false});
    this.dialog.nativeElement.showModal();return new Promise(resolve=>this.resolver=resolve);
  }
  close():void{if(!this.saving())this.finish(false);}
  save():void{
    this.form.markAllAsTouched();if(this.form.invalid){this.error.set('Complete un motivo y un stock mínimo válido cuando corresponda.');return;}
    const item=this.item();if(!item?.almacenId||!item.productoId||this.saving())return;
    this.saving.set(true);this.error.set(null);const value=this.form.getRawValue();
    this.api.manageWarehouseProduct(item.almacenId,item.productoId,{
      uotId:this.uotId,operacion:this.operation(),stockMinimo:this.operation()==='EDITAR'?value.stockMinimo:undefined,motivo:value.motivo.trim(),
    }).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success(this.operation()==='RETIRAR'?'Producto retirado del almacén':'Configuración del almacén actualizada');this.finish(true);},
      error:error=>{const message=mapOpenApiError(error).message;this.error.set(message);this.toast.error('No se pudo completar la operación',message);},
    });
  }
  private finish(saved:boolean):void{this.dialog.nativeElement.close();this.resolver?.(saved);this.resolver=null;}
}
