import { Provider } from '@angular/core';

import { EMPLEADOS_GATEWAY } from './application/port/out/empleados.gateway';
import { CrearEmpleadoUseCase } from './application/use-case/crear-empleado.use-case';
import { EditarEmpleadoUseCase } from './application/use-case/editar-empleado.use-case';
import { ListarEmpleadosUseCase } from './application/use-case/listar-empleados.use-case';
import { ObtenerEmpleadoUseCase } from './application/use-case/obtener-empleado.use-case';
import { RetirarEmpleadoUseCase } from './application/use-case/retirar-empleado.use-case';
import { EmpleadosHttpAdapter } from './adapter/out/http/empleados-http.adapter';
import { EmpleadosHttpMapper } from './adapter/out/http/empleados-http.mapper';

export function provideEmpleados(): Provider[] {
  return [
    EmpleadosHttpMapper,
    EmpleadosHttpAdapter,
    {
      provide: EMPLEADOS_GATEWAY,
      useExisting: EmpleadosHttpAdapter,
    },
    ListarEmpleadosUseCase,
    ObtenerEmpleadoUseCase,
    CrearEmpleadoUseCase,
    EditarEmpleadoUseCase,
    RetirarEmpleadoUseCase,
  ];
}
