import { inject, Injectable } from '@angular/core';

import {
  EMPLEADOS_GATEWAY,
  EmpleadosGateway,
} from '../port/out/empleados.gateway';

@Injectable()
export class ObtenerEmpleadoUseCase {
  private readonly gateway: EmpleadosGateway = inject(EMPLEADOS_GATEWAY);

  execute(id: number, uotId?: number) {
    return this.gateway.get(id, uotId);
  }
}
