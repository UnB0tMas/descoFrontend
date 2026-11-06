export type TipoTitularidad = string;
export interface Titularidad {
  predioTitularidadId: number;
  personaId?: number;
  socioId?: number | null;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  tipoTitularidad: string;
  rolTitularidad?: 'PRINCIPAL' | 'ADICIONAL';
  porcentaje: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: boolean;
}
export interface TitularidadInput {
  personaId: number;
  socioId?: number;
  tipoTitularidad: TipoTitularidad;
  porcentaje: number;
}
