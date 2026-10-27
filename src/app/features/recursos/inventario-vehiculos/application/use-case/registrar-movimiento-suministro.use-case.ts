import { inject, Injectable } from '@angular/core';
import { MovimientoSuministroCreate } from '../../domain/movimiento-suministro.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class RegistrarMovimientoSuministroUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(id: number, input: MovimientoSuministroCreate){return this.gateway.registerMovement(id, input);} }
