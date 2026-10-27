import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../core/http/services/idempotency-key.service';
import { VentasService } from '../../../../infrastructure/openapi/generated/api/ventas.service';
import { SaleCancelRequest } from '../../../../infrastructure/openapi/generated/model/saleCancelRequest';
import { SaleCreateRequest } from '../../../../infrastructure/openapi/generated/model/saleCreateRequest';
import { SaleDetailResponse } from '../../../../infrastructure/openapi/generated/model/saleDetailResponse';
import { SalePaymentCancelRequest } from '../../../../infrastructure/openapi/generated/model/salePaymentCancelRequest';
import { SalePaymentMethodResponse } from '../../../../infrastructure/openapi/generated/model/salePaymentMethodResponse';
import { SalePaymentRequest } from '../../../../infrastructure/openapi/generated/model/salePaymentRequest';
import { SaleReceiptRequest } from '../../../../infrastructure/openapi/generated/model/saleReceiptRequest';
import { SaleSummaryResponse } from '../../../../infrastructure/openapi/generated/model/saleSummaryResponse';
import { unwrapApiResponse } from '../../../../infrastructure/openapi/api-response-unwrapper';

@Injectable({ providedIn: 'root' })
export class VentasApiService {
  private readonly api = inject(VentasService);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(uotId?: number, estado?: string) {
    return this.api
      .ventasListar({ uotId, estado }, 'body', false, { transferCache: false })
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<SaleSummaryResponse[]>(response) ?? [],
        ),
      );
  }

  get(id: number) {
    return this.api
      .ventasVer({ id }, 'body', false, { transferCache: false })
      .pipe(map((response) => unwrapApiResponse<SaleDetailResponse>(response)));
  }

  paymentMethods() {
    return this.api
      .ventasMetodosPagoListar({}, 'body', false, { transferCache: false })
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<SalePaymentMethodResponse[]>(response) ?? [],
        ),
      );
  }

  create(body: SaleCreateRequest) {
    return this.api
      .ventasCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          saleCreateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  pay(id: number, body: SalePaymentRequest) {
    return this.api
      .ventasRegistrarPago(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          salePaymentRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  cancelPayment(id: number, body: SalePaymentCancelRequest) {
    return this.api
      .ventasPagoAnular(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          salePaymentCancelRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  deliver(id: number) {
    return this.api
      .ventasEntregar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  cancel(id: number, body: SaleCancelRequest) {
    return this.api
      .ventasAnular(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          saleCancelRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  receipt(id: number, body: SaleReceiptRequest) {
    return this.api
      .ventasComprobanteEmitir(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          saleReceiptRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
