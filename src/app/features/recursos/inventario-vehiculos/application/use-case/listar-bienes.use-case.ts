import { inject, Injectable } from '@angular/core';
import { BienInventarioFiltro } from '../../domain/bien-inventario.model';
import { INVENTARIO_VEHICULOS_GATEWAY, InventarioVehiculosGateway } from '../port/out/inventario-vehiculos.gateway';
@Injectable() export class ListarBienesUseCase { private readonly gateway:InventarioVehiculosGateway=inject(INVENTARIO_VEHICULOS_GATEWAY); execute(filter: BienInventarioFiltro){return this.gateway.listAssets(filter);} }
