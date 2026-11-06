import { Injectable, inject } from '@angular/core';
import { SALIDAS_E2_GATEWAY } from '../port/salidas-e2.gateway';
import { CorreccionE2, EstadoBienE2, SolicitudE2 } from '../../domain/salida-operativa.model';
@Injectable()
export class SalidasE2UseCase {
  private readonly data = inject(SALIDAS_E2_GATEWAY);
  catalogos(uot: number, convenio?: number) { return this.data.catalogos(uot, convenio); }
  listar(uot: number, convenio?: number, estado?: string, pagina=1, tamano=20) { return this.data.listar(uot, convenio, estado, pagina, tamano); }
  ver(uot: number, id: number, convenio?: number) { return this.data.ver(uot, id, convenio); }
  solicitar(uot: number, datos: SolicitudE2, convenio?: number) { return this.data.solicitar(uot, datos, convenio); }
  corregir(uot: number, id: number, correccion: CorreccionE2, convenio?: number) { return this.data.corregir(uot,id,correccion,convenio); }
  decidir(uot: number, id: number, decision: 'APROBADA'|'OBSERVADA'|'RECHAZADA', motivo?: string, convenio?: number) { return this.data.decidir(uot,id,decision,motivo,convenio); }
  entregar(uot: number, id: number, convenio?: number) { return this.data.entregar(uot,id,convenio); }
  iniciar(uot: number, id: number, convenio?: number) { return this.data.iniciar(uot,id,convenio); }
  visitar(uot: number, id: number, destinoId: number, tipo: number, objetivo?: string, convenio?: number) { return this.data.visitar(uot,id,destinoId,tipo,objetivo,convenio); }
  finalizarVisita(uot: number, id: number, visitaId: number, resumen: string, convenio?: number) { return this.data.finalizarVisita(uot,id,visitaId,resumen,convenio); }
  retornar(uot: number, id: number, obs: string, bienes: EstadoBienE2[], convenio?: number) { return this.data.retornar(uot,id,obs,bienes,convenio); }
  inspeccionar(uot: number, id: number, bienes: EstadoBienE2[], obs?: string, convenio?: number) { return this.data.inspeccionar(uot,id,bienes,obs,convenio); }
  vincularDestino(uot:number,id:number,destinoId:number,predioId:number,convenio?:number){return this.data.vincularDestino(uot,id,destinoId,predioId,convenio);}
  cancelar(uot:number,id:number,motivo:string,convenio?:number){return this.data.cancelar(uot,id,motivo,convenio);}
  regularizarFin(uot: number, id: number, fechaFinPrevista: string, convenio?: number) {
    return this.data.regularizarFin(uot,id,fechaFinPrevista,convenio);
  }
  cerrar(uot: number, id: number, convenio?: number) { return this.data.cerrar(uot,id,convenio); }
}
