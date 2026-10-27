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

export interface UotDeactivationImpact {
  uotId: number;
  uotIncluidas: number;
  usuariosActivos: number;
  usuariosExclusivos: number;
  empleadosActivos: number;
  areasActivas: number;
  organizacionesActivas: number;
  prediosActivos: number;
  almacenesActivos: number;
  productosConStock: number;
  stockReservado: number;
  suministrosConStock: number;
  suministrosReservados: number;
  bienesActivos: number;
  ventasAbiertas: number;
  campaniasAbiertas: number;
  operativosAbiertos: number;
  salidasAbiertas: number;
  recursosAbiertos: number;
  puedeDeshabilitar: boolean;
  bloqueos: readonly string[];
}

export interface UotResourceTransfer {
  movimientoSalidaId: number | null;
  movimientoEntradaId: number | null;
  productosTransferidos: number;
  bienesTransferidos: number;
  suministrosTransferidos: number;
}

export interface UotTransferResources {
  uotDestinoId: number;
  almacenOrigenId?: number;
  almacenDestinoId?: number;
  transferirStock?: boolean;
  bienIds?: readonly number[];
  suministroIds?: readonly number[];
  motivo: string;
}
