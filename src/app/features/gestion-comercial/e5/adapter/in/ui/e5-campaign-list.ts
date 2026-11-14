import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faEye, faRotate } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { CommercialApiService } from '../../../../shared/commercial-api.service';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { DataTableComponent } from '../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../shared/data-display/data-table/data-table.types';
import { RecordCardComponent } from '../../../../../../shared/data-display/record-card/record-card';
import { ListViewSwitchComponent } from '../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { PaginatorComponent } from '../../../../../../shared/data-display/paginator/paginator';
import { EmptyStateComponent } from '../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../shared/data-display/loading-state/loading-state';
import { PageResult, emptyPageResult } from '../../../../../../shared/models/page-result.model';

@Component({
  selector: 'app-e5-campaign-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent, PageHeaderComponent, DataTableComponent,
    RecordCardComponent, ListViewSwitchComponent, PaginatorComponent, EmptyStateComponent,
    ErrorStateComponent, LoadingStateComponent],
  templateUrl: './e5-campaign-list.html',
  styleUrl: './e5-campaign-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class E5CampaignListPage implements OnInit {
  private readonly api = inject(CommercialApiService);
  readonly calendarIcon = faCalendarDays;
  readonly eyeIcon = faEye;
  readonly reloadIcon = faRotate;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly view = signal<'cards' | 'table'>('cards');
  readonly search = signal('');
  readonly state = signal('');
  readonly result = signal<PageResult<Record<string, unknown>>>(emptyPageResult(12));
  readonly columns: readonly DataTableColumn<Record<string, unknown>>[] = [
    { key: 'nombre', label: 'Campaña' },
    { key: 'fechaInicio', label: 'Inicio', format: value => this.dateText(value) },
    { key: 'fechaFin', label: 'Fin', format: value => this.dateText(value) },
    { key: 'comprador', label: 'Comprador' },
    { key: 'estadoProceso', label: 'Estado' },
    { key: 'acciones', label: 'Acciones', align: 'right' },
  ];
  // El mismo catálogo y las mismas reglas territoriales del apartado Campañas.
  // No filtrar por ACTIVA: una campaña dentro de fechas puede seguir en PLANIFICACION.
  readonly rows = computed(() => this.result().items.filter(c => {
    const query = this.search().trim().toLocaleLowerCase('es');
    const status = this.state();
    return (!status || this.str(c, 'estadoProceso') === status) && (!query ||
      [c['nombre'], c['codigo'], c['asociacionNombre'], c['asociacion'], c['comprador'], c['empresaCompradora']]
        .some(value => String(value ?? '').toLocaleLowerCase('es').includes(query)));
  }));

  ngOnInit(): void { this.load(1); }

  load(page = this.result().page): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list('campaigns', page, this.result().size)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => this.result.set(result),
        error: error => this.error.set(mapOpenApiError(error).message),
      });
  }

  changeSize(size: number): void {
    this.result.set(emptyPageResult(size));
    this.load(1);
  }

  str(row: Record<string, unknown>, key: string): string {
    return String(row[key] ?? '—');
  }

  buyer(row: Record<string, unknown>): string {
    return String(row['comprador'] || row['empresaCompradora'] || 'Sin nombre');
  }

  association(row: Record<string, unknown>): string {
    return String(row['asociacionNombre'] || row['asociacion'] || 'APAPPSS');
  }

  id(row: Record<string, unknown>): number {
    return Number(row['campaniaVentaId'] ?? row['id'] ?? 0);
  }

  dateText(value: unknown): string {
    if (value == null || value === '') return '—';
    const text = String(value).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : text;
  }
}
