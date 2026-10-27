import { inject, Injectable } from '@angular/core';

import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class ListarSuministrosUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(page: number, size: number){return this.gateway.listSupplies(page, size);} }
