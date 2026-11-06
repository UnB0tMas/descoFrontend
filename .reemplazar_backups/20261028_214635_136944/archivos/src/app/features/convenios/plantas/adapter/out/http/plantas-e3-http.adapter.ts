import {Injectable,inject} from '@angular/core';
import {map} from 'rxjs';
import {PlantasDePaltaService,E3LoteRequest,E3FilaLoteRequest,E3FichaRequest,E3EstadoRequest,E3TratamientoRequest,E3SeguimientoRequest,E3ProduccionRequest,E3EvidenciaRequest} from '../../../../../../infrastructure/openapi/generated';
import {IdempotencyKeyService} from '../../../../../../core/http/services/idempotency-key.service';
import {PlantasE3Gateway} from '../../../application/port/plantas-e3.gateway';
import {AmbitoE3,CatalogosE3,DetalleE3,EstadoE3,FichaE3,FilaE3,FiltrosE3,LoteResultadoE3,OperacionE3,PaginaE3,ProduccionNuevaE3,SeguimientoNuevoE3,TratamientoNuevoE3} from '../../../domain/planta-paltera.model';
function must<T>(v:T|undefined|null,name:string):T{if(v===null||v===undefined)throw new Error('Respuesta incompleta: '+name);return v}
@Injectable()
export class PlantasE3HttpAdapter implements PlantasE3Gateway {
 private readonly api=inject(PlantasDePaltaService);
 private readonly keys=inject(IdempotencyKeyService);
 private readonly options={transferCache:false};
 catalogos(a:AmbitoE3){return this.api.apappssPlantasCatalogos({...a},'body',false,this.options).pipe(map(r=>{
  const d=must(r.datos,'catalogos');const result:CatalogosE3={
   variedades:(d.variedades??[]).map(x=>({id:must(x.id,'variedad'),nombre:x.nombre??''})),
   diagnosticos:(d.diagnosticos??[]).map(x=>({id:must(x.id,'diagnostico'),nombre:x.nombre??''})),
   parcelas:(d.parcelas??[]).map(x=>({id:must(x.id,'parcela'),nombre:x.nombre??''})),
  };return result;
 }))}
 listar(a:AmbitoE3,f:FiltrosE3){return this.api.apappssPlantasListar({...a,...f},'body',false,this.options).pipe(map(r=>{
  const d=must(r.datos,'lista');const result:PaginaE3={total:d.total??0,
   items:(d.items??[]).map(x=>({plantaId:must(x.plantaId,'plantaId'),codigo:x.codigo??'',variedad:x.variedad??'',
    variedadId:must(x.variedadId,'variedadId'),estado:x.estado??'',parcelaCultivoId:x.parcelaCultivoId,version:x.version??0})),
   resumen:(d.resumen??[]).map(x=>({variedadId:must(x.variedadId,'variedadId'),variedad:x.variedad??'',cantidad:x.cantidad??0,sinEvaluar:x.sinEvaluar??0}))
  };return result;
 }))}
 ver(a:AmbitoE3,plantaId:number){return this.api.apappssPlantaVer({...a,plantaId},'body',false,this.options).pipe(map(r=>{
  const d=must(r.datos,'planta');const result:DetalleE3={plantaId:must(d.plantaId,'plantaId'),predioId:must(d.predioId,'predioId'),
   codigo:d.codigo??'',variedad:d.variedad??'',variedadId:must(d.variedadId,'variedadId'),estado:d.estado??'',
   edadActual:d.edadActual,edadReferenciaAnios:d.edadReferenciaAnios,fechaPlantacion:d.fechaPlantacion,version:d.version??0,
   parcelaCultivoId:d.parcelaCultivoId,
   historial:(d.historial??[]).map(x=>({eventoId:must(x.eventoId,'eventoId'),tipo:x.tipo??'',estadoAnterior:x.estadoAnterior,
    estadoNuevo:x.estadoNuevo,observacion:x.observacion,visitaId:x.visitaId,usuarioId:x.usuarioId,fechaHora:x.fechaHora})),
   episodios:(d.episodios??[]).map(x=>({episodioId:must(x.episodioId,'episodioId'),diagnostico:x.diagnostico??'',
    diagnosticoId:must(x.diagnosticoId,'diagnosticoId'),inicio:x.inicio,fin:x.fin,observacion:x.observacion})),
   tratamientos:(d.tratamientos??[]).map(x=>({tratamientoId:must(x.tratamientoId,'tratamientoId'),episodioId:must(x.episodioId,'episodioId'),
    descripcion:x.descripcion??'',resultado:x.resultado,fechaHora:x.fechaHora,visitaId:x.visitaId})),
   producciones:(d.producciones??[]).map(x=>({produccionId:must(x.produccionId,'produccionId'),anio:must(x.anio,'anio'),
    estimadoKg:x.estimadoKg,realKg:x.realKg,observacion:x.observacion,fechaHora:x.fechaHora})),
   evidencias:(d.evidencias??[]).map(x=>({archivoId:must(x.archivoId,'archivoId'),eventoId:x.eventoId,nombre:x.nombre??'',mimeType:x.mimeType??'',url:x.url,tipo:x.tipo??''}))
  };return result;
 }))}
 private result(data?:{plantaId?:number;eventoId?:number;estado?:string}):OperacionE3{
  return {plantaId:must(data?.plantaId,'plantaId'),eventoId:must(data?.eventoId,'eventoId'),estado:data?.estado??''};
 }
 lote(a:AmbitoE3,filas:FilaE3[]){const e3LoteRequest:E3LoteRequest={filas:filas.map(f=>({...f} as E3FilaLoteRequest))};
  return this.keys.idempotent(`E3:lote:${a.predioId}`,e3LoteRequest,key=>
   this.api.apappssPlantasCrearLote({...a,xIdempotencyKey:key,e3LoteRequest},'body',false,this.options)
    .pipe(map(r=>({total:r.datos?.total??0,resumen:(r.datos?.resumen??[]).map(x=>({variedadId:must(x.variedadId,'variedadId'),variedad:x.variedad??'',cantidad:x.cantidad??0,sinEvaluar:x.sinEvaluar??0}))} as LoteResultadoE3))));
 }
 ficha(a:AmbitoE3,plantaId:number,data:FichaE3){const e3FichaRequest:E3FichaRequest={...data};return this.keys.idempotent(`E3:ficha:${plantaId}`,data,key=>
  this.api.apappssPlantaCompletarFicha({...a,plantaId,xIdempotencyKey:key,e3FichaRequest},'body',false,this.options).pipe(map(r=>this.result(r.datos))));}
 estado(a:AmbitoE3,plantaId:number,data:EstadoE3){const e3EstadoRequest:E3EstadoRequest={...data};return this.keys.idempotent(`E3:estado:${plantaId}`,data,key=>
  this.api.apappssPlantaEvaluar({...a,plantaId,xIdempotencyKey:key,e3EstadoRequest},'body',false,this.options).pipe(map(r=>this.result(r.datos))));}
 tratar(a:AmbitoE3,plantaId:number,data:TratamientoNuevoE3){const e3TratamientoRequest:E3TratamientoRequest={...data};return this.keys.idempotent(`E3:tratar:${plantaId}`,data,key=>
  this.api.apappssPlantaTratar({...a,plantaId,xIdempotencyKey:key,e3TratamientoRequest},'body',false,this.options).pipe(map(r=>this.result(r.datos))));}
 seguir(a:AmbitoE3,plantaId:number,data:SeguimientoNuevoE3){const e3SeguimientoRequest:E3SeguimientoRequest={...data};return this.keys.idempotent(`E3:seguir:${plantaId}`,data,key=>
  this.api.apappssPlantaSeguimiento({...a,plantaId,xIdempotencyKey:key,e3SeguimientoRequest},'body',false,this.options).pipe(map(r=>this.result(r.datos))));}
 produccion(a:AmbitoE3,plantaId:number,data:ProduccionNuevaE3){const e3ProduccionRequest:E3ProduccionRequest={...data};return this.keys.idempotent(`E3:produccion:${plantaId}`,data,key=>
  this.api.apappssPlantaProduccion({...a,plantaId,xIdempotencyKey:key,e3ProduccionRequest},'body',false,this.options).pipe(map(r=>this.result(r.datos))));}
 evidencia(a:AmbitoE3,plantaId:number,archivoId:number,eventoId?:number){const e3EvidenciaRequest:E3EvidenciaRequest={archivoId,eventoId};return this.keys.idempotent(`E3:evidencia:${plantaId}`,e3EvidenciaRequest,key=>
  this.api.apappssPlantaVincularEvidencia({...a,plantaId,xIdempotencyKey:key,e3EvidenciaRequest},'body',false,this.options).pipe(map(r=>this.result(r.datos))));}
}
