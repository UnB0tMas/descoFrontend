import { inject, Injectable } from '@angular/core';
import { PredioFiltro } from '../../domain/predio-filtro.model';
import { PREDIOS_GATEWAY, PrediosGateway } from '../port/out/predios.gateway';
@Injectable() export class ListarPrediosUseCase { private readonly gateway:PrediosGateway=inject(PREDIOS_GATEWAY); execute(filter: PredioFiltro){ return this.gateway.list(filter); } }
