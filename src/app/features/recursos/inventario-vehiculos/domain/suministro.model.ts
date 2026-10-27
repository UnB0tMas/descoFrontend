export interface Suministro { suministroId:number; codigo:string; nombre:string; unidadMedida:string; estado:boolean; stock:number; }
export interface SuministroCreate { codigo:string; nombre:string; unidadMedida:string; stockInicial:number; }
export interface SuministroUpdate { nombre:string; unidadMedida:string; }
