import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { E4Assigned,E4Campaign,E4Delivery,E4Prebalance,E4Result,E4Return,E4Units } from '../../domain/e4.model';
export interface E4Gateway {
  resumen(campaniaId:number):Observable<E4Campaign>;
  configurar(campaniaId:number,cupoJabas:number,taraKg:number):Observable<void>;
  asignar(operativoSocioId:number,cantidad:number):Observable<E4Assigned>;
  unidades(asignacionId:number):Observable<E4Units>;
  pesar(unidadId:number,pesoBrutoKg:number,variedadId:number,condicionId:number):Observable<void>;
  devolver(asignacionId:number,llenas:number,vacias:number):Observable<E4Return>;
  confirmar(asignacionId:number):Observable<E4Delivery>;
  sancionar(entregaId:number,precioNuevo:number,motivo:string,condicionId?:number,variedadId?:number):Observable<E4Result>;
  tarifa(campaniaId:number,precioUnitario:number):Observable<void>;
  confirmarFaltantes(asignacionId:number,motivo:string):Observable<void>;
  cargo(asignacionId:number,motivo:string):Observable<E4Result>;
  prebalance(campaniaId:number):Observable<E4Prebalance>;
}
export const E4_GATEWAY=new InjectionToken<E4Gateway>('E4_GATEWAY');
