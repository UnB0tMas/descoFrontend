import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConvenioE1, PersonaE1, PredioE1, CatalogosE1, ExpedienteE1, PersonaAltaE1,
  PredioAltaE1, CultivoAltaE1, CrianzaAltaE1, ConteoAltaE1,
  ActuacionAltaE1, FichaAltaE1,
} from '../domain/expediente-e1.model';

export abstract class ExpedienteE1Gateway {
  abstract convenios(uot: number): Observable<ConvenioE1[]>;
  abstract personas(uot: number, buscar: string): Observable<PersonaE1[]>;
  abstract crearPersona(uot: number, entrada: PersonaAltaE1): Observable<number>;
  abstract predios(uot: number, buscar: string, convenio?: number): Observable<PredioE1[]>;
  abstract altaPredio(uot: number, entrada: PredioAltaE1, convenio?: number): Observable<number>;
  abstract catalogos(uot: number): Observable<CatalogosE1>;
  abstract expediente(uot: number, id: number, convenio?: number): Observable<ExpedienteE1>;
  abstract agregarCultivo(uot: number, id: number, entrada: CultivoAltaE1, convenio?: number): Observable<number>;
  abstract agregarCrianza(uot: number, id: number, entrada: CrianzaAltaE1, convenio?: number): Observable<number>;
  abstract agregarConteo(uot: number, id: number, entrada: ConteoAltaE1, convenio?: number): Observable<number>;
  abstract registrarActuacion(uot: number, id: number, entrada: ActuacionAltaE1, convenio?: number): Observable<number>;
  abstract completarFicha(uot: number, id: number, entrada: FichaAltaE1, convenio?: number): Observable<number>;
  abstract vincularConvenio(uot: number, id: number, convenio: number, personaId: number): Observable<number>;
}

export const EXPEDIENTE_E1_GATEWAY = new InjectionToken<ExpedienteE1Gateway>('EXPEDIENTE_E1_GATEWAY');
