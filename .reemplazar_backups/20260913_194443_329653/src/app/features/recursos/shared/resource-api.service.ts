import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { RecursosService } from '../../../infrastructure/openapi/generated/api/recursos.service';
import { ResourceAssetCreateRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetCreateRequest';
import { ResourceAssetDetailResponse } from '../../../infrastructure/openapi/generated/model/resourceAssetDetailResponse';
import { ResourceAssetIncidentRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetIncidentRequest';
import { ResourceAssetResponse } from '../../../infrastructure/openapi/generated/model/resourceAssetResponse';
import { ResourceAssetStateChangeRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetStateChangeRequest';
import { ResourceAssetUpdateRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetUpdateRequest';
import { ResourceKardexResponse } from '../../../infrastructure/openapi/generated/model/resourceKardexResponse';
import { ResourceMovementRegisterRequest } from '../../../infrastructure/openapi/generated/model/resourceMovementRegisterRequest';
import { ResourceProductCreateRequest } from '../../../infrastructure/openapi/generated/model/resourceProductCreateRequest';
import { ResourceProductPriceVersionRequest } from '../../../infrastructure/openapi/generated/model/resourceProductPriceVersionRequest';
import { ResourceProductResponse } from '../../../infrastructure/openapi/generated/model/resourceProductResponse';
import { ResourceStockResponse } from '../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { ResourceWarehouseCreateRequest } from '../../../infrastructure/openapi/generated/model/resourceWarehouseCreateRequest';
import { ResourceWarehouseResponse } from '../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { ResourceWarehouseShareRequest } from '../../../infrastructure/openapi/generated/model/resourceWarehouseShareRequest';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { BASE_PATH } from '../../../infrastructure/openapi/generated/variables';

export interface ResourceProductPriceHistory {
  productoPrecioId: number;
  productoId: number;
  productoCodigo: string | null;
  producto: string | null;
  uotId: number;
  uotCodigo: string | null;
  uotNombre: string | null;
  precioVenta: number;
  moneda: string;
  version: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  vigente: boolean;
  usuarioId: number | null;
  nombreUsuario: string | null;
}

@Injectable({ providedIn: 'root' })
export class ResourceApiService {
  private readonly api = inject(RecursosService);
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH);
  private readonly idempotency = inject(IdempotencyKeyService);

  listAssets(uotId?: number) {
    return this.api
      .recursosBienesListar({ uotId }, 'body', false, { transferCache: false })
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceAssetResponse[]>(response) ?? [],
        ),
      );
  }

  getAsset(id: number) {
    return this.api
      .recursosBienesVer({ id }, 'body', false, { transferCache: false })
      .pipe(
        map((response) =>
          unwrapApiResponse<ResourceAssetDetailResponse>(response),
        ),
      );
  }

  createAsset(body: ResourceAssetCreateRequest) {
    return this.api
      .recursosBienesCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          resourceAssetCreateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  updateAsset(id: number, body: ResourceAssetUpdateRequest) {
    return this.api
      .recursosBienesEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          resourceAssetUpdateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  changeAssetState(id: number, body: ResourceAssetStateChangeRequest) {
    return this.api
      .recursosBienesCambiarEstado(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          resourceAssetStateChangeRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  reportAssetIncident(id: number, body: ResourceAssetIncidentRequest) {
    return this.api
      .recursosBienesRegistrarIncidente(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          resourceAssetIncidentRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  listProducts(uotId?: number) {
    return this.api
      .recursosProductosListar(
        { uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceProductResponse[]>(response) ?? [],
        ),
      );
  }

  createProduct(body: ResourceProductCreateRequest) {
    return this.api
      .recursosProductosCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          resourceProductCreateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  versionProductPrice(id: number, body: ResourceProductPriceVersionRequest) {
    return this.api
      .recursosProductosVersionarPrecio(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          resourceProductPriceVersionRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }


  listProductPriceHistory(productId: number, uotId: number) {
    const params = new HttpParams().set('uotId', String(uotId));
    return this.http
      .get<ApiEnvelope<ResourceProductPriceHistory[]>>(
        `${this.basePath}/api/v1/recursos/productos/${productId}/precios/historial`,
        { params },
      )
      .pipe(map((response) => unwrapApiResponse(response) ?? []));
  }

  listWarehouses(uotId?: number) {
    return this.api
      .recursosAlmacenesListar(
        { uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceWarehouseResponse[]>(response) ?? [],
        ),
      );
  }

  createWarehouse(body: ResourceWarehouseCreateRequest) {
    return this.api
      .recursosAlmacenesCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          resourceWarehouseCreateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  shareWarehouse(id: number, body: ResourceWarehouseShareRequest) {
    return this.api
      .recursosAlmacenesCompartir(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          resourceWarehouseShareRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  listStock(uotId?: number, almacenId?: number) {
    return this.api
      .recursosStockListar(
        { uotId, almacenId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceStockResponse[]>(response) ?? [],
        ),
      );
  }

  listKardex(uotId?: number, almacenId?: number, productoId?: number) {
    return this.api
      .recursosKardexListar(
        { uotId, almacenId, productoId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceKardexResponse[]>(response) ?? [],
        ),
      );
  }

  registerMovement(body: ResourceMovementRegisterRequest) {
    return this.api
      .recursosMovimientosRegistrar(
        {
          xIdempotencyKey: this.idempotency.create(),
          resourceMovementRegisterRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
