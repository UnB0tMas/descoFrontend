import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import { FinanzasAPAPPSSE5Service, E5PagoRequest,E5CierreRequest } from '../../../../../../infrastructure/openapi/generated';
import { E5Gateway } from '../../../application/port/e5.gateway';

function required<T>(data: T | null | undefined): T {
 if(data==null) throw new Error('El servidor no devolvió los datos financieros solicitados.');
 return data;
}
@Injectable()
export class E5HttpAdapter implements E5Gateway {
 private readonly api=inject(FinanzasAPAPPSSE5Service);
 private readonly keys=inject(IdempotencyKeyService);
 private readonly opts={transferCache:false};
 private write<T>(scope:string,request:unknown,send:(key:string)=>Observable<T>):Observable<T> {
   return this.keys.idempotent(`APAPPSS:E5:${scope}`,request,send);
 }
 tablero(campaniaId:number){return this.api.apappssE5Tablero({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 gastos(campaniaId:number){return this.api.apappssE5Gastos({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 repartos(gastoId:number){return this.api.apappssE5Repartos({gastoId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 repartir(gastoId:number){return this.write(`REPARTIR:${gastoId}`,{},key=>this.api.apappssE5Repartir({gastoId,xIdempotencyKey:key},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 aprobarReparto(gastoId:number){return this.write(`APROBAR_REPARTO:${gastoId}`,{},key=>this.api.apappssE5AprobarReparto({gastoId,xIdempotencyKey:key},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 rectificarReparto(gastoId:number,motivo:string){const e5ObservacionRequest={motivo};return this.write(`RECTIFICAR_REPARTO:${gastoId}`,e5ObservacionRequest,key=>this.api.apappssE5RectificarReparto({gastoId,xIdempotencyKey:key,e5ObservacionRequest},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 liquidaciones(campaniaId:number){return this.api.apappssE5Liquidaciones({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 liquidar(participacionId:number,motivoRectificacion?:string){const e5RectificacionRequest=motivoRectificacion?{motivoRectificacion}:undefined;return this.write(`LIQUIDAR:${participacionId}`,e5RectificacionRequest,key=>this.api.apappssE5Liquidar({participacionId,xIdempotencyKey:key,e5RectificacionRequest},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 liquidacion(liquidacionId:number){return this.api.apappssE5Liquidacion({liquidacionId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 aprobarLiquidacion(liquidacionId:number){return this.write(`APROBAR:${liquidacionId}`,{},key=>this.api.apappssE5AprobarLiquidacion({liquidacionId,xIdempotencyKey:key},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 observarLiquidacion(liquidacionId:number,motivo:string){const e5ObservacionRequest={motivo};return this.write(`OBSERVAR:${liquidacionId}`,e5ObservacionRequest,key=>this.api.apappssE5ObservarLiquidacion({liquidacionId,xIdempotencyKey:key,e5ObservacionRequest},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 pagar(liquidacionId:number,e5PagoRequest:E5PagoRequest){return this.write(`PAGAR:${liquidacionId}`,e5PagoRequest,key=>this.api.apappssE5Pagar({liquidacionId,xIdempotencyKey:key,e5PagoRequest},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 reversar(pagoId:number,motivo:string){const e5ObservacionRequest={motivo};return this.write(`REVERSAR:${pagoId}`,e5ObservacionRequest,key=>this.api.apappssE5ReversarPago({pagoId,xIdempotencyKey:key,e5ObservacionRequest},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
 reporte(campaniaId:number){return this.api.apappssE5Reporte({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 exportar(campaniaId:number){return this.api.apappssE5Exportar({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 cobros(campaniaId:number){return this.api.apappssE5Cobros({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 validarCierre(campaniaId:number){return this.api.apappssE5ValidarCierre({campaniaId},'body',false,this.opts).pipe(map(x=>required(x.datos)))}
 cerrar(campaniaId:number,e5CierreRequest:E5CierreRequest){return this.write(`CERRAR:${campaniaId}`,e5CierreRequest,key=>this.api.apappssE5Cerrar({campaniaId,xIdempotencyKey:key,e5CierreRequest},'body',false,this.opts).pipe(map(x=>required(x.datos))))}
}
