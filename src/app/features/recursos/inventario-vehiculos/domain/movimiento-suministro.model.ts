export type TipoMovimientoSuministro = 'ENTRADA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SALIDA';
export interface MovimientoSuministro { suministroMovimientoId:number; suministroId:number; codigo:string; nombre:string; unidadMedida:string; recursoProgramadoId:number|null; tipoMovimiento:string; cantidad:number; fechaHora:string|null; documentoReferencia:string|null; observacion:string|null; usuario:string|null; }
export interface MovimientoSuministroCreate { tipoMovimiento:TipoMovimientoSuministro; cantidad:number; documentoReferencia?:string; observacion?:string; }
