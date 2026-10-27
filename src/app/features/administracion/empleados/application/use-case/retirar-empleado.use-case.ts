import { inject, Injectable } from '@angular/core';

import {
  EMPLEADOS_GATEWAY,
  EmpleadosGateway,
} from '../port/out/empleados.gateway';

@Injectable()
export class RetirarEmpleadoUseCase {
  private readonly gateway: EmpleadosGateway = inject(EMPLEADOS_GATEWAY);

  execute(id: number, uotId: number, motivo: string, fechaCese?: string) {
    return this.gateway.retire(id, uotId, motivo, fechaCese);
  }
}
