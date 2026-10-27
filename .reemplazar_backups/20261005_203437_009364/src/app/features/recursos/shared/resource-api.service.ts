import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { RecursosService } from '../../../infrastructure/openapi/generated/api/recursos.service';
import { PageResponseResourceAssetListItemResponse } from '../../../infrastructure/openapi/generated/model/pageResponseResourceAssetListItemResponse';
import { PageResponseResourceProductListItemResponse } from '../../../infrastructure/openapi/generated/model/pageResponseResourceProductListItemResponse';
import { ResourceAssetCreateRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetCreateRequest';
import { ResourceAssetDetailResponse } from '../../../infrastructure/openapi/generated/model/resourceAssetDetailResponse';
import { ResourceAssetIncidentRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetIncidentRequest';
import { ResourceAssetListItemResponse } from '../../../infrastructure/openapi/generated/model/resourceAssetListItemResponse';
import { ResourceAssetStateChangeRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetStateChangeRequest';
import { ResourceAssetUpdateRequest } from '../../../infrastructure/openapi/generated/model/resourceAssetUpdateRequest';
import { ResourceCodeSuggestionResponse } from '../../../infrastructure/openapi/generated/model/resourceCodeSuggestionResponse';
import { ResourceKardexResponse } from '../../../infrastructure/openapi/generated/model/resourceKardexResponse';
import { ResourceMovementRegisterRequest } from '../../../infrastructure/openapi/generated/model/resourceMovementRegisterRequest';
import { ResourceProductCreateRequest } from '../../../infrastructure/openapi/generated/model/resourceProductCreateRequest';
import { ResourceProductDetailResponse } from '../../../infrastructure/openapi/generated/model/resourceProductDetailResponse';
import { ResourceProductListItemResponse } from '../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { ResourceProductPriceHistoryResponse } from '../../../infrastructure/openapi/generated/model/resourceProductPriceHistoryResponse';
import { ResourceProductPriceReactivateRequest } from '../../../infrastructure/openapi/generated/model/resourceProductPriceReactivateRequest';
import { ResourceProductPriceVersionRequest } from '../../../infrastructure/openapi/generated/model/resourceProductPriceVersionRequest';
import { ResourceStockResponse } from '../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { ResourceWarehouseCreateRequest } from '../../../infrastructure/openapi/generated/model/resourceWarehouseCreateRequest';
import { ResourceWarehouseProductConfigureRequest } from '../../../infrastructure/openapi/generated/model/resourceWarehouseProductConfigureRequest';
import { ResourceWarehouseResponse } from '../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { ResourceWarehouseShareRequest } from '../../../infrastructure/openapi/generated/model/resourceWarehouseShareRequest';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { environment } from '../../../../environments/environment';
import { PageResult } from '../../../shared/models/page-result.model';

export type ResourceCodeKind = 'BIEN' | 'PRODUCTO' | 'ALMACEN' | 'SUMINISTRO';

export interface ResourceAssetListQuery {
  uotId?: number;
  search?: string;
  typeId?: number;
  state?: string;
  page?: number;
  size?: number;
}

export interface ResourceProductListQuery {
  uotId?: number;
  search?: string;
  category?: string;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface ResourceProductUpdateInput {
  uotContextoId: number;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  categoria?: string;
  requiereLote: boolean;
  controlaVencimiento: boolean;
}

export interface ResourceProductPriceHistory {
  productoPrecioId: number;
  productoId: number;
  productoCodigo: string | null;
  producto: string | null;
  uotId: number;
  uotCodigo: string | null;
  uotNombre: string | null;
  precioInicial: number;
  precioVenta: number;
  moneda: string;
  version: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  vigente: boolean;
  usuarioId: number | null;
  nombreUsuario: string | null;
  precioOrigenId: number | null;
  precioOrigenVersion: number | null;
}

@Injectable({ providedIn: 'root' })
export class ResourceApiService {
  private readonly api = inject(RecursosService);
  private readonly http = inject(HttpClient);
  private readonly idempotency = inject(IdempotencyKeyService);

  suggestCode(uotId: number, tipo: ResourceCodeKind) {
    return this.api
      .recursosCodigoSugerido({ uotId, tipo }, 'body', false, { transferCache: false })
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceCodeSuggestionResponse>(response)?.codigo?.trim() ?? '',
        ),
      );
  }

  listAssets(query: ResourceAssetListQuery = {}) {
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    return this.api
      .recursosBienesListar(
        {
          uotId: query.uotId,
          buscar: query.search?.trim() || undefined,
          tipoBienId: query.typeId,
          estado: query.state?.trim() || undefined,
          pagina: page,
          tamano: size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          this.mapAssetPage(
            unwrapApiResponse<PageResponseResourceAssetListItemResponse>(response),
            page,
            size,
          ),
        ),
      );
  }

  listAllAssets(uotId?: number) {
    const size = 100;
    return this.listAssets({ uotId, page: 1, size }).pipe(
      expand((page) =>
        page.page < page.totalPages
          ? this.listAssets({ uotId, page: page.page + 1, size })
          : EMPTY,
      ),
      reduce(
        (all, page) => [...all, ...page.items],
        [] as ResourceAssetListItemResponse[],
      ),
    );
  }

  getAsset(id: number) {
    return this.api
      .recursosBienesVer({ id }, 'body', false, { transferCache: false })
      .pipe(map((response) => unwrapApiResponse<ResourceAssetDetailResponse>(response)));
  }

  createAsset(body: ResourceAssetCreateRequest) {
    return this.idempotency.idempotent(
      'recursos:bienes:crear',
      body,
      (key) =>
        this.api
          .recursosBienesCrear(
            {
              xIdempotencyKey: key,
              resourceAssetCreateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  updateAsset(id: number, body: ResourceAssetUpdateRequest) {
    return this.idempotency.idempotent(
      `recursos:bienes:editar:${id}`,
      body,
      (key) =>
        this.api
          .recursosBienesEditar(
            {
              id,
              xIdempotencyKey: key,
              resourceAssetUpdateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  changeAssetState(id: number, body: ResourceAssetStateChangeRequest) {
    return this.idempotency.idempotent(
      `recursos:bienes:estado:${id}`,
      body,
      (key) =>
        this.api
          .recursosBienesCambiarEstado(
            {
              id,
              xIdempotencyKey: key,
              resourceAssetStateChangeRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  reportAssetIncident(id: number, body: ResourceAssetIncidentRequest) {
    return this.idempotency.idempotent(
      `recursos:bienes:incidente:${id}`,
      body,
      (key) =>
        this.api
          .recursosBienesRegistrarIncidente(
            {
              id,
              xIdempotencyKey: key,
              resourceAssetIncidentRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  listProducts(query: ResourceProductListQuery = {}) {
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    return this.api
      .recursosProductosListar(
        {
          uotId: query.uotId,
          buscar: query.search?.trim() || undefined,
          categoria: query.category?.trim() || undefined,
          estado: query.active,
          pagina: page,
          tamano: size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          this.mapProductPage(
            unwrapApiResponse<PageResponseResourceProductListItemResponse>(response),
            page,
            size,
          ),
        ),
      );
  }

  updateProduct(id: number, body: ResourceProductUpdateInput) {
    return this.http
      .put<ApiEnvelope<void>>(
        `${environment.apiBaseUrl}/api/v1/recursos/productos/${id}`,
        body,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  deactivateProduct(id: number, uotId: number) {
    return this.http
      .delete<ApiEnvelope<void>>(
        `${environment.apiBaseUrl}/api/v1/recursos/productos/${id}`,
        { params: new HttpParams().set('uotId', String(uotId)) },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  reactivateProduct(id: number, uotContextoId: number) {
    return this.http
      .post<ApiEnvelope<void>>(
        `${environment.apiBaseUrl}/api/v1/recursos/productos/${id}/reactivar`,
        { uotContextoId },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  listAllProducts(uotId?: number) {
    const size = 100;
    return this.listProducts({ uotId, active: true, page: 1, size }).pipe(
      expand((page) =>
        page.page < page.totalPages
          ? this.listProducts({ uotId, active: true, page: page.page + 1, size })
          : EMPTY,
      ),
      reduce(
        (all, page) => [...all, ...page.items],
        [] as ResourceProductListItemResponse[],
      ),
    );
  }

  getProduct(id: number, uotId: number) {
    return this.api
      .recursosProductosVer({ id, uotId }, 'body', false, { transferCache: false })
      .pipe(map((response) => unwrapApiResponse<ResourceProductDetailResponse>(response)));
  }

  createProduct(body: ResourceProductCreateRequest) {
    return this.idempotency.idempotent(
      'recursos:productos:crear',
      body,
      (key) =>
        this.api
          .recursosProductosCrear(
            {
              xIdempotencyKey: key,
              resourceProductCreateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  versionProductPrice(id: number, body: ResourceProductPriceVersionRequest) {
    return this.idempotency.idempotent(
      `recursos:productos:precio:${id}`,
      body,
      (key) =>
        this.api
          .recursosProductosVersionarPrecio(
            {
              id,
              xIdempotencyKey: key,
              resourceProductPriceVersionRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  reactivateProductPrice(
    productId: number,
    priceId: number,
    body: ResourceProductPriceReactivateRequest,
  ) {
    return this.idempotency.idempotent(
      `recursos:productos:precio-reactivar:${productId}:${priceId}`,
      body,
      (key) =>
        this.api
          .recursosProductosReactivarPrecio(
            {
              id: productId,
              precioId: priceId,
              xIdempotencyKey: key,
              resourceProductPriceReactivateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  listProductPriceHistory(productId: number, uotId: number) {
    return this.api
      .recursosProductosHistorialPrecios(
        { id: productId, uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          (unwrapApiResponse<ResourceProductPriceHistoryResponse[]>(response) ?? []).map(
            (item) => this.mapProductPriceHistory(item),
          ),
        ),
      );
  }

  listWarehouses(uotId?: number) {
    return this.api
      .recursosAlmacenesListar({ uotId }, 'body', false, { transferCache: false })
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<ResourceWarehouseResponse[]>(response) ?? [],
        ),
      );
  }

  createWarehouse(body: ResourceWarehouseCreateRequest) {
    return this.idempotency.idempotent(
      'recursos:almacenes:crear',
      body,
      (key) =>
        this.api
          .recursosAlmacenesCrear(
            {
              xIdempotencyKey: key,
              resourceWarehouseCreateRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  configureWarehouseProduct(id: number, body: ResourceWarehouseProductConfigureRequest) {
    return this.idempotency.idempotent(
      `recursos:almacenes:configurar:${id}`,
      body,
      (key) =>
        this.api
          .recursosAlmacenesConfigurarProducto(
            {
              id,
              xIdempotencyKey: key,
              resourceWarehouseProductConfigureRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  shareWarehouse(id: number, body: ResourceWarehouseShareRequest) {
    return this.idempotency.idempotent(
      `recursos:almacenes:compartir:${id}`,
      body,
      (key) =>
        this.api
          .recursosAlmacenesCompartir(
            {
              id,
              xIdempotencyKey: key,
              resourceWarehouseShareRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  listStock(uotId?: number, almacenId?: number) {
    return this.api
      .recursosStockListar({ uotId, almacenId }, 'body', false, { transferCache: false })
      .pipe(
        map((response) => unwrapApiResponse<ResourceStockResponse[]>(response) ?? []),
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
        map((response) => unwrapApiResponse<ResourceKardexResponse[]>(response) ?? []),
      );
  }

  registerMovement(body: ResourceMovementRegisterRequest) {
    return this.idempotency.idempotent(
      'recursos:movimientos:registrar',
      body,
      (key) =>
        this.api
          .recursosMovimientosRegistrar(
            {
              xIdempotencyKey: key,
              resourceMovementRegisterRequest: body,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => unwrapApiResponse(response))),
    );
  }

  private mapProductPriceHistory(item: ResourceProductPriceHistoryResponse): ResourceProductPriceHistory {
    return {
      productoPrecioId: Number(item.productoPrecioId ?? 0),
      productoId: Number(item.productoId ?? 0),
      productoCodigo: item.productoCodigo ?? null,
      producto: item.producto ?? null,
      uotId: Number(item.uotId ?? 0),
      uotCodigo: item.uotCodigo ?? null,
      uotNombre: item.uotNombre ?? null,
      precioInicial: Number(item.precioInicial ?? 0),
      precioVenta: Number(item.precioVenta ?? 0),
      moneda: item.moneda ?? 'PEN',
      version: Number(item.version ?? 0),
      fechaDesde: item.fechaDesde ?? null,
      fechaHasta: item.fechaHasta ?? null,
      vigente: item.vigente === true,
      usuarioId: item.usuarioId ?? null,
      nombreUsuario: item.nombreUsuario ?? null,
      precioOrigenId: item.precioOrigenId ?? null,
      precioOrigenVersion: item.precioOrigenVersion ?? null,
    };
  }

  private mapProductPage(
    value: PageResponseResourceProductListItemResponse | undefined,
    requestedPage: number,
    requestedSize: number,
  ): PageResult<ResourceProductListItemResponse> {
    return {
      items: [...(value?.items ?? [])],
      page: Number(value?.pagina ?? requestedPage),
      size: Number(value?.tamanio ?? requestedSize),
      totalRecords: Number(value?.totalRegistros ?? 0),
      totalPages: Number(value?.totalPaginas ?? 0),
    };
  }

  private mapAssetPage(
    value: PageResponseResourceAssetListItemResponse | undefined,
    requestedPage: number,
    requestedSize: number,
  ): PageResult<ResourceAssetListItemResponse> {
    return {
      items: [...(value?.items ?? [])],
      page: Number(value?.pagina ?? requestedPage),
      size: Number(value?.tamanio ?? requestedSize),
      totalRecords: Number(value?.totalRegistros ?? 0),
      totalPages: Number(value?.totalPaginas ?? 0),
    };
  }
}
