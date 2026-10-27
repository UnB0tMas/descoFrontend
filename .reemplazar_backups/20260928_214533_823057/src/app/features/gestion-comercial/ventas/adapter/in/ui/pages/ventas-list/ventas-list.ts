import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCartShopping,
  faEye,
  faPlus,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { SaleSummaryResponse } from '../../../../../../../../infrastructure/openapi/generated/model/saleSummaryResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { VentasApiService } from '../../../../../shared/ventas-api.service';
import { VentaFormComponent } from '../venta-form/venta-form';

@Component({
  selector: 'app-ventas-list-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    VentaFormComponent,
  ],
  templateUrl: './ventas-list.html',
  styleUrl: './ventas-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasListPage implements OnInit {
  @ViewChild(VentaFormComponent) private form!: VentaFormComponent;

  private readonly api = inject(VentasApiService);
  private readonly router = inject(Router);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly sales = signal<readonly SaleSummaryResponse[]>([]);
  readonly unitFilter = signal<number | null>(null);
  readonly stateFilter = signal('');
  readonly search = signal('');

  readonly pageIcon = faCartShopping;
  readonly addIcon = faPlus;
  readonly refreshIcon = faRotate;
  readonly viewIcon = faEye;

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.sales();
    return this.sales().filter((item) =>
      [
        String(item.ventaId ?? ''),
        item.cliente,
        item.almacen,
        item.uotNombre,
      ].some((value) => (value ?? '').toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.unitFilter.set(this.uot.isGeneral() ? null : this.uot.selectedId());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const unitId =
      this.uot.isGeneral()
        ? this.unitFilter() ?? undefined
        : this.uot.selectedId() ?? undefined;

    this.api
      .list(unitId, this.stateFilter() || undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.sales.set(items),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onUnitChange(value: string): void {
    const id = Number(value);
    this.unitFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.load();
  }

  onStateChange(value: string): void {
    this.stateFilter.set(value);
    this.load();
  }

  async create(): Promise<void> {
    const result = await this.form.open(this.uot.isGeneral() ? this.unitFilter() ?? undefined : this.uot.selectedId() ?? undefined);
    if (result.saved) {
      this.load();
      if (result.value) {
        void this.router.navigate(['/gestion-comercial/ventas', result.value]);
      }
    }
  }

  stateClass(state?: string): string {
    const value = (state ?? '').toUpperCase();
    if (value === 'ENTREGADA' || value === 'PAGADA') return 'sale-state sale-state--ok';
    if (value === 'ANULADA') return 'sale-state sale-state--muted';
    if (value === 'PAGO_PARCIAL') return 'sale-state sale-state--warning';
    return 'sale-state sale-state--info';
  }

  stateLabel(state?: string): string {
    return (state ?? 'SIN ESTADO').replaceAll('_', ' ');
  }
}
