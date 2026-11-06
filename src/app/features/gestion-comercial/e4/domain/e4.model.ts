export interface E4Campaign {
  campaniaId: number;
  nombre: string;
  estado: string;
  cupoJabas?: number;
  taraKg?: number;
  stockFisico?: number;
  stockRetenido?: number;
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
  clasificaciones?: readonly E4ClassificationDetail[];
}
export interface E4Units {
  asignacionId: number;
  asignadas: number;
  retornoValidado?: boolean;
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

export interface E4EligiblePartner {socioAsociacionId: number; nombre: string; numeroDocumento: string}
export interface E4EligiblePartners {campaniaId: number; socios: readonly E4EligiblePartner[]}
export interface E4PartnerInclusion {campaniaId: number; incorporados: number}

export interface E4ClassificationDetail {
  numero: number; pesoKg: number; rechazada: boolean;
  variedadId?: number; condicionId?: number; precioBase?: number;
}
export interface E4ClassificationLine {
  pesoKg: number; rechazada: boolean; variedadId?: number; condicionId?: number;
}
export interface E4ClassificationResult {
  unidadId: number; lineas: number; kilosAceptados: number; kilosRechazados: number;
}
export interface E4Stock {uotId:number; existenciaCertificada:number; retenidas:number}
export interface E4RetornoValidado {asignacionId:number; validadas:number}
export interface E4PesajeEvento {historialId:number; estadoAnterior:string; estadoNuevo:string;
 pesoAnterior?:number; pesoNuevo?:number; taraAnterior?:number; taraNueva?:number;
 motivo?:string; usuarioId?:number; fechaHora?:string}
export interface E4PesajeHistorial {unidadId:number; eventos:E4PesajeEvento[]}
