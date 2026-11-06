export interface GpParcelaResponse {
  parcelaId: number; predioId: number; codigo: string; nombre: string;
  areaHa?: number | null; estado: boolean;
  distritoCodigo?: string | null; centroPobladoId?: number | null;
  latitud?: number | null; longitud?: number | null;
}
