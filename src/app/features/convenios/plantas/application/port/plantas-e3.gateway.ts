import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {MateriaSecaE3,MedicionE3,SeguimientoMasivoE3,ResultadoMasivoE3,AmbitoE3,CatalogosE3,EstadisticasE3,DetalleE3,EstadoE3,FichaE3,FilaE3,FiltrosE3,LoteResultadoE3,OperacionE3,PaginaE3,ProduccionNuevaE3,SeguimientoNuevoE3,TratamientoNuevoE3,DocumentoPredioE3} from '../../domain/planta-paltera.model';
export interface PlantasE3Gateway {
 documentos(a:AmbitoE3):Observable<DocumentoPredioE3[]>;
 mediciones(a:AmbitoE3,id:number):Observable<MedicionE3[]>;
 medir(a:AmbitoE3,id:number,data:MateriaSecaE3):Observable<OperacionE3>;
 seguimientoMasivo(a:AmbitoE3,data:SeguimientoMasivoE3):Observable<ResultadoMasivoE3>;
 catalogos(a:AmbitoE3):Observable<CatalogosE3>;
 resumen(a:AmbitoE3,desde:string,hasta:string,estado?:string,plantaId?:number):Observable<EstadisticasE3>;
 listar(a:AmbitoE3,f:FiltrosE3):Observable<PaginaE3>;
 ver(a:AmbitoE3,id:number):Observable<DetalleE3>;
 lote(a:AmbitoE3,filas:FilaE3[],socioId?:number):Observable<LoteResultadoE3>;
 ficha(a:AmbitoE3,id:number,data:FichaE3):Observable<OperacionE3>;
 estado(a:AmbitoE3,id:number,data:EstadoE3):Observable<OperacionE3>;
 tratar(a:AmbitoE3,id:number,data:TratamientoNuevoE3):Observable<OperacionE3>;
 seguir(a:AmbitoE3,id:number,data:SeguimientoNuevoE3):Observable<OperacionE3>;
 produccion(a:AmbitoE3,id:number,data:ProduccionNuevaE3):Observable<OperacionE3>;
 evidencia(a:AmbitoE3,id:number,archivoId:number,eventoId?:number):Observable<OperacionE3>;
}
export const PLANTAS_E3_GATEWAY=new InjectionToken<PlantasE3Gateway>('PLANTAS_E3_GATEWAY');
