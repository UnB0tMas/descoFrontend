import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faEye,
  faFilter,
  faPen,
  faPlus,
  faRotate,
  faTriangleExclamation,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ResourceAssetResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { RecursoFormComponent } from '../recurso-form/recurso-form';

@Component({
  selector: 'app-inventario-vehiculos-list-page',
  standalone: true,
  imports: [
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    RecursoFormComponent,
  ],
  templateUrl: './inventario-vehiculos-list.html',
  styleUrl: './inventario-vehiculos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioVehiculosListPage implements OnInit {
  @ViewChild(RecursoFormComponent) private form!: RecursoFormComponent;

  private readonly api = inject(ResourceApiService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly assets = signal<readonly ResourceAssetResponse[]>([]);
  readonly search = signal('');
  readonly stateFilter = signal('');
  readonly unitFilter = signal<number | null>(null);

  readonly pageIcon = faWarehouse;
  readonly addIcon = faPlus;
  readonly refreshIcon = faRotate;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly filterIcon = faFilter;
  readonly incidentIcon = faTriangleExclamation;

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const state = this.stateFilter().trim().toUpperCase();

    return this.assets().filter((item) => {
      if (state && (item.estadoBien ?? '').toUpperCase() !== state) return false;
      if (!query) return true;
      return [
        item.codigoPatrimonial,
        item.nombre,
        item.marca,
        item.modelo,
        item.serie,
        item.tipoBien,
        item.uotNombre,
      ].some((value) => (value ?? '').toLowerCase().includes(query));
    });
  });

  readonly availableUnits = computed(() => this.uot.memberships());

  ngOnInit(): void {
    const selected = this.uot.selectedId();
    this.unitFilter.set(selected);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const unitId =
      this.uot.modo() === 'GENERAL'
        ? this.unitFilter() ?? undefined
        : this.uot.selectedId() ?? undefined;

    this.api
      .listAssets(unitId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.assets.set(items),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onUnitChange(value: string): void {
    const parsed = Number(value);
    this.unitFilter.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    this.load();
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate();
    if (result.saved) this.load();
  }

  async edit(item: ResourceAssetResponse): Promise<void> {
    const result = await this.form.openEdit(item);
    if (result.saved) this.load();
  }

  stateLabel(value?: string): string {
    return (value ?? 'SIN ESTADO').replaceAll('_', ' ');
  }

  stateClass(value?: string): string {
    const normalized = (value ?? '').toUpperCase();
    if (normalized === 'DISPONIBLE') return 'resource-status resource-status--ok';
    if (normalized === 'BAJA' || normalized === 'INACTIVO') {
      return 'resource-status resource-status--muted';
    }
    if (
      normalized === 'AVERIADO' ||
      normalized === 'MANTENIMIENTO' ||
      normalized === 'NO_DISPONIBLE'
    ) {
      return 'resource-status resource-status--warning';
    }
    return 'resource-status resource-status--info';
  }
}
