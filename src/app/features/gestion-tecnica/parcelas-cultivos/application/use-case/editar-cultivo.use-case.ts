import { inject, Injectable } from '@angular/core';
import { CultivoUpdate } from '../../domain/cultivo.model';
import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class EditarCultivoUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(id:number, input:CultivoUpdate){return this.gateway.updateCrop(id, input);}}
