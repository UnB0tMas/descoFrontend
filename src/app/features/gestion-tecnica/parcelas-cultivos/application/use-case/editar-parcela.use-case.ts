import { inject, Injectable } from '@angular/core';
import { ParcelaInput } from '../../domain/parcela.model';
import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class EditarParcelaUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(id:number, input:ParcelaInput){return this.gateway.updatePlot(id, input);}}
