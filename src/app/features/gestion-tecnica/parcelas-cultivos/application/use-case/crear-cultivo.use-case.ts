import { inject, Injectable } from '@angular/core';
import { CultivoInput } from '../../domain/cultivo.model';
import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class CrearCultivoUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(parcelaId:number, input:CultivoInput){return this.gateway.createCrop(parcelaId, input);}}
