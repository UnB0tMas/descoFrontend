import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRotateLeft,
  faBoxesStacked,
  faBuilding,
  faCalendarDays,
  faChartLine,
  faCoins,
  faFileLines,
  faFilter,
  faGaugeHigh,
  faLeaf,
  faLocationDot,
  faMoneyBillTransfer,
  faSeedling,
  faTruck,
  faUserGroup,
  faUsersGear,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessStore } from '../../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { ObtenerDashboardUseCase } from '../../../../../application/use-case/obtener-dashboard.use-case';
import { AccesoRapido } from '../../../../../domain/acceso-rapido.model';
import { Dashboard, EMPTY_DASHBOARD } from '../../../../../domain/dashboard.model';
import { DashboardFilter } from '../../../../../domain/dashboard-filter.model';
import { AlertasPanelComponent } from '../../components/alertas-panel/alertas-panel';
import { GraficosPanelComponent } from '../../components/graficos-panel/graficos-panel';
import { IndicadoresPanelComponent } from '../../components/indicadores-panel/indicadores-panel';

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [
    RouterLink,
    FaIconComponent,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    AlertasPanelComponent,
    IndicadoresPanelComponent,
    GraficosPanelComponent,
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioPage implements OnInit {
  private readonly useCase = inject(ObtenerDashboardUseCase);
  private readonly access = inject(AccessStore);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<Dashboard>(EMPTY_DASHBOARD);

  readonly dashboardIcon = faGaugeHigh;
  readonly filterIcon = faFilter;
  readonly resetIcon = faArrowRotateLeft;

  readonly today = this.localIsoDate(new Date());
  readonly desde = signal(this.offsetDate(-89));
  readonly hasta = signal(this.today);

  readonly greeting = computed(() => {
    const user = this.access.user();
    const firstName = user?.nombres?.trim().split(/\s+/)[0];

    return firstName ? `Hola, ${firstName}` : 'Dashboard';
  });

  readonly primaryRole = computed(
    () => this.access.roles()[0]?.nombre ?? 'Perfil autorizado',
  );

  readonly relatedAccesses = computed<readonly AccesoRapido[]>(() =>
    this.dashboard().accesosRapidos,
  );

  readonly filterError = computed(() => {
    const from = this.parseDate(this.desde());
    const to = this.parseDate(this.hasta());

    if (!from || !to) {
      return 'Selecciona un periodo válido.';
    }

    if (from.getTime() > to.getTime()) {
      return 'La fecha inicial no puede ser posterior a la fecha final.';
    }

    const days = Math.floor(
      (to.getTime() - from.getTime()) / 86_400_000,
    );

    if (days > 365) {
      return 'El periodo máximo permitido es de 366 días.';
    }

    if (this.hasta() > this.today) {
      return 'La fecha final no puede estar en el futuro.';
    }

    return null;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.filterError()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.useCase
      .execute(this.currentFilter())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);

          if (dashboard.periodo.desde) {
            this.desde.set(dashboard.periodo.desde);
          }

          if (dashboard.periodo.hasta) {
            this.hasta.set(dashboard.periodo.hasta);
          }
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  applyFilters(): void {
    this.load();
  }

  resetFilters(): void {
    this.desde.set(this.offsetDate(-89));
    this.hasta.set(this.today);
    this.load();
  }

  updateDesde(event: Event): void {
    this.desde.set((event.target as HTMLInputElement).value);
  }

  updateHasta(event: Event): void {
    this.hasta.set((event.target as HTMLInputElement).value);
  }

  iconForModule(code: string): IconDefinition {
    const normalized = code.toUpperCase();

    if (normalized.includes('TIPO') && normalized.includes('BIEN')) {
      return faBoxesStacked;
    }

    if (normalized.includes('PRODUCTOR') || normalized.includes('SOCIO')) {
      return faUserGroup;
    }

    if (normalized.includes('PREDIO')) {
      return faLocationDot;
    }

    if (
      normalized.includes('CULTIVO') ||
      normalized.includes('PRODUCCION') ||
      normalized.includes('SANIDAD')
    ) {
      return normalized.includes('SANIDAD') ? faLeaf : faSeedling;
    }

    if (
      normalized.includes('CAMPANIA') ||
      normalized.includes('OPERATIVO') ||
      normalized.includes('SALIDA') ||
      normalized.includes('VISITA')
    ) {
      return faCalendarDays;
    }

    if (
      normalized.includes('INVENTARIO') ||
      normalized.includes('RECURSO') ||
      normalized.includes('JABA')
    ) {
      return faBoxesStacked;
    }

    if (normalized.includes('ENTREGA')) {
      return faTruck;
    }

    if (
      normalized.includes('PAGO') ||
      normalized.includes('COBRO') ||
      normalized.includes('LIQUID')
    ) {
      return faMoneyBillTransfer;
    }

    if (normalized.includes('GASTO') || normalized.includes('AJUSTE')) {
      return faCoins;
    }

    if (normalized.includes('USUARIO') || normalized.includes('ROL')) {
      return faUsersGear;
    }

    if (normalized.includes('REPORTE') || normalized.includes('AUDITOR')) {
      return faFileLines;
    }

    if (normalized.includes('ORGANIZ')) {
      return faBuilding;
    }

    return faChartLine;
  }


  private currentFilter(): DashboardFilter {
    return {
      desde: this.desde(),
      hasta: this.hasta(),
    };
  }

  private offsetDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return this.localIsoDate(date);
  }

  private localIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
