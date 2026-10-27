import { Sort } from '../models/sort.model';

export interface ListQueryState<TFilters = Record<string, unknown>> {
  page: number;
  size: number;
  filters: TFilters;
  sort: Sort | null;
}

export function createDefaultListQueryState<TFilters>(
  filters: TFilters,
  size = 20,
): ListQueryState<TFilters> {
  return {
    page: 1,
    size,
    filters,
    sort: null,
  };
}
