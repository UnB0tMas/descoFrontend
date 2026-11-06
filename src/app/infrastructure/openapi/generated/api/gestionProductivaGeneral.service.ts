/** Mirror of the Spring OpenAPI tag "Gestion productiva general".
 * Mantenimiento manual de contratos OpenAPI. No importar Swagger automáticamente. */
import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_PATH } from '../variables';
import { Configuration } from '../configuration';
import { BaseService } from '../api.base.service';
import { GpParcelaResponse } from '../model/gpParcelaResponse';
import { GpParcelaAltaRequest } from '../model/gpParcelaAltaRequest';
import { GpParcelaEditarRequest } from '../model/gpParcelaEditarRequest';
import { GpActividadRevisionResponse } from '../model/gpActividadRevisionResponse';
import { GpCatalogoResponse } from '../model/gpCatalogoResponse';
import { GpActividadResponse } from '../model/gpActividadResponse';
import { GpCensoResponse } from '../model/gpCensoResponse';
import { GpEventoResponse } from '../model/gpEventoResponse';
import { GpIdResponse } from '../model/gpIdResponse';
import { GpActividadAltaRequest } from '../model/gpActividadAltaRequest';
import { GpActividadEditarRequest } from '../model/gpActividadEditarRequest';
import { GpCensoAltaRequest } from '../model/gpCensoAltaRequest';
import { GpEventoAltaRequest } from '../model/gpEventoAltaRequest';
import { GpCatalogoRazaRequest } from '../model/gpCatalogoRazaRequest';
import { GpCatalogoCultivoRequest } from '../model/gpCatalogoCultivoRequest';
import { GpCatalogoEspecieRequest } from '../model/gpCatalogoEspecieRequest';
import { GpCatalogoProblemaRequest } from '../model/gpCatalogoProblemaRequest';
import { GpCatalogoTratamientoRequest } from '../model/gpCatalogoTratamientoRequest';
import { GpCatalogoRelacionRequest } from '../model/gpCatalogoRelacionRequest';
export interface GpIncidenciaResponse {incidenciaId:number;actividadId:number;problemaId:number;problema:string;estado:'ABIERTA'|'CERRADA';
 resultado?:string|null;afectadaM2?:number|null;afectadosAnimales?:number|null;perdidaM2?:number|null;perdidosAnimales?:number|null;
 descripcion:string;fechaRegistro:string;usuarioId:number;fechaCierre?:string|null;descripcionCierre?:string|null;usuarioCierreId?:number|null;}
export interface GpIncidenciaRevisionResponse {
  revisionId:number;incidenciaId:number;accion:'EDICION'|'RETIRO';motivo:string;
  usuarioId:number;fechaRegistro:string;problemaAnterior:number;problemaNuevo:number;
  afectadaAnterior?:number|null;afectadaNueva?:number|null;
  animalesAnteriores?:number|null;animalesNuevos?:number|null;
  descripcionAnterior:string;descripcionNueva:string;
}
export interface GpIncidenciaEditarRequest extends GpIncidenciaAltaRequest {motivo:string;}
export interface GpIncidenciaRetirarRequest {motivo:string;}
export interface GpTratamientoSeguimientoResponse {eventoId:number;incidenciaId:number;tratamientoId:number;tratamiento:string;
 descripcion:string;fechaInicio:string;fechaFinPrevista?:string|null;fechaFinReal?:string|null;descripcionCierre?:string|null;usuarioId:number;}
