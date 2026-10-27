import { inject, Injectable } from '@angular/core';

import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class ConsultarDisponibilidadRecursosUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);

  execute(uotId: number) {
    return this.gateway.availability(uotId);
  }
}
