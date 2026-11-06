/** DESCO API — cliente OpenAPI manual equivalente. */
import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_PATH } from '../variables';
import { Configuration } from '../configuration';
import { BaseService } from '../api.base.service';
import { ApiResponseE5CierreResponse } from '../model/apiResponseE5CierreResponse';
import { ApiResponseE5CobrosResponse } from '../model/apiResponseE5CobrosResponse';
import { ApiResponseE5GastosResponse } from '../model/apiResponseE5GastosResponse';
import { ApiResponseE5LiquidacionResponse } from '../model/apiResponseE5LiquidacionResponse';
import { ApiResponseE5LiquidacionesResponse } from '../model/apiResponseE5LiquidacionesResponse';
import { ApiResponseE5RepartoResponse } from '../model/apiResponseE5RepartoResponse';
import { ApiResponseE5RepartosResponse } from '../model/apiResponseE5RepartosResponse';
import { ApiResponseE5TableroResponse } from '../model/apiResponseE5TableroResponse';
import { ApiResponseE5ValidacionCierreResponse } from '../model/apiResponseE5ValidacionCierreResponse';
import { E5CierreRequest } from '../model/e5CierreRequest';
import { E5ObservacionRequest } from '../model/e5ObservacionRequest';
import { E5PagoRequest } from '../model/e5PagoRequest';
import { E5RectificacionRequest } from '../model/e5RectificacionRequest';

export interface E5CallOptions { xCorrelationId?: string; xDeviceId?: string; }
export interface ApappssE5TableroRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5GastosRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5RepartosRequestParams extends E5CallOptions { gastoId: number; }
export interface ApappssE5LiquidacionesRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5LiquidacionRequestParams extends E5CallOptions { liquidacionId: number; }
export interface ApappssE5ReporteRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5ExportarRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5CobrosRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5ValidarCierreRequestParams extends E5CallOptions { campaniaId: number; }
export interface ApappssE5RepartirRequestParams extends E5CallOptions { gastoId: number; xIdempotencyKey: string; }
export interface ApappssE5AprobarRepartoRequestParams extends E5CallOptions { gastoId: number; xIdempotencyKey: string; }
export interface ApappssE5RectificarRepartoRequestParams extends E5CallOptions { gastoId: number; xIdempotencyKey: string; e5ObservacionRequest: E5ObservacionRequest; }
export interface ApappssE5LiquidarRequestParams extends E5CallOptions { participacionId: number; xIdempotencyKey: string; e5RectificacionRequest?: E5RectificacionRequest; }
export interface ApappssE5AprobarLiquidacionRequestParams extends E5CallOptions { liquidacionId: number; xIdempotencyKey: string; }
export interface ApappssE5ObservarLiquidacionRequestParams extends E5CallOptions { liquidacionId: number; xIdempotencyKey: string; e5ObservacionRequest: E5ObservacionRequest; }
export interface ApappssE5PagarRequestParams extends E5CallOptions { liquidacionId: number; xIdempotencyKey: string; e5PagoRequest: E5PagoRequest; }
export interface ApappssE5ReversarPagoRequestParams extends E5CallOptions { pagoId: number; xIdempotencyKey: string; e5ObservacionRequest: E5ObservacionRequest; }
export interface ApappssE5CerrarRequestParams extends E5CallOptions { campaniaId: number; xIdempotencyKey: string; e5CierreRequest: E5CierreRequest; }

