import { OrganizacionUbicacionInput } from './empresa.model';

export interface AsociacionCreate {
  uotId: number;
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
  uotId: number;
  razonSocial: string;
  nombreComercial?: string;
  telefono?: string;
  correo?: string;
  fechaConstitucion?: string;
  numeroPartida?: string;
  ubicacion: OrganizacionUbicacionInput;
}
