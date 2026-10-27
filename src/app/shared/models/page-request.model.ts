import { Sort } from './sort.model';

export interface PageRequest<TFilters = Record<string, unknown>> {
  page: number;
  size: number;
  filters: TFilters;
  sort: Sort | null;
}
