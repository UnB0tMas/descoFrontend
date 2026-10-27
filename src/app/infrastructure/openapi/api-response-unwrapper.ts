export interface ApiEnvelope<T> {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: T | null;
  correlacionId?: string;
  fechaHoraUtc?: string;
}

export class ApiEnvelopeError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly correlationId: string | null,
  ) {
    super(message);
    this.name = 'ApiEnvelopeError';
  }
}

export function unwrapApiResponse<T>(response: ApiEnvelope<T>): T {
  if (response.exitoso === false) {
    throw new ApiEnvelopeError(
      response.codigo ?? 'OPERACION_NO_COMPLETADA',
      response.mensaje ?? 'La operación no pudo completarse.',
      response.correlacionId ?? null,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(response, 'datos')) {
    return undefined as T;
  }

  return response.datos as T;
}
