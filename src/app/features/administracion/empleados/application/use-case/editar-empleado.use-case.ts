import { inject, Injectable } from '@angular/core';

import { EmpleadoCreate, EmpleadoUpdate } from '../../domain/empleado.model';
import {
  EMPLEADOS_GATEWAY,
  EmpleadosGateway,
} from '../port/out/empleados.gateway';

@Injectable()
export class EditarEmpleadoUseCase {
  private readonly gateway: EmpleadosGateway = inject(EMPLEADOS_GATEWAY);

  execute(id: number, input: EmpleadoUpdate) {
    return this.gateway.update(id, input);
  }
}
