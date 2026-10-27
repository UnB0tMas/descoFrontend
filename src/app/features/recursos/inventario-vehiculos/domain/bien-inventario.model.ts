export type EstadoBien = 'DISPONIBLE' | 'MANTENIMIENTO' | 'NO_DISPONIBLE' | 'BAJA' | string;
export interface BienInventario { bienInventarioId:number; empresaId:number; empresa:string; tipoBienId:number; tipoBien:string; codigoPatrimonial:string; nombre:string; marca:string|null; modelo:string|null; serie:string|null; estadoBien:EstadoBien; vehiculo:boolean; placa:string|null; tipoVehiculo:string|null; kilometrajeKm:number|null; }
export interface BienRecursoRelacionado { recursoProgramadoId:number; estadoProceso:string; cantidadProgramada:number; fechaProgramacion:string|null; campaniaVentaId:number|null; operativoVentaId:number|null; salidaCampoId:number|null; }
export interface BienMovimiento { recursoMovimientoId:number; tipoMovimiento:string; cantidad:number; fechaHora:string|null; observacion:string|null; }
export interface BienInventarioDetalle extends BienInventario { estado:boolean; recursos:readonly BienRecursoRelacionado[]; movimientos:readonly BienMovimiento[]; }
export interface BienInventarioCreate { empresaId:number; tipoBienId:number; codigoPatrimonial:string; nombre:string; marca?:string; modelo?:string; serie?:string; }
export interface BienInventarioUpdate { nombre:string; marca?:string; modelo?:string; serie?:string; estadoBien:EstadoBien; }
export interface BienInventarioFiltro { empresaId?:number; tipoBienId?:number; estadoBien?:string; page:number; size:number; }
