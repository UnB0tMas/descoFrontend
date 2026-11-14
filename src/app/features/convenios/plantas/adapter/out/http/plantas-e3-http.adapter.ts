import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { BASE_PATH } from '../../../../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import { PLANTAS_E3_GATEWAY, PlantasE3Gateway } from '../../../application/port/plantas-e3.gateway';
import {
  AmbitoE3, CatalogosE3, EstadisticasE3, DetalleE3, FichaE3, FilaE3, FiltrosE3,
  LoteResultadoE3, MedicionE3, MateriaSecaE3, OperacionE3, PaginaE3,
  ProduccionNuevaE3, ResultadoMasivoE3, SeguimientoMasivoE3, SeguimientoNuevoE3,
  TratamientoNuevoE3, EstadoE3, DocumentoPredioE3,
} from '../../../domain/planta-paltera.model';

interface ApiEnvelope<T> { datos?: T; mensaje?: string; exitoso?: boolean; }
interface Page<T> { items: T[]; }
function unwrap<T>(response: ApiEnvelope<T>): T {
  if (response.datos === null || response.datos === undefined)
    throw new Error(response.mensaje || 'No se recibieron los datos solicitados.');
  return response.datos;
}
@Injectable()
export class PlantasE3HttpAdapter implements PlantasE3Gateway {
  private readonly http = inject(HttpClient);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly url = `${inject(BASE_PATH).replace(/\/$/, '')}/api/v1/apappss/plantas`;
  private readonly documentosUrl = `${inject(BASE_PATH).replace(/\/$/, '')}/api/v1/documentos`;
  private params(a: AmbitoE3): HttpParams {
    return new HttpParams().set('uotId', a.uotId).set('convenioId', a.convenioId).set('predioId', a.predioId);
  }
  private get<T>(a: AmbitoE3, suffix = '', params = this.params(a)): Observable<T> {
    return this.http.get<ApiEnvelope<T>>(`${this.url}${suffix}`, { params, transferCache: false }).pipe(map(unwrap));
  }
  private write<T>(method: 'POST'|'PUT', a: AmbitoE3, suffix: string, payload: unknown): Observable<T> {
    const scope = `${method}:${this.url}${suffix}:${a.uotId}:${a.convenioId}:${a.predioId}`;
    return this.keys.idempotent(scope,payload,key =>
      this.http.request<ApiEnvelope<T>>(method,`${this.url}${suffix}`,{
        params:this.params(a),body:payload,headers:new HttpHeaders({'X-Idempotency-Key':key}),
      }).pipe(map(unwrap)));
  }
  catalogos(a: AmbitoE3) {
    return this.get<Partial<CatalogosE3>>(a,'/catalogos').pipe(map(c=>({
      variedades:Array.isArray(c.variedades)?c.variedades:[],
      diagnosticos:Array.isArray(c.diagnosticos)?c.diagnosticos:[],
      tratamientos:Array.isArray(c.tratamientos)?c.tratamientos:[],
      parcelas:Array.isArray(c.parcelas)?c.parcelas:[],
      socios:Array.isArray(c.socios)?c.socios:[],
    })));
  }
  resumen(a:AmbitoE3,desde:string,hasta:string,estado?:string,plantaId?:number) {
    let params=this.params(a).set('desde',desde).set('hasta',hasta);
    if(estado)params=params.set('estado',estado);
    return this.get<EstadisticasE3>(a,plantaId?`/${plantaId}/resumen`:'/resumen',params);
  }
  listar(a: AmbitoE3,f:FiltrosE3) {
    let params=this.params(a).set('pagina',f.pagina).set('tamano',f.tamano);
    if(f.buscar) params=params.set('buscar',f.buscar);
    if(f.estado) params=params.set('estado',f.estado);
    if(f.variedadId) params=params.set('variedadId',f.variedadId);
    return this.get<PaginaE3>(a,'',params);
  }
  ver(a:AmbitoE3,id:number){return this.get<DetalleE3>(a,`/${id}`).pipe(map(d=>({
    ...d,
    historial:Array.isArray(d.historial)?d.historial:[],
    fichas:Array.isArray(d.fichas)?d.fichas:[],
    episodios:Array.isArray(d.episodios)?d.episodios:[],
    seguimientos:Array.isArray(d.seguimientos)?d.seguimientos:[],
    tratamientos:Array.isArray(d.tratamientos)?d.tratamientos:[],
    producciones:Array.isArray(d.producciones)?d.producciones:[],
    produccionResumen:Array.isArray(d.produccionResumen)?d.produccionResumen:[],
    evidencias:Array.isArray(d.evidencias)?d.evidencias:[],
  })));}
  lote(a:AmbitoE3,filas:FilaE3[],socioId?:number){return this.write<LoteResultadoE3>('POST',a,'/lotes',{filas,socioId});}
  ficha(a:AmbitoE3,id:number,data:FichaE3){return this.write<OperacionE3>('PUT',a,`/${id}/ficha`,data);}
  estado(a:AmbitoE3,id:number,data:EstadoE3){return this.write<OperacionE3>('POST',a,`/${id}/estado`,data);}
  tratar(a:AmbitoE3,id:number,data:TratamientoNuevoE3){return this.write<OperacionE3>('POST',a,`/${id}/tratamientos`,data);}
  seguir(a:AmbitoE3,id:number,data:SeguimientoNuevoE3){return this.write<OperacionE3>('POST',a,`/${id}/seguimientos`,data);}
  produccion(a:AmbitoE3,id:number,data:ProduccionNuevaE3){return this.write<OperacionE3>('POST',a,`/${id}/producciones`,data);}
  evidencia(a:AmbitoE3,id:number,archivoId:number,eventoId?:number){return this.write<OperacionE3>('POST',a,`/${id}/evidencias`,{archivoId,eventoId});}
  // Conservamos lectura de datos históricos, pero no ofrecemos nuevas mediciones individuales.
  medir(a:AmbitoE3,id:number,data:MateriaSecaE3){return this.write<OperacionE3>('POST',a,`/${id}/mediciones`,data);}
  seguimientoMasivo(a:AmbitoE3,data:SeguimientoMasivoE3){return this.write<ResultadoMasivoE3>('POST',a,'/seguimientos/masivo',data);}
  mediciones(a:AmbitoE3,id:number){return this.get<Page<MedicionE3>>(a,`/${id}/mediciones`).pipe(map(r=>r.items??[]));}
  documentos(a:AmbitoE3):Observable<DocumentoPredioE3[]>{
    return this.http.get<ApiEnvelope<{items:Array<{archivoId:number;nombreOriginal?:string;nombre?:string;mimeType?:string;url?:string}>}>>(
      this.documentosUrl,{params:new HttpParams().set('contextoTipo','PREDIO').set('contextoId',a.predioId)
        .set('pagina',1).set('tamano',100),transferCache:false}).pipe(
        map(unwrap),map(x=>(x.items??[]).map(f=>({archivoId:f.archivoId,nombre:f.nombreOriginal??f.nombre??'',mimeType:f.mimeType??'',url:f.url}))));
  }
}
