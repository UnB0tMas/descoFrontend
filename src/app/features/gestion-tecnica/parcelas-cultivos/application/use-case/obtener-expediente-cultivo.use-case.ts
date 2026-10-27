import { inject, Injectable } from '@angular/core';

import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class ObtenerExpedienteCultivoUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(parcelaId?: number, cultivoId?: number){return this.gateway.getExpediente(parcelaId, cultivoId);}}