export interface GpIncidenciaAltaRequest {problemaId:number;afectadaM2?:number|null;afectadosAnimales?:number|null;descripcion:string;}
export interface GpTratamientoAplicarRequest {incidenciaId:number;tratamientoId:number;descripcion:string;fechaFinPrevista?:string|null;}
export interface GpIncidenciaCerrarRequest {perdidaM2?:number|null;perdidosAnimales?:number|null;descripcion:string;}
export interface GpEnvelope<T> {exitoso:boolean; codigo:string; mensaje:string; datos:T; correlacionId:string; fechaHoraUtc:string;}
@Injectable({providedIn:'root'})
export class GestionProductivaGeneralService extends BaseService {
  constructor(protected http:HttpClient,@Optional() @Inject(BASE_PATH) basePath:string|string[],@Optional() configuration?:Configuration){ super(basePath,configuration); }
  private readonly root='/api/v1/gestion-productiva-general';
  private uri(path:string){ return `${this.configuration.basePath}${this.root}${path}`; }
  private params(uotId:number){return new HttpParams().set('uotId',String(uotId));}
  private headers(key:string){return new HttpHeaders().set('X-Idempotency-Key',key);}
  gpParcelasListar(uotId:number,predioId:number):Observable<GpEnvelope<GpParcelaResponse[]>>{
    return this.http.get<GpEnvelope<GpParcelaResponse[]>>(this.uri(`/predios/${predioId}/parcelas`),{params:this.params(uotId)});
  }
  gpParcelaCrear(uotId:number,body:GpParcelaAltaRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/parcelas'),body,
      {params:this.params(uotId),headers:this.headers(key)});
  }
  gpParcelaEditar(uotId:number,id:number,body:GpParcelaEditarRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.put<GpEnvelope<GpIdResponse>>(this.uri(`/parcelas/${id}`),body,
      {params:this.params(uotId),headers:this.headers(key)});
  }
  gpCatalogosListar(uotId:number):Observable<GpEnvelope<GpCatalogoResponse[]>>{
    return this.http.get<GpEnvelope<GpCatalogoResponse[]>>(this.uri('/catalogos'),{params:this.params(uotId)});
  }
  gpActividadesListar(uotId:number,parcelaId:number):Observable<GpEnvelope<GpActividadResponse[]>>{
    return this.http.get<GpEnvelope<GpActividadResponse[]>>(this.uri(`/parcelas/${parcelaId}/actividades`),{params:this.params(uotId)});
  }
  gpActividadCrear(uotId:number,body:GpActividadAltaRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/actividades'),body,{params:this.params(uotId),headers:this.headers(key)});
  }
  gpActividadEditar(uotId:number,id:number,body:GpActividadEditarRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.put<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}`),body,{params:this.params(uotId),headers:this.headers(key)});
  }
  gpActividadRevisionesListar(uotId:number,id:number):Observable<GpEnvelope<GpActividadRevisionResponse[]>>{
    return this.http.get<GpEnvelope<GpActividadRevisionResponse[]>>(this.uri(`/actividades/${id}/revisiones`),
      {params:this.params(uotId)});
  }
  gpCensosListar(uotId:number,id:number):Observable<GpEnvelope<GpCensoResponse[]>>{
    return this.http.get<GpEnvelope<GpCensoResponse[]>>(this.uri(`/actividades/${id}/censos`),{params:this.params(uotId)});
  }
  gpCensoCrear(uotId:number,id:number,body:GpCensoAltaRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}/censos`),body,{params:this.params(uotId),headers:this.headers(key)});
  }
  gpEventosListar(uotId:number,id:number):Observable<GpEnvelope<GpEventoResponse[]>>{
    return this.http.get<GpEnvelope<GpEventoResponse[]>>(this.uri(`/actividades/${id}/eventos`),{params:this.params(uotId)});
  }
  gpEventoCrear(uotId:number,id:number,body:GpEventoAltaRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}/eventos`),body,{params:this.params(uotId),headers:this.headers(key)});
  }
  gpIncidenciasListar(u:number,id:number):Observable<GpEnvelope<GpIncidenciaResponse[]>>{
    return this.http.get<GpEnvelope<GpIncidenciaResponse[]>>(this.uri(`/actividades/${id}/incidencias`),{params:this.params(u)});
  }
  gpIncidenciasTratamientosListar(u:number,id:number):Observable<GpEnvelope<GpTratamientoSeguimientoResponse[]>>{
    return this.http.get<GpEnvelope<GpTratamientoSeguimientoResponse[]>>(this.uri(`/actividades/${id}/tratamientos`),{params:this.params(u)});
  }
  gpIncidenciaCrear(u:number,id:number,q:GpIncidenciaAltaRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}/incidencias`),q,{params:this.params(u),headers:this.headers(key)});
  }
  gpIncidenciaEditar(u:number,id:number,q:GpIncidenciaEditarRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.put<GpEnvelope<GpIdResponse>>(this.uri(`/incidencias/${id}`),q,{params:this.params(u),headers:this.headers(key)});
  }
  gpIncidenciaRetirar(u:number,id:number,q:GpIncidenciaRetirarRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/incidencias/${id}/retirar`),q,{params:this.params(u),headers:this.headers(key)});
  }
  gpIncidenciaRevisionesListar(u:number,id:number):Observable<GpEnvelope<GpIncidenciaRevisionResponse[]>>{
    return this.http.get<GpEnvelope<GpIncidenciaRevisionResponse[]>>(this.uri(`/incidencias/${id}/revisiones`),{params:this.params(u)});
  }
  gpIncidenciaTratamientoCrear(u:number,id:number,q:GpTratamientoAplicarRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}/incidencias/tratamientos`),q,{params:this.params(u),headers:this.headers(key)});
  }
  gpIncidenciaTratamientoFinalizar(u:number,id:number,q:{descripcion:string},key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/tratamientos/${id}/finalizar`),q,{params:this.params(u),headers:this.headers(key)});
  }
  gpIncidenciaCerrar(u:number,id:number,q:GpIncidenciaCerrarRequest,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/incidencias/${id}/cerrar`),q,{params:this.params(u),headers:this.headers(key)});
  }
  gpActividadFinalizar(u:number,id:number,motivo:string,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}/finalizar`),{motivo},{params:this.params(u),headers:this.headers(key)});
  }
  gpActividadEliminar(u:number,id:number,motivo:string,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/actividades/${id}/eliminar`),{motivo},{params:this.params(u),headers:this.headers(key)});
  }
  gpParcelaEliminar(u:number,id:number,motivo:string,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/parcelas/${id}/eliminar`),{motivo},{params:this.params(u),headers:this.headers(key)});
  }
  gpPredioEliminar(u:number,id:number,motivo:string,key:string):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/predios/${id}/eliminar`),{motivo},{params:this.params(u),headers:this.headers(key)});
  }
  /** OpenAPI manual: gpFotoSubir, multipart/form-data, archivo requerido. */
  gpFotoSubir(uotId:number,eventoId:number,archivo:File):Observable<GpEnvelope<GpIdResponse>> {
    const form=new FormData();form.append('archivo',archivo,archivo.name);
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri(`/fotos/eventos/${eventoId}`),form,{params:this.params(uotId)});
  }
  /** OpenAPI manual: gpFotoVer; binario autenticado por interceptor HTTP. */
  gpFotoVer(uotId:number,fotoId:number):Observable<Blob> {
    return this.http.get(this.uri(`/fotos/${fotoId}`),{params:this.params(uotId),responseType:'blob'});
  }
  gpCatalogoCultivoCrear(uotId:number,body:GpCatalogoCultivoRequest):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/cultivos'),body,{params:this.params(uotId)});
  }
  gpCatalogoEspecieCrear(uotId:number,body:GpCatalogoEspecieRequest):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/especies'),body,{params:this.params(uotId)});
  }
  gpCatalogoRazaCrear(uotId:number,body:GpCatalogoRazaRequest):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/razas'),body,{params:this.params(uotId)});
  }
  gpCatalogoProblemaCrear(uotId:number,body:GpCatalogoProblemaRequest):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/problemas'),body,{params:this.params(uotId)});
  }
  gpCatalogoTratamientoCrear(uotId:number,body:GpCatalogoTratamientoRequest):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/tratamientos'),body,{params:this.params(uotId)});
  }
  gpCatalogoAsociar(uotId:number,body:GpCatalogoRelacionRequest):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/relaciones'),body,{params:this.params(uotId)});
  }
  gpCatalogoVariedadCrear(uotId:number,body:{cultivoId:number;codigo:string;nombre:string;descripcion?:string|null}):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.post<GpEnvelope<GpIdResponse>>(this.uri('/catalogos/variedades'),body,{params:this.params(uotId)});
  }
  gpCatalogoActualizar(uotId:number,tipo:string,id:number,body:{codigo?:string|null;nombre?:string|null;padreId?:number|null;descripcion?:string|null;estado:boolean}):Observable<GpEnvelope<GpIdResponse>>{
    return this.http.put<GpEnvelope<GpIdResponse>>(this.uri(`/catalogos/${encodeURIComponent(tipo)}/${id}`),body,{params:this.params(uotId)});
  }

}
