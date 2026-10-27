export type TipoDocumentoProductor = 'DNI' | 'CE' | 'PASAPORTE' | 'OTRO';
export type SituacionMembresia = 'ACTIVO' | 'SUSPENDIDO';

export interface ProductorUbicacionInput {
  distritoCodigo: string;
  centroPobladoId?: number;
  referencia?: string;
}

export interface Productor {
  socioId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  correo: string | null;
  fechaAlta: string | null;
  estado: boolean;
  socioAsociacionId: number | null;
  asociacionId: number | null;
  codigoSocio: string | null;
  situacionMembresia: string | null;
  asociacionNombre: string | null;
}

export interface ProductorCreate {
  tipoDocumento: TipoDocumentoProductor;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: string;
  fechaAlta: string;
  asociacionId: number;
  fechaDesde: string;
  situacionMembresia: SituacionMembresia;
  ubicacion: ProductorUbicacionInput;
}

export interface ProductorUpdate {
  tipoDocumento: TipoDocumentoProductor;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: string;
  asociacionId: number;
  fechaDesde: string;
  situacionMembresia: SituacionMembresia;
  ubicacion: ProductorUbicacionInput;
}
