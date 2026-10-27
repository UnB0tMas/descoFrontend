import { inject, Injectable } from '@angular/core';

import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class AsignarRecursoUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(id: number) {
    return this.gateway.assign(id);
  }
}
