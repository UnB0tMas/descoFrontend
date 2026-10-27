import { Permiso } from './permiso.model';

export interface Rol {
  rolId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  requiereSegundoFactor: boolean;
  esSistema: boolean;
  estado: boolean;
  usuariosActivos: number;
  permisosActivos: number;
}

export interface RolUsuario {
  usuarioId: number;
  nombreUsuario: string;
  numeroDocumento: string | null;
  empleado: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: boolean;
}

export interface RolDetalle {
  rol: Rol;
  permisos: readonly Permiso[];
  usuarios: readonly RolUsuario[];
}

export interface RolCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiereSegundoFactor: boolean;
}

export interface RolUpdate {
  nombre: string;
  descripcion?: string;
  requiereSegundoFactor: boolean;
}
