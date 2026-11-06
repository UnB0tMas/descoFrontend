import { inject, Injectable } from '@angular/core';
import { EXPEDIENTE_E1_GATEWAY } from './expediente-e1.gateway';
import {
  PersonaAltaE1, PredioAltaE1, CultivoAltaE1, CrianzaAltaE1,
  ConteoAltaE1, ActuacionAltaE1, FichaAltaE1,
} from '../domain/expediente-e1.model';

@Injectable()
export class ExpedienteE1UseCase {
  private readonly gateway = inject(EXPEDIENTE_E1_GATEWAY);
  convenios(uot: number) { return this.gateway.convenios(uot); }
  buscarPersonas(uot: number, buscar: string) { return this.gateway.personas(uot, buscar); }
  crearPersona(uot: number, entrada: PersonaAltaE1) { return this.gateway.crearPersona(uot, entrada); }
  buscarPredios(uot: number, buscar: string, convenio?: number) { return this.gateway.predios(uot, buscar, convenio); }
  altaPredio(uot: number, entrada: PredioAltaE1, convenio?: number) { return this.gateway.altaPredio(uot, entrada, convenio); }
  catalogos(uot: number) { return this.gateway.catalogos(uot); }
  detalle(uot: number, id: number, convenio?: number) { return this.gateway.expediente(uot, id, convenio); }
  cultivo(uot: number, id: number, entrada: CultivoAltaE1, convenio?: number) {
    return this.gateway.agregarCultivo(uot, id, entrada, convenio);
  }
  crianza(uot: number, id: number, entrada: CrianzaAltaE1, convenio?: number) {
    return this.gateway.agregarCrianza(uot, id, entrada, convenio);
  }
  conteo(uot: number, id: number, entrada: ConteoAltaE1, convenio?: number) {
    return this.gateway.agregarConteo(uot, id, entrada, convenio);
  }
  actuacion(uot: number, id: number, entrada: ActuacionAltaE1, convenio?: number) {
    return this.gateway.registrarActuacion(uot, id, entrada, convenio);
  }
  ficha(uot: number, id: number, entrada: FichaAltaE1, convenio?: number) {
    return this.gateway.completarFicha(uot, id, entrada, convenio);
  }
  vincular(uot: number, id: number, convenio: number, personaId: number) {
    return this.gateway.vincularConvenio(uot, id, convenio, personaId);
  }
}
