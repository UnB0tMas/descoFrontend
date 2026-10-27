import { Provider } from '@angular/core';
import { GASTOS_GATEWAY } from './application/port/out/gastos.gateway';
import { AnularGastoUseCase } from './application/use-case/anular-gasto.use-case';
import { AprobarGastoUseCase } from './application/use-case/aprobar-gasto.use-case';
import { CrearGastoUseCase } from './application/use-case/crear-gasto.use-case';
import { EditarGastoUseCase } from './application/use-case/editar-gasto.use-case';
import { ListarGastosUseCase } from './application/use-case/listar-gastos.use-case';
import { ObtenerGastoUseCase } from './application/use-case/obtener-gasto.use-case';
import { ProrratearGastoUseCase } from './application/use-case/prorratear-gasto.use-case';
import { GastosHttpAdapter } from './adapter/out/http/gastos-http.adapter';
import { GastosHttpMapper } from './adapter/out/http/gastos-http.mapper';
export function provideGastos(): Provider[] { return [GastosHttpMapper, GastosHttpAdapter, { provide: GASTOS_GATEWAY, useExisting: GastosHttpAdapter }, ListarGastosUseCase, ObtenerGastoUseCase, CrearGastoUseCase, EditarGastoUseCase, ProrratearGastoUseCase, AprobarGastoUseCase, AnularGastoUseCase]; }
