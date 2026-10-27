export type UotMode = 'ESPECIFICA' | 'GENERAL';

export interface UotMembership {
  usuarioUotId: number | null;
  uotId: number;
  codigo: string;
  nombre: string;
  predeterminada: boolean;
  roles: readonly string[];
}

export interface UotContext {
  modo: UotMode;
  uotSeleccionadaId: number | null;
  requiereSeleccion: boolean;
  permiteModoGeneral: boolean;
  uots: readonly UotMembership[];
}

export interface UotUnit {
  uotId: number;
  uotPadreId: number | null;
  ubicacionId: number | null;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  esRaiz: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: boolean;
  asignada: boolean;
  predeterminada: boolean;
}
