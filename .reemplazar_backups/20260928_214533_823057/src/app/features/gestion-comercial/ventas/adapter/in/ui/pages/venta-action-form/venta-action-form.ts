import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faCreditCard,
  faFileInvoice,
  faFloppyDisk,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { SalePaymentMethodResponse } from '../../../../../../../../infrastructure/openapi/generated/model/salePaymentMethodResponse';
import { SalePaymentResponse } from '../../../../../../../../infrastructure/openapi/generated/model/salePaymentResponse';
import {
  SaleReceiptRequestTipoEnum,
} from '../../../../../../../../infrastructure/openapi/generated/model/saleReceiptRequest';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { VentasApiService } from '../../../../../shared/ventas-api.service';

type SaleActionMode = 'payment' | 'receipt' | 'cancel-sale' | 'cancel-payment';

@Component({
  selector: 'app-venta-action-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent, NgTemplateOutlet],
  templateUrl: './venta-action-form.html',
  styleUrl: './venta-action-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaActionFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(VentasApiService);
  private readonly toast = inject(ToastService);

  readonly mode = signal<SaleActionMode>('payment');
  readonly saleId = signal(0);
  readonly payment = signal<SalePaymentResponse | null>(null);
  readonly methods = signal<readonly SalePaymentMethodResponse[]>([]);
  readonly saving = signal(false);
  readonly loadingMethods = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly paymentIcon = faCreditCard;
  readonly receiptIcon = faFileInvoice;
  readonly cancelIcon = faBan;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  readonly paymentForm = this.fb.nonNullable.group({
    metodoPagoId: [0, [Validators.required, Validators.min(1)]],
    importe: [0, [Validators.required, Validators.min(0.01)]],
    numeroOperacion: ['', [Validators.maxLength(120)]],
  });

  readonly receiptForm = this.fb.nonNullable.group({
    tipo: [SaleReceiptRequestTipoEnum.Boleta, [Validators.required]],
    serie: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(20)],
    ],
    numero: [0, [Validators.required, Validators.min(1)]],
    documentoCliente: ['', [Validators.maxLength(30)]],
    nombreCliente: ['', [Validators.maxLength(200)]],
  });

  readonly reasonForm = this.fb.nonNullable.group({
    motivo: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(500)],
    ],
  });

  private resolver: ((result: AdminModalResult) => void) | null = null;

  openPayment(id: number, suggestedAmount = 0): Promise<AdminModalResult> {
    this.prepare('payment', id);
    this.paymentForm.reset({
      metodoPagoId: 0,
      importe: Math.max(0, suggestedAmount),
      numeroOperacion: '',
    });
    this.loadMethods();
    return this.show();
  }

  openReceipt(id: number): Promise<AdminModalResult> {
    this.prepare('receipt', id);
    this.receiptForm.reset({
      tipo: SaleReceiptRequestTipoEnum.Boleta,
      serie: '',
      numero: 0,
      documentoCliente: '',
      nombreCliente: '',
    });
    return this.show();
  }

  openCancelSale(id: number): Promise<AdminModalResult> {
    this.prepare('cancel-sale', id);
    this.reasonForm.reset({ motivo: '' });
    return this.show();
  }

  openCancelPayment(
    payment: SalePaymentResponse,
  ): Promise<AdminModalResult> {
    this.prepare('cancel-payment', 0);
    this.payment.set(payment);
    this.reasonForm.reset({ motivo: '' });
    return this.show();
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    switch (this.mode()) {
      case 'receipt':
        this.saveReceipt();
        break;
      case 'cancel-sale':
        this.saveCancelSale();
        break;
      case 'cancel-payment':
        this.saveCancelPayment();
        break;
      default:
        this.savePayment();
        break;
    }
  }

  title(): string {
    switch (this.mode()) {
      case 'receipt':
        return 'Emitir comprobante';
      case 'cancel-sale':
        return 'Anular venta';
      case 'cancel-payment':
        return 'Anular pago';
      default:
        return 'Registrar pago';
    }
  }

  icon() {
    if (this.mode() === 'receipt') return this.receiptIcon;
    if (this.mode().startsWith('cancel')) return this.cancelIcon;
    return this.paymentIcon;
  }

  paymentMethodRequiresOperation(): boolean {
    const id = Number(this.paymentForm.controls.metodoPagoId.value);
    return this.methods().find((method) => method.metodoPagoId === id)
      ?.requiereNumeroOperacion === true;
  }

  onPaymentMethodChange(): void {
    const control = this.paymentForm.controls.numeroOperacion;
    if (this.paymentMethodRequiresOperation()) {
      control.setValidators([
        Validators.required,
        notBlankValidator,
        Validators.maxLength(120),
      ]);
    } else {
      control.setValidators([Validators.maxLength(120)]);
    }
    control.updateValueAndValidity();
  }

  private savePayment(): void {
    this.onPaymentMethodChange();
    this.paymentForm.markAllAsTouched();
    if (this.paymentForm.invalid || this.saving()) return;

    const raw = this.paymentForm.getRawValue();
    this.run(
      this.api.pay(this.saleId(), {
        metodoPagoId: Number(raw.metodoPagoId),
        importe: Number(raw.importe),
        numeroOperacion: normalizeOptionalText(raw.numeroOperacion),
      }),
      'Pago registrado',
    );
  }

  private saveReceipt(): void {
    this.receiptForm.markAllAsTouched();
    if (this.receiptForm.invalid || this.saving()) return;

    const raw = this.receiptForm.getRawValue();
    this.run(
      this.api.receipt(this.saleId(), {
        tipo: raw.tipo,
        serie: raw.serie.trim().toUpperCase(),
        numero: Number(raw.numero),
        documentoCliente: normalizeOptionalText(raw.documentoCliente),
        nombreCliente: normalizeOptionalText(raw.nombreCliente),
      }),
      'Comprobante emitido',
    );
  }

  private saveCancelSale(): void {
    this.reasonForm.markAllAsTouched();
    if (this.reasonForm.invalid || this.saving()) return;

    this.run(
      this.api.cancel(this.saleId(), {
        motivo: normalizeText(this.reasonForm.controls.motivo.value),
      }),
      'Venta anulada',
    );
  }

  private saveCancelPayment(): void {
    const paymentId = this.payment()?.pagoVentaId;
    this.reasonForm.markAllAsTouched();

    if (!paymentId || this.reasonForm.invalid || this.saving()) return;

    this.run(
      this.api.cancelPayment(paymentId, {
        motivo: normalizeText(this.reasonForm.controls.motivo.value),
      }),
      'Pago anulado',
    );
  }

  private loadMethods(): void {
    this.loadingMethods.set(true);
    this.api
      .paymentMethods()
      .pipe(finalize(() => this.loadingMethods.set(false)))
      .subscribe({
        next: (items) => {
          this.methods.set(items);
          this.paymentForm.controls.metodoPagoId.setValue(
            items[0]?.metodoPagoId ?? 0,
          );
          this.onPaymentMethodChange();
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private run(operation: import('rxjs').Observable<unknown>, success: string): void {
    this.saving.set(true);
    this.errorMessage.set(null);

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(success);
        this.finish({ saved: true, value: null });
      },
      error: (error) => {
        const message = mapOpenApiError(error).message;
        this.errorMessage.set(message);
        this.toast.error('No se pudo completar la operación', message);
      },
    });
  }

  private prepare(mode: SaleActionMode, saleId: number): void {
    this.mode.set(mode);
    this.saleId.set(saleId);
    this.payment.set(null);
    this.errorMessage.set(null);
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.payment.set(null);
  }
}
