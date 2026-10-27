import { UsuarioDispositivo } from './usuario-dispositivo.model';

export interface Usuario {
  usuarioId: number;
  nombreUsuario: string;
  estadoCuenta: string | null;
  fechaCreacion: string | null;
  ultimoAccesoCorrecto: string | null;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  segundoFactorHabilitado: boolean;
  empleadoId: number;
  codigoEmpleado: string | null;
  empresa: string | null;
  numeroDocumento: string | null;
  empleado: string | null;
  rolesActivos: number;
  sesionesActivas: number;
}

export interface UsuarioRol {
  rolId: number;
  codigo: string;
  nombre: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: boolean;
}

export interface UsuarioDetalle {
  usuarioId: number;
  nombreUsuario: string;
  estadoCuenta: string | null;
  estado: boolean;
  fechaCreacion: string | null;
  ultimoAccesoCorrecto: string | null;
  fechaCambioPassword: string | null;
  requiereCambioPassword: boolean;
  segundoFactorHabilitado: boolean;
  empleadoId: number;
  numeroDocumento: string | null;
  empleado: string | null;
  roles: readonly UsuarioRol[];
  dispositivos: readonly UsuarioDispositivo[];
}

export interface UsuarioCreate {
  empleadoId: number;
  nombreUsuario: string;
  passwordInicial: string;
  correoSeguridad: string;
  requiereCambioPassword: boolean;
  rolIds: readonly number[];
}

export interface UsuarioUpdate {
  nombreUsuario: string;
  requiereCambioPassword: boolean;
  segundoFactorHabilitado: boolean;
}
