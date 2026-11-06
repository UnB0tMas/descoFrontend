import { inject,Injectable } from '@angular/core';
import { E4ClassificationLine } from '../../domain/e4.model';
import { E4_GATEWAY } from '../port/e4.gateway';
@Injectable()
export class E4UseCase {
  private readonly gateway=inject(E4_GATEWAY);
  resumen(id:number){return this.gateway.resumen(id)}
  stock(id:number,n:number,motivo:string){return this.gateway.stock(id,n,motivo)}
  prepesar(id:number,peso:number){return this.gateway.prepesar(id,peso)}
  anularPesaje(id:number,version:number,motivo:string){return this.gateway.anularPesaje(id,version,motivo)}
  corregirPesaje(id:number,body:import('../../../../../infrastructure/openapi/generated').E4PesajeCorreccionRequest){return this.gateway.corregirPesaje(id,body)}
  historial(id:number){return this.gateway.historial(id)}
  validarRetorno(id:number,motivo:string){return this.gateway.validarRetorno(id,motivo)}
  socios(id:number){return this.gateway.socios(id)}
  incluirSocios(id:number,ids:readonly number[]){return this.gateway.incluirSocios(id,ids)}
  configurar(id:number,cupo:number,tara:number){return this.gateway.configurar(id,cupo,tara)}
  asignar(id:number,n:number){return this.gateway.asignar(id,n)}
  unidades(id:number){return this.gateway.unidades(id)}
  pesar(id:number,peso:number,variedad:number,condicion:number){return this.gateway.pesar(id,peso,variedad,condicion)}
  clasificar(id:number,lineas:readonly E4ClassificationLine[],motivo:string){return this.gateway.clasificar(id,lineas,motivo)}
  devolver(id:number,llenas:number,vacias:number){return this.gateway.devolver(id,llenas,vacias)}
  confirmar(id:number){return this.gateway.confirmar(id)}
  sancionar(id:number,precio:number,motivo:string,condicion?:number,variedad?:number){return this.gateway.sancionar(id,precio,motivo,condicion,variedad)}
  tarifa(id:number,precio:number){return this.gateway.tarifa(id,precio)}
  confirmarFaltantes(id:number,motivo:string){return this.gateway.confirmarFaltantes(id,motivo)}
  cargo(id:number,motivo:string){return this.gateway.cargo(id,motivo)}
  prebalance(id:number){return this.gateway.prebalance(id)}
}
