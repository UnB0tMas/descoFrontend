export interface EmpleadoFiltro {
  uotId?: number;
  empresaId?: number;
  areaId?: number;
  activo?: boolean;
  page: number;
  size: number;
}
