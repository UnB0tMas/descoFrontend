import { SortDirection } from '../../models/sort.model';

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T extends object> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: DataTableAlign;
  width?: string;
  value?: (row: T) => unknown;
  format?: (value: unknown, row: T) => string;
  cellClass?: string;
  headerClass?: string;
}

export interface DataTableSort {
  field: string;
  direction: SortDirection;
}
