import { inject, Injectable } from '@angular/core';
import { PredioCreate } from '../../domain/predio.model';
import { PREDIOS_GATEWAY, PrediosGateway } from '../port/out/predios.gateway';
@Injectable() export class CrearPredioUseCase { private readonly gateway:PrediosGateway=inject(PREDIOS_GATEWAY); execute(input: PredioCreate){ return this.gateway.create(input); } }
