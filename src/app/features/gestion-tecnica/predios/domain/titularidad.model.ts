export type TipoTitularidad = 'PROPIETARIO' | 'COPROPIETARIO' | 'POSESIONARIO' | 'ARRENDATARIO' | 'OTRO';
export interface Titularidad { predioTitularidadId:number; socioId:number; tipoDocumento:string; numeroDocumento:string; nombres:string; apellidoPaterno:string; apellidoMaterno:string|null; tipoTitularidad:string; porcentaje:number; fechaDesde:string|null; fechaHasta:string|null; estado:boolean; }
export interface TitularidadInput { socioId:number; tipoTitularidad:TipoTitularidad; porcentaje:number; }
