import { inject, Injectable } from '@angular/core';

import { EmpleadoCreate, EmpleadoUpdate } from '../../domain/empleado.model';
import {
  EMPLEADOS_GATEWAY,
  EmpleadosGateway,
} from '../port/out/empleados.gateway';

@Injectable()
export class CrearEmpleadoUseCase {
  private readonly gateway: EmpleadosGateway = inject(EMPLEADOS_GATEWAY);

  execute(input: EmpleadoCreate) {
    return this.gateway.create(input);
  }
}
