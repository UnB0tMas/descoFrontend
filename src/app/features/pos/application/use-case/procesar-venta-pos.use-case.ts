import { Inject, Injectable } from '@angular/core';
import {
  Observable,
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

        if (sale.balance <= 0) {
          return of(sale);
        }

        return this.gateway
          .paySale(
            sale.saleId,
            input.paymentMethodId,
            sale.balance,
            input.paymentOperation,
            input.paymentIdempotencyKey,
          )
          .pipe(
            switchMap(() => this.gateway.getSale(sale.saleId)),
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
