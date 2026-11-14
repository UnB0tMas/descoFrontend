import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
 E5TableroResponse,E5GastosResponse,E5RepartosResponse,E5RepartoResponse,
 E5LiquidacionesResponse,E5LiquidacionResponse,E5ValidacionCierreResponse,
 E5CierreResponse,E5CobrosResponse,E5PagoRequest,E5CierreRequest
} from '../../../../../infrastructure/openapi/generated';

export interface E5Gateway {
 tablero(campaniaId:number):Observable<E5TableroResponse>;
 gastos(campaniaId:number):Observable<E5GastosResponse>;
 repartos(gastoId:number):Observable<E5RepartosResponse>;
 repartir(gastoId:number,cuotas?:readonly {participacionId:number;monto:number}[]):Observable<E5RepartoResponse>;
 aprobarReparto(gastoId:number):Observable<E5RepartoResponse>;
 rectificarReparto(gastoId:number,motivo:string,cuotas?:readonly {participacionId:number;monto:number}[]):Observable<E5RepartoResponse>;
 liquidaciones(campaniaId:number):Observable<E5LiquidacionesResponse>;
 liquidar(participacionId:number,motivoRectificacion?:string):Observable<E5LiquidacionResponse>;
 liquidacion(liquidacionId:number):Observable<E5LiquidacionResponse>;
 aprobarLiquidacion(liquidacionId:number):Observable<E5LiquidacionResponse>;
 observarLiquidacion(liquidacionId:number,motivo:string):Observable<E5LiquidacionResponse>;
 pagar(liquidacionId:number,pago:E5PagoRequest):Observable<E5LiquidacionResponse>;
 reversar(pagoId:number,motivo:string):Observable<E5LiquidacionResponse>;
 reporte(campaniaId:number):Observable<E5TableroResponse>;
 exportar(campaniaId:number):Observable<E5TableroResponse>;
 cobros(campaniaId:number):Observable<E5CobrosResponse>;
 validarCierre(campaniaId:number):Observable<E5ValidacionCierreResponse>;
 cerrar(campaniaId:number,request:E5CierreRequest):Observable<E5CierreResponse>;
}
export const E5_GATEWAY=new InjectionToken<E5Gateway>('E5_GATEWAY');
