import { inject, Injectable } from '@angular/core';
import { BienInventarioCreate } from '../../domain/bien-inventario.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class CrearBienUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(input: BienInventarioCreate){return this.gateway.createAsset(input);} }
