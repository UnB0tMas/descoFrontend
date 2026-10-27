import { TitularidadInput } from './titularidad.model';

export interface Predio {
  predioId: number;
  codigo: string;
  nombre: string;
  fechaRegistro: string | null;
  estado: boolean;
  distritoCodigo: string;
  centroPobladoId: number | null;
  referencia: string | null;
  areaTotalHa: number;
  areaCultivableHa: number;
  tipoRiego: string;
  titulares: string;
}

export interface PredioUbicacion {
  distritoCodigo: string;
  centroPobladoId?: number;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  altitudM?: number;
}

export interface PredioCaracteristicas {
  areaTotalHa: number;
  areaCultivableHa: number;
  tipoRiego: string;
  fuenteAgua?: string;
  infraestructura?: string;
  observacion?: string;
  fechaDesde: string;
}

export interface PredioCreate {
  nombre: string;
  fechaRegistro: string;
  ubicacion: PredioUbicacion;
  caracteristicas: PredioCaracteristicas;
  titulares: readonly TitularidadInput[];
}

export interface PredioUpdate {
  nombre: string;
  fechaTitularidad?: string;
  ubicacion?: PredioUbicacion;
  caracteristicas?: PredioCaracteristicas;
  titulares?: readonly TitularidadInput[];
}
