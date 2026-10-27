export interface ApiError {
  status: number;
  code: string;
  message: string;
  correlationId: string | null;
  timestamp: string | null;
  details: unknown;
}

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ApiError>;
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  );
}
