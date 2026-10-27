import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBan,
  faCreditCard,
  faFileInvoice,
  faRotate,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { SaleDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/saleDetailResponse';
import { SalePaymentResponse } from '../../../../../../../../infrastructure/openapi/generated/model/salePaymentResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { AppAlertService } from '../../../../../../../../shared/feedback/app-alert/app-alert.service';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { VentasApiService } from '../../../../../shared/ventas-api.service';
import { VentaActionFormComponent } from '../venta-action-form/venta-action-form';

@Component({
  selector: 'app-venta-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    VentaActionFormComponent,
  ],
  templateUrl: './venta-detail.html',
  styleUrl: './venta-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaDetailPage implements OnInit {
  @ViewChild(VentaActionFormComponent)
  private actionForm!: VentaActionFormComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(VentasApiService);
  private readonly alert = inject(AppAlertService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<SaleDetailResponse | null>(null);

  readonly backIcon = faArrowLeft;
  readonly refreshIcon = faRotate;
  readonly paymentIcon = faCreditCard;
  readonly receiptIcon = faFileInvoice;
  readonly deliverIcon = faTruck;
  readonly cancelIcon = faBan;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.saleId();
    if (!id) {
      this.errorMessage.set('El identificador de la venta no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  async pay(): Promise<void> {
    const sale = this.detail()?.venta;
    if (!sale?.ventaId) return;
    const result = await this.actionForm.openPayment(
      sale.ventaId,
      Math.max(0, sale.saldo ?? 0),
    );
    if (result.saved) this.load();
  }

  async receipt(): Promise<void> {
    const id = this.detail()?.venta?.ventaId;
    if (!id) return;
    const result = await this.actionForm.openReceipt(id);
    if (result.saved) this.load();
  }

  async cancelSale(): Promise<void> {
    const id = this.detail()?.venta?.ventaId;
    if (!id) return;
    const result = await this.actionForm.openCancelSale(id);
    if (result.saved) this.load();
  }

  async cancelPayment(payment: SalePaymentResponse): Promise<void> {
    const result = await this.actionForm.openCancelPayment(payment);
    if (result.saved) this.load();
  }

  async deliver(): Promise<void> {
    const sale = this.detail()?.venta;
    if (!sale?.ventaId || this.actionLoading()) return;

    const answer = await this.alert.question(
      'Entregar venta',
      'La entrega consumirá definitivamente el stock reservado o disponible. ¿Deseas continuar?',
      'Entregar',
      'Cancelar',
    );

    if (!answer.confirmed) return;

    this.actionLoading.set(true);
    this.api
      .deliver(sale.ventaId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Venta entregada');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo entregar la venta',
            mapOpenApiError(error).message,
          ),
      });
  }

  canPay(): boolean {
    const sale = this.detail()?.venta;
    return Boolean(
      sale &&
        (sale.saldo ?? 0) > 0 &&
        sale.estadoVenta !== 'ANULADA' &&
        sale.estadoVenta !== 'ENTREGADA',
    );
  }

  canDeliver(): boolean {
    const sale = this.detail()?.venta;
    return Boolean(
      sale &&
        (sale.saldo ?? 0) === 0 &&
        sale.estadoVenta !== 'ANULADA' &&
        sale.estadoVenta !== 'ENTREGADA',
    );
  }

  canCancel(): boolean {
    const state = this.detail()?.venta?.estadoVenta;
    return Boolean(state && state !== 'ANULADA' && state !== 'ENTREGADA');
  }

  activePayments(): readonly SalePaymentResponse[] {
    return (this.detail()?.pagos ?? []).filter(
      (payment) => payment.estadoPago !== 'ANULADO',
    );
  }

  private saleId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }
}
