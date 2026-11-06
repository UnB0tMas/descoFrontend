import {Injectable,inject} from '@angular/core';
import {map,Observable} from 'rxjs';
import {
  PlantasDePaltaService,DocumentosYEvidenciasService,
  E3LoteRequest,E3FichaRequest,E3EstadoRequest,E3TratamientoRequest,
  E3SeguimientoRequest,E3SeguimientoMasivoRequest,E3ProduccionRequest,
  E3MedicionMateriaSecaRequest,E3EvidenciaRequest,ApiResponseE3OperacionResponse,
} from '../../../../../../infrastructure/openapi/generated';
import {IdempotencyKeyService} from '../../../../../../core/http/services/idempotency-key.service';
import {PlantasE3Gateway} from '../../../application/port/plantas-e3.gateway';
import {
  AmbitoE3,CatalogosE3,DetalleE3,PaginaE3,FilaE3,FichaE3,EstadoE3,
  TratamientoNuevoE3,SeguimientoNuevoE3,ProduccionNuevaE3,SeguimientoMasivoE3,
  MateriaSecaE3,LoteResultadoE3,OperacionE3,ResultadoMasivoE3,DocumentoPredioE3,
  EstadoPlantaE3,TipoActuacionE3,
} from '../../../domain/planta-paltera.model';

