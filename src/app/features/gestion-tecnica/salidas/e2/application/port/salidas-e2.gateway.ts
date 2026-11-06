import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogosE2, CorreccionE2, DetalleE2, EstadoBienE2, ListaE2, ResultadoE2, SolicitudE2 } from '../../domain/salida-operativa.model';
export interface SalidasE2Gateway {
  catalogos(uotId: number, convenioId?: number): Observable<CatalogosE2>;
  listar(uotId: number, convenioId?: number, estado?: string, pagina?: number, tamano?: number): Observable<ListaE2>;
  ver(uotId: number, id: number, convenioId?: number): Observable<DetalleE2>;
  solicitar(uotId: number, entrada: SolicitudE2, convenioId?: number): Observable<ResultadoE2>;
  corregir(uotId: number, id: number, correccion: CorreccionE2, convenioId?: number): Observable<ResultadoE2>;
  decidir(uotId: number, id: number, decision: 'APROBADA'|'OBSERVADA'|'RECHAZADA', motivo?: string, convenioId?: number): Observable<ResultadoE2>;
  entregar(uotId: number, id: number, convenioId?: number): Observable<ResultadoE2>;
  iniciar(uotId: number, id: number, convenioId?: number): Observable<ResultadoE2>;
  visitar(uotId: number, id: number, destinoId: number, tipoVisitaId: number, objetivo?: string, convenioId?: number): Observable<ResultadoE2>;
  finalizarVisita(uotId: number, id: number, visitaId: number, resumen: string, convenioId?: number): Observable<ResultadoE2>;
  retornar(uotId: number, id: number, observacionGeneral: string, bienes: EstadoBienE2[], convenioId?: number): Observable<ResultadoE2>;
  inspeccionar(uotId: number, id: number, bienes: EstadoBienE2[], observacion?: string, convenioId?: number): Observable<ResultadoE2>;
  vincularDestino(uotId:number,id:number,destinoId:number,predioId:number,convenioId?:number): Observable<ResultadoE2>;
  cancelar(uotId:number,id:number,motivo:string,convenioId?:number): Observable<ResultadoE2>;
  regularizarFin(uotId: number, id: number, fechaFinPrevista: string, convenioId?: number): Observable<ResultadoE2>;
  cerrar(uotId: number, id: number, convenioId?: number): Observable<ResultadoE2>;
}
export const SALIDAS_E2_GATEWAY = new InjectionToken<SalidasE2Gateway>('SalidasE2Gateway');
