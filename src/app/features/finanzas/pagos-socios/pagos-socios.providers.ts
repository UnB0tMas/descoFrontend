import { Provider } from '@angular/core';
import { PAGOS_SOCIOS_GATEWAY } from './application/port/out/pagos-socios.gateway';
import { AnularPagoSocioUseCase } from './application/use-case/anular-pago-socio.use-case';
import { ConfirmarPagoSocioUseCase } from './application/use-case/confirmar-pago-socio.use-case';
import { ListarPagosSociosUseCase } from './application/use-case/listar-pagos-socios.use-case';
import { ObtenerPagoSocioUseCase } from './application/use-case/obtener-pago-socio.use-case';
import { RegistrarPagoSocioUseCase } from './application/use-case/registrar-pago-socio.use-case';
import { PagosSociosHttpAdapter } from './adapter/out/http/pagos-socios-http.adapter';
import { PagosSociosHttpMapper } from './adapter/out/http/pagos-socios-http.mapper';
export function providePagosSocios(): Provider[] { return [PagosSociosHttpMapper, PagosSociosHttpAdapter, { provide: PAGOS_SOCIOS_GATEWAY, useExisting: PagosSociosHttpAdapter }, ListarPagosSociosUseCase, ObtenerPagoSocioUseCase, RegistrarPagoSocioUseCase, ConfirmarPagoSocioUseCase, AnularPagoSocioUseCase]; }
