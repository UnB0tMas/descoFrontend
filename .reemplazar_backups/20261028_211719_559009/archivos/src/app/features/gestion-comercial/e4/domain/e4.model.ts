export interface E4Campaign {
  campaniaId: number;
  nombre: string;
  estado: string;
  cupoJabas?: number;
  taraKg?: number;
  jabasPendientes?: number;
  unidades?: number;
  precios?: readonly {variedadId: number; condicionId: number; precio: number; version: number}[];
}
export interface E4Unit {
  unidadId: number;
  numero: number;
  pesoBrutoKg?: number;
  taraKg?: number;
  pesoNetoKg?: number;
  variedadId?: number;
  condicionId?: number;
  precioBase?: number;
  pesaje: string;
  retorno: string;
  entregaId?: number;
  version: number;
}
export interface E4Units {
  asignacionId: number;
  asignadas: number;
  pesadas: number;
  devueltas: number;
  faltantes: number;
  unidades: readonly E4Unit[];
}
export interface E4Prebalance {
  campaniaId: number;
  brutoConfirmado: number;
  descuentosPrecio: number;
  cargosIndividuales: number;
}
export interface E4Assigned {asignacionId: number; unidades: number}
export interface E4Return {asignacionId: number; llenas: number; vacias: number; faltantes: number}
export interface E4Delivery {entregaId: number; kilosAceptados: number; llenas: number}
export interface E4Result {importe?: number; descuento?: number; cargoId?: number; sancionId?: number}
