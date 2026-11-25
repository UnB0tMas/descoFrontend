import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DataTableComponent } from '../../data-display/data-table/data-table';
import { DataTableColumn, DataTableSort } from '../../data-display/data-table/data-table.types';
import { ListViewMode } from '../../data-display/list-view-switch/list-view-switch';
import { PaginatorComponent } from '../../data-display/paginator/paginator';

/** La página entrega registros, plantillas, paginación y eventos; no duplica filtrado ni API. */
@Component({
  selector: 'app-list-container',
  standalone: true,
  imports: [NgTemplateOutlet, DataTableComponent, PaginatorComponent],
  templateUrl: './list-container.html',
  styleUrl: './list-container.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListContainerComponent<T extends object> {
  @Input() rows: readonly T[] = [];
  @Input() columns: readonly DataTableColumn<T>[] = [];
  @Input() view: ListViewMode = 'table';
  @Input() appearance: 'default' | 'admin' = 'admin';
  @Input() sort: DataTableSort | null = null;
  @Input() loading = false;
  @Input() emptyMessage = 'No hay registros disponibles.';
  @Input() trackByKey: string | null = null;
  @Input() cellTemplates: Readonly<Record<string, TemplateRef<{ $implicit: T }>>> = {};
  @Input() cardTemplate: TemplateRef<{ $implicit: T }> | null = null;
  @Input() cardLayout: 'default' | 'institutional' = 'default';
  @Input() cardsBounded = false;
  @Input() cardsTemplate: TemplateRef<unknown> | null = null;
  @Input() rowClickable = false;
  @Input() showPaginator = false;
  @Input() page = 1;
  @Input() size = 20;
  @Input() totalRecords = 0;
  @Input() totalPages = 0;
  @Input() pageSizes: readonly number[] = [10, 20, 50, 100];

  @Output() readonly sortChange = new EventEmitter<DataTableSort>();
  @Output() readonly rowClick = new EventEmitter<T>();
  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly sizeChange = new EventEmitter<number>();

  identity(index: number, row: T): unknown {
    return this.trackByKey ? (row as Record<string, unknown>)[this.trackByKey] ?? index : index;
  }
}
