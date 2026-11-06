import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { SalidasOperativasService } from '../../../../../../../infrastructure/openapi/generated/api/salidasOperativas.service';
import { IdempotencyKeyService } from '../../../../../../../core/http/services/idempotency-key.service';
import { SalidasE2Gateway } from '../../../application/port/salidas-e2.gateway';
import { CatalogosE2, CorreccionE2, DetalleE2, EstadoBienE2, ListaE2,
  ResultadoE2, SolicitudE2 } from '../../../domain/salida-operativa.model';
import { E2SolicitudRequest } from '../../../../../../../infrastructure/openapi/generated/model/e2SolicitudRequest';
import { E2CorreccionRequest } from '../../../../../../../infrastructure/openapi/generated/model/e2CorreccionRequest';
import { E2RetornoRequest } from '../../../../../../../infrastructure/openapi/generated/model/e2RetornoRequest';
import { E2InspeccionRequest } from '../../../../../../../infrastructure/openapi/generated/model/e2InspeccionRequest';
import { E2VisitaRequest } from '../../../../../../../infrastructure/openapi/generated/model/e2VisitaRequest';

function required<T>(value:T|null|undefined, nombre:string):T {
  if(value==null) throw new Error(`Respuesta E2 incompleta: ${nombre}`);
  return value;
}
@Injectable()
export class SalidasE2HttpAdapter implements SalidasE2Gateway {
  private readonly api=inject(SalidasOperativasService);
  private readonly keys=inject(IdempotencyKeyService);
  private readonly options={transferCache:false};
  catalogos(uotId:number,convenioId?:number){
    return this.api.salidasOperativasCatalogos({uotId,convenioId},'body',false,this.options)
      .pipe(map(r=>{
        const d=required(r.datos,'catalogos') as unknown as CatalogosE2;
        return {motivos:required(d.motivos,'motivos'),tiposVisita:required(d.tiposVisita,'tiposVisita'),
          bienes:required(d.bienes,'bienes'),participantes:required(d.participantes,'participantes')};
      }));
  }
  listar(uotId:number,convenioId?:number,estado?:string,pagina=1,tamano=20){
    return this.api.salidasOperativasListar({uotId,convenioId,estado,pagina,tamano},'body',false,this.options)
      .pipe(map(r=>{const d=required(r.datos,'listado') as unknown as ListaE2;
        return {total:required(d.total,'total'),items:required(d.items,'items')};}));
  }
  ver(uotId:number,id:number,convenioId?:number){
    return this.api.salidasOperativasVer({uotId,id,convenioId},'body',false,this.options)
      .pipe(map(r=>{const d=required(r.datos,'detalle') as unknown as DetalleE2;
        required(d.destinos,'destinos');required(d.bienes,'bienes');required(d.visitas,'visitas');
        required(d.historial,'historial');required(d.participantes,'participantes');
        return d;}));
  }
  solicitar(uotId:number,entrada:SolicitudE2,convenioId?:number){
    return this.keys.idempotent(`E2:solicitar:${uotId}:${convenioId??0}`,entrada,key=>
      this.api.salidasOperativasSolicitar({uotId,convenioId,xIdempotencyKey:key,
        e2SolicitudRequest:entrada as unknown as E2SolicitudRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'solicitud') as ResultadoE2)));
  }
  corregir(uotId:number,id:number,correccion:CorreccionE2,convenioId?:number){
    return this.keys.idempotent(`E2:corregir:${uotId}:${id}`,correccion,key=>
      this.api.salidasOperativasCorregir({uotId,id,convenioId,xIdempotencyKey:key,
        e2CorreccionRequest:correccion as unknown as E2CorreccionRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'correccion') as ResultadoE2)));
  }
  decidir(uotId:number,id:number,decision:'APROBADA'|'OBSERVADA'|'RECHAZADA',motivo?:string,convenioId?:number){
    const e2DecisionRequest={decision,motivo};
    return this.keys.idempotent(`E2:decidir:${uotId}:${id}`,e2DecisionRequest,key=>
      this.api.salidasOperativasDecidir({uotId,id,convenioId,xIdempotencyKey:key,e2DecisionRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'decision') as ResultadoE2)));
  }
  entregar(uotId:number,id:number,convenioId?:number){
    return this.keys.idempotent(`E2:entregar:${uotId}:${id}`,{},key=>
      this.api.salidasOperativasEntregar({uotId,id,convenioId,xIdempotencyKey:key},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'entrega') as ResultadoE2)));
  }
  iniciar(uotId:number,id:number,convenioId?:number){
    return this.keys.idempotent(`E2:iniciar:${uotId}:${id}`,{},key=>
      this.api.salidasOperativasIniciar({uotId,id,convenioId,xIdempotencyKey:key},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'inicio') as ResultadoE2)));
  }
  visitar(uotId:number,id:number,destinoId:number,tipoVisitaId:number,objetivo?:string,convenioId?:number){
    const e2VisitaRequest={destinoId,tipoVisitaId,objetivo} as E2VisitaRequest;
    return this.keys.idempotent(`E2:visita:${uotId}:${id}`,e2VisitaRequest,key=>
      this.api.salidasOperativasVisitar({uotId,id,convenioId,xIdempotencyKey:key,e2VisitaRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'visita') as ResultadoE2)));
  }
  finalizarVisita(uotId:number,id:number,visitaId:number,resumen:string,convenioId?:number){
    const e2VisitaCierreRequest={resumen};
    return this.keys.idempotent(`E2:finvisita:${uotId}:${id}:${visitaId}`,e2VisitaCierreRequest,key=>
      this.api.salidasOperativasVisitaFinalizar({uotId,id,visitaId,convenioId,xIdempotencyKey:key,
        e2VisitaCierreRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'fin visita') as ResultadoE2)));
  }
  retornar(uotId:number,id:number,observacionGeneral:string,bienes:EstadoBienE2[],convenioId?:number){
    const e2RetornoRequest={observacionGeneral,bienes} as E2RetornoRequest;
    return this.keys.idempotent(`E2:retorno:${uotId}:${id}`,e2RetornoRequest,key=>
      this.api.salidasOperativasRetornar({uotId,id,convenioId,xIdempotencyKey:key,e2RetornoRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'retorno') as ResultadoE2)));
  }
  inspeccionar(uotId:number,id:number,bienes:EstadoBienE2[],observacion?:string,convenioId?:number){
    const e2InspeccionRequest={observacion,bienes} as E2InspeccionRequest;
    return this.keys.idempotent(`E2:inspeccion:${uotId}:${id}`,e2InspeccionRequest,key=>
      this.api.salidasOperativasInspeccionar({uotId,id,convenioId,xIdempotencyKey:key,e2InspeccionRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'inspeccion') as ResultadoE2)));
  }
  vincularDestino(uotId:number,id:number,destinoId:number,predioId:number,convenioId?:number){
    const e2VincularDestinoRequest={destinoId,predioId};
    return this.keys.idempotent(`E2:vincular:${uotId}:${id}`,e2VincularDestinoRequest,key=>
      this.api.salidasOperativasVincularDestino({uotId,id,convenioId,xIdempotencyKey:key,e2VincularDestinoRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'vinculo') as ResultadoE2)));
  }
  cancelar(uotId:number,id:number,motivo:string,convenioId?:number){
    const e2CancelarRequest={motivo};
    return this.keys.idempotent(`E2:cancelar:${uotId}:${id}`,e2CancelarRequest,key=>
      this.api.salidasOperativasCancelar({uotId,id,convenioId,xIdempotencyKey:key,e2CancelarRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'cancelacion') as ResultadoE2)));
  }
  regularizarFin(uotId:number,id:number,fechaFinPrevista:string,convenioId?:number){
    const e2FechaFinRequest={fechaFinPrevista};
    return this.keys.idempotent(`E2:fecha-fin:${uotId}:${id}`,e2FechaFinRequest,key=>
      this.api.salidasOperativasRegularizarFin({uotId,id,convenioId,xIdempotencyKey:key,e2FechaFinRequest},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'fecha fin') as ResultadoE2)));
  }
  cerrar(uotId:number,id:number,convenioId?:number){
    return this.keys.idempotent(`E2:cerrar:${uotId}:${id}`,{},key=>
      this.api.salidasOperativasCerrar({uotId,id,convenioId,xIdempotencyKey:key},'body',false,this.options)
      .pipe(map(r=>required(r.datos,'cierre') as ResultadoE2)));
  }
}
