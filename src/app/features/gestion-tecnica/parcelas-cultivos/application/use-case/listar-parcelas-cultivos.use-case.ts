import { inject, Injectable } from '@angular/core';
import { CultivoFiltro } from '../../domain/cultivo.model';
import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class ListarParcelasCultivosUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(filter: CultivoFiltro){return this.gateway.list(filter);}}
