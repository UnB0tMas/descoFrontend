import { inject, Injectable } from '@angular/core';
import { BienInventarioUpdate } from '../../domain/bien-inventario.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class EditarBienUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(id: number, input: BienInventarioUpdate){return this.gateway.updateAsset(id, input);} }
