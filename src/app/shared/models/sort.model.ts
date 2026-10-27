export type SortDirection = 'asc' | 'desc';

export interface Sort {
  field: string;
  direction: SortDirection;
}

export function nextSortDirection(
  current: SortDirection | null | undefined,
): SortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}
