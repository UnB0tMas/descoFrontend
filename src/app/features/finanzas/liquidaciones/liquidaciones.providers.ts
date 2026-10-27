import { Provider } from '@angular/core';
import { LIQUIDACIONES_GATEWAY } from './application/port/out/liquidaciones.gateway';
import { AnularLiquidacionUseCase } from './application/use-case/anular-liquidacion.use-case';
import { AprobarLiquidacionUseCase } from './application/use-case/aprobar-liquidacion.use-case';
import { CalcularLiquidacionUseCase } from './application/use-case/calcular-liquidacion.use-case';
import { ListarLiquidacionesUseCase } from './application/use-case/listar-liquidaciones.use-case';
import { ObtenerLiquidacionUseCase } from './application/use-case/obtener-liquidacion.use-case';
import { RecalcularLiquidacionUseCase } from './application/use-case/recalcular-liquidacion.use-case';
import { LiquidacionesHttpAdapter } from './adapter/out/http/liquidaciones-http.adapter';
import { LiquidacionesHttpMapper } from './adapter/out/http/liquidaciones-http.mapper';
export function provideLiquidaciones(): Provider[] { return [LiquidacionesHttpMapper, LiquidacionesHttpAdapter, { provide: LIQUIDACIONES_GATEWAY, useExisting: LiquidacionesHttpAdapter }, ListarLiquidacionesUseCase, ObtenerLiquidacionUseCase, CalcularLiquidacionUseCase, RecalcularLiquidacionUseCase, AprobarLiquidacionUseCase, AnularLiquidacionUseCase]; }
