import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { SuministrosService } from '../../../infrastructure/openapi/generated/api/suministros.service';
import { PageResponseSupplySummaryResponse } from '../../../infrastructure/openapi/generated/model/pageResponseSupplySummaryResponse';
import { SupplyCreateRequest } from '../../../infrastructure/openapi/generated/model/supplyCreateRequest';
import { SupplyMovementCancelRequest } from '../../../infrastructure/openapi/generated/model/supplyMovementCancelRequest';
import { SupplyMovementCreateRequest } from '../../../infrastructure/openapi/generated/model/supplyMovementCreateRequest';
import { SupplyMovementResponse } from '../../../infrastructure/openapi/generated/model/supplyMovementResponse';
import { SupplySummaryResponse } from '../../../infrastructure/openapi/generated/model/supplySummaryResponse';
import { SupplyUpdateRequest } from '../../../infrastructure/openapi/generated/model/supplyUpdateRequest';

export interface SupplyPage {
  items: readonly SupplySummaryResponse[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class SupplyApiService {
  private readonly api = inject(SuministrosService);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(uotId?: number, page = 1, size = 100) {
    return this.api
      .suministrosUotListar(
        {
          uotId,
          pagina: page,
          tamano: size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          this.mapPage(
            unwrapApiResponse<PageResponseSupplySummaryResponse>(response),
            page,
            size,
          ),
        ),
      );
  }

  listAll(uotId?: number) {
    return this.list(uotId, 1, 200).pipe(map((page) => page.items));
  }

  create(body: SupplyCreateRequest) {
    return this.idempotency.idempotent(
      'recursos:suministros:crear',
      body,
      (key) =>
        this.api
          .suministrosUotCrear(
            {
              xIdempotencyKey: key,
              supplyCreateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  update(id: number, body: SupplyUpdateRequest) {
    return this.idempotency.idempotent(
      `recursos:suministros:editar:${id}`,
      body,
      (key) =>
        this.api
          .suministrosUotEditar(
            {
              id,
              xIdempotencyKey: key,
              supplyUpdateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  kardex(id: number, uotId?: number) {
    return this.api
      .suministrosUotKardex(
        { id, uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            (unwrapApiResponse<SupplyMovementResponse[]>(response) ?? []) as readonly SupplyMovementResponse[],
        ),
      );
  }

  registerMovement(id: number, body: SupplyMovementCreateRequest) {
    return this.idempotency.idempotent(
      `recursos:suministros:movimiento:${id}`,
      body,
      (key) =>
        this.api
          .suministrosUotMovimientoCrear(
            {
              id,
              xIdempotencyKey: key,
              supplyMovementCreateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  cancelMovement(
    id: number,
    body: SupplyMovementCancelRequest,
  ) {
    return this.idempotency.idempotent(
      `recursos:suministros:movimiento-anular:${id}`,
      body,
      (key) =>
        this.api
          .suministrosUotMovimientoAnular(
            {
              id,
              xIdempotencyKey: key,
              supplyMovementCancelRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  private mapPage(
    value: PageResponseSupplySummaryResponse | undefined,
    requestedPage: number,
    requestedSize: number,
  ): SupplyPage {
    return {
      items: [...(value?.items ?? [])],
      page: Number(value?.pagina ?? requestedPage),
      size: Number(value?.tamanio ?? requestedSize),
      totalRecords: Number(value?.totalRegistros ?? 0),
      totalPages: Number(value?.totalPaginas ?? 0),
    };
  }
}
