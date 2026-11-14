import {Injectable,inject} from '@angular/core';
import {environment} from '../../../../../../../../environments/environment';
import {HttpClient,HttpHeaders,HttpParams} from '@angular/common/http';
import {Observable,map} from 'rxjs';
import {AmbitoE3} from '../../../../domain/planta-paltera.model';
import {ApiEnvelopeError} from '../../../../../../../infrastructure/openapi/api-response-unwrapper';

interface Envelope<T>{exitoso:boolean;codigo:string;mensaje:string;datos:T;correlacionId?:string}
export interface NotaEnfermedadE4{notaId:number;comentario:string;usuarioId:number;usuarioNombre?:string;fechaHora:string}
export interface ListadoNotasE4{items:NotaEnfermedadE4[]}
export interface InformeGlobalE4{
 informeId:number;porcentaje:number;cantidadPlantas:number;totalPlantasAlRegistro:number;
 cobertura:'TOTAL'|'PARCIAL';informe:string;fechaMuestreo:string;fechaRegistro?:string;
 cantidadFrutos?:number;metodo?:string;
 usuarioId?:number;usuarioNombre?:string;activo:boolean;version:number;
 modificadoPorUsuarioId?:number;modificadoPorNombre?:string;fechaModificacion?:string;
 eliminadoPorUsuarioId?:number;eliminadoPorNombre?:string;fechaBaja?:string;motivoBaja?:string;
}
export interface SecaPredioE4{totalPlantasActivas:number;items:InformeGlobalE4[]}
type SecaPredioRespuestaE4=Omit<SecaPredioE4,'items'>&{items?:InformeGlobalE4[]|string|null};
export interface DatosMateriaSecaFundo{
 porcentaje:number;cantidadPlantas:number;cantidadFrutos:number;metodo:string;fechaMuestreo:string;informe:string;
 motivoEdicion?:string;version?:number;
}

@Injectable({providedIn:'root'})
export class E3ExpedienteE4Service {
 private readonly http=inject(HttpClient);
 private readonly root=`${environment.apiBaseUrl}/api/v1/apappss`;
 private params(a:AmbitoE3):HttpParams{return new HttpParams().set('uotId',a.uotId).set('convenioId',a.convenioId).set('predioId',a.predioId)}
 private headers(){return new HttpHeaders({'X-Idempotency-Key':globalThis.crypto.randomUUID()})}
 private unwrap<T>(value:Observable<Envelope<T>>):Observable<T>{return value.pipe(map(r=>{
  // Conservar el código y la correlación; un Error genérico se perdía en el mapper global.
  if(!r||r.exitoso!==true)throw new ApiEnvelopeError(
   r?.codigo||'E4_RESPUESTA_INVALIDA',r?.mensaje||'No se pudo completar la solicitud.',r?.correlacionId??null);
  return r.datos;
 }))}
 private get<T>(url:string,a:AmbitoE3){return this.unwrap(this.http.get<Envelope<T>>(url,{params:this.params(a)}))}
 private post<T>(url:string,a:AmbitoE3,data:unknown){return this.unwrap(this.http.post<Envelope<T>>(url,data,{params:this.params(a),headers:this.headers()}))}
 private put<T>(url:string,a:AmbitoE3,data:unknown){return this.unwrap(this.http.put<Envelope<T>>(url,data,{params:this.params(a),headers:this.headers()}))}
 private delete<T>(url:string,a:AmbitoE3,data:unknown){return this.unwrap(this.http.request<Envelope<T>>('DELETE',url,{params:this.params(a),headers:this.headers(),body:data}))}
 private enfermedad(plantaId:number,episodioId:number){return `${this.root}/plantas/${plantaId}/enfermedades/${episodioId}`}
 notas(a:AmbitoE3,plantaId:number,episodioId:number){return this.get<ListadoNotasE4>(`${this.enfermedad(plantaId,episodioId)}/notas`,a)}
 registrarNota(a:AmbitoE3,plantaId:number,episodioId:number,comentario:string){
  return this.post<{notaId:number}>(`${this.enfermedad(plantaId,episodioId)}/notas`,a,{comentario});
 }
 registrarTratamientos(a:AmbitoE3,plantaId:number,episodioId:number,tratamientoIds:number[],fechaAplicacion:string,
  comentario?:string,resultado?:string){
  return this.post<{aplicacionId:number;tratamientosRegistrados:number}>(
   `${this.enfermedad(plantaId,episodioId)}/tratamientos/lote`,a,{tratamientoIds,fechaAplicacion,comentario,resultado});
 }
 secaPredio(a:AmbitoE3):Observable<SecaPredioE4>{
  return this.get<SecaPredioRespuestaE4>(`${this.root}/predios/${a.predioId}/materia-seca`,a).pipe(map(r=>{
   if(!r||!Number.isInteger(r.totalPlantasActivas)||r.totalPlantasActivas<0)
    throw new ApiEnvelopeError('E4_LISTADO_INVALIDO','No se pudo cargar la información.',null);
   let items:unknown=r.items??[];
   if(typeof items==='string'){
    try{items=JSON.parse(items);}
    catch{throw new ApiEnvelopeError('E4_LISTADO_INVALIDO','No se pudo cargar la información.',null);}
   }
   if(!Array.isArray(items))
    throw new ApiEnvelopeError('E4_LISTADO_INVALIDO','No se pudo cargar la información.',null);
   return {...r,items:items as InformeGlobalE4[]};
  }));
 }
 registrarSecaGlobal(a:AmbitoE3,data:DatosMateriaSecaFundo){
  return this.post<{informeId:number;version:number}>(`${this.root}/predios/${a.predioId}/materia-seca`,a,data);
 }
 editarSecaGlobal(a:AmbitoE3,informeId:number,data:DatosMateriaSecaFundo){
  return this.put<{informeId:number;version:number}>(`${this.root}/predios/${a.predioId}/materia-seca/${informeId}`,a,data);
 }
 eliminarSecaGlobal(a:AmbitoE3,informeId:number,version:number,motivo:string){
  return this.delete<{informeId:number;version:number}>(`${this.root}/predios/${a.predioId}/materia-seca/${informeId}`,a,{version,motivo});
 }
}
