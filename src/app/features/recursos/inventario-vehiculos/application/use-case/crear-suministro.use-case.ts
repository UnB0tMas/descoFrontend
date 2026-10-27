import { inject, Injectable } from '@angular/core';
import { SuministroCreate } from '../../domain/suministro.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class CrearSuministroUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(input: SuministroCreate){return this.gateway.createSupply(input);} }
