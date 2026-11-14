import {inject,Injectable} from '@angular/core';
import {HttpClient,HttpHeaders,HttpParams} from '@angular/common/http';
import {map,Observable} from 'rxjs';
import {AmbitoE3,EstadisticasE3,FiltrosE3,PaginaE3} from '../../../../domain/planta-paltera.model';

interface Envelope<T>{exitoso:boolean;codigo:string;mensaje:string;datos:T}
export type EstadoEpisodioE3='VIGENTE'|'RECUPERADA'|'ELIMINADA';
export interface EnfermedadItemE3{episodioId:number;diagnosticoId:number;enfermedad:string;estado:EstadoEpisodioE3;
 fechaDiagnostico:string;fechaCuracion?:string;diasEnferma:number;usuarioRegistroId:number;registradoPor?:string;totalTratamientos:number}
export interface TratamientoItemE3{tratamientoId:number;catalogoTratamientoId:number;descripcion:string;
 resultado?:string;comentario?:string;fechaAplicacion:string;fechaRegistro:string;usuarioId:number;usuarioNombre?:string;modificadoPorUsuarioId?:number;modificadoPorNombre?:string;modificadoEn?:string}
export interface EnfermedadDetalleE3 extends EnfermedadItemE3{plantaId:number;observacion?:string;motivoCierre?:string;
 usuarioCuracionId?:number;curadoPor?:string;usuarioEliminacionId?:number;eliminadoPor?:string;fechaEliminacion?:string;tratamientos:TratamientoItemE3[]}
export interface ComentarioE3{comentarioId:number;comentario:string;usuarioId:number;usuarioNombre?:string;fechaHora:string}
export interface AnalisisE3{plantaId:number;estadoPlanta:string;totalEnfermedades:number;enfermedadesVigentes:number;
 enfermedadesRecuperadas:number;tratamientosAplicados:number;totalComentarios:number;ultimoTratamiento?:string}
export interface ArchivoPlantaE3{
 archivoId:number;nombre:string;mimeType:string;categoria?:string;descripcion?:string;
 tipo:'GENERAL'|'TRATAMIENTO';aplicacionId?:number;episodioId?:number;enfermedad?:string;
 fechaCarga:string;usuarioNombre?:string;local:boolean;url?:string;
}
export interface ListadoE3<T>{items:T[]}

