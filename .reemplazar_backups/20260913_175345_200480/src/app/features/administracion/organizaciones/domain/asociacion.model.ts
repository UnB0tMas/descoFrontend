import { OrganizacionUbicacionInput } from './empresa.model';

export interface AsociacionCreate {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  telefono?: string;
  correo?: string;
  fechaConstitucion?: string;
  numeroPartida?: string;
  ubicacion: OrganizacionUbicacionInput;
}

export interface AsociacionUpdate {
  razonSocial: string;
  nombreComercial?: string;
  telefono?: string;
  correo?: string;
  fechaConstitucion?: string;
  numeroPartida?: string;
  ubicacion: OrganizacionUbicacionInput;
}
