export interface ConvenioE1 { id: number; nombre: string; }
export interface PersonaE1 {
  personaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreCompleto: string;
}
export interface PredioE1 {
  predioId: number;
  codigo: string;
  nombre: string;
  distritoCodigo: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  titular?: string;
}
export interface CatalogoE1 { id: number; nombre: string; }
export interface VariedadE1 { id: number; padreId: number; nombre: string; }
export interface CatalogosE1 {
  cultivos: CatalogoE1[];
  variedades: VariedadE1[];
  especies: CatalogoE1[];
}
export interface TitularE1 {
  personaId: number; socioId?: number; numeroDocumento: string;
  nombreCompleto: string; tipoTitularidad: string; porcentaje?: number; rolTitularidad?: string;
}
export interface CultivoE1 {
  id: number; cultivo: string; variedad?: string; parcela: string;
  fechaInicio: string; fechaFin?: string;
}
export interface CrianzaE1 {
  id: number; especie: string; lote?: string; fechaInicio: string; cantidadActual?: number;
}
export interface ActuacionE1 {
  id: number; tipo: string; observacion: string; fechaHecho: string;
  fechaRegistro: string; autor: string; cultivoId?: number; crianzaId?: number;
  salidaId?: number; visitaId?: number;
}
export interface CensoE1 { id: number; cultivo?: string; fecha: string; total: number; productivas: number; observacion?: string; }
export interface ConteoE1 {
  id: number; crianzaId: number; cantidad?: number; fechaHecho: string; observacion?: string;
}
export interface ExpedienteE1 {
  predioId: number; codigo: string; nombre: string; distritoCodigo: string;
  referencia?: string; latitud?: number; longitud?: number;
  areaTotalHa?: number; areaCultivableHa?: number; tipoRiego?: string;
  fichaCompleta: boolean; titulares: TitularE1[]; cultivos: CultivoE1[];
  crianzas: CrianzaE1[]; historial: ActuacionE1[]; censos: CensoE1[]; conteos: ConteoE1[];
}
export interface PersonaAltaE1 {
  tipoDocumento: string; numeroDocumento: string; nombres: string;
  apellidoPaterno: string; apellidoMaterno?: string;
  fechaNacimiento?: string; telefono?: string; correo?: string;
  distritoCodigo: string; centroPobladoId?: number; referencia?: string;
}
export interface PredioAltaE1 {
  personaId: number; nombre: string; distritoCodigo: string;
  referencia?: string; latitud?: number; longitud?: number; centroPobladoId?: number;
  areaTotalHa?: number; areaCultivableHa?: number; tipoRiego?: string;
  altitudM?: number; fuenteAgua?: string; infraestructura?: string; observacion?: string;
  fechaRegistro?: string; fechaDesde?: string; tipoTitularidadPrincipal?: string;
  titularesAdicionales?: {personaId:number; tipoTitularidad:string; porcentaje:number}[];
}
export interface CultivoAltaE1 {
  cultivoId: number; variedadId?: number; parcelaId?: number;
  parcelaNombre?: string; fecha?: string;
}
export interface CrianzaAltaE1 {
  especieId: number; nombre?: string; cantidad?: number; fecha?: string; observacion?: string;
}
export interface ConteoAltaE1 {
  loteId: number; cantidad?: number; fecha?: string; observacion?: string;
}
export interface ActuacionAltaE1 {
  tipo: string; observacion: string; fechaHecho?: string; crianzaId?: number; cultivoId?: number;
}
export interface FichaAltaE1 {
  areaTotalHa?: number; areaCultivableHa?: number; tipoRiego?: string;
}
