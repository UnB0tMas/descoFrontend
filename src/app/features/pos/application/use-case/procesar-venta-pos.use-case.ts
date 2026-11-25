import { Inject, Injectable } from '@angular/core';
import {
  Observable,
  concatMap,
  from,
  last,
  catchError,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { PosCheckoutInput, PosCheckoutResult } from '../../domain/pos.model';
import { PosCartStore } from '../../state/pos-cart.store';
import { POS_GATEWAY, PosGateway } from '../port/out/pos.gateway';

@Injectable()
export class ProcesarVentaPosUseCase {
  constructor(
    @Inject(POS_GATEWAY)
    private readonly gateway: PosGateway,
    private readonly cart: PosCartStore,
  ) {}

  execute(input: PosCheckoutInput): Observable<PosCheckoutResult> {
    const sale$ = input.pendingSaleId
      ? this.gateway.getSale(input.pendingSaleId)
      : this.gateway
          .createSale(
            {
              uotId: input.uotId,
              warehouseId: input.warehouseId,
              customer: input.customer,
              items: input.items,
              observation: input.observation,
            },
            input.createIdempotencyKey,
          )
          .pipe(
            tap((saleId) => {
              this.cart.markPendingSale(saleId);
              this.cart.markCreationUncertain(false);
            }),
            switchMap((saleId) => this.gateway.getSale(saleId)),
            catchError((error) => {
              this.cart.markCreationUncertain(this.isTransient(error));
              return throwError(() => error);
            }),
          );

    return sale$.pipe(
      switchMap((sale) => {
        if (sale.state === 'ANULADA') {
          return throwError(
            () => new Error('La venta pendiente fue anulada y no puede continuar.'),
          );
        }

        this.cart.markPendingSale(sale.saleId);

        if (sale.state === 'ENTREGADA') return of(sale);
        if (input.payments.length === 0) {
          return throwError(() => new Error('Debe registrar al menos un medio de pago.'));
        }
        if (Math.round(input.payments.reduce((sum, p) => sum + p.amount, 0) * 100)
            !== Math.round(sale.total * 100)) {
          return throwError(() => new Error('La suma de los pagos no coincide con el total de la venta.'));
        }
        // Se reenvían desde la primera cuota: cada una usa una clave ESTABLE por posición.
        // Los pagos previos se reconocen en SQL Server y no generan cobros duplicados.
        return from(input.payments.map((payment, index) => ({payment,index}))).pipe(
          concatMap(({payment,index}) => this.gateway.paySale(
            sale.saleId,payment.paymentMethodId,payment.amount,payment.operationNumber,
            this.paymentKey(input.paymentIdempotencyKey,index),payment.archivoId)),
          last(),
          switchMap(() => this.gateway.getSale(sale.saleId)),
          switchMap(updated => updated.balance > 0.009
            ? throwError(() => new Error('La venta conserva un saldo pendiente.')) : of(updated)),
        );
      }),
      switchMap((sale) => {
        if (sale.state === 'ENTREGADA') {
          return of(sale);
        }

        return this.gateway
          .deliverSale(
            sale.saleId,
            input.deliveryIdempotencyKey,
          )
          .pipe(
            switchMap(() => this.gateway.getSale(sale.saleId)),
          );
      }),
      map((sale) => ({
        saleId: sale.saleId,
        total: sale.total,
        currency: sale.currency,
        state: sale.state,
      })),
    );
  }

  /** El primer pago mantiene la clave histórica; los demás derivan claves UUID diferentes. */
  private paymentKey(base: string, index: number): string {
    if (index === 0) return base;
    return base.replace(/^[0-9a-f]{8}/i, head =>
      ((parseInt(head, 16) + index) >>> 0).toString(16).padStart(8, '0'));
  }

  private isTransient(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('status' in error)) {
      return false;
    }

    const status = Number((error as { status?: unknown }).status);

    return status === 0
      || status === 408
      || status === 425
      || status === 429
      || (Number.isFinite(status) && status >= 500);
  }
}
