import { inject, Injectable } from '@angular/core';
import { ParcelaInput } from '../../domain/parcela.model';
import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class CrearParcelaUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(input: ParcelaInput){return this.gateway.createPlot(input);}}
