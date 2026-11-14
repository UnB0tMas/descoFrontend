import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { AcopioAPAPPSSE4Service, BASE_PATH } from '../../../infrastructure/openapi/generated';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';

export type CampaignCrateOrigin = 'UOT' | 'ASOCIACION';

export interface CampaignPlanPrice {
  variedadPaltaId: number;
  precio: number;
}
export interface CampaignGradeLine {
  variedadPaltaId: number; calibre: 'PRIMERA' | 'SEGUNDA' | 'DESCARTE';
  gramosDesde: number; gramosHasta: number | null; precioKg: number;
}
export interface CreateCampaignPlan {
  uotId: number;
  asociacionId: number;
  modalidadVentaId: number;
  compradorId: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  observacion?: string;
  cupoJabas?: number;
  origenJabas: CampaignCrateOrigin;
  descuentoJabaKg?: number | null;
  precios: CampaignPlanPrice[];
  calibres: CampaignGradeLine[];
}
export interface CampaignPlanParticipant {
  participacionId: number;
  socioAsociacionId: number;
  documento: string;
  socioNombre: string;
  estadoParticipacion: string;
  asignacionId?: number;
  cantidadJabas?: number;
  estadoJabas?: 'PENDIENTE_RECOJO' | 'PENDIENTE_DEVOLUCION' | 'ENTREGADA' | 'DEVUELTA';
  cantidadObjetivo?: number;
  cantidadAjustePendiente?: number;
  comentarioAjustePendiente?: string | null;
  versionJabas?: number;
}
export interface CampaignPlanDetail {
  campaniaId: number;
  compradorId?: number | null;
  compradorNombre?: string | null;
  tipoComprador?: "PERSONA" | "EMPRESA" | null;
  modalidadVentaId?: number;
  condicionComercialId?: number;
  cupoJabas?: number;
  taraKg?: number;
  stockFisico?: number;
  origenJabas: CampaignCrateOrigin;
  jabasComprometidas: number;
  jabasOperativo: number;
  participantes: CampaignPlanParticipant[];
}
export interface EligiblePartner {
  socioAsociacionId: number;
  nombre: string;
  numeroDocumento: string;
}
export interface UpdateCampaignData {
  origenJabas: CampaignCrateOrigin;
  compradorId: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  observacion?: string;
  descuentoJabaKg?: number | null;
}
export interface PlanCreated {
  campaniaVentaId: number;
  preciosCreados: number;
  cupoJabas?: number;
}

/** Contrato tipado local hasta regenerar el cliente OpenAPI, sin tocar código generado. */
@Injectable({ providedIn: 'root' })
export class CampaignPlanningApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BASE_PATH);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly e4 = inject(AcopioAPAPPSSE4Service);
  private readonly resource = `${this.base}/api/v1/campanias`;

  private mutate<T>(method: 'POST' | 'PUT', path: string, payload: unknown): Observable<T> {
    return this.keys.idempotent(`campaign-planning:${method}:${path}`, payload, (key) =>
      this.http.request<ApiEnvelope<T>>(method, `${this.resource}${path}`, {
        headers: new HttpHeaders({ 'X-Idempotency-Key': key }),
        body: payload,
      }).pipe(map(unwrapApiResponse)),
    );
  }

  create(payload: CreateCampaignPlan): Observable<PlanCreated> {
    return this.mutate<PlanCreated>('POST', '/plan', payload);
  }
  update(campaniaId: number, payload: UpdateCampaignData): Observable<unknown> {
    return this.mutate("PUT", `/${campaniaId}/plan-datos`, payload);
  }
  plan(campaniaId: number): Observable<CampaignPlanDetail> {
    return this.http.get<ApiEnvelope<CampaignPlanDetail>>(`${this.resource}/${campaniaId}/plan`)
      .pipe(map(unwrapApiResponse));
  }
  eligible(campaniaId: number): Observable<EligiblePartner[]> {
    return this.http.get<ApiEnvelope<{ campaniaId: number; socios: EligiblePartner[] }>>(
      `${this.resource}/${campaniaId}/socios-elegibles`).pipe(map((r) => unwrapApiResponse(r).socios ?? []));
  }
  include(campaniaId: number, sociosIds: number[]): Observable<{ incorporados: number }> {
    return this.mutate<{ incorporados: number }>('POST', `/${campaniaId}/socios-lote`, { sociosIds });
  }
  remove(campaniaId: number, participacionId: number, motivo: string): Observable<unknown> {
    return this.mutate('POST', `/${campaniaId}/participantes/${participacionId}/retirar`, { motivo });
  }
  assign(campaniaId: number, participacionId: number, cantidad: number, version?: number, comentario?: string): Observable<unknown> {
    return this.mutate('PUT', `/${campaniaId}/participantes/${participacionId}/jabas`, { cantidad, version, comentario });
  }
  deliver(campaniaId: number, participacionId: number): Observable<unknown> {
    return this.mutate('POST', `/${campaniaId}/participantes/${participacionId}/jabas/entregar`, {});
  }
  returnCrates(campaniaId: number, participacionId: number): Observable<unknown> {
    return this.mutate('POST', `/${campaniaId}/participantes/${participacionId}/jabas/devolver`, {});
  }
  configure(campaniaId: number, cupoJabas: number, taraKg: number): Observable<unknown> {
    return this.keys.idempotent(`campaign-e4-config:${campaniaId}`, { cupoJabas, taraKg }, (key) =>
      this.e4.apappssE4Configurar({
        campaniaId, xIdempotencyKey: key, e4ConfiguracionRequest: { cupoJabas, taraKg },
      }, 'body', false, { transferCache: false }).pipe(map(unwrapApiResponse)));
  }
}
