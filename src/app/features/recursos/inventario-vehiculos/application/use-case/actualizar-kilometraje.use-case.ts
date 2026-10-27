import { inject, Injectable } from '@angular/core';
import { KilometrajeUpdate } from '../../domain/vehiculo.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class ActualizarKilometrajeUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(id: number, input: KilometrajeUpdate){return this.gateway.updateMileage(id, input);} }
