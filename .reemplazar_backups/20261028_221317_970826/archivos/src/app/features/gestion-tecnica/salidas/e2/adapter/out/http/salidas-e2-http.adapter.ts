import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import {
  SalidasOperativasService, E2SolicitudRequest, E2DecisionRequest,
  E2CorreccionRequest, E2VisitaRequest, E2VisitaCierreRequest,
  E2RetornoRequest, E2InspeccionRequest, E2VincularDestinoRequest, E2CancelarRequest,
  E2SalidasResponse, E2SalidaDetalleResponse, E2CatalogosResponse, E2OperacionResponse,
} from '../../../../../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../../../../../core/http/services/idempotency-key.service';
import { SalidasE2Gateway } from '../../../application/port/salidas-e2.gateway';
import {
  CatalogosE2, DetalleE2, EstadoBienE2, ListaE2, ResultadoE2, SolicitudE2,
} from '../../../domain/salida-operativa.model';

function required<T>(value: T | undefined | null, nombre: string): T {
  if (value === undefined || value === null) throw new Error(`Respuesta incompleta: ${nombre}`);
  return value;
}
function operation(data?: E2OperacionResponse): ResultadoE2 {
  return {salidaId: required(data?.salidaId,'salidaId'), visitaId:data?.visitaId,
    estado: data?.estado ?? ''};
}
function detail(data?: E2SalidaDetalleResponse): DetalleE2 {
  const d = required(data,'detalle');
  return {
    salidaId: required(d.salidaId,'salidaId'), nombre:d.nombre ?? '', estado:d.estado ?? '',
    uotId: required(d.uotId,'uotId'), convenioId:d.convenioId,
    solicitanteEmpleadoId:required(d.solicitanteEmpleadoId,'solicitanteEmpleadoId'),
    motivoSalidaId: required(d.motivoSalidaId,'motivoSalidaId'),
    fechaSolicitud:d.fechaSolicitud, descripcion:d.descripcion,
    fechaInicioPrevista:d.fechaInicioPrevista,fechaFinPrevista:d.fechaFinPrevista,
    fechaInicioReal:d.fechaInicioReal,fechaFinReal:d.fechaFinReal,fechaAprobacion:d.fechaAprobacion,
    destinos:(d.destinos ?? []).map(x=>({destinoId:required(x.destinoId,'destinoId'),
      predioId:x.predioId,referencia:x.referencia,orden:x.orden ?? 0})),
    bienes:(d.bienes ?? []).map(x=>({solicitudRecursoId:required(x.solicitudRecursoId,'solicitudRecursoId'),
      bienId:required(x.bienId,'bienId'),nombre:x.nombre ?? '',estado:x.estado ?? '',
      resultadoDeclarado:x.resultadoDeclarado,resultadoValidado:x.resultadoValidado,observacion:x.observacion})),
    visitas:(d.visitas ?? []).map(x=>({visitaId:required(x.visitaId,'visitaId'),predioId:required(x.predioId,'predioId'),
      fechaInicio:x.fechaInicio,fechaFin:x.fechaFin,estado:x.estado ?? '',
      objetivo:x.objetivo,resumen:x.resumen,tipoVisita:x.tipoVisita})),
    historial:(d.historial ?? []).map(x=>({eventoId:required(x.eventoId,'eventoId'),
      tipo:x.tipo ?? '',detalle:x.detalle,usuarioId:required(x.usuarioId,'usuarioId'),fechaHora:x.fechaHora})),
    observacionRetorno:d.observacionRetorno,
  };
}
@Injectable()
export class SalidasE2HttpAdapter implements SalidasE2Gateway {
  private readonly api = inject(SalidasOperativasService);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly options = {transferCache:false};
  catalogos(uotId:number,convenioId?:number) {
    return this.api.salidasOperativasCatalogos({uotId,convenioId},'body',false,this.options)
      .pipe(map(r=>this.mapCatalogs(r.datos)));
  }
  listar(uotId:number,convenioId?:number,estado?:string,pagina=1,tamano=20) {
    return this.api.salidasOperativasListar({uotId,convenioId,estado,pagina,tamano},'body',false,this.options)
      .pipe(map(r=>this.mapList(r.datos)));
  }
  ver(uotId:number,id:number,convenioId?:number) {
    return this.api.salidasOperativasVer({id,uotId,convenioId},'body',false,this.options)
      .pipe(map(r=>detail(r.datos)));
  }
  solicitar(uotId:number,data:SolicitudE2,convenioId?:number) {
    const e2SolicitudRequest:E2SolicitudRequest={...data};
    return this.keys.idempotent(`E2:solicitar:${uotId}:${convenioId??0}`,e2SolicitudRequest,key=>
      this.api.salidasOperativasSolicitar({uotId,convenioId,xIdempotencyKey:key,e2SolicitudRequest},
        'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  corregir(uotId:number,id:number,nombre:string,descripcion?:string,convenioId?:number) {
    const e2CorreccionRequest:E2CorreccionRequest={nombre,descripcion};
    return this.keys.idempotent(`E2:corregir:${id}`,e2CorreccionRequest,key=>
      this.api.salidasOperativasCorregir({id,uotId,convenioId,xIdempotencyKey:key,e2CorreccionRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  decidir(uotId:number,id:number,decision:'APROBADA'|'OBSERVADA'|'RECHAZADA',motivo?:string,convenioId?:number) {
    const e2DecisionRequest:E2DecisionRequest={decision,motivo};
    return this.keys.idempotent(`E2:decidir:${id}`,e2DecisionRequest,key=>
      this.api.salidasOperativasDecidir({id,uotId,convenioId,xIdempotencyKey:key,e2DecisionRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  entregar(uotId:number,id:number,convenioId?:number) {
    return this.keys.idempotent(`E2:entregar:${id}`,{},key=>
      this.api.salidasOperativasEntregar({id,uotId,convenioId,xIdempotencyKey:key},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  iniciar(uotId:number,id:number,convenioId?:number) {
    return this.keys.idempotent(`E2:iniciar:${id}`,{},key=>
      this.api.salidasOperativasIniciar({id,uotId,convenioId,xIdempotencyKey:key},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  visitar(uotId:number,id:number,destinoId:number,tipoVisitaId:number,objetivo?:string,convenioId?:number) {
    const e2VisitaRequest:E2VisitaRequest={destinoId,tipoVisitaId,objetivo};
    return this.keys.idempotent(`E2:visitar:${id}`,e2VisitaRequest,key=>
      this.api.salidasOperativasVisitar({id,uotId,convenioId,xIdempotencyKey:key,e2VisitaRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  finalizarVisita(uotId:number,id:number,visitaId:number,resumen:string,convenioId?:number) {
    const e2VisitaCierreRequest:E2VisitaCierreRequest={resumen};
    return this.keys.idempotent(`E2:visita-fin:${visitaId}`,e2VisitaCierreRequest,key=>
      this.api.salidasOperativasVisitaFinalizar({id,visitaId,uotId,convenioId,
      xIdempotencyKey:key,e2VisitaCierreRequest},'body',false,this.options)
      .pipe(map(r=>operation(r.datos))));
  }
  retornar(uotId:number,id:number,observacionGeneral:string,bienes:EstadoBienE2[],convenioId?:number) {
    const e2RetornoRequest:E2RetornoRequest={observacionGeneral,bienes};
    return this.keys.idempotent(`E2:retorno:${id}`,e2RetornoRequest,key=>
      this.api.salidasOperativasRetornar({id,uotId,convenioId,xIdempotencyKey:key,e2RetornoRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  inspeccionar(uotId:number,id:number,bienes:EstadoBienE2[],observacion?:string,convenioId?:number) {
    const e2InspeccionRequest:E2InspeccionRequest={observacion,bienes};
    return this.keys.idempotent(`E2:inspeccion:${id}`,e2InspeccionRequest,key=>
      this.api.salidasOperativasInspeccionar({id,uotId,convenioId,xIdempotencyKey:key,e2InspeccionRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  vincularDestino(uotId:number,id:number,destinoId:number,predioId:number,convenioId?:number) {
    const e2VincularDestinoRequest:E2VincularDestinoRequest={destinoId,predioId};
    return this.keys.idempotent(`E2:vincular:${id}:${destinoId}`,e2VincularDestinoRequest,key=>
      this.api.salidasOperativasVincularDestino({id,uotId,convenioId,xIdempotencyKey:key,e2VincularDestinoRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  cancelar(uotId:number,id:number,motivo:string,convenioId?:number) {
    const e2CancelarRequest:E2CancelarRequest={motivo};
    return this.keys.idempotent(`E2:cancelar:${id}`,e2CancelarRequest,key=>
      this.api.salidasOperativasCancelar({id,uotId,convenioId,xIdempotencyKey:key,e2CancelarRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  cerrar(uotId:number,id:number,convenioId?:number) {
    return this.keys.idempotent(`E2:cerrar:${id}`,{},key=>
      this.api.salidasOperativasCerrar({id,uotId,convenioId,xIdempotencyKey:key},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  private mapList(d?: E2SalidasResponse): ListaE2 {
    return {total:d?.total ?? 0,items:(d?.items ?? []).map(x=>({
      salidaId:required(x.salidaId,'salidaId'),nombre:x.nombre ?? '',estado:x.estado ?? '',
      fechaSolicitud:x.fechaSolicitud,fechaInicioPrevista:x.fechaInicioPrevista,
      fechaFinPrevista:x.fechaFinPrevista,
      solicitanteEmpleadoId:required(x.solicitanteEmpleadoId,'solicitanteEmpleadoId'),
    }))};
  }
  private mapCatalogs(d?: E2CatalogosResponse): CatalogosE2 {
    const mapOption=(x:{id?:number;nombre?:string;codigo?:string})=>({id:required(x.id,'opcionId'),nombre:x.nombre ?? '',codigo:x.codigo});
    return {motivos:(d?.motivos ?? []).map(mapOption),tiposVisita:(d?.tiposVisita ?? []).map(mapOption),
      bienes:(d?.bienes ?? []).map(mapOption)};
  }
}
