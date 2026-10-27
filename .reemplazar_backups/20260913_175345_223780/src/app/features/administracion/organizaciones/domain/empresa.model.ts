export interface OrganizacionUbicacionInput {
  distritoCodigo: string;
  centroPobladoId?: number;
  referencia?: string;
}

export interface Empresa {
  empresaId: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  telefono: string | null;
  correo: string | null;
  fechaCreacion: string | null;
  estado: boolean;
  esAsociacion: boolean;
  fechaConstitucion: string | null;
  numeroPartida: string | null;
}

export interface EmpresaCreate {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  telefono?: string;
  correo?: string;
  ubicacion: OrganizacionUbicacionInput;
}

export interface EmpresaUpdate {
  razonSocial: string;
  nombreComercial?: string;
  telefono?: string;
  correo?: string;
  ubicacion: OrganizacionUbicacionInput;
}

export interface OrganizacionEmpleado {
  empleadoId: number;
  codigoEmpleado: string | null;
  numeroDocumento: string | null;
  empleado: string;
}

export interface OrganizacionDetalle {
  organizacion: Empresa;
  distritoCodigo: string;
  distritoNombre: string | null;
  centroPobladoId: number | null;
  centroPobladoNombre: string | null;
  referencia: string | null;
  altitudM: number | null;
  posicionWkt: string | null;
  posicionSrid: number | null;
  areas: readonly import('./area.model').Area[];
  empleados: readonly OrganizacionEmpleado[];
}
