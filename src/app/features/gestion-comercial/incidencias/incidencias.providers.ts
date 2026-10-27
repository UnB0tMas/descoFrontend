import { Provider } from '@angular/core';
import { INCIDENCIAS_GATEWAY } from './application/port/out/incidencias.gateway';
import { AnularIncidenciaUseCase } from './application/use-case/anular-incidencia.use-case';
import { ListarIncidenciasUseCase } from './application/use-case/listar-incidencias.use-case';
import { ObtenerIncidenciaUseCase } from './application/use-case/obtener-incidencia.use-case';
import { RegistrarIncidenciaUseCase } from './application/use-case/registrar-incidencia.use-case';
import { ResolverIncidenciaUseCase } from './application/use-case/resolver-incidencia.use-case';
import { RevisarIncidenciaUseCase } from './application/use-case/revisar-incidencia.use-case';
import { IncidenciasHttpAdapter } from './adapter/out/http/incidencias-http.adapter';
import { IncidenciasHttpMapper } from './adapter/out/http/incidencias-http.mapper';
export function provideIncidencias(): Provider[] { return [IncidenciasHttpMapper, IncidenciasHttpAdapter, { provide: INCIDENCIAS_GATEWAY, useExisting: IncidenciasHttpAdapter }, ListarIncidenciasUseCase, ObtenerIncidenciaUseCase, RegistrarIncidenciaUseCase, RevisarIncidenciaUseCase, ResolverIncidenciaUseCase, AnularIncidenciaUseCase]; }
