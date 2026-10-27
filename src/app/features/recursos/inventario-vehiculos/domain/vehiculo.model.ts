import { BienInventarioDetalle } from './bien-inventario.model';
export interface Vehiculo { vehiculoId:number; bienInventarioId:number; placa:string; tipoVehiculo:string; kilometrajeKm:number; bien:BienInventarioDetalle; }
export interface VehiculoCreate { placa:string; tipoVehiculo:string; kilometrajeKm:number; }
export interface KilometrajeUpdate { kilometrajeKm:number; }
