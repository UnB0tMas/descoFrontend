const DEFAULT_MESSAGE = 'No se pudo completar la acción.';

const CODE_MESSAGES: Readonly<Record<string, string>> = {
  CORREO_DUPLICADO: 'El correo ya está registrado.',
  CORREO_EMPRESA_DUPLICADO: 'El correo ya está registrado.',
  CORREO_PERSONA_DUPLICADO: 'El correo ya está registrado.',
  CORREO_SEGURIDAD_DUPLICADO: 'El correo ya está registrado.',
  CORREO_PRINCIPAL_DUPLICADO: 'La cuenta ya tiene un correo principal.',
  ROL_DUPLICADO: 'El rol ya está asignado.',
  ROL_VIGENTE_DUPLICADO: 'El rol ya está asignado.',
  EMPLEADO_DUPLICADO: 'La persona ya está registrada como empleado.',
  CODIGO_AREA_DUPLICADO: 'Ya existe un área con ese nombre o código en la organización.',
  CODIGO_EMPLEADO_DUPLICADO: 'Ya existe un empleado con ese código en la organización.',
  VALOR_DUPLICADO: 'El valor ya está registrado.',
  USUARIO_DUPLICADO: 'El nombre de usuario ya está registrado.',
  DOCUMENTO_DUPLICADO: 'El documento ya está registrado.',
  DATO_DUPLICADO: 'La información ya está registrada.',
  REGISTRO_DUPLICADO: 'La información ya está registrada.',
  REGISTRO_NO_ENCONTRADO: 'No se encontró la información seleccionada.',
  RECURSO_NO_ENCONTRADO: 'No se encontró la información seleccionada.',
  DOCUMENTO_INVALIDO: 'El documento ingresado no es válido.',
  SOLICITUD_NO_VALIDA: 'Revisa la información ingresada.',
};

export function safeApiMessage(
  status: number,
  candidate: string | null | undefined,
  code?: string | null,
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

  const safe = safeCandidate(candidate);
  if (safe) {
    return safe;
  }

  const known = code ? CODE_MESSAGES[code.trim().toUpperCase()] : null;
  if (known) {
    return known;
  }

  if (status === 404) {
    return 'No se encontró la información solicitada.';
  }
  if (status === 409) {
    return 'La información ya existe o cambió.';
  }
  if (status === 422) {
    return 'Revisa la información ingresada.';
  }
  if (status === 429) {
    return 'Hay demasiadas solicitudes. Intente nuevamente.';
  }
  if (status >= 500) {
    return 'No se pudo completar la acción en este momento.';
  }
  return DEFAULT_MESSAGE;
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
