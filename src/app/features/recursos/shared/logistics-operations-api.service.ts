import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';

export interface ProductUotPolicy {
  productoId: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  permiteVenta: boolean;
  permiteUsoInterno: boolean;
  configurado: boolean;
  stockActual: number;
  stockReservado: number;
}

export interface TechnicalProductProgram {
  programacionId: number;
  uotId: number;
  almacenId: number;
  productoId: number;
  productoNombre: string;
  empleadoId: number;
  cantidadProgramada: number;
  cantidadEntregada: number;
  cantidadDevuelta: number;
  cantidadConsumida: number;
  cantidadPendiente: number;
  estadoProceso: string;
  actividad: string;
  lugar: string;
  fechaInicio: string;
  fechaFin: string | null;
  archivoAutorizacionId: number | null;
  observacion: string | null;
}

export interface TechnicalProductProgramRequest {
  uotId: number;
  almacenId: number;
  productoId: number;
  empleadoId: number;
  cantidad: number;
  actividad: string;
  lugar: string;
  fechaInicio: string;
  fechaFin?: string;
  archivoAutorizacionId?: number;
  observacion?: string;
}

export interface StockTransferInput {
  almacenOrigenId: number;
  almacenDestinoId: number;
  detalle: { productoId: number; cantidad: number }[];
  observacion?: string;
}

export interface TransferProduct {
  productoId: number;
  producto: string;
  unidadMedida: string;
  stockDisponible: number;
  apto: boolean;
  motivo: string | null;
}

@Injectable({ providedIn: 'root' })
export class LogisticsOperationsApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH);
  private readonly idempotency = inject(IdempotencyKeyService);
  private get url(): string {
    return `${this.basePath.replace(/\/$/, '')}/api/v1/recursos-operativos`;
  }

  listPolicies(uotId: number) {
    return this.http.get<ApiEnvelope<ProductUotPolicy[]>>(`${this.url}/productos-uot`, {
      params: new HttpParams().set('uotId', String(uotId)),
    }).pipe(map((response) => (unwrapApiResponse(response) ?? []).map((item) => ({
      ...item,
      productoId: Number(item.productoId ?? 0),
      stockActual: Number(item.stockActual ?? 0),
      stockReservado: Number(item.stockReservado ?? 0),
      permiteVenta: item.permiteVenta === true,
      permiteUsoInterno: item.permiteUsoInterno === true,
      configurado: item.configurado === true,
    }))));
  }

  setPolicy(uotId: number, productoId: number, permiteVenta: boolean, permiteUsoInterno: boolean) {
    const body = { uotId, productoId, permiteVenta, permiteUsoInterno };
    return this.idempotency.idempotent(`productos-uot:${uotId}:${productoId}`, body, (key) =>
      this.http.put<ApiEnvelope<null>>(`${this.url}/productos-uot/politica`, body, {
        headers: { 'X-Idempotency-Key': key },
      }).pipe(map(unwrapApiResponse)),
    );
  }

  listTransferProducts(almacenOrigenId: number, almacenDestinoId: number) {
    return this.http.get<ApiEnvelope<TransferProduct[]>>(`${this.url}/transferencias/productos`, {
      params: new HttpParams().set('almacenOrigenId', almacenOrigenId).set('almacenDestinoId', almacenDestinoId),
    }).pipe(map(response => unwrapApiResponse(response) ?? []));
  }

  transfer(input: StockTransferInput) {
    return this.idempotency.idempotent('almacenes:transferir', input, (key) =>
      this.http.post<ApiEnvelope<number>>(`${this.url}/transferencias`, input, {
        headers: { 'X-Idempotency-Key': key },
      }).pipe(map((response) => Number(unwrapApiResponse(response) ?? 0))),
    );
  }

  listPrograms(uotId: number, estado?: string) {
    let params = new HttpParams().set('uotId', String(uotId));
    if (estado) params = params.set('estado', estado);
    return this.http.get<ApiEnvelope<TechnicalProductProgram[]>>(`${this.url}/programaciones`, {
      params,
    }).pipe(map((response) => unwrapApiResponse(response) ?? []));
  }

  createProgram(input: TechnicalProductProgramRequest) {
    return this.idempotency.idempotent('productos:programar', input, (key) =>
      this.http.post<ApiEnvelope<number>>(`${this.url}/programaciones`, input, {
        headers: { 'X-Idempotency-Key': key },
      }).pipe(map((response) => Number(unwrapApiResponse(response) ?? 0))),
    );
  }

  operateProgram(id: number, operacion: string, cantidad?: number, observacion?: string) {
    const body = { operacion, cantidad, observacion };
    return this.idempotency.idempotent(`productos:programacion:${id}:${operacion}`, body, (key) =>
      this.http.post<ApiEnvelope<number>>(`${this.url}/programaciones/${id}/operaciones`, body, {
        headers: { 'X-Idempotency-Key': key },
      }).pipe(map((response) => Number(unwrapApiResponse(response) ?? 0))),
    );
  }
}
