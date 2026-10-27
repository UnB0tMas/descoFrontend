import { Productor } from './productor.model';

export interface ProductorAfiliacion {
  socioAsociacionId: number;
  asociacionId: number;
  asociacionNombre: string;
  codigoSocio: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  situacionMembresia: string;
  estado: boolean;
}

export interface ProductorPredio {
  predioId: number;
  codigo: string;
  nombre: string;
  fechaRegistro: string | null;
  estado: boolean;
  tipoTitularidad: string | null;
  porcentaje: number | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

export interface ProductorCampania {
  participacionCampaniaSocioId: number;
  campaniaVentaId: number;
  codigo: string;
  nombre: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  estadoProceso: string;
  estadoParticipacion: string;
  fechaRegistro: string | null;
}

export interface ProductorDetalle extends Productor {
  fechaNacimiento: string | null;
  distritoCodigo: string;
  distritoNombre: string | null;
  centroPobladoId: number | null;
  centroPobladoNombre: string | null;
  referencia: string | null;
  afiliaciones: readonly ProductorAfiliacion[];
  predios: readonly ProductorPredio[];
  campanias: readonly ProductorCampania[];
}
