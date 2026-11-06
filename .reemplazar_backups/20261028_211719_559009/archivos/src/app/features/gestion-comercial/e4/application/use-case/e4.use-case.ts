import { inject,Injectable } from '@angular/core';
import { E4_GATEWAY } from '../port/e4.gateway';
@Injectable()
export class E4UseCase {
  private readonly gateway=inject(E4_GATEWAY);
  resumen(id:number){return this.gateway.resumen(id)}
  configurar(id:number,cupo:number,tara:number){return this.gateway.configurar(id,cupo,tara)}
  asignar(id:number,n:number){return this.gateway.asignar(id,n)}
  unidades(id:number){return this.gateway.unidades(id)}
  pesar(id:number,peso:number,variedad:number,condicion:number){return this.gateway.pesar(id,peso,variedad,condicion)}
  devolver(id:number,llenas:number,vacias:number){return this.gateway.devolver(id,llenas,vacias)}
  confirmar(id:number){return this.gateway.confirmar(id)}
  sancionar(id:number,precio:number,motivo:string,condicion?:number,variedad?:number){return this.gateway.sancionar(id,precio,motivo,condicion,variedad)}
  tarifa(id:number,precio:number){return this.gateway.tarifa(id,precio)}
  confirmarFaltantes(id:number,motivo:string){return this.gateway.confirmarFaltantes(id,motivo)}
  cargo(id:number,motivo:string){return this.gateway.cargo(id,motivo)}
  prebalance(id:number){return this.gateway.prebalance(id)}
}
