import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';

export interface CajaOperador { usuarioId:number; nombreUsuario:string; nombreCompleto:string; }
export interface CajaPos {
  cajaId: number; uotId: number; codigo: string; nombre: string;
  sesionId: number | null; operadorId: number | null; estado: string; saldoInicial: number | null; activa: boolean;
}
export interface CajaSesion {
  sesionId: number; cajaId: number; uotId: number; caja: string;
  usuarioAperturaId: number; operadorId: number; estado: string;
  fechaApertura: string; fechaCierre: string | null; saldoInicial: number;
  saldoEsperado: number | null; saldoDeclarado: number | null; diferencia: number | null;
  observacionApertura?:string|null;observacionCierre?:string|null;operadorNombre?:string|null;
}
export interface CajaMovimientoDetalle {
  movimientoId:number; sesionId:number; tipo:string; importe:number; motivo:string; usuarioId:number; fecha:string; usuarioNombre?:string|null;
}
export interface CajaAsignacionDetalle {
  asignacionId:number; sesionId:number; anteriorId:number; nuevoId:number; responsableId:number; fecha:string; anteriorNombre?:string|null; nuevoNombre?:string|null;
}
export interface CajaVentaTurno {
  ventaId:number; sesionId:number; fecha:string; estado:string; total:number; cobrado:number;
}
export interface CajaDetalle {
  caja:CajaPos; sesiones:CajaSesion[]; movimientos:CajaMovimientoDetalle[]; asignaciones:CajaAsignacionDetalle[];
  ventas:CajaVentaTurno[];
  evidencias: { archivoId:number; sesionId:number; fase:'APERTURA'|'CIERRE'; nombre:string; fecha:string }[];
}
export interface CajaDisponible { cajaId:number; codigo:string; nombre:string; }
export interface CajaArqueoPago { codigo: string; nombre: string; importe: number; }
export interface CajaArqueoVenta { ventaId: number; fecha: string; estado: string; total: number; pagos: CajaArqueoPago[]; }
export interface CajaArqueoMetodo { codigo: string; nombre: string; total: number; }
export interface CajaArqueo {
  sesionId: number; cajaId: number; caja: string; uotNombre: string;
  estado: 'ABIERTA' | 'CERRADA'; fechaApertura: string; fechaCierre: string | null;
  operadorId: number; saldoInicial: number; efectivo: number; otrosMedios: number;
  ingresos: number; egresos: number; ventasEntregadas: number; totalCobrado: number;
  saldoEsperado: number; saldoDeclarado: number | null; diferencia: number | null;
  observacion: string | null; ventasPendientes: number;
  metodos: CajaArqueoMetodo[]; ventas: CajaArqueoVenta[];
}
export interface CajaCierre {
  sesionId: number; saldoEsperado: number; saldoDeclarado: number; diferencia: number;
}
export interface VentaReporte {
  periodo: string; cantidad: number; vendido: number; cobrado: number; efectivo: number;
}
export interface PosComprobante {
  ventaId: number; uotId: number; uotCodigo: string; uotNombre: string;
  fecha: string; cliente: string; documento: string; moneda: string;
  subtotal: number; impuesto: number; total: number; estado: string;
  numeroInterno: string; estadoSunat: string;
  tipoDocumento: 'BOLETA' | 'FACTURA'; serie: string; numero: number;
  emisorRuc: string; emisorRazonSocial: string; emisorDireccion: string;
  atendidoPor: string; qrContenido: string;
  lineas: { producto: string; cantidad: number; precioUnitario: number; subtotal: number }[];
}

