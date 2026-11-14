import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';

export interface SaleSanctionCatalog {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  usos: number;
}
export interface SaleSanctionTariff {
  tarifaId: number;
  sancionId: number;
  codigo: string;
  nombre: string;
  descuentoKg: number;
  activo: boolean;
  socios: number;
}
export interface SaleSanctionAssignment {
  asignacionId: number;
  tarifaId: number;
  nombre: string;
  alcance: 'TODAS' | 'CANTIDAD';
  desdeNumero: number;
  hastaNumero: number | null;
  comentario: string;
  descuentoKg: number;
  activo: boolean;
}
export interface SalePartnerSanction {
  asignacion: SaleSanctionAssignment | null;
  jabasRegistradas: number;
  totalDescuentoSoles: number;
}
@Injectable({ providedIn: 'root' })
export class CampaignSanctionsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BASE_PATH);
  private readonly keys = inject(IdempotencyKeyService);
  private root = `${this.base}/api/v1/campanias`;
  private mutation<T>(method: 'PUT'|'POST', url: string, data: unknown): Observable<T> {
    return this.keys.idempotent(`apappss-sancion:${method}:${url}`, data, key =>
      this.http.request<ApiEnvelope<T>>(method, url, {
        headers: new HttpHeaders({ 'X-Idempotency-Key': key }), body: data,
      }).pipe(map(unwrapApiResponse)));
  }
  catalog(): Observable<{ items: SaleSanctionCatalog[] }> {
    return this.http.get<ApiEnvelope<{ items: SaleSanctionCatalog[] }>>(`${this.root}/sanciones/catalogo`).pipe(map(unwrapApiResponse));
  }
  createCatalog(data: {nombre:string;descripcion:string}): Observable<unknown> {
    return this.mutation('POST', `${this.root}/sanciones/catalogo`, data);
  }
  editCatalog(id: number, data: {nombre:string;descripcion:string}): Observable<unknown> {
    return this.mutation('PUT', `${this.root}/sanciones/catalogo/${id}`, data);
  }
  disableCatalog(id: number): Observable<unknown> {
    return this.mutation('POST', `${this.root}/sanciones/catalogo/${id}/deshabilitar`, {});
  }
  rates(campaignId: number): Observable<{items:SaleSanctionTariff[];disponibles:{id:number;nombre:string}[]}> {
    return this.http.get<ApiEnvelope<{items:SaleSanctionTariff[];disponibles:{id:number;nombre:string}[]}>>(
      `${this.root}/${campaignId}/sanciones`).pipe(map(unwrapApiResponse));
  }
  saveRate(campaignId: number, data: {sancionId:number;descuentoKg:number}): Observable<unknown> {
    return this.mutation('PUT', `${this.root}/${campaignId}/sanciones`, data);
  }
  saveBatch(campaignId: number, data: {tarifas: {sancionId:number; descuentoKg:number}[]}): Observable<unknown> {
    return this.mutation('PUT', `${this.root}/${campaignId}/sanciones/lote`, data);
  }
  disableRate(campaignId: number, tariffId: number): Observable<unknown> {
    return this.mutation('POST', `${this.root}/${campaignId}/sanciones/${tariffId}/deshabilitar`, {});
  }
  partner(campaignId: number, participantId: number): Observable<SalePartnerSanction> {
    return this.http.get<ApiEnvelope<SalePartnerSanction>>(
      `${this.root}/${campaignId}/sanciones/socios/${participantId}`).pipe(map(unwrapApiResponse));
  }
  assign(campaignId: number, participantId: number, data: {
    tarifaId:number;alcance:'TODAS'|'CANTIDAD';cantidad:number|null;comentario:string;
  }): Observable<unknown> {
    return this.mutation('PUT', `${this.root}/${campaignId}/sanciones/socios/${participantId}`, data);
  }
  remove(campaignId: number, participantId: number, motivo: string): Observable<unknown> {
    return this.mutation('POST', `${this.root}/${campaignId}/sanciones/socios/${participantId}/retirar`, {motivo});
  }
}
