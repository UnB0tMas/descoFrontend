import { Provider } from '@angular/core';

import { ORGANIZACIONES_GATEWAY } from './application/port/out/organizaciones.gateway';
import { CrearAreaUseCase } from './application/use-case/crear-area.use-case';
import { CrearAsociacionUseCase } from './application/use-case/crear-asociacion.use-case';
import { CrearEmpresaUseCase } from './application/use-case/crear-empresa.use-case';
import { DeshabilitarAreaUseCase } from './application/use-case/deshabilitar-area.use-case';
import { DeshabilitarOrganizacionUseCase } from './application/use-case/deshabilitar-organizacion.use-case';
import { EditarAreaUseCase } from './application/use-case/editar-area.use-case';
import { EditarAsociacionUseCase } from './application/use-case/editar-asociacion.use-case';
import { EditarEmpresaUseCase } from './application/use-case/editar-empresa.use-case';
import { ListarOrganizacionesUseCase } from './application/use-case/listar-organizaciones.use-case';
import { OrganizacionesHttpAdapter } from './adapter/out/http/organizaciones-http.adapter';
import { OrganizacionesHttpMapper } from './adapter/out/http/organizaciones-http.mapper';

export function provideOrganizaciones(): Provider[] {
  return [
    OrganizacionesHttpMapper,
    OrganizacionesHttpAdapter,
    {
      provide: ORGANIZACIONES_GATEWAY,
      useExisting: OrganizacionesHttpAdapter,
    },
    ListarOrganizacionesUseCase,
    CrearEmpresaUseCase,
    EditarEmpresaUseCase,
    CrearAsociacionUseCase,
    EditarAsociacionUseCase,
    CrearAreaUseCase,
    EditarAreaUseCase,
    DeshabilitarOrganizacionUseCase,
    DeshabilitarAreaUseCase,
  ];
}
