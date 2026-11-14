import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import {
  ExpedientesProductivosService, E1PersonaRequest, E1PredioAltaRequest,
  E1CultivoRequest, E1CrianzaRequest, E1ConteoRequest, E1ActuacionRequest,
  E1FichaRequest, E1VinculoRequest,
} from '../../../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../../../core/http/services/idempotency-key.service';
import { ExpedienteE1Gateway } from '../application/expediente-e1.gateway';
import {
  ConvenioE1, PersonaAltaE1, PredioAltaE1, CultivoAltaE1, CrianzaAltaE1, ConteoAltaE1,
  ActuacionAltaE1, FichaAltaE1, ExpedienteE1, CatalogosE1,
} from '../domain/expediente-e1.model';

function required<T>(value: T | undefined | null, field: string): T {
  if (value === undefined || value === null) throw new Error(`Respuesta incompleta: ${field}`);
  return value;
}

@Injectable()
export class ExpedienteE1HttpAdapter implements ExpedienteE1Gateway {
  private readonly api = inject(ExpedientesProductivosService);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly settings = { transferCache: false };

  convenios(uot: number) {
    return this.api.expedientesConveniosListar({ uotId: uot }, 'body', false, this.settings)
      .pipe(map(r => (r.datos?.items ?? []).map(x => ({
        id: required(x.id, 'convenioId'), nombre: x.nombre ?? '',
      } as ConvenioE1))));
  }
  personas(uot: number, buscar: string) {
    return this.api.expedientesPersonasBuscar({ uotId: uot, buscar }, 'body', false, this.settings)
      .pipe(map(r => (r.datos?.items ?? []).map(p => ({
        personaId: required(p.personaId, 'personaId'),
        tipoDocumento: p.tipoDocumento ?? '', numeroDocumento: p.numeroDocumento ?? '',
        nombreCompleto: p.nombreCompleto ?? '',
      }))));
  }
  crearPersona(uot: number, entrada: PersonaAltaE1) {
    const e1PersonaRequest: E1PersonaRequest = { ...entrada };
    return this.keys.idempotent('E1:persona:'+uot, e1PersonaRequest, key =>
      this.api.expedientesPersonaCrear({ uotId: uot, xIdempotencyKey: key, e1PersonaRequest },
      'body', false, this.settings).pipe(map(r => required(r.datos?.id, 'personaId'))));
  }
  predios(uot: number, buscar: string, convenio?: number) {
    return this.api.expedientesPrediosListar({ uotId: uot, convenioId: convenio, buscar: buscar || undefined },
      'body', false, this.settings).pipe(map(r => (r.datos?.items ?? []).map(p => ({
        predioId: required(p.predioId, 'predioId'), codigo: p.codigo ?? '',
        nombre: p.nombre ?? '', distritoCodigo: p.distritoCodigo ?? '',
        referencia: p.referencia, latitud: p.latitud, longitud: p.longitud, titular: p.titular,
      }))));
  }
  altaPredio(uot: number, entrada: PredioAltaE1, convenio?: number) {
    const e1PredioAltaRequest: E1PredioAltaRequest = { ...entrada };
    return this.keys.idempotent(`E1:predio:${uot}:${convenio ?? 0}`, e1PredioAltaRequest, key =>
      this.api.expedientesPredioAltaRapida({ uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1PredioAltaRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'predioId'))));
  }
  catalogos(uot: number) {
    return this.api.expedientesCatalogos({ uotId: uot }, 'body', false, this.settings).pipe(map(r => {
      const d = required(r.datos, 'catalogos');
      const result: CatalogosE1 = {
        cultivos: (d.cultivos ?? []).map(x => ({ id: required(x.id, 'cultivoId'), nombre: x.nombre ?? '' })),
        variedades: (d.variedades ?? []).map(x => ({ id: required(x.id, 'variedadId'),
          padreId: required(x.padreId, 'cultivoId'), nombre: x.nombre ?? '' })),
        especies: (d.especies ?? []).map(x => ({ id: required(x.id, 'especieId'), nombre: x.nombre ?? '' })),
      };
      return result;
    }));
  }
  expediente(uot: number, id: number, convenio?: number) {
    return this.api.expedientesPredioDetalle({ id, uotId: uot, convenioId: convenio },
      'body', false, this.settings).pipe(map(r => {
        const d = required(r.datos, 'expediente');
        // El backend ya expone ambos campos; el SDK generado se sincroniza en el siguiente OpenAPI.
        const ubicacion = d as typeof d & { centroPobladoId?:number; centroPoblado?:string };
        const detail: ExpedienteE1 = {
          predioId: required(d.predioId, 'predioId'), codigo: d.codigo ?? '',
          nombre: d.nombre ?? '', distritoCodigo: d.distritoCodigo ?? '',
          referencia: d.referencia, centroPobladoId:ubicacion.centroPobladoId, centroPoblado:ubicacion.centroPoblado,
          latitud: d.latitud, longitud: d.longitud,
          areaTotalHa: d.areaTotalHa, areaCultivableHa: d.areaCultivableHa,
          tipoRiego: d.tipoRiego, fichaCompleta: d.fichaCompleta ?? false,
          titulares: (d.titulares ?? []).map(t => ({
            personaId: required(t.personaId, 'personaId'), socioId: t.socioId,
            numeroDocumento: t.numeroDocumento ?? '', nombreCompleto: t.nombreCompleto ?? '',
            tipoTitularidad: t.tipoTitularidad ?? '', porcentaje: t.porcentaje,
          })),
          cultivos: (d.cultivos ?? []).map(c => ({ id: required(c.id, 'cultivoId'),
            cultivo: c.cultivo ?? '', variedad: c.variedad, parcela: c.parcela ?? '',
            fechaInicio: c.fechaInicio ?? '', fechaFin: c.fechaFin,
          })),
          crianzas: (d.crianzas ?? []).map(c => ({ id: required(c.id, 'crianzaId'),
            especie: c.especie ?? '', lote: c.lote, fechaInicio: c.fechaInicio ?? '',
            cantidadActual: c.cantidadActual,
          })),
          historial: (d.historial ?? []).map(h => ({ id: required(h.id, 'actuacionId'),
            tipo: h.tipo ?? '', observacion: h.observacion ?? '',
            fechaHecho: h.fechaHecho ?? '', fechaRegistro: h.fechaRegistro ?? '',
            autor: h.autor ?? '', cultivoId: h.cultivoId, crianzaId: h.crianzaId,
            salidaId: h.salidaId, visitaId: h.visitaId,
          })),
          censos: (d.censos ?? []).map(c => ({ id: required(c.id, 'censoId'), cultivo: c.cultivo,
            fecha: c.fecha ?? '', total: c.total ?? 0, productivas: c.productivas ?? 0,
            observacion: c.observacion,
          })),
          conteos: (d.conteos ?? []).map(c => ({ id: required(c.id, 'conteoId'),
            crianzaId: required(c.crianzaId, 'crianzaId'), cantidad: c.cantidad,
            fechaHecho: c.fechaHecho ?? '', observacion: c.observacion,
          })),
        };
        return detail;
      }));
  }
  agregarCultivo(uot: number, id: number, entrada: CultivoAltaE1, convenio?: number) {
    const e1CultivoRequest: E1CultivoRequest = { ...entrada };
    return this.keys.idempotent(`E1:cultivo:${uot}:${convenio ?? 0}:${id}`, e1CultivoRequest, key =>
      this.api.expedientesCultivoAgregar({ id, uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1CultivoRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'cultivoId'))));
  }
  agregarCrianza(uot: number, id: number, entrada: CrianzaAltaE1, convenio?: number) {
    const e1CrianzaRequest: E1CrianzaRequest = { ...entrada };
    return this.keys.idempotent(`E1:crianza:${uot}:${convenio ?? 0}:${id}`, e1CrianzaRequest, key =>
      this.api.expedientesCrianzaAgregar({ id, uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1CrianzaRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'crianzaId'))));
  }
  agregarConteo(uot: number, id: number, entrada: ConteoAltaE1, convenio?: number) {
    const e1ConteoRequest: E1ConteoRequest = { ...entrada };
    return this.keys.idempotent(`E1:conteo:${uot}:${convenio ?? 0}:${id}`, e1ConteoRequest, key =>
      this.api.expedientesConteoAgregar({ id, uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1ConteoRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'conteoId'))));
  }
  registrarActuacion(uot: number, id: number, entrada: ActuacionAltaE1, convenio?: number) {
    const e1ActuacionRequest: E1ActuacionRequest = { ...entrada };
    return this.keys.idempotent(`E1:actuacion:${uot}:${convenio ?? 0}:${id}`, e1ActuacionRequest, key =>
      this.api.expedientesActuacionRegistrar({ id, uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1ActuacionRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'actuacionId'))));
  }
  completarFicha(uot: number, id: number, entrada: FichaAltaE1, convenio?: number) {
    const e1FichaRequest: E1FichaRequest = { ...entrada };
    return this.keys.idempotent(`E1:ficha:${uot}:${convenio ?? 0}:${id}`, e1FichaRequest, key =>
      this.api.expedientesFichaCompletar({ id, uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1FichaRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'versionId'))));
  }
  vincularConvenio(uot: number, id: number, convenio: number, personaId: number) {
    const e1VinculoRequest: E1VinculoRequest = { personaId };
    return this.keys.idempotent(`E1:vinculo:${uot}:${convenio ?? 0}:${id}`, e1VinculoRequest, key =>
      this.api.expedientesVincularConvenio({ id, uotId: uot, convenioId: convenio,
      xIdempotencyKey: key, e1VinculoRequest }, 'body', false, this.settings)
      .pipe(map(r => required(r.datos?.id, 'predioId'))));
  }
}
