export interface GpProductorResponse {
  personaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreCompleto: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  telefono?: string | null;
  correo?: string | null;
  fechaNacimiento?: string | null;
  distritoCodigo?: string | null;
  centroPobladoId?: number | null;
  referencia?: string | null;
}
