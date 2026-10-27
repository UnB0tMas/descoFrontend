export interface RolPermisoUpdate {
  permisoIds: readonly number[];
  motivo?: string;
}

export interface PermisoAsignable {
  permisoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  accion: string | null;
  moduloCodigo: string;
  moduloNombre: string;
  sensible: boolean;
  requiereMotivo: boolean;
}
