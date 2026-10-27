import { inject, Injectable } from '@angular/core';
import { SuministroUpdate } from '../../domain/suministro.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class EditarSuministroUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(id: number, input: SuministroUpdate){return this.gateway.updateSupply(id, input);} }
