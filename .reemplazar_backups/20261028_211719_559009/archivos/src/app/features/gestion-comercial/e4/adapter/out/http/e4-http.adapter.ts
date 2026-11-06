import { inject,Injectable } from '@angular/core';
import { map } from 'rxjs';
import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  AcopioApappssE4Service,E4ConfiguracionRequest,E4AsignacionRequest,E4PesajeRequest,
  E4DevolucionRequest,E4SancionRequest,E4TarifaRequest,E4CargoRequest,
} from '../../../../../../infrastructure/openapi/generated';
import { E4Gateway } from '../../../application/port/e4.gateway';
import { E4Assigned,E4Campaign,E4Delivery,E4Prebalance,E4Result,E4Return,E4Units } from '../../../domain/e4.model';
function data<T>(input:T | null | undefined):T {
  if(input==null) throw new Error('La operación no devolvió los datos requeridos.');
  return input;
}
@Injectable()
export class E4HttpAdapter implements E4Gateway {
  private readonly api=inject(AcopioApappssE4Service);
  private readonly keys=inject(IdempotencyKeyService);
  private readonly options={transferCache:false};
  resumen(campaniaId:number){return this.api.apappssE4Resumen({campaniaId},'body',false,this.options).pipe(map(r=>data(r.datos) as E4Campaign))}
  configurar(campaniaId:number,cupoJabas:number,taraKg:number){
    const e4ConfiguracionRequest:E4ConfiguracionRequest={cupoJabas,taraKg};
    return this.keys.idempotent(`E4:config:${campaniaId}`,e4ConfiguracionRequest,key=>
      this.api.apappssE4Configurar({campaniaId,xIdempotencyKey:key,e4ConfiguracionRequest},'body',false,this.options).pipe(map(()=>undefined)));
  }
  asignar(operativoSocioId:number,cantidad:number){
    const e4AsignacionRequest:E4AsignacionRequest={cantidad};
    return this.keys.idempotent(`E4:asignar:${operativoSocioId}`,e4AsignacionRequest,key=>
      this.api.apappssE4Asignar({operativoSocioId,xIdempotencyKey:key,e4AsignacionRequest},'body',false,this.options)
        .pipe(map(r=>data(r.datos) as E4Assigned)));
  }
  unidades(asignacionId:number){return this.api.apappssE4Unidades({asignacionId},'body',false,this.options)
    .pipe(map(r=>data(r.datos) as E4Units));}
  pesar(unidadId:number,pesoBrutoKg:number,variedadId:number,condicionId:number){
    const e4PesajeRequest:E4PesajeRequest={pesoBrutoKg,variedadId,condicionId};
    return this.keys.idempotent(`E4:pesar:${unidadId}`,e4PesajeRequest,key=>
      this.api.apappssE4Pesar({unidadId,xIdempotencyKey:key,e4PesajeRequest},'body',false,this.options).pipe(map(()=>undefined)));
  }
  devolver(asignacionId:number,llenas:number,vacias:number){
    const e4DevolucionRequest:E4DevolucionRequest={llenas,vacias};
    return this.keys.idempotent(`E4:devolver:${asignacionId}`,e4DevolucionRequest,key=>
      this.api.apappssE4Devolver({asignacionId,xIdempotencyKey:key,e4DevolucionRequest},'body',false,this.options)
        .pipe(map(r=>data(r.datos) as E4Return)));
  }
  confirmar(asignacionId:number){
    return this.keys.idempotent(`E4:confirmar:${asignacionId}`,{asignacionId},key=>
      this.api.apappssE4Confirmar({asignacionId,xIdempotencyKey:key},'body',false,this.options)
        .pipe(map(r=>data(r.datos) as E4Delivery)));
  }
  sancionar(entregaId:number,precioNuevo:number,motivo:string,condicionId?:number,variedadId?:number){
    const e4SancionRequest:E4SancionRequest={precioNuevo,motivo,condicionId,variedadId};
    return this.keys.idempotent(`E4:sancion:${entregaId}`,e4SancionRequest,key=>
      this.api.apappssE4Sancionar({entregaId,xIdempotencyKey:key,e4SancionRequest},'body',false,this.options)
        .pipe(map(r=>data(r.datos) as E4Result)));
  }
  tarifa(campaniaId:number,precioUnitario:number){
    const e4TarifaRequest:E4TarifaRequest={conceptoId:1,precioUnitario};
    return this.keys.idempotent(`E4:tarifa:${campaniaId}`,e4TarifaRequest,key=>
      this.api.apappssE4Tarifar({campaniaId,xIdempotencyKey:key,e4TarifaRequest},'body',false,this.options)
        .pipe(map(()=>undefined)));
  }
  confirmarFaltantes(asignacionId:number,motivo:string){
    const e4CargoRequest:E4CargoRequest={motivo};
    return this.keys.idempotent(`E4:confirmar-faltantes:${asignacionId}`,e4CargoRequest,key=>
      this.api.apappssE4ValidarFaltantes({asignacionId,xIdempotencyKey:key,e4CargoRequest},'body',false,this.options)
        .pipe(map(()=>undefined)));
  }
  cargo(asignacionId:number,motivo:string){
    const e4CargoRequest:E4CargoRequest={motivo};
    return this.keys.idempotent(`E4:cargo:${asignacionId}`,e4CargoRequest,key=>
      this.api.apappssE4CobrarFaltantes({asignacionId,xIdempotencyKey:key,e4CargoRequest},'body',false,this.options)
        .pipe(map(r=>data(r.datos) as E4Result)));
  }
  prebalance(campaniaId:number){return this.api.apappssE4Prebalance({campaniaId},'body',false,this.options)
    .pipe(map(r=>data(r.datos) as E4Prebalance));}
}
