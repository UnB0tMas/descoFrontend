import { inject, Injectable } from '@angular/core';

import { EmpleadoFiltro } from '../../domain/empleado-filtro.model';
import {
  EMPLEADOS_GATEWAY,
  EmpleadosGateway,
} from '../port/out/empleados.gateway';

@Injectable()
export class ListarEmpleadosUseCase {
  private readonly gateway: EmpleadosGateway = inject(EMPLEADOS_GATEWAY);

  execute(filter: EmpleadoFiltro) {
    return this.gateway.list(filter);
  }
}
