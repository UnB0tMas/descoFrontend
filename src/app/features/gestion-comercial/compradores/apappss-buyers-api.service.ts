import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';

export type BuyerType = 'PERSONA' | 'EMPRESA';
export interface ApappssContext {
  asociacionId: number;
  uotId: number;
  convenioId: number;
  nombre: string;
  ruc: string;
}
export interface ApappssBuyer {
  compradorId: number;
  tipo: BuyerType;
  personaId?: number | null;
  empresaId?: number | null;
  nombre: string;
  documento: string;
  tipoDocumento: string;
  telefono?: string;
  correo?: string;
  fechaRegistro: string;
}
export interface ApappssBuyerPage {
  items: ApappssBuyer[];
  totalRecords: number;
  pagina: number;
  tamano: number;
}
export interface ApappssDocumentType {
  codigo: string;
  nombre: string;
}
export interface ApappssLocalIdentity {
  encontrado: boolean;
  compradorId: number | null;
  tipo: BuyerType;
  entidadId: number | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  telefono: string | null;
  correo: string | null;
  fechaNacimiento: string | null;
  sexo: string | null;
  distritoCodigo: string | null;
  centroPobladoId: number | null;
  referencia: string | null;
}
export interface ApappssBuyerDetail extends ApappssBuyer {
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  distritoCodigo?: string | null;
  centroPobladoId?: number | null;
  referencia?: string | null;
}

export interface ApappssBuyerUpdate {
  /** Solo completa campos vacíos de un comprador que ya está registrado. */
  completarDatos?: boolean;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  razonSocial?: string;
  nombreComercial?: string;
  fechaNacimiento?: string;
  sexo?: string;
  telefono?: string;
  correo?: string;
  distritoCodigo?: string;
  centroPobladoId?: number;
  referencia?: string;
}

export interface ApappssBuyerCreate {
  tipo: BuyerType;
  tipoDocumento: string;
  documento: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  razonSocial?: string;
  nombreComercial?: string;
  fechaNacimiento?: string;
  sexo?: string;
  telefono?: string;
  correo?: string;
  distritoCodigo?: string;
  centroPobladoId?: number;
  referencia?: string;
}

/** Contratos específicos de Compradores. No modifica el código OpenAPI autogenerado. */
@Injectable({ providedIn: 'root' })
export class ApappssBuyersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BASE_PATH);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly resource = `${this.base}/api/v1/apappss`;

  context(uotId: number): Observable<ApappssContext> {
    return this.http.get<ApiEnvelope<ApappssContext>>(`${this.resource}/contexto`, {
      params: new HttpParams().set('uotId', uotId), transferCache: false,
    }).pipe(map(unwrapApiResponse));
  }

  list(uotId: number, pagina = 1, tamano = 20, buscar = '', tipo = ''): Observable<ApappssBuyerPage> {
    let params = new HttpParams().set('uotId', uotId).set('pagina', pagina).set('tamano', tamano);
    if (buscar.trim()) params = params.set('buscar', buscar.trim());
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<ApiEnvelope<ApappssBuyerPage>>(`${this.resource}/compradores`, {
      params, transferCache: false,
    }).pipe(map(unwrapApiResponse));
  }

  detail(uotId: number, compradorId: number): Observable<ApappssBuyerDetail> {
    return this.http.get<ApiEnvelope<ApappssBuyerDetail>>(`${this.resource}/compradores/${compradorId}`, {
      params: new HttpParams().set('uotId', uotId), transferCache: false,
    }).pipe(map(unwrapApiResponse));
  }

  update(uotId: number, compradorId: number, data: ApappssBuyerUpdate): Observable<{ compradorId: number }> {
    return this.keys.idempotent('apappss:comprador:editar', { uotId, compradorId, data }, key =>
      this.http.put<ApiEnvelope<{ compradorId: number }>>(
        `${this.resource}/compradores/${compradorId}`, data,
        { params: new HttpParams().set('uotId', uotId), headers: new HttpHeaders({ 'X-Idempotency-Key': key }) },
      ).pipe(map(unwrapApiResponse)),
    );
  }

  documentTypes(uotId: number): Observable<ApappssDocumentType[]> {
    return this.http.get<ApiEnvelope<{ items: ApappssDocumentType[] }>>(`${this.resource}/compradores/tipos-documento`, {
      params: new HttpParams().set('uotId', uotId), transferCache: false,
    }).pipe(map(unwrapApiResponse), map(result => result.items ?? []));
  }

  localIdentity(uotId: number, tipoDocumento: string, documento: string): Observable<ApappssLocalIdentity> {
    return this.http.get<ApiEnvelope<ApappssLocalIdentity>>(`${this.resource}/compradores/identidad-local`, {
      params: new HttpParams().set('uotId', uotId).set('tipoDocumento', tipoDocumento).set('documento', documento),
      transferCache: false,
    }).pipe(map(unwrapApiResponse));
  }

  create(uotId: number, data: ApappssBuyerCreate): Observable<{ compradorId: number; personaId?: number; empresaId?: number }> {
    return this.keys.idempotent('apappss:comprador:crear', { uotId, data }, key =>
      this.http.post<ApiEnvelope<{ compradorId: number; personaId?: number; empresaId?: number }>>(
        `${this.resource}/compradores`, data,
        { params: new HttpParams().set('uotId', uotId), headers: new HttpHeaders({ 'X-Idempotency-Key': key }) },
      ).pipe(map(unwrapApiResponse)),
    );
  }
}
