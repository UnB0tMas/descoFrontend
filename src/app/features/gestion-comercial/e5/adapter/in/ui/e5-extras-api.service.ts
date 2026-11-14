import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BASE_PATH } from '../../../../../../infrastructure/openapi/generated';
import { ApiEnvelope, unwrapApiResponse } from '../../../../../../infrastructure/openapi/api-response-unwrapper';
import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import { E5LiquidacionResponse } from '../../../../../../infrastructure/openapi/generated';

export interface E5GraficoDia { fecha:string; kilogramos:number; ventaEfectiva:number; }
export interface E5GraficoVariedad { variedadId:number; variedad:string; kilogramos:number; ventaEfectiva:number; }
export interface E5Graficos {
  campaniaId:number; fechaInicio:string; fechaFin:string; variedadPaltaId:number|null;
  porDia:E5GraficoDia[]; porVariedad:E5GraficoVariedad[];
}
export interface E5BeneficiarioHistorial {
  pagoId:number; beneficiarioPersonaId:number; documento:string; nombre:string;
  usuarioId:number; fecha:string; motivoEntrega?:string|null; comprobanteArchivoId?:number|null;
}
export interface E5Beneficiario {
  liquidacionId:number; beneficiarioPersonaId:number; documento:string; nombre:string; uotId?:number;
  historial:E5BeneficiarioHistorial[];
}
export interface E5PagoBeneficiario {
  importe:number; medioPago:'YAPE'|'PLIN'|'EFECTIVO'|'DEPOSITO';
  referencia?:string; beneficiarioPersonaId:number; motivoEntrega?:string; comprobanteArchivoId?:number;
}
export interface E5ReceptorRequest {
  tipoDocumento:string; numeroDocumento:string; nombres:string;
  apellidoPaterno:string; apellidoMaterno:string; telefono:string;
  correo:string; fechaNacimiento:string; sexo:string; identityId?:number;
}
export interface E5EntregaSocioDetalle { entregaId:number; lote:string; fecha:string; jabas:number; pesoBruto:number; tara:number; rechazado:number; aceptado:number; }
export interface E5PartidaSocio { detalleId:number; entregaId:number; variedad:string; condicionId:number; condicion:string; kilogramos:number; precioBase:number; precioEfectivo:number; importe:number; }
export interface E5JabaSocio { entregaId:number; unidadId:number; numero:number; pesoBruto:number; tara:number; pesoNeto:number; }
export interface E5EntregasSocio { participacionId:number; entregas?:E5EntregaSocioDetalle[]|null; partidas?:E5PartidaSocio[]|null; jabas?:E5JabaSocio[]|null; }
export interface E5CobroMovimiento { cobroId:number; fecha:string; importe:number; moneda:string; estado:string; medioPago:string; numeroOperacion:string|null; }
export interface E5CobrosDetalle { campaniaId:number; movimientos:E5CobroMovimiento[]; }
@Injectable({providedIn:'root'})
export class E5ExtrasApiService {
  private readonly http=inject(HttpClient);
  private readonly base=inject(BASE_PATH);
  private readonly keys=inject(IdempotencyKeyService);
  private get root(){return `${this.base}/api/v1/apappss/finanzas-e5`;}

  graficos(campaniaId:number,fechaInicio:string,fechaFin:string,variedadPaltaId:number|null):Observable<E5Graficos> {
    const params:Record<string,string|number>={};
    if(fechaInicio)params['fechaInicio']=fechaInicio;
    if(fechaFin)params['fechaFin']=fechaFin;
    if(variedadPaltaId)params['variedadPaltaId']=variedadPaltaId;
    return this.http.get<ApiEnvelope<E5Graficos>>(`${this.root}/campanias/${campaniaId}/graficos`,{params})
      .pipe(map(unwrapApiResponse));
  }
  entregas(participacionId:number):Observable<E5EntregasSocio> {
    return this.http.get<ApiEnvelope<E5EntregasSocio>>(`${this.root}/participaciones/${participacionId}/entregas`)
      .pipe(map(unwrapApiResponse));
  }
  cobrosDetalle(campaniaId:number):Observable<E5CobrosDetalle> {
    return this.http.get<ApiEnvelope<E5CobrosDetalle>>(`${this.root}/campanias/${campaniaId}/cobros-detalle`)
      .pipe(map(unwrapApiResponse));
  }
  beneficiario(liquidacionId:number):Observable<E5Beneficiario> {
    return this.http.get<ApiEnvelope<E5Beneficiario>>(`${this.root}/liquidaciones/${liquidacionId}/beneficiario`)
      .pipe(map(unwrapApiResponse));
  }
  asegurarReceptor(liquidacionId:number,datos:E5ReceptorRequest):Observable<number> {
    return this.keys.idempotent(`APAPPSS:E5:RECEPTOR:${liquidacionId}`,datos,key=>
      this.http.post<ApiEnvelope<{personaId:number}>>(`${this.root}/liquidaciones/${liquidacionId}/receptores`,datos,{
        headers:new HttpHeaders({'X-Idempotency-Key':key}),
      }).pipe(map(response=>unwrapApiResponse(response).personaId)));
  }
  pagar(liquidacionId:number,datos:E5PagoBeneficiario):Observable<E5LiquidacionResponse> {
    return this.keys.idempotent(`APAPPSS:E5:PAGO_BENEFICIARIO:${liquidacionId}`,datos,key=>
      this.http.post<ApiEnvelope<E5LiquidacionResponse>>(`${this.root}/liquidaciones/${liquidacionId}/pagar-beneficiario`,datos,{
        headers:new HttpHeaders({'X-Idempotency-Key':key}),
      }).pipe(map(unwrapApiResponse)));
  }
}
