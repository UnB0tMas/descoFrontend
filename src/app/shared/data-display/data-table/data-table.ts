import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faTableColumns,
} from '@fortawesome/free-solid-svg-icons';

import { DataTableColumn, DataTableSort } from './data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends object> {
  @Input({ required: true }) columns: readonly DataTableColumn<T>[] = [];
  @Input() rows: readonly T[] = [];
  @Input() sort: DataTableSort | null = null;
  @Input() loading = false;
  @Input() rowClickable = false;
  @Input() trackByKey: string | null = null;
  @Input() emptyMessage = 'No hay registros disponibles.';

  @Output() sortChange = new EventEmitter<DataTableSort>();
  @Output() rowClick = new EventEmitter<T>();

  readonly tableIcon = faTableColumns;
  readonly ascendingIcon = faArrowUp;
  readonly descendingIcon = faArrowDown;

  value(row: T, column: DataTableColumn<T>): unknown {
    if (column.value) {
      return column.value(row);
    }

    return (row as Record<string, unknown>)[column.key];
  }

  display(row: T, column: DataTableColumn<T>): string {
    const value = this.value(row, column);

    if (column.format) {
      return column.format(value, row);
    }

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return String(value);
  }

  sortBy(column: DataTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }

    const direction =
      this.sort?.field === column.key && this.sort.direction === 'asc'
        ? 'desc'
        : 'asc';

    this.sortChange.emit({
      field: column.key,
      direction,
    });
  }

  rowIdentity(index: number, row: T): unknown {
    if (this.trackByKey) {
      return (row as Record<string, unknown>)[this.trackByKey] ?? index;
    }

    return index;
  }

  alignClass(align: DataTableColumn<T>['align']): string {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  }
}
