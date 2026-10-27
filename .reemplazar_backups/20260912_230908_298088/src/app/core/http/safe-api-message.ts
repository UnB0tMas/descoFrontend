const DEFAULT_MESSAGE = 'No se pudo completar la acción.';

export function safeApiMessage(
  status: number,
  candidate: string | null | undefined,
): string {
  if (status === 0) {
    return 'No se pudo conectar al sistema.';
  }
  if (status === 401) {
    return 'Su sesión no es válida. Inicie sesión nuevamente.';
  }
  if (status === 403) {
    return 'No cuenta con autorización para realizar esta acción.';
  }
  if (status === 404) {
    return safeCandidate(candidate) ?? 'No se encontró la información solicitada.';
  }
  if (status === 409) {
    return safeCandidate(candidate) ?? 'La información ya existe o cambió.';
  }
  if (status === 429) {
    return 'Hay demasiadas solicitudes. Intente nuevamente.';
  }
  if (status >= 500) {
    return 'No se pudo completar la acción en este momento.';
  }
  return safeCandidate(candidate) ?? DEFAULT_MESSAGE;
}

export function safeCandidate(
  candidate: string | null | undefined,
): string | null {
  const value = candidate?.trim();
  if (!value || isTechnicalMessage(value)) return null;
  return value.length > 300 ? value.slice(0, 300) : value;
}

function isTechnicalMessage(value: string): boolean {
  const normalized = value.toLowerCase();
  const markers = [
    'exception', 'stacktrace', 'stack trace', 'sqlstate', 'sqlexception',
    'jdbc', 'simplejdbccall', 'stored procedure', 'procedimiento almacenado',
    'constraint', 'foreign key', 'primary key', 'unique index', 'duplicate key',
    'nullpointer', 'classcastexception', 'timeout exception', 'nvarchar',
    'http://', 'https://', '/api/', 'endpoint', 'bearer', 'authorization:',
    'access token', 'refresh token', 'provider', 'proveedor externo',
    'factiliza', 'verificape', 'reniec api', 'sunat api', 'select ', 'insert ',
    'update ', 'delete ', 'merge ', 'create table', 'alter table',
  ];
  return markers.some((marker) => normalized.includes(marker));
}
