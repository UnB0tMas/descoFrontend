import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';

export type CalibreTipo = 'PRIMERA' | 'SEGUNDA' | 'DESCARTE';
export interface SaleGrade {
  calibreId: number;
  variedadPaltaId: number;
  nombreVariedad?: string;
  calibre: CalibreTipo;
  gramosDesde: number;
  gramosHasta: number | null;
  precioKg: number;
  version: number;
}
export interface SaleParticipant {
  participacionId: number;
  socioAsociacionId: number;
  documento: string;
  socioNombre: string;
  asignadas: number;
  estadoJabas: 'PENDIENTE_RECOJO' | 'ENTREGADA' | 'DEVUELTA';
  recepcionConfirmada: boolean;
  devueltas: number;
  pesoBrutoKg: number;
  descuentoTotalKg: number;
  pesoNetoKg: number;
}
export interface SaleProcessDetail {
  campaniaId: number;
  codigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estadoProceso: string;
  descuentoJabaKg: number | null;
  vigente: boolean;
  calibres: SaleGrade[];
  socios: SaleParticipant[];
}
export interface SaleCrate {
  numero: number;
  pesoBrutoKg: number;
  descuentoKg: number;
  pesoNetoKg: number;
  calibreId: number | null;
  version: number;
  observacion?: string | null;
  precioOriginalKg?: number | null;
  descuentoSancionKg?: number | null;
  precioFinalKg?: number | null;
  importeFinalSoles?: number | null;
  sancionAplicacionId?: number | null;
  sancionNombre?: string | null;
}
export interface SaleCratesPage {
  participacionId: number;
  asignadas: number;
  pagina: number;
  tamano: number;
  registros: SaleCrate[];
}
export interface NewGrade {
  variedadPaltaId: number;
  calibre: CalibreTipo;
  gramosDesde: number;
  gramosHasta: number | null;
  precioKg: number;
}

export interface CampaignIndicatorDaily {
  fecha: string;
  jabas: number;
  pesoBrutoKg: number;
  pesoNetoKg: number;
}
export interface CampaignIndicatorVariety {
  variedadPaltaId: number | null;
  nombre: string;
  jabas: number;
  pesoNetoKg: number;
}
export interface CampaignIndicatorStatus { estado: string; cantidad: number; }
export interface CampaignIndicators {
  fechaInicio: string;
  fechaFin: string;
  variedadPaltaId: number | null;
  resumen: { jabasRegistradas: number; pesoBrutoKg: number; pesoNetoKg: number; };
  porDia: CampaignIndicatorDaily[];
  porVariedad: CampaignIndicatorVariety[];
  porEstado: CampaignIndicatorStatus[];
}

@Injectable({ providedIn: 'root' })
export class CampaignSaleProcessApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BASE_PATH);
  private readonly keys = inject(IdempotencyKeyService);
  private root(id: number): string { return `${this.base}/api/v1/campanias/${id}/venta`; }

  private mutation<T>(method: 'POST' | 'PUT', url: string, payload: unknown): Observable<T> {
    return this.keys.idempotent(`apappss-sale:${method}:${url}`, payload, key =>
      this.http.request<ApiEnvelope<T>>(method, url, {
        headers: new HttpHeaders({ 'X-Idempotency-Key': key }), body: payload,
      }).pipe(map(unwrapApiResponse)));
  }
  detail(campaignId: number): Observable<SaleProcessDetail> {
    return this.http.get<ApiEnvelope<SaleProcessDetail>>(this.root(campaignId)).pipe(map(unwrapApiResponse));
  }
  indicators(campaignId: number, start: string, end: string, varietyId: number | null): Observable<CampaignIndicators> {
    const params: Record<string, string | number> = { fechaInicio: start, fechaFin: end };
    if (varietyId !== null) params['variedadPaltaId'] = varietyId;
    return this.http.get<ApiEnvelope<CampaignIndicators>>(`${this.root(campaignId)}/indicadores`, { params })
      .pipe(map(unwrapApiResponse));
  }
  crates(campaignId: number, participationId: number, page = 1, size = 25): Observable<SaleCratesPage> {
    return this.http.get<ApiEnvelope<SaleCratesPage>>(
      `${this.root(campaignId)}/socios/${participationId}/jabas`, { params: { pagina: page, tamano: size } })
      .pipe(map(unwrapApiResponse));
  }
  weigh(campaignId: number, participationId: number, number: number, weight: number,
      calibreId: number | null, version: number | null, observacion: string): Observable<unknown> {
    return this.mutation('PUT', `${this.root(campaignId)}/socios/${participationId}/jabas/${number}`,
      { pesoBrutoKg: weight, calibreId: weight === 0 ? null : calibreId, version, observacion });
  }
  correct(campaignId: number, participationId: number, number: number, weight: number,
      calibreId: number | null, version: number, motivo: string, observacion: string): Observable<unknown> {
    return this.mutation('PUT', `${this.root(campaignId)}/socios/${participationId}/jabas/${number}/corregir`,
      { pesoBrutoKg: weight, calibreId: weight === 0 ? null : calibreId, version, motivo, observacion });
  }
  confirmReception(campaignId: number, participationId: number): Observable<unknown> {
    return this.mutation('POST', `${this.root(campaignId)}/socios/${participationId}/confirmar-entrega`, {});
  }
  saveGrades(campaignId: number, calibres: ReadonlyArray<NewGrade & { calibreId: number | null; version: number | null }>): Observable<unknown> {
    return this.mutation('PUT', `${this.root(campaignId)}/calibres/configurar`, { calibres });
  }
  addGrade(campaignId: number, data: NewGrade): Observable<unknown> {
    return this.mutation('POST', `${this.root(campaignId)}/calibres`, data);
  }
  changePrice(campaignId: number, gradeId: number, price: number, version: number): Observable<unknown> {
    return this.mutation('PUT', `${this.root(campaignId)}/calibres/${gradeId}/precio`, { precioKg: price, version });
  }
  changeDiscount(campaignId: number, discount: number | null): Observable<unknown> {
    return this.mutation('PUT', `${this.root(campaignId)}/descuento-jaba`, { descuentoJabaKg: discount });
  }
}
