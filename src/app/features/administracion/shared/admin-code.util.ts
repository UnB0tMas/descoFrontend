export function buildSystemCode(
  prefix: string,
  source: string,
  maxLength: number,
): string {
  const normalizedPrefix = normalizeCodePart(prefix) || 'SYS';
  const normalizedSource = normalizeCodePart(source) || 'REGISTRO';
  const raw = `${normalizedPrefix}_${normalizedSource}`;

  return raw.slice(0, Math.max(1, maxLength)).replace(/_+$/g, '');
}

export function buildUsernameSuggestion(
  label: string,
  entityId: number,
  maxLength = 80,
): string {
  const displayName = label.split('·')[0]?.trim() || 'usuario';
  const normalized = normalizeText(displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  const first = parts[0] || 'usuario';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const base = [first, last, String(entityId)]
    .filter(Boolean)
    .join('.');

  return base.slice(0, Math.max(1, maxLength)).replace(/[._-]+$/g, '');
}

function normalizeCodePart(value: string): string {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