@Injectable({ providedIn: 'root' })
export class CajaPosApiService {
  private readonly http=inject(HttpClient);
  private readonly keys=inject(IdempotencyKeyService);
  private readonly root=`${environment.apiBaseUrl.replace(/\/$/,'')}/api/v1/cajas-pos`;
  private headers(key: string): HttpHeaders { return new HttpHeaders({ 'X-Idempotency-Key': key }); }
  cajas(uotId: number,incluirInactivas=false) {
    return this.http.get<ApiEnvelope<CajaPos[]>>(this.root,{params:{uotId,incluirInactivas}})
      .pipe(map(response=>unwrapApiResponse(response) ?? []));
  }
  editarObservacionVenta(ventaId:number,input:{uotId:number;observacion:string}) {
    return this.keys.idempotent(`caja:venta:observacion:${ventaId}`,input,key=>
      this.http.patch<ApiEnvelope<{id:number}>>(`${this.root}/ventas/${ventaId}/observacion`,input,
        {headers:this.headers(key)}).pipe(map(response=>unwrapApiResponse(response))));
  }
  operadores(uotId: number) {
    return this.http.get<ApiEnvelope<CajaOperador[]>>(`${this.root}/operadores`,{params:{uotId}})
      .pipe(map(response=>unwrapApiResponse(response) ?? []));
  }
  sesiones(uotId: number) {
    return this.http.get<ApiEnvelope<CajaSesion[]>>(`${this.root}/sesiones`,{params:{uotId}})
      .pipe(map(response=>unwrapApiResponse(response) ?? []));
  }
  activa(uotId: number) {
    return this.http.get<ApiEnvelope<CajaSesion | null>>(`${this.root}/activa`,{params:{uotId}})
      .pipe(map(response=>unwrapApiResponse(response) ?? null));
  }
  disponibles(uotId:number) {
    return this.http.get<ApiEnvelope<CajaDisponible[]>>(`${this.root}/disponibles`,{params:{uotId}})
      .pipe(map(response=>unwrapApiResponse(response)??[]));
  }
  crear(input:{uotId:number;nombre:string}) {
    return this.keys.idempotent(`caja:crear:${input.uotId}`,input,key=>
      this.http.post<ApiEnvelope<{id:number}>>(this.root,input,{headers:this.headers(key)})
      .pipe(map(response=>unwrapApiResponse(response))));
  }
  detalle(uotId:number,cajaId:number) {
    return this.http.get<ApiEnvelope<CajaDetalle>>(`${this.root}/${cajaId}`,{params:{uotId}})
      .pipe(map(response=>unwrapApiResponse(response)));
  }
  editar(cajaId:number,input:{uotId:number;nombre:string}) {
    return this.keys.idempotent(`caja:editar:${cajaId}`,input,key=>
      this.http.put<ApiEnvelope<{id:number}>>(`${this.root}/${cajaId}`,input,{headers:this.headers(key)})
       .pipe(map(response=>unwrapApiResponse(response))));
  }
  retirar(cajaId:number,uotId:number) {
    return this.http.delete<ApiEnvelope<{id:number}>>(`${this.root}/${cajaId}`,{params:{uotId}})
      .pipe(map(response=>unwrapApiResponse(response)));
  }
  abrir(input:{uotId:number;cajaId:number;saldoInicial:number;observacion?:string;archivos?:number[]}) {
    return this.keys.idempotent(`caja:abrir:${input.cajaId}`,input,key=>
      this.http.post<ApiEnvelope<{id:number}>>(`${this.root}/abrir`,input,{headers:this.headers(key)})
      .pipe(map(response=>unwrapApiResponse(response))));
  }
  asignados(sesionId:number,uotId:number) {
    return this.http.get<ApiEnvelope<CajaOperador[]>>(`${this.root}/sesiones/${sesionId}/operadores`,
      {params:{uotId}}).pipe(map(response=>unwrapApiResponse(response)??[]));
  }
  quitar(sesionId:number,usuarioId:number,uotId:number) {
    return this.keys.idempotent(`caja:quitar:${sesionId}:${usuarioId}`,{uotId,usuarioId},key=>
      this.http.delete<ApiEnvelope<{id:number}>>(`${this.root}/sesiones/${sesionId}/operadores/${usuarioId}`,
        {params:{uotId},headers:this.headers(key)}).pipe(map(response=>unwrapApiResponse(response))));
  }
  asignar(sesionId:number,input:{uotId:number;operadorId:number}) {
    return this.keys.idempotent(`caja:asignar:${sesionId}`,input,key=>
      this.http.post<ApiEnvelope<{id:number}>>(`${this.root}/sesiones/${sesionId}/asignar`,input,{headers:this.headers(key)})
      .pipe(map(response=>unwrapApiResponse(response))));
  }
  movimiento(sesionId:number,input:{uotId:number;tipo:'INGRESO'|'EGRESO';importe:number;motivo:string}) {
    return this.keys.idempotent(`caja:movimiento:${sesionId}`,input,key=>
      this.http.post<ApiEnvelope<{id:number}>>(`${this.root}/sesiones/${sesionId}/movimientos`,input,
        {headers:this.headers(key)}).pipe(map(response=>unwrapApiResponse(response))));
  }
  arqueo(sesionId:number,uotId:number) {
    return this.http.get<ApiEnvelope<CajaArqueo>>(`${this.root}/sesiones/${sesionId}/arqueo`,
      {params:{uotId}}).pipe(map(response=>unwrapApiResponse(response)));
  }
  arqueoPdf(sesionId:number,uotId:number) {
    return this.http.get(`${this.root}/sesiones/${sesionId}/arqueo.pdf`,
      {params:{uotId},responseType:'blob'});
  }
  cerrar(sesionId:number,input:{uotId:number;saldoDeclarado:number;observacion?:string;archivos?:number[]}) {
    return this.keys.idempotent(`caja:cerrar:${sesionId}`,input,key=>
      this.http.post<ApiEnvelope<CajaCierre>>(`${this.root}/sesiones/${sesionId}/cerrar`,input,
        {headers:this.headers(key)}).pipe(map(response=>unwrapApiResponse(response))));
  }
  reporte(uotId:number,agrupacion:'DIA'|'MES',desde:string,hasta:string) {
    const params=new HttpParams().set('uotId',uotId).set('agrupacion',agrupacion).set('desde',desde).set('hasta',hasta);
    return this.http.get<ApiEnvelope<VentaReporte[]>>(`${this.root}/reportes`,{params})
      .pipe(map(response=>unwrapApiResponse(response) ?? []));
  }
  comprobante(saleId:number) {
    return this.http.get<ApiEnvelope<PosComprobante>>(`${this.root}/ventas/${saleId}/comprobante-interno`)
      .pipe(map(response=>unwrapApiResponse(response)));
  }
  comprobantePdf(saleId:number) {
    return this.http.get(`${this.root}/ventas/${saleId}/comprobante.pdf`,{responseType:'blob'});
  }
}
