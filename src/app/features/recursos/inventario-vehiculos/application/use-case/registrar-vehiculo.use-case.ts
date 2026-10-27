import { inject, Injectable } from '@angular/core';
import { VehiculoCreate } from '../../domain/vehiculo.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class RegistrarVehiculoUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(id: number, input: VehiculoCreate){return this.gateway.registerVehicle(id, input);} }
