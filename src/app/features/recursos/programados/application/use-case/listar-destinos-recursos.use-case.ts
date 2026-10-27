import { inject, Injectable } from '@angular/core';

import { TipoDestinoRecurso } from '../../domain/recurso-programado.model';
import {
  PROGRAMADOS_GATEWAY,
  ProgramadosGateway,
} from '../port/out/programados.gateway';

@Injectable()
export class ListarDestinosRecursosUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);

  execute(uotId?: number, tipo?: TipoDestinoRecurso) {
    return this.gateway.destinations(uotId, tipo);
  }
}
