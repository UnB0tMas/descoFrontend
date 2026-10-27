import { inject, Injectable } from '@angular/core';

import { PARCELAS_CULTIVOS_GATEWAY, ParcelasCultivosGateway } from '../port/out/parcelas-cultivos.gateway';
@Injectable() export class FinalizarCultivoUseCase{private readonly gateway:ParcelasCultivosGateway=inject(PARCELAS_CULTIVOS_GATEWAY);execute(id:number, fechaFin:string, motivo:string){return this.gateway.finishCrop(id, fechaFin, motivo);}}
