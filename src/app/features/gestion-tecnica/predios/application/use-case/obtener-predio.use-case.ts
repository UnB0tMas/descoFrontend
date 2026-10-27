import { inject, Injectable } from '@angular/core';

import { PREDIOS_GATEWAY, PrediosGateway } from '../port/out/predios.gateway';
@Injectable() export class ObtenerPredioUseCase { private readonly gateway:PrediosGateway=inject(PREDIOS_GATEWAY); execute(id: number){ return this.gateway.get(id); } }
