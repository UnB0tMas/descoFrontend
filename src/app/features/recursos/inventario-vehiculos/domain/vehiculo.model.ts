import { BienInventarioDetalle } from './bien-inventario.model';
export interface Vehiculo { vehiculoId:number; bienInventarioId:number; placa:string|null; tipoVehiculo:string; color?:string|null; kilometrajeKm:number|null; bien:BienInventarioDetalle; }
export interface VehiculoCreate { placa?:string; tipoVehiculo:string; color?:string; kilometrajeKm?:number; }
export interface KilometrajeUpdate { kilometrajeKm:number; }
