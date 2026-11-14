/** Reglas compartidas de completitud de Persona y Empresa: no sustituir valores ya registrados. */
export function identityValuePresent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  return value !== null && value !== undefined && value !== false;
}

export function hasIdentityGaps(
  original: Record<string, unknown>,
  optionalFields: readonly string[],
): boolean {
  return optionalFields.some(field => !identityValuePresent(original[field]));
}

/** Solo detecta incorporaciones en atributos vacíos; nunca propone sobrescribir datos existentes. */
export function identityCompletionChanged(
  original: Record<string, unknown>,
  incoming: Record<string, unknown>,
): boolean {
  return Object.keys(incoming).some(key =>
    !identityValuePresent(original[key]) && identityValuePresent(incoming[key]));
}
