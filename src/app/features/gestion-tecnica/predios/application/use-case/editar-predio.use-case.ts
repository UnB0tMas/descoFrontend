import { inject, Injectable } from '@angular/core';
import { PredioUpdate } from '../../domain/predio.model';
import { PREDIOS_GATEWAY, PrediosGateway } from '../port/out/predios.gateway';
@Injectable() export class EditarPredioUseCase { private readonly gateway:PrediosGateway=inject(PREDIOS_GATEWAY); execute(id: number, input: PredioUpdate){ return this.gateway.update(id, input); } }
