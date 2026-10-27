import { inject, Injectable } from '@angular/core';

import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class RetirarBienUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(id: number, motivo: string){return this.gateway.retireAsset(id, motivo);} }
