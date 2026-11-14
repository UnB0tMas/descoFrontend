import { Injectable, inject } from '@angular/core';
import { E5PagoRequest,E5CierreRequest } from '../../../../../infrastructure/openapi/generated';
import { E5_GATEWAY } from '../port/e5.gateway';

@Injectable()
export class E5UseCase {
 private readonly repo=inject(E5_GATEWAY);
 tablero(c:number){return this.repo.tablero(c)}
 gastos(c:number){return this.repo.gastos(c)}
 repartos(g:number){return this.repo.repartos(g)}
 repartir(g:number,cuotas?:readonly {participacionId:number;monto:number}[]){return this.repo.repartir(g,cuotas)}
 aprobarReparto(g:number){return this.repo.aprobarReparto(g)}
 rectificarReparto(g:number,m:string,cuotas?:readonly {participacionId:number;monto:number}[]){return this.repo.rectificarReparto(g,m,cuotas)}
 liquidaciones(c:number){return this.repo.liquidaciones(c)}
 liquidar(p:number,m?:string){return this.repo.liquidar(p,m)}
 liquidacion(l:number){return this.repo.liquidacion(l)}
 aprobarLiquidacion(l:number){return this.repo.aprobarLiquidacion(l)}
 observarLiquidacion(l:number,m:string){return this.repo.observarLiquidacion(l,m)}
 pagar(l:number,p:E5PagoRequest){return this.repo.pagar(l,p)}
 reversar(p:number,m:string){return this.repo.reversar(p,m)}
 reporte(c:number){return this.repo.reporte(c)}
 exportar(c:number){return this.repo.exportar(c)}
 cobros(c:number){return this.repo.cobros(c)}
 validarCierre(c:number){return this.repo.validarCierre(c)}
 cerrar(c:number,r:E5CierreRequest){return this.repo.cerrar(c,r)}
}
