export interface GpProductorEditarRequest {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  telefono?: string | null;
  correo?: string | null;
  distritoCodigo?: string | null;
  centroPobladoId?: number | null;
  referencia?: string | null;
}
