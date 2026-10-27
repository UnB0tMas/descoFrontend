import { inject, Injectable } from '@angular/core';

import { PREDIOS_GATEWAY, PrediosGateway } from '../port/out/predios.gateway';
@Injectable() export class RetirarPredioUseCase { private readonly gateway:PrediosGateway=inject(PREDIOS_GATEWAY); execute(id: number, fechaRetiro: string, motivo: string){ return this.gateway.retire(id, fechaRetiro, motivo); } }
