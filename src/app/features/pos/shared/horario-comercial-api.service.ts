import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';

export interface ComercialEmpleado {
  empleadoId:number; usuarioId:number|null; nombre:string; codigo:string;
  area:string; cargo:string; habilitadoPos:boolean;
}
export interface ComercialBloque { diaSemana:number; horaInicio:string; horaFin:string; }
export interface ComercialTurno extends ComercialBloque { horarioId:number; empleadoId:number; }
export interface ComercialPlantilla { plantillaId:number; nombre:string; horaInicio:string; horaFin:string; }
export interface ComercialAtencion { uotId:number; horaInicio:string; horaFin:string; }
export interface ComercialAtencionDia { diaSemana:number; horaInicio:string; horaFin:string; personalizado:boolean; }
export interface ComercialAfectado {
  horarioId:number;empleadoId:number;empleado:string;diaSemana:number;
  horaInicio:string;horaFin:string;nuevoInicio:string|null;nuevoFin:string|null;quitar:boolean;
}
export interface ComercialCambioAtencion {
  uotId:number;modo:'GENERAL'|'PERSONALIZAR'|'HEREDAR';diaSemana:number|null;
  horaInicio:string|null;horaFin:string|null;ajustarEmpleados:boolean;vistaConfirmada:string|null;
}
export interface ComercialCambioAtencionLote {
  uotId:number;diasSemana:number[];horaInicio:string;horaFin:string;
  ajustarEmpleados:boolean;vistaConfirmada:string|null;
}
export interface ComercialResultadoAtencion { afectados:ComercialAfectado[];mensaje:string; }
export interface ComercialMiHorario {
  empleadoId:number|null; nombre:string; turnos:ComercialTurno[];
  atencion:ComercialAtencion; diasAtencion:ComercialAtencionDia[];
}
export interface ComercialPlanilla {
  atencion:ComercialAtencion; diasAtencion:ComercialAtencionDia[]; empleados:ComercialEmpleado[]; turnos:ComercialTurno[];
}
@Injectable({providedIn:'root'})
export class HorarioComercialApiService {
  private readonly http=inject(HttpClient);
  private readonly keys=inject(IdempotencyKeyService);
  private readonly root=`${environment.apiBaseUrl.replace(/\/$/,'')}/api/v1/comercial/horarios`;
  mio(uotId:number) {
    return this.http.get<ApiEnvelope<ComercialMiHorario>>(`${this.root}/mio`,{params:{uotId}})
      .pipe(map(r=>unwrapApiResponse(r)));
  }
  planilla(uotId:number) {
    return this.http.get<ApiEnvelope<ComercialPlanilla>>(this.root,{params:{uotId}})
      .pipe(map(r=>unwrapApiResponse(r)));
  }
  configurar(input:ComercialAtencion) {
    return this.keys.idempotent(`comercial:horario:${input.uotId}`,input,key=>
      this.http.put<ApiEnvelope<{id:number}>>(`${this.root}/configuracion`,input,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }
  previsualizarAtencion(input:ComercialCambioAtencion) {
    return this.http.post<ApiEnvelope<ComercialResultadoAtencion>>(`${this.root}/atencion-semanal/preview`,input)
      .pipe(map(r=>unwrapApiResponse(r)));
  }
  guardarAtencionSemanal(input:ComercialCambioAtencion) {
    return this.keys.idempotent(`comercial:atencion-semanal:${input.uotId}:${input.diaSemana??'general'}`,input,key=>
      this.http.put<ApiEnvelope<ComercialResultadoAtencion>>(`${this.root}/atencion-semanal`,input,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }
  previsualizarAtencionLote(input:ComercialCambioAtencionLote) {
    return this.http.post<ApiEnvelope<ComercialResultadoAtencion>>(`${this.root}/atencion-semanal/lote/preview`,input)
      .pipe(map(r=>unwrapApiResponse(r)));
  }
  guardarAtencionLote(input:ComercialCambioAtencionLote) {
    return this.keys.idempotent(`comercial:atencion-semanal:lote:${input.uotId}`,input,key=>
      this.http.put<ApiEnvelope<ComercialResultadoAtencion>>(`${this.root}/atencion-semanal/lote`,input,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }
  cambiarAcceso(uotId:number,empleadoId:number,habilitar:boolean,motivo:string) {
    const input={uotId,habilitar,motivo};
    return this.keys.idempotent(`comercial:acceso:${uotId}:${empleadoId}`,input,key=>
      this.http.put<ApiEnvelope<{empleadoId:number;habilitado:boolean;mensaje:string}>>(
        `${this.root}/empleados/${empleadoId}/acceso`,input,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }
  guardar(uotId:number,empleadoId:number,bloques:ComercialBloque[],autorizarCoincidencia=false,motivoCoincidencia='') {
    const input={uotId,bloques,autorizarCoincidencia,motivoCoincidencia};
    return this.keys.idempotent(`comercial:empleado:${empleadoId}`,input,key=>
      this.http.put<ApiEnvelope<{id:number}>>(`${this.root}/empleados/${empleadoId}`,input,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }
  plantillas(uotId:number) {
    return this.http.get<ApiEnvelope<ComercialPlantilla[]>>(`${this.root}/plantillas`,{params:{uotId}})
      .pipe(map(r=>unwrapApiResponse(r)));
  }
  guardarPlantilla(uotId:number,nombre:string,horaInicio:string,horaFin:string,plantillaId:number|null=null) {
    const input={uotId,plantillaId,nombre,horaInicio,horaFin};
    return this.keys.idempotent(`comercial:plantilla:${uotId}:${plantillaId??'nueva'}`,input,key=>
      this.http.put<ApiEnvelope<{id:number}>>(`${this.root}/plantillas`,input,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }
  eliminarPlantilla(uotId:number,plantillaId:number) {
    const input={uotId,plantillaId};
    return this.keys.idempotent(`comercial:plantilla:eliminar:${uotId}:${plantillaId}`,input,key=>
      this.http.post<ApiEnvelope<{id:number}>>(`${this.root}/plantillas/${plantillaId}/desactivar`,{},
        {params:{uotId},headers:new HttpHeaders({'X-Idempotency-Key':key})}).pipe(map(r=>unwrapApiResponse(r))));
  }

}
