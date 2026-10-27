import { Provider } from '@angular/core';
import { PROGRAMADOS_GATEWAY } from './application/port/out/programados.gateway';
import { AsignarRecursoUseCase } from './application/use-case/asignar-recurso.use-case';
import { CancelarRecursoProgramadoUseCase } from './application/use-case/cancelar-recurso-programado.use-case';
import { ConsultarDisponibilidadRecursosUseCase } from './application/use-case/consultar-disponibilidad-recursos.use-case';
import { EditarRecursoProgramadoUseCase } from './application/use-case/editar-recurso-programado.use-case';
import { ListarRecursosProgramadosUseCase } from './application/use-case/listar-recursos-programados.use-case';
import { ObtenerRecursoProgramadoUseCase } from './application/use-case/obtener-recurso-programado.use-case';
import { ProgramarRecursoUseCase } from './application/use-case/programar-recurso.use-case';
import { RegistrarDevolucionRecursoUseCase } from './application/use-case/registrar-devolucion-recurso.use-case';
import { RegistrarConsumoRecursoUseCase } from './application/use-case/registrar-consumo-recurso.use-case';
import { ProgramadosHttpAdapter } from './adapter/out/http/programados-http.adapter';
import { ProgramadosHttpMapper } from './adapter/out/http/programados-http.mapper';

export function provideProgramados(): Provider[] {
  return [
    ProgramadosHttpMapper,
    ProgramadosHttpAdapter,
    { provide: PROGRAMADOS_GATEWAY, useExisting: ProgramadosHttpAdapter },
    ListarRecursosProgramadosUseCase,
    ObtenerRecursoProgramadoUseCase,
    ConsultarDisponibilidadRecursosUseCase,
    ProgramarRecursoUseCase,
    EditarRecursoProgramadoUseCase,
    AsignarRecursoUseCase,
    RegistrarDevolucionRecursoUseCase,
    RegistrarConsumoRecursoUseCase,
    CancelarRecursoProgramadoUseCase,
  ];
}
