import { inject, Injectable } from '@angular/core';

import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class ObtenerRecursoProgramadoUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(id: number) {
    return this.gateway.get(id);
  }
}
