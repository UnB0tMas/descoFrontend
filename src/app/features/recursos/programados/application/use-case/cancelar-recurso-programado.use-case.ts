import { inject, Injectable } from '@angular/core';

import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class CancelarRecursoProgramadoUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(id: number, motivo: string) {
    return this.gateway.cancel(id, motivo);
  }
}
