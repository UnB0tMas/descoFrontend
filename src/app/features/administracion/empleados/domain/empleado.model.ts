export type TipoDocumentoEmpleado = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';

export interface EmpleadoUbicacionInput {
  distritoCodigo: string;
  centroPobladoId?: number;
  referencia?: string;
}

export interface Empleado {
  empleadoId: number;
  uotId: number;
  uotCodigo: string;
  uotNombre: string;
  empresaId: number;
  empresa: string;
  codigoEmpleado: string;
  fechaIngreso: string | null;
  fechaCese: string | null;
  estado: boolean;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  correo: string | null;
  areaId: number | null;
  area: string | null;
  cargo: string | null;
  usuarioId: number | null;
  nombreUsuario: string | null;
  estadoCuenta: string | null;
}

export interface EmpleadoAreaHistorial {
  empleadoAreaId: number;
  areaId: number;
  area: string;
  cargo: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: boolean;
}

export interface EmpleadoUsuario {
  usuarioId: number;
  nombreUsuario: string;
  estadoCuenta: string | null;
  ultimoAccesoCorrecto: string | null;
  segundoFactorHabilitado: boolean;
}

export interface EmpleadoRol {
  rolId: number;
  codigo: string;
  nombre: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: boolean;
}

export interface EmpleadoDetalle extends Empleado {
  fechaNacimiento: string | null;
  distritoCodigo: string;
  distritoNombre: string | null;
  centroPobladoId: number | null;
  centroPobladoNombre: string | null;
  referencia: string | null;
  areas: readonly EmpleadoAreaHistorial[];
  usuario: EmpleadoUsuario | null;
  roles: readonly EmpleadoRol[];
}

export interface EmpleadoCreate {
  tipoDocumento: TipoDocumentoEmpleado;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: string;
  uotId: number;
  empresaId?: number;
  codigoEmpleado: string;
  fechaIngreso: string;
  areaId?: number;
  cargo?: string;
  ubicacion: EmpleadoUbicacionInput;
}

export interface EmpleadoUpdate {
  tipoDocumento: TipoDocumentoEmpleado;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: string;
  uotId: number;
  empresaId?: number;
  codigoEmpleado: string;
  fechaIngreso: string;
  areaId?: number;
  cargo?: string;
  fechaAsignacionArea?: string;
  ubicacion: EmpleadoUbicacionInput;
}