function required<T>(value:T|null|undefined, name:string):T {
  if(value===undefined || value===null) throw new Error(`Respuesta APAPPSS incompleta: ${name}`);
  return value;
}
@Injectable()
export class PlantasE3HttpAdapter implements PlantasE3Gateway {
  private readonly api=inject(PlantasDePaltaService);
  private readonly documentosApi=inject(DocumentosYEvidenciasService);
  private readonly keys=inject(IdempotencyKeyService);
  private readonly options={transferCache:false};
  private scope(a:AmbitoE3,accion:string,id?:number):string {
    return `E3:${a.uotId}:${a.convenioId}:${a.predioId}:${accion}:${id??0}`;
  }
  documentos(a:AmbitoE3) {
    return this.documentosApi.documentosListar({contextoTipo:'PREDIO',contextoId:a.predioId,pagina:1,tamano:100},
      'body',false,this.options).pipe(map(r=>(r.datos?.items??[]).map(d=>({
       archivoId:required(d.archivoId,'archivoId'),nombre:d.nombreOriginal??'Sin nombre',
       mimeType:d.mimeType??'',url:d.secureUrl,
      } as DocumentoPredioE3))));
  }
  catalogos(a:AmbitoE3) {
    return this.api.apappssPlantasCatalogos(a,'body',false,this.options).pipe(map(r=>{
      const d=required(r.datos,'catalogos');
      const options=(list:typeof d.variedades)=>(list??[]).map(x=>({id:required(x.id,'id'),nombre:x.nombre??''}));
      return {variedades:options(d.variedades),diagnosticos:options(d.diagnosticos),
       parcelas:options(d.parcelas),socios:options(d.socios)} as CatalogosE3;
    }));
  }
  listar(a:AmbitoE3,f:{buscar?:string;estado?:string;variedadId?:number;pagina:number;tamano:number}) {
    return this.api.apappssPlantasListar({...a,...f},'body',false,this.options).pipe(map(r=>{
      const d=required(r.datos,'listado de plantas');
      const resumen=(d.resumen??[]).map(x=>({
       variedadId:required(x.variedadId,'variedadId'),variedad:x.variedad??'',
       cantidad:x.cantidad??0,sinEvaluar:x.sinEvaluar??0,sanas:x.sanas??0,
       enfermas:x.enfermas??0,muertas:x.muertas??0,
       plantasConEstimacion:x.plantasConEstimacion??0,plantasConCosecha:x.plantasConCosecha??0,
       estimadoKg:x.estimadoKg??0,realKg:x.realKg??0,
      }));
      return {total:d.total??0,anioResumen:d.anioResumen??new Date().getFullYear(),resumen,
       resumenParcelas:(d.resumenParcelas??[]).map(x=>({parcelaCultivoId:x.parcelaCultivoId,
        variedadId:required(x.variedadId,'variedadId'),variedad:x.variedad??'',
        cantidad:x.cantidad??0,plantasConEstimacion:x.plantasConEstimacion??0,
        plantasConCosecha:x.plantasConCosecha??0,estimadoKg:x.estimadoKg??0,realKg:x.realKg??0})),
       items:(d.items??[]).map(x=>({plantaId:required(x.plantaId,'plantaId'),
        codigo:x.codigo??'',variedad:x.variedad??'',variedadId:required(x.variedadId,'variedadId'),
        estado:required(x.estado,'estado') as EstadoPlantaE3,parcelaCultivoId:x.parcelaCultivoId,socioId:x.socioId,
        version:required(x.version,'version')})),
      } as PaginaE3;
    }));
  }
  ver(a:AmbitoE3,id:number) {
    return this.api.apappssPlantaVer({...a,plantaId:id},'body',false,this.options).pipe(map(r=>{
      const d=required(r.datos,'expediente de planta');
      return {plantaId:required(d.plantaId,'plantaId'),predioId:required(d.predioId,'predioId'),
       codigo:d.codigo??'',variedad:d.variedad??'',variedadId:required(d.variedadId,'variedadId'),
       estado:required(d.estado,'estado') as EstadoPlantaE3,
       socioId:d.socioId,registradoPorUsuarioId:d.registradoPorUsuarioId,registradoEn:d.registradoEn,
       fechaPlantacion:d.fechaPlantacion,edadReferenciaAnios:d.edadReferenciaAnios,edadActual:d.edadActual,
       version:required(d.version,'version'),parcelaCultivoId:d.parcelaCultivoId,
       historial:(d.historial??[]).map(x=>({eventoId:required(x.eventoId,'eventoId'),tipo:x.tipo??'',
        estadoAnterior:x.estadoAnterior,estadoNuevo:x.estadoNuevo,observacion:x.observacion,
        visitaId:x.visitaId,usuarioId:x.usuarioId,fechaHora:x.fechaHora})),
       fichas:(d.fichas??[]).map(x=>({fichaId:required(x.fichaId,'fichaId'),fechaPlantacion:x.fechaPlantacion,
        edadReferenciaAnios:x.edadReferenciaAnios,fechaReferencia:x.fechaReferencia,
        version:required(x.version,'version'),usuarioId:required(x.usuarioId,'usuarioId'),fechaHora:x.fechaHora})),
       episodios:(d.episodios??[]).map(x=>({episodioId:required(x.episodioId,'episodioId'),
        diagnostico:x.diagnostico??'',diagnosticoId:required(x.diagnosticoId,'diagnosticoId'),
        inicio:x.inicio,fin:x.fin,observacion:x.observacion})),
       seguimientos:(d.seguimientos??[]).map(x=>({seguimientoId:required(x.seguimientoId,'seguimientoId'),
        episodioId:x.episodioId,tipo:required(x.tipo,'tipo') as TipoActuacionE3,
        observacion:x.observacion??'',resultado:x.resultado,
        eventoId:required(x.eventoId,'eventoId'),visitaId:x.visitaId,usuarioId:x.usuarioId,fechaHora:x.fechaHora})),
       tratamientos:(d.tratamientos??[]).map(x=>({tratamientoId:required(x.tratamientoId,'tratamientoId'),
        episodioId:required(x.episodioId,'episodioId'),descripcion:x.descripcion??'',
        resultado:x.resultado,fechaHora:x.fechaHora,visitaId:x.visitaId})),
       producciones:(d.producciones??[]).map(x=>({produccionId:required(x.produccionId,'produccionId'),
        anio:required(x.anio,'anio'),tipo:(x.tipo??'LEGADO') as 'ESTIMACION'|'COSECHA'|'LEGADO',
        estimadoKg:x.estimadoKg,realKg:x.realKg,observacion:x.observacion,
        fechaEvento:x.fechaEvento,visitaId:x.visitaId,fechaHora:x.fechaHora})),
       produccionResumen:(d.produccionResumen??[]).map(x=>({anio:required(x.anio,'anio'),
        estimadoKg:x.estimadoKg,realKg:x.realKg??0,
        tieneEstimacion:x.tieneEstimacion??false,tieneReal:x.tieneReal??false})),
       evidencias:(d.evidencias??[]).map(x=>({archivoId:required(x.archivoId,'archivoId'),
        eventoId:x.eventoId,nombre:x.nombre??'',mimeType:x.mimeType??'',url:x.url,tipo:x.tipo??''})),
      } as DetalleE3;
    }));
  }
  lote(a:AmbitoE3,filas:FilaE3[],socioId?:number) {
    const e3LoteRequest:E3LoteRequest={filas,socioId};
    return this.keys.idempotent(this.scope(a,'LOTE'),e3LoteRequest,key=>
      this.api.apappssPlantasCrearLote({...a,xIdempotencyKey:key,e3LoteRequest},'body',false,this.options)
      .pipe(map(r=>({total:required(r.datos?.total,'total'),resumen:(r.datos?.resumen??[]).map(x=>({
       variedadId:required(x.variedadId,'variedadId'),variedad:x.variedad??'',cantidad:x.cantidad??0,
       sinEvaluar:x.sinEvaluar??0,sanas:x.sanas??0,enfermas:x.enfermas??0,muertas:x.muertas??0,
       plantasConEstimacion:x.plantasConEstimacion??0,plantasConCosecha:x.plantasConCosecha??0,
       estimadoKg:x.estimadoKg??0,realKg:x.realKg??0,
      }))} as LoteResultadoE3))));
  }
  private action(a:AmbitoE3,id:number,accion:string,body:unknown,
     run:(key:string)=>Observable<ApiResponseE3OperacionResponse>) {
    return this.keys.idempotent(this.scope(a,accion,id),body,key=>run(key).pipe(map(r=>this.operation(r.datos))));
  }
  private operation(d:{plantaId?:number;eventoId?:number;estado?:string}|undefined):OperacionE3 {
    const x=required(d,'resultado de operación');
    return {plantaId:required(x.plantaId,'plantaId'),eventoId:required(x.eventoId,'eventoId'),
      estado:required(x.estado,'estado') as EstadoPlantaE3};
  }
  ficha(a:AmbitoE3,id:number,data:FichaE3) {
    const e3FichaRequest:E3FichaRequest={...data};
    return this.action(a,id,'FICHA',e3FichaRequest,key=>this.api.apappssPlantaCompletarFicha(
      {...a,plantaId:id,xIdempotencyKey:key,e3FichaRequest},'body',false,this.options));
  }
  estado(a:AmbitoE3,id:number,data:EstadoE3) {
    const e3EstadoRequest:E3EstadoRequest={...data};
    return this.action(a,id,'ESTADO',e3EstadoRequest,key=>this.api.apappssPlantaEvaluar(
      {...a,plantaId:id,xIdempotencyKey:key,e3EstadoRequest},'body',false,this.options));
  }
  tratar(a:AmbitoE3,id:number,data:TratamientoNuevoE3) {
    const e3TratamientoRequest:E3TratamientoRequest={...data};
    return this.action(a,id,'TRATAMIENTO',e3TratamientoRequest,key=>this.api.apappssPlantaTratar(
      {...a,plantaId:id,xIdempotencyKey:key,e3TratamientoRequest},'body',false,this.options));
  }
  seguir(a:AmbitoE3,id:number,data:SeguimientoNuevoE3) {
    const e3SeguimientoRequest:E3SeguimientoRequest={...data};
    return this.action(a,id,'SEGUIMIENTO',e3SeguimientoRequest,key=>this.api.apappssPlantaSeguimiento(
      {...a,plantaId:id,xIdempotencyKey:key,e3SeguimientoRequest},'body',false,this.options));
  }
  produccion(a:AmbitoE3,id:number,data:ProduccionNuevaE3) {
    const e3ProduccionRequest:E3ProduccionRequest={...data};
    return this.action(a,id,'PRODUCCION',e3ProduccionRequest,key=>this.api.apappssPlantaProduccion(
      {...a,plantaId:id,xIdempotencyKey:key,e3ProduccionRequest},'body',false,this.options));
  }
  evidencia(a:AmbitoE3,id:number,archivoId:number,eventoId?:number) {
    const e3EvidenciaRequest:E3EvidenciaRequest={archivoId,eventoId};
    return this.action(a,id,'EVIDENCIA',e3EvidenciaRequest,key=>this.api.apappssPlantaVincularEvidencia(
      {...a,plantaId:id,xIdempotencyKey:key,e3EvidenciaRequest},'body',false,this.options));
  }
  mediciones(a:AmbitoE3,id:number) {
    return this.api.apappssPlantaMediciones({...a,plantaId:id},'body',false,this.options).pipe(map(r=>
      (r.datos?.items??[]).map(m=>({medicionId:required(m.medicionId,'medicionId'),
       plantaId:required(m.plantaId,'plantaId'),porcentaje:required(m.porcentaje,'porcentaje'),
       visitaId:required(m.visitaId,'visitaId'),observacion:m.observacion,fechaHora:m.fechaHora,
       usuarioId:m.usuarioId}))));
  }
  medir(a:AmbitoE3,id:number,data:MateriaSecaE3) {
    const e3MedicionMateriaSecaRequest:E3MedicionMateriaSecaRequest={...data};
    return this.action(a,id,'MEDIR',e3MedicionMateriaSecaRequest,key=>this.api.apappssPlantaMedirMateriaSeca(
      {...a,plantaId:id,xIdempotencyKey:key,e3MedicionMateriaSecaRequest},'body',false,this.options));
  }
  seguimientoMasivo(a:AmbitoE3,data:SeguimientoMasivoE3) {
    const e3SeguimientoMasivoRequest:E3SeguimientoMasivoRequest={...data};
    return this.keys.idempotent(this.scope(a,'MASIVO'),e3SeguimientoMasivoRequest,key=>
      this.api.apappssPlantasSeguimientoMasivo({...a,xIdempotencyKey:key,e3SeguimientoMasivoRequest},
      'body',false,this.options).pipe(map(r=>({procesadas:required(r.datos?.procesadas,'procesadas')} as ResultadoMasivoE3))));
  }
}
