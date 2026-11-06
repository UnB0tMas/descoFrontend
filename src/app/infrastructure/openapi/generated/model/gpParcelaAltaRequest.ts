export interface GpParcelaAltaRequest {
  predioId: number; nombre: string; areaHa: number; distritoCodigo: string;
  centroPobladoId?: number | null; latitud?: number | null; longitud?: number | null;
}
