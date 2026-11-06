import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import {
  AcopioAPAPPSSE4Service,
  E4PesajeRequest,
  E4PesajeCorreccionRequest,
  E4ClasificacionLineaRequest,
} from '../../../../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import { E4Gateway } from '../../../application/port/e4.gateway';
import {
  E4Assigned,E4ClassificationLine,E4ClassificationResult,E4EligiblePartners,
  E4PartnerInclusion,E4Campaign,E4Delivery,E4Prebalance,E4Result,E4Return,E4Units,
  E4Stock,E4PesajeHistorial,E4RetornoValidado,
} from '../../../domain/e4.model';

function required<T>(item: T | null | undefined, field: string): T {
  if (item == null) throw new Error(`Respuesta de acopio incompleta: ${field}`);
  return item;
}

@Injectable()
export class E4HttpAdapter implements E4Gateway {
  private readonly api = inject(AcopioAPAPPSSE4Service);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly options = { transferCache: false };
  private mutate<T>(scope: string, body: unknown,
    call: (key: string) => import('rxjs').Observable<T>): import('rxjs').Observable<T> {
    return this.keys.idempotent(`APAPPSS:E4:${scope}`, body, call);
  }
  resumen(campaniaId: number) {
    return this.api.apappssE4Resumen({campaniaId},'body',false,this.options)
      .pipe(map(r => required(r.datos,'campaña') as E4Campaign));
  }
  socios(campaniaId:number) {
    return this.api.apappssE4SociosElegibles({campaniaId},'body',false,this.options).pipe(map(r=>{
      const data=required(r.datos,'socios');
      return {campaniaId:required(data.campaniaId,'campaniaId'),socios:(data.socios??[]).map(s=>({
        socioAsociacionId:required(s.socioAsociacionId,'socioAsociacionId'),
        nombre:s.nombre??'',numeroDocumento:s.numeroDocumento??'',
      }))} as E4EligiblePartners;
    }));
  }
  incluirSocios(campaniaId:number,sociosIds:readonly number[]) {
    const e4IncorporarSociosRequest={sociosIds:[...sociosIds]};
    return this.mutate(`SOCIOS:${campaniaId}`,e4IncorporarSociosRequest,key=>
      this.api.apappssE4IncluirSocios({campaniaId,xIdempotencyKey:key,e4IncorporarSociosRequest},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'incorporación');
          return {campaniaId:required(d.campaniaId,'campaniaId'),incorporados:required(d.incorporados,'incorporados')} as E4PartnerInclusion;
        })));
  }
  configurar(campaniaId:number,cupoJabas:number,taraKg:number) {
    const e4ConfiguracionRequest={cupoJabas,taraKg};
    return this.mutate(`CONFIGURAR:${campaniaId}`,e4ConfiguracionRequest,key=>
      this.api.apappssE4Configurar({campaniaId,xIdempotencyKey:key,e4ConfiguracionRequest},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'configuración');}))); 
  }
  stock(campaniaId:number,existenciaCertificada:number,motivo:string) {
    const e4StockRequest={existenciaCertificada,motivo};
    return this.mutate(`STOCK:${campaniaId}`,e4StockRequest,key=>
      this.api.apappssE4Stock({campaniaId,xIdempotencyKey:key,e4StockRequest},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'stock');
          return {uotId:required(d.uotId,'uotId'),existenciaCertificada:required(d.existenciaCertificada,'existenciaCertificada'),
            retenidas:required(d.retenidas,'retenidas')} as E4Stock;
        })));
  }
  asignar(operativoSocioId:number,cantidad:number) {
    const e4AsignacionRequest={cantidad};
    return this.mutate(`ASIGNAR:${operativoSocioId}`,e4AsignacionRequest,key=>
      this.api.apappssE4Asignar({operativoSocioId,xIdempotencyKey:key,e4AsignacionRequest},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'asignación');
          return {asignacionId:required(d.asignacionId,'asignacionId'),unidades:required(d.unidades,'unidades')} as E4Assigned;
        })));
  }
  unidades(asignacionId:number) {
    return this.api.apappssE4Unidades({asignacionId},'body',false,this.options).pipe(map(r=>{
      const d=required(r.datos,'unidades');
      return {asignacionId:required(d.asignacionId,'asignacionId'),asignadas:required(d.asignadas,'asignadas'),retornoValidado:d.retornoValidado??false,
        pesadas:d.pesadas??0,devueltas:d.devueltas??0,faltantes:d.faltantes??0,
        unidades:(d.unidades??[]).map(u=>({
          unidadId:required(u.unidadId,'unidadId'),numero:required(u.numero,'numero'),
          pesoBrutoKg:u.pesoBrutoKg,taraKg:u.taraKg,pesoNetoKg:u.pesoNetoKg,
          variedadId:u.variedadId,condicionId:u.condicionId,precioBase:u.precioBase,
          pesaje:required(u.pesaje,'pesaje'),retorno:required(u.retorno,'retorno'),
          entregaId:u.entregaId,version:required(u.version,'version'),
          clasificaciones:(u.clasificaciones??[]).map(c=>({numero:required(c.numero,'numero'),
            pesoKg:required(c.pesoKg,'pesoKg'),rechazada:required(c.rechazada,'rechazada'),
            variedadId:c.variedadId,condicionId:c.condicionId,precioBase:c.precioBase})),
        }))} as E4Units;
    }));
  }
  pesar(unidadId:number,pesoBrutoKg:number,variedadId:number,condicionId:number) {
    const e4PesajeRequest:E4PesajeRequest={pesoBrutoKg,variedadId,condicionId};
    return this.mutate(`PESAR:${unidadId}`,e4PesajeRequest,key=>
      this.api.apappssE4Pesar({unidadId,xIdempotencyKey:key,e4PesajeRequest},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'pesaje');})));
  }
  prepesar(unidadId:number,pesoBrutoKg:number) {
    const e4PesajePreliminarRequest={pesoBrutoKg};
    return this.mutate(`PREPESAR:${unidadId}`,e4PesajePreliminarRequest,key=>
      this.api.apappssE4Prepesar({unidadId,xIdempotencyKey:key,e4PesajePreliminarRequest},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'pesaje preliminar');})));
  }
  anularPesaje(unidadId:number,version:number,motivo:string) {
    const e4PesajeAnulacionRequest={version,motivo};
    return this.mutate(`ANULAR_PESAJE:${unidadId}`,e4PesajeAnulacionRequest,key=>
      this.api.apappssE4PesajeAnular({unidadId,xIdempotencyKey:key,e4PesajeAnulacionRequest},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'anulación de pesaje');})));
  }
  corregirPesaje(unidadId:number,request:E4PesajeCorreccionRequest) {
    return this.mutate(`CORREGIR_PESAJE:${unidadId}`,request,key=>
      this.api.apappssE4PesajeCorregir({unidadId,xIdempotencyKey:key,e4PesajeCorreccionRequest:request},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'corrección de pesaje');})));
  }
  historial(unidadId:number) {
    return this.api.apappssE4Historial({unidadId},'body',false,this.options).pipe(map(r=>{
      const d=required(r.datos,'historial de pesaje');
      return {unidadId:required(d.unidadId,'unidadId'),eventos:(d.eventos??[]).map(e=>({
        historialId:required(e.historialId,'historialId'),estadoAnterior:e.estadoAnterior??'',
        estadoNuevo:e.estadoNuevo??'',pesoAnterior:e.pesoAnterior,pesoNuevo:e.pesoNuevo,
        taraAnterior:e.taraAnterior,taraNueva:e.taraNueva,motivo:e.motivo,
        usuarioId:e.usuarioId,fechaHora:e.fechaHora,
      }))} as E4PesajeHistorial;
    }));
  }
  clasificar(unidadId:number,lineas:readonly E4ClassificationLine[],motivo:string) {
    const e4ClasificacionRequest={lineas:lineas.map(x=>({
      pesoKg:x.pesoKg,rechazada:x.rechazada,variedadId:x.rechazada?undefined:x.variedadId,
      condicionId:x.rechazada?undefined:x.condicionId,
    } as E4ClasificacionLineaRequest)),motivo};
    return this.mutate(`CLASIFICAR:${unidadId}`,e4ClasificacionRequest,key=>
      this.api.apappssE4Clasificar({unidadId,xIdempotencyKey:key,e4ClasificacionRequest},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'clasificación');
          return {unidadId:required(d.unidadId,'unidadId'),lineas:required(d.lineas,'lineas'),
            kilosAceptados:required(d.kilosAceptados,'kilosAceptados'),
            kilosRechazados:required(d.kilosRechazados,'kilosRechazados')} as E4ClassificationResult;
        })));
  }
  devolver(asignacionId:number,llenas:number,vacias:number) {
    const e4DevolucionRequest={llenas,vacias};
    return this.mutate(`DEVOLVER:${asignacionId}`,e4DevolucionRequest,key=>
      this.api.apappssE4Devolver({asignacionId,xIdempotencyKey:key,e4DevolucionRequest},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'devolución');
          return {asignacionId:required(d.asignacionId,'asignacionId'),
            llenas:required(d.llenas,'llenas'),vacias:required(d.vacias,'vacias'),
            faltantes:required(d.faltantes,'faltantes')} as E4Return;
        })));
  }
  validarRetorno(asignacionId:number,motivo:string) {
    const e4RetornoValidarRequest={motivo:motivo||undefined};
    return this.mutate(`RETORNO_VALIDAR:${asignacionId}`,e4RetornoValidarRequest,key=>
      this.api.apappssE4RetornoValidar({asignacionId,xIdempotencyKey:key,e4RetornoValidarRequest},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'validación de retorno');
          return {asignacionId:required(d.asignacionId,'asignacionId'),validadas:required(d.validadas,'validadas')} as E4RetornoValidado;
        })));
  }
  confirmar(asignacionId:number) {
    return this.mutate(`CONFIRMAR:${asignacionId}`,{},key=>
      this.api.apappssE4Confirmar({asignacionId,xIdempotencyKey:key},
        'body',false,this.options).pipe(map(r=>{
          const d=required(r.datos,'entrega');
          return {entregaId:required(d.entregaId,'entregaId'),
            kilosAceptados:required(d.kilosAceptados,'kilosAceptados'),llenas:required(d.llenas,'llenas')} as E4Delivery;
        })));
  }
  sancionar(entregaId:number,precioNuevo:number,motivo:string,condicionId?:number,variedadId?:number) {
    const e4SancionRequest={precioNuevo,motivo,condicionId,variedadId};
    return this.mutate(`SANCION:${entregaId}`,e4SancionRequest,key=>
      this.api.apappssE4Sancionar({entregaId,xIdempotencyKey:key,e4SancionRequest},
        'body',false,this.options).pipe(map(r=>({sancionId:required(r.datos?.sancionId,'sancionId'),
          descuento:required(r.datos?.descuento,'descuento')} as E4Result))));
  }
  tarifa(campaniaId:number,precioUnitario:number) {
    const e4TarifaRequest={precioUnitario};
    return this.mutate(`TARIFA:${campaniaId}`,e4TarifaRequest,key=>
      this.api.apappssE4Tarifar({campaniaId,xIdempotencyKey:key,e4TarifaRequest},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'tarifa');})));
  }
  confirmarFaltantes(asignacionId:number,motivo:string) {
    const e4CargoRequest={motivo};
    return this.mutate(`VALIDAR_FALTANTE:${asignacionId}`,e4CargoRequest,key=>
      this.api.apappssE4ValidarFaltantes({asignacionId,xIdempotencyKey:key,e4CargoRequest},
        'body',false,this.options).pipe(map(r=>{required(r.datos,'incidencia');})));
  }
  cargo(asignacionId:number,motivo:string) {
    const e4CargoRequest={motivo};
    return this.mutate(`CARGO:${asignacionId}`,e4CargoRequest,key=>
      this.api.apappssE4CobrarFaltantes({asignacionId,xIdempotencyKey:key,e4CargoRequest},
        'body',false,this.options).pipe(map(r=>({cargoId:required(r.datos?.cargoId,'cargoId'),
          importe:required(r.datos?.importe,'importe')} as E4Result))));
  }
  prebalance(campaniaId:number) {
    return this.api.apappssE4Prebalance({campaniaId},'body',false,this.options).pipe(map(r=>{
      const d=required(r.datos,'prebalance');
      return {campaniaId:required(d.campaniaId,'campaniaId'),
        brutoConfirmado:required(d.brutoConfirmado,'brutoConfirmado'),
        descuentosPrecio:required(d.descuentosPrecio,'descuentosPrecio'),
        cargosIndividuales:required(d.cargosIndividuales,'cargosIndividuales')} as E4Prebalance;
    }));
  }
}
