import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';

/** Mensaje público reutilizado por los tres flujos de predios E1. */
export function registroPredioError(error: unknown): string {
  const parsed = mapOpenApiError(error);
  const referencia = parsed.correlationId
    && /^[0-9a-fA-F-]{36}$/.test(parsed.correlationId) ? parsed.correlationId : null;
  const mensaje = parsed.code === 'EXPEDIENTE_ERROR' || parsed.code === 'EXPEDIENTE_RESPUESTA_INVALIDA'
    ? 'No se pudo completar el registro.' : parsed.message;
  return referencia && (parsed.code === 'EXPEDIENTE_ERROR' || parsed.code === 'EXPEDIENTE_RESPUESTA_INVALIDA')
    ? `${mensaje} Referencia: ${referencia}` : mensaje;
}