@Injectable({providedIn:'root'})
export class E3ClinicalService {
 private readonly http=inject(HttpClient);
 private readonly base='/api/v1/apappss/plantas';
 private params(a:AmbitoE3):HttpParams{let p=new HttpParams().set('uotId',a.uotId).set('convenioId',a.convenioId).set('predioId',a.predioId);if(a.parcelaCultivoId)p=p.set('parcelaCultivoId',a.parcelaCultivoId);return p}
 private endpoint(id:number){return `${this.base}/${encodeURIComponent(id)}`}
 private unwrap<T>(o:Observable<Envelope<T>>):Observable<T>{return o.pipe(map(r=>{
  if(!r.exitoso)throw Error(r.mensaje||'La operación no pudo completarse');return r.datos;
 }))}
 private idempotent(){return new HttpHeaders({'X-Idempotency-Key':globalThis.crypto.randomUUID()})}
 private get<T>(url:string,a:AmbitoE3){return this.unwrap(this.http.get<Envelope<T>>(url,{params:this.params(a)}))}
 private post<T>(url:string,a:AmbitoE3,data:unknown){return this.unwrap(this.http.post<Envelope<T>>(url,data,{params:this.params(a),headers:this.idempotent()}))}
 private put<T>(url:string,a:AmbitoE3,data:unknown){return this.unwrap(this.http.put<Envelope<T>>(url,data,{params:this.params(a),headers:this.idempotent()}))}
 private remove<T>(url:string,a:AmbitoE3,data:unknown){return this.unwrap(this.http.request<Envelope<T>>('DELETE',url,{params:this.params(a),body:data,headers:this.idempotent()}))}
 eliminarPlanta(a:AmbitoE3,id:number,version:number,motivo:string){return this.remove(this.endpoint(id),a,{version,motivo})}
 listarArchivos(a:AmbitoE3,id:number){return this.get<ListadoE3<ArchivoPlantaE3>>(`${this.endpoint(id)}/archivos`,a)}
 vincularArchivoTratamiento(a:AmbitoE3,id:number,episodioId:number,aplicacionId:number,archivoId:number){
  return this.post<{tratamientoArchivoId:number}>(`${this.endpoint(id)}/enfermedades/${episodioId}/tratamientos/archivos`,a,{aplicacionId,archivoId});
 }
 listarComentarios(a:AmbitoE3,id:number){return this.get<ListadoE3<ComentarioE3>>(`${this.endpoint(id)}/comentarios`,a)}
 registrarComentario(a:AmbitoE3,id:number,comentario:string){return this.post(`${this.endpoint(id)}/comentarios`,a,{comentario})}
 listarEnfermedades(a:AmbitoE3,id:number){return this.get<ListadoE3<EnfermedadItemE3>>(`${this.endpoint(id)}/enfermedades`,a)}
 crearEnfermedad(a:AmbitoE3,id:number,diagnosticoId:number,observacion?:string){return this.post(`${this.endpoint(id)}/enfermedades`,a,{diagnosticoId,observacion})}
 detalleEnfermedad(a:AmbitoE3,id:number,episodioId:number){return this.get<EnfermedadDetalleE3>(`${this.endpoint(id)}/enfermedades/${episodioId}`,a)}
 editarEnfermedad(a:AmbitoE3,id:number,episodioId:number,diagnosticoId:number,observacion?:string){return this.put(`${this.endpoint(id)}/enfermedades/${episodioId}`,a,{diagnosticoId,observacion})}
 recuperarEnfermedad(a:AmbitoE3,id:number,episodioId:number,fechaCuracion?:string,comentario?:string){return this.post(`${this.endpoint(id)}/enfermedades/${episodioId}/recuperar`,a,{fechaCuracion,comentario})}
 eliminarEnfermedad(a:AmbitoE3,id:number,episodioId:number,motivo:string){return this.remove(`${this.endpoint(id)}/enfermedades/${episodioId}`,a,{motivo})}
 tratamientos(a:AmbitoE3,id:number,episodioId:number){return this.get<ListadoE3<TratamientoItemE3>>(`${this.endpoint(id)}/enfermedades/${episodioId}/tratamientos`,a)}
 registrarTratamiento(a:AmbitoE3,id:number,episodioId:number,catalogoTratamientoId:number,fechaAplicacion?:string,comentario?:string,resultado?:string){
  return this.post(`${this.endpoint(id)}/enfermedades/${episodioId}/tratamientos`,a,{catalogoTratamientoId,fechaAplicacion,comentario,resultado})}
 editarTratamiento(a:AmbitoE3,id:number,episodioId:number,tratamientoId:number,
  body:{catalogoTratamientoId:number;fechaAplicacion:string;resultado:string|null;comentario:string|null}){
  return this.put<{tratamientoId:number}>(`${this.endpoint(id)}/enfermedades/${episodioId}/tratamientos/${tratamientoId}`,a,body);
 }
 analisis(a:AmbitoE3,id:number){return this.get<AnalisisE3>(`${this.endpoint(id)}/analisis-fitosanitario`,a)}
 altaInicial(a:AmbitoE3){return this.get<{totalHistorico:number;puedeCargaInicial:boolean}>(`${this.base}/alta-inicial`,a)}
 crearIndividual(a:AmbitoE3,data:{variedadId:number;socioId?:number;fechaPlantacion?:string;edadReferenciaAnios?:number;observacion?:string}){
  return this.post<{plantaId:number;codigo:string;estado:string}>(`${this.base}/individuales`,a,data);
 }
 listarParcela(a:AmbitoE3,f:FiltrosE3,parcelaCultivoId:number){
  let p=this.params(a).set('parcelaCultivoId',parcelaCultivoId).set('pagina',f.pagina).set('tamano',f.tamano);
  if(f.buscar)p=p.set('buscar',f.buscar);if(f.estado)p=p.set('estado',f.estado);if(f.variedadId)p=p.set('variedadId',f.variedadId);
  return this.unwrap(this.http.get<Envelope<PaginaE3>>(this.base,{params:p}));
 }
 resumenParcela(a:AmbitoE3,parcelaCultivoId:number,desde:string,hasta:string,estado?:string){
  let p=this.params(a).set('parcelaCultivoId',parcelaCultivoId).set('desde',desde).set('hasta',hasta);
  if(estado)p=p.set('estado',estado);
  return this.unwrap(this.http.get<Envelope<EstadisticasE3>>(`${this.base}/resumen`,{params:p}));
 }
}
