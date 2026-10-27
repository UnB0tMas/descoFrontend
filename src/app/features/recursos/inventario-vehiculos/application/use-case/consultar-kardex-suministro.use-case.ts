import { inject, Injectable } from '@angular/core';

import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class ConsultarKardexSuministroUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(suministroId?: number){return this.gateway.movements(suministroId);} }
