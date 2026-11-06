import {inject,Injectable} from '@angular/core';
import {PLANTAS_E3_GATEWAY} from '../port/plantas-e3.gateway';
import {AmbitoE3,EstadoE3,FichaE3,FilaE3,FiltrosE3,ProduccionNuevaE3,SeguimientoNuevoE3,TratamientoNuevoE3} from '../../domain/planta-paltera.model';
@Injectable()
export class PlantasE3UseCase {
 private readonly gateway=inject(PLANTAS_E3_GATEWAY);
 catalogos(a:AmbitoE3){return this.gateway.catalogos(a)}
 listar(a:AmbitoE3,f:FiltrosE3){return this.gateway.listar(a,f)}
 ver(a:AmbitoE3,id:number){return this.gateway.ver(a,id)}
 lote(a:AmbitoE3,filas:FilaE3[]){return this.gateway.lote(a,filas)}
 ficha(a:AmbitoE3,id:number,data:FichaE3){return this.gateway.ficha(a,id,data)}
 estado(a:AmbitoE3,id:number,data:EstadoE3){return this.gateway.estado(a,id,data)}
 tratar(a:AmbitoE3,id:number,data:TratamientoNuevoE3){return this.gateway.tratar(a,id,data)}
 seguir(a:AmbitoE3,id:number,data:SeguimientoNuevoE3){return this.gateway.seguir(a,id,data)}
 produccion(a:AmbitoE3,id:number,data:ProduccionNuevaE3){return this.gateway.produccion(a,id,data)}
 evidencia(a:AmbitoE3,id:number,archivoId:number,eventoId?:number){return this.gateway.evidencia(a,id,archivoId,eventoId)}
}
