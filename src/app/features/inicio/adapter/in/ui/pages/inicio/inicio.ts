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
import { ModuleAccessService } from '../../../../../../../core/access/module-access.service';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { NavigationItem } from '../../../../../../../core/navigation/navigation-item.model';
import { NavigationService } from '../../../../../../../core/navigation/navigation.service';
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
  private readonly permissions = inject(PermissionService);
  private readonly modules = inject(ModuleAccessService);
  private readonly navigation = inject(NavigationService);

  // El inicio no concede acceso a indicadores sin autorización.
  readonly canViewDashboard = computed(() =>
    this.modules.has('INICIO') && this.permissions.has('INICIO_LISTAR'),
  );

  readonly availableLinks = computed(() => {
    const links: { code: string; label: string; route: string }[] = [];
    const routes = new Set<string>();
    const visit = (items: readonly NavigationItem[]): void => {
      for (const item of items) {
        if (item.route && item.route !== '/inicio' &&
            item.route !== '/seleccionar-uot' && !routes.has(item.route)) {
          routes.add(item.route);
          links.push({ code: item.code, label: item.label, route: item.route });
        }
        visit(item.children);
      }
    };
    visit(this.navigation.items());
    return links.slice(0, 8);
  });

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

  readonly priorityIndicators = computed(() => this.dashboard().indicadores.slice(0, 3));
  readonly priorityCharts = computed(() => this.dashboard().graficos.slice(0, 2));

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
    if (this.canViewDashboard()) this.load();
    else this.loading.set(false);
  }

  load(): void {
    if (!this.canViewDashboard()) {
      this.loading.set(false);
      return;
    }
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

    if (normalized.includes('HORARIO')) return faCalendarDays;

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
