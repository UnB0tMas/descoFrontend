import { Provider } from '@angular/core';
import { AJUSTES_PRECIO_GATEWAY } from './application/port/out/ajustes-precio.gateway';
import { AnularAjustePrecioUseCase } from './application/use-case/anular-ajuste-precio.use-case';
import { ListarAjustesPrecioUseCase } from './application/use-case/listar-ajustes-precio.use-case';
import { RegistrarAjustePrecioUseCase } from './application/use-case/registrar-ajuste-precio.use-case';
import { VerImpactoAjusteUseCase } from './application/use-case/ver-impacto-ajuste.use-case';
import { AjustesPrecioHttpAdapter } from './adapter/out/http/ajustes-precio-http.adapter';
import { AjustesPrecioHttpMapper } from './adapter/out/http/ajustes-precio-http.mapper';
export function provideAjustesPrecio(): Provider[] { return [AjustesPrecioHttpMapper, AjustesPrecioHttpAdapter, { provide: AJUSTES_PRECIO_GATEWAY, useExisting: AjustesPrecioHttpAdapter }, ListarAjustesPrecioUseCase, VerImpactoAjusteUseCase, RegistrarAjustePrecioUseCase, AnularAjustePrecioUseCase]; }
