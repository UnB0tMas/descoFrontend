import { Provider } from '@angular/core';
import { COBROS_COMPRADORES_GATEWAY } from './application/port/out/cobros-compradores.gateway';
import { AnularCobroCompradorUseCase } from './application/use-case/anular-cobro-comprador.use-case';
import { ConfirmarCobroCompradorUseCase } from './application/use-case/confirmar-cobro-comprador.use-case';
import { ConsultarSaldoCompradorUseCase } from './application/use-case/consultar-saldo-comprador.use-case';
import { ListarCobrosCompradoresUseCase } from './application/use-case/listar-cobros-compradores.use-case';
import { RegistrarCobroCompradorUseCase } from './application/use-case/registrar-cobro-comprador.use-case';
import { CobrosCompradoresHttpAdapter } from './adapter/out/http/cobros-compradores-http.adapter';
import { CobrosCompradoresHttpMapper } from './adapter/out/http/cobros-compradores-http.mapper';
export function provideCobrosCompradores(): Provider[] { return [CobrosCompradoresHttpMapper, CobrosCompradoresHttpAdapter, { provide: COBROS_COMPRADORES_GATEWAY, useExisting: CobrosCompradoresHttpAdapter }, ListarCobrosCompradoresUseCase, ConsultarSaldoCompradorUseCase, RegistrarCobroCompradorUseCase, ConfirmarCobroCompradorUseCase, AnularCobroCompradorUseCase]; }
