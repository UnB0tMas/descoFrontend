import { Provider } from '@angular/core';
import { REPORTES_GATEWAY } from './application/port/out/reportes.gateway';
import { ExportarReporteUseCase } from './application/use-case/exportar-reporte.use-case';
import { ListarReportesUseCase } from './application/use-case/listar-reportes.use-case';
import { ObtenerDatosReporteUseCase } from './application/use-case/obtener-datos-reporte.use-case';
import { ReportesHttpAdapter } from './adapter/out/http/reportes-http.adapter';
import { ReportesHttpMapper } from './adapter/out/http/reportes-http.mapper';
export function provideReportes(): Provider[] { return [ReportesHttpMapper, ReportesHttpAdapter, { provide: REPORTES_GATEWAY, useExisting: ReportesHttpAdapter }, ListarReportesUseCase, ObtenerDatosReporteUseCase, ExportarReporteUseCase]; }
