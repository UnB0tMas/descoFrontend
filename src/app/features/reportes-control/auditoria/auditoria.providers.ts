import { Provider } from '@angular/core';
import { AUDITORIA_GATEWAY } from './application/port/out/auditoria.gateway';
import { ExportarAuditoriaUseCase } from './application/use-case/exportar-auditoria.use-case';
import { ListarAuditoriaUseCase } from './application/use-case/listar-auditoria.use-case';
import { ObtenerEventoAuditoriaUseCase } from './application/use-case/obtener-evento-auditoria.use-case';
import { AuditoriaHttpAdapter } from './adapter/out/http/auditoria-http.adapter';
import { AuditoriaHttpMapper } from './adapter/out/http/auditoria-http.mapper';
export function provideAuditoria(): Provider[] { return [AuditoriaHttpMapper, AuditoriaHttpAdapter, { provide: AUDITORIA_GATEWAY, useExisting: AuditoriaHttpAdapter }, ListarAuditoriaUseCase, ObtenerEventoAuditoriaUseCase, ExportarAuditoriaUseCase]; }
