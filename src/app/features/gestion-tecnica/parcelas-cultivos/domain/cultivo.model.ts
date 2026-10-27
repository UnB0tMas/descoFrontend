export interface Cultivo { parcelaCultivoId:number; variedadPaltaId:number; variedadCodigo:string|null; variedad:string; fechaInicio:string|null; fechaFin:string|null; situacionCultivo:string; estado:boolean; }
export interface CultivoInput { parcelaId:number; variedadPaltaId:number; fechaInicio:string; }
export interface CultivoUpdate { variedadPaltaId:number; fechaInicio:string; }
export interface ParcelaCultivoResumen { parcelaId:number; predioId:number; predioCodigo:string; predioNombre:string; parcelaCodigo:string; parcelaNombre:string; areaHa:number; ubicacionId:number|null; parcelaEstado:boolean; parcelaCultivoId:number|null; variedadPaltaId:number|null; variedad:string|null; fechaInicio:string|null; fechaFin:string|null; situacionCultivo:string|null; cultivoEstado:boolean; }
export interface CultivoFiltro { predioId?:number; socioId?:number; variedadPaltaId?:number; situacionCultivo?:string; buscar?:string; page:number; size:number; }
