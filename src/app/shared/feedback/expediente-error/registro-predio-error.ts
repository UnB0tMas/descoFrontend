import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';

/** Los diagnósticos y referencias permanecen en los registros internos. */
export function registroPredioError(error: unknown): string {
  const parsed = mapOpenApiError(error);
  if (parsed.status >= 500 ||
      ['EXPEDIENTE_ERROR', 'EXPEDIENTE_SQL_ERROR', 'EXPEDIENTE_RESPUESTA_INVALIDA'].includes(parsed.code)) {
    return 'No se pudo registrar el fundo. Intente nuevamente.';
  }
  return parsed.message || 'No se pudo registrar el fundo.';
}
