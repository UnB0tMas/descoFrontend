export interface Parcela {
  parcelaId: number;
  predioId: number;
  predioCodigo: string;
  predioNombre: string;
  codigo: string;
  nombre: string;
  areaHa: number;
  estado: boolean;
  ubicacionId: number | null;
  distritoCodigo: string | null;
  centroPobladoId: number | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  altitudM: number | null;
}

export interface ParcelaInput {
  predioId: number;
  nombre: string;
  areaHa: number;
}