@Injectable({ providedIn: 'root' })
export class FinanzasAPAPPSSE5Service extends BaseService {
  constructor(protected httpClient: HttpClient, @Optional() @Inject(BASE_PATH) basePath: string|string[],
              @Optional() configuration?: Configuration) { super(basePath,configuration); }
  private headers(params: E5CallOptions, idempotencyKey?: string): HttpHeaders {
    let h = new HttpHeaders({ 'Accept': 'application/json' });
    if (idempotencyKey) h = h.set('X-Idempotency-Key',idempotencyKey);
    if (params.xCorrelationId) h = h.set('X-Correlation-Id',params.xCorrelationId);
    if (params.xDeviceId) h = h.set('X-Device-Id',params.xDeviceId);
    return h;
  }
  private uri(path: string): string { return `${this.configuration.basePath}/api/v1/apappss/finanzas-e5/${path}`; }
  public apappssE5Tablero(params: ApappssE5TableroRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5TableroResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5TableroResponse>(this.uri(`campanias/${params.campaniaId}/tablero`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Gastos(params: ApappssE5GastosRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5GastosResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5GastosResponse>(this.uri(`campanias/${params.campaniaId}/gastos`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Repartos(params: ApappssE5RepartosRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5RepartosResponse> {
    if (!params || !Number.isInteger(params.gastoId) || params.gastoId<=0) throw new Error('gastoId requerido');
    return this.httpClient.get<ApiResponseE5RepartosResponse>(this.uri(`gastos/${params.gastoId}/repartos`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Liquidaciones(params: ApappssE5LiquidacionesRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionesResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5LiquidacionesResponse>(this.uri(`campanias/${params.campaniaId}/liquidaciones`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Liquidacion(params: ApappssE5LiquidacionRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionResponse> {
    if (!params || !Number.isInteger(params.liquidacionId) || params.liquidacionId<=0) throw new Error('liquidacionId requerido');
    return this.httpClient.get<ApiResponseE5LiquidacionResponse>(this.uri(`liquidaciones/${params.liquidacionId}`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Reporte(params: ApappssE5ReporteRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5TableroResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5TableroResponse>(this.uri(`campanias/${params.campaniaId}/reporte`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Exportar(params: ApappssE5ExportarRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5TableroResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5TableroResponse>(this.uri(`campanias/${params.campaniaId}/exportacion`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Cobros(params: ApappssE5CobrosRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5CobrosResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5CobrosResponse>(this.uri(`campanias/${params.campaniaId}/cobros`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5ValidarCierre(params: ApappssE5ValidarCierreRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5ValidacionCierreResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0) throw new Error('campaniaId requerido');
    return this.httpClient.get<ApiResponseE5ValidacionCierreResponse>(this.uri(`campanias/${params.campaniaId}/cierre`),{headers:this.headers(params),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Repartir(params: ApappssE5RepartirRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5RepartoResponse> {
    if (!params || !Number.isInteger(params.gastoId) || params.gastoId<=0 || !params.xIdempotencyKey)
      throw new Error('gastoId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5RepartoResponse>(this.uri(`gastos/${params.gastoId}/repartir`),{},
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5AprobarReparto(params: ApappssE5AprobarRepartoRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5RepartoResponse> {
    if (!params || !Number.isInteger(params.gastoId) || params.gastoId<=0 || !params.xIdempotencyKey)
      throw new Error('gastoId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5RepartoResponse>(this.uri(`gastos/${params.gastoId}/repartos/aprobar`),{},
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5RectificarReparto(params: ApappssE5RectificarRepartoRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5RepartoResponse> {
    if (!params || !Number.isInteger(params.gastoId) || params.gastoId<=0 || !params.xIdempotencyKey)
      throw new Error('gastoId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5RepartoResponse>(this.uri(`gastos/${params.gastoId}/repartos/rectificar`),params.e5ObservacionRequest,
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Liquidar(params: ApappssE5LiquidarRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionResponse> {
    if (!params || !Number.isInteger(params.participacionId) || params.participacionId<=0 || !params.xIdempotencyKey)
      throw new Error('participacionId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5LiquidacionResponse>(this.uri(`participaciones/${params.participacionId}/liquidar`),params.e5RectificacionRequest,
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5AprobarLiquidacion(params: ApappssE5AprobarLiquidacionRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionResponse> {
    if (!params || !Number.isInteger(params.liquidacionId) || params.liquidacionId<=0 || !params.xIdempotencyKey)
      throw new Error('liquidacionId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5LiquidacionResponse>(this.uri(`liquidaciones/${params.liquidacionId}/aprobar`),{},
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5ObservarLiquidacion(params: ApappssE5ObservarLiquidacionRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionResponse> {
    if (!params || !Number.isInteger(params.liquidacionId) || params.liquidacionId<=0 || !params.xIdempotencyKey)
      throw new Error('liquidacionId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5LiquidacionResponse>(this.uri(`liquidaciones/${params.liquidacionId}/observar`),params.e5ObservacionRequest,
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Pagar(params: ApappssE5PagarRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionResponse> {
    if (!params || !Number.isInteger(params.liquidacionId) || params.liquidacionId<=0 || !params.xIdempotencyKey)
      throw new Error('liquidacionId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5LiquidacionResponse>(this.uri(`liquidaciones/${params.liquidacionId}/pagar`),params.e5PagoRequest,
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5ReversarPago(params: ApappssE5ReversarPagoRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5LiquidacionResponse> {
    if (!params || !Number.isInteger(params.pagoId) || params.pagoId<=0 || !params.xIdempotencyKey)
      throw new Error('pagoId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5LiquidacionResponse>(this.uri(`pagos/${params.pagoId}/reversar`),params.e5ObservacionRequest,
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
  public apappssE5Cerrar(params: ApappssE5CerrarRequestParams, observe: 'body'='body', reportProgress=false,
       options?: { context?: HttpContext; transferCache?: boolean }): Observable<ApiResponseE5CierreResponse> {
    if (!params || !Number.isInteger(params.campaniaId) || params.campaniaId<=0 || !params.xIdempotencyKey)
      throw new Error('campaniaId y xIdempotencyKey son obligatorios');
    return this.httpClient.post<ApiResponseE5CierreResponse>(this.uri(`campanias/${params.campaniaId}/cerrar`),params.e5CierreRequest,
      {headers:this.headers(params,params.xIdempotencyKey),context:options?.context,transferCache:options?.transferCache});
  }
}
