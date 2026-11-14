import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ObtenerGastoUseCase } from '../../../../../finanzas/gastos/application/use-case/obtener-gasto.use-case';
import { GastoDetalle } from '../../../../../finanzas/gastos/domain/gasto.model';
import { EvidencePanelComponent } from '../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { EvidenciaContexto } from '../../../../../documentos-evidencias/domain/evidencia-contexto.model';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { finalize } from 'rxjs';

@Component({selector:'app-e5-expense-detail',standalone:true,
 imports:[CommonModule,FaIconComponent,EvidencePanelComponent],
 templateUrl:'./e5-expense-detail.html',styleUrl:'./e5-expense-detail.css',
 changeDetection:ChangeDetectionStrategy.OnPush})
export class E5ExpenseDetailComponent {
 @ViewChild('dialog',{static:true}) private dialog!:ElementRef<HTMLDialogElement>;
 private readonly get=inject(ObtenerGastoUseCase);
 readonly info=signal<GastoDetalle|null>(null);
 readonly context=signal<EvidenciaContexto|null>(null);
 readonly loading=signal(false);
 readonly error=signal<string|null>(null);
 readonly viewIcon=faEye; readonly closeIcon=faXmark;
 open(id:number):void {
  if(!Number.isSafeInteger(id)||id<1)return;
  this.info.set(null);this.context.set({tipo:'GASTO',id});this.error.set(null);this.loading.set(true);
  this.dialog.nativeElement.showModal();
  this.get.execute(id).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:d=>this.info.set(d),error:e=>this.error.set(mapOpenApiError(e).message),
  });
 }
 close():void {this.dialog.nativeElement.close();}
}
