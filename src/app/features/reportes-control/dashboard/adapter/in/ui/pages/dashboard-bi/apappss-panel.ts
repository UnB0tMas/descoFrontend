import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { ApexOptions, ChartComponent } from 'ng-apexcharts';
import { Subscription, finalize, of, switchMap } from 'rxjs';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ThemeService } from '../../../../../../../../core/ui/theme.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ApappssInsightsService, ApFilters, ApKpi, ApOption, ApPoint, ApSnapshot, ApTab } from './apappss-insights.service';

type GraphKind = 'area' | 'column' | 'bar' | 'donut';
interface TabDefinition { id: ApTab; title: string; permiso: string; }
interface GraphDefinition { id: string; title: string; subtitle: string; kind: GraphKind; }
interface ChartView extends GraphDefinition { empty: boolean; options: ApexOptions; }

const TABS: readonly TabDefinition[] = [
  { id: 'SOCIOS', title: 'Socios', permiso: 'APAPPSS_SOCIOS_LISTAR' },
  { id: 'PREDIOS', title: 'Predios', permiso: 'APAPPSS_PREDIOS_LISTAR' },
  { id: 'CAMPANIAS', title: 'Campañas', permiso: 'CAMPANIAS_LISTAR' },
  { id: 'VENTAS', title: 'Ventas', permiso: 'ENTREGAS_LISTAR' },
  { id: 'COMPRADORES', title: 'Compradores', permiso: 'COMPRADORES_LISTAR' },
  { id: 'LIQUIDACIONES', title: 'Liquidaciones', permiso: 'LIQUIDACIONES_LISTAR' },
  { id: 'PAGOS', title: 'Pagos a socios', permiso: 'PAGOS_LISTAR' },
];

const GRAPHS: Record<ApTab, readonly GraphDefinition[]> = {
  SOCIOS: [
    { id: 'ALTAS', title: 'Altas de socios', subtitle: 'Nuevos registros por fecha', kind: 'area' },
    { id: 'MEMBRESIA', title: 'Situación de socios', subtitle: 'Distribución de las membresías', kind: 'donut' },
    { id: 'ASOCIACION', title: 'Socios por asociación', subtitle: 'Socios registrados por asociación', kind: 'bar' },
    { id: 'PARTICIPANTES', title: 'Participación en campañas', subtitle: 'Socios participantes por campaña', kind: 'column' },
  ],
  PREDIOS: [
    { id: 'VARIEDAD', title: 'Plantas por variedad', subtitle: 'Distribución de las variedades', kind: 'bar' },
    { id: 'ESTADO_PLANTA', title: 'Estado de las plantas', subtitle: 'Condición actual de las plantas', kind: 'donut' },
    { id: 'DISTRITO', title: 'Predios por distrito', subtitle: 'Distribución territorial de predios', kind: 'column' },
    { id: 'REGISTRO_PLANTA', title: 'Registro de plantas', subtitle: 'Altas de plantas por día', kind: 'area' },
  ],
  CAMPANIAS: [
    { id: 'FECHAS', title: 'Inicio de campañas', subtitle: 'Campañas iniciadas por mes', kind: 'area' },
    { id: 'ESTADOS', title: 'Estado de campañas', subtitle: 'Distribución por estado', kind: 'donut' },
    { id: 'PARTICIPACION', title: 'Socios participantes', subtitle: 'Participación por campaña', kind: 'bar' },
    { id: 'OPERATIVOS', title: 'Operativos por campaña', subtitle: 'Operativos registrados', kind: 'column' },
  ],
  VENTAS: [
    { id: 'KILOS_DIA', title: 'Volumen recibido', subtitle: 'Kilos recibidos por día', kind: 'area' },
    { id: 'ESTADO_ENTREGA', title: 'Estado de entregas', subtitle: 'Distribución por estado', kind: 'donut' },
    { id: 'KILOS_CAMPANIA', title: 'Volumen por campaña', subtitle: 'Kilos entregados por campaña', kind: 'bar' },
    { id: 'CALIDAD', title: 'Control de calidad', subtitle: 'Resultados de la clasificación', kind: 'column' },
  ],
  COMPRADORES: [
    { id: 'TIPOS', title: 'Tipos de comprador', subtitle: 'Distribución de compradores', kind: 'donut' },
    { id: 'NUEVOS_DIA', title: 'Altas de compradores', subtitle: 'Compradores nuevos por día', kind: 'area' },
    { id: 'CAMPANIAS', title: 'Campañas por comprador', subtitle: 'Participación comercial', kind: 'bar' },
    { id: 'COBROS', title: 'Cobros por comprador', subtitle: 'Importes cobrados', kind: 'column' },
  ],
  LIQUIDACIONES: [
    { id: 'NETO_DIA', title: 'Liquidaciones por día', subtitle: 'Importe neto liquidado', kind: 'area' },
    { id: 'ESTADOS', title: 'Estado de liquidaciones', subtitle: 'Distribución por estado', kind: 'donut' },
    { id: 'POR_CAMPANIA', title: 'Liquidaciones por campaña', subtitle: 'Importe neto por campaña', kind: 'bar' },
    { id: 'AJUSTES', title: 'Ajustes por mes', subtitle: 'Importes ajustados', kind: 'column' },
  ],
  PAGOS: [
    { id: 'PAGOS_DIA', title: 'Pagos por día', subtitle: 'Importes pagados por fecha', kind: 'area' },
    { id: 'ESTADOS', title: 'Estado de pagos', subtitle: 'Distribución por estado', kind: 'donut' },
    { id: 'MEDIOS', title: 'Medios de pago', subtitle: 'Pagos según medio utilizado', kind: 'bar' },
    { id: 'POR_CAMPANIA', title: 'Pagos por campaña', subtitle: 'Importes pagados por campaña', kind: 'column' },
  ],
};

const PALETTE = ['#2563EB', '#60A5FA', '#4F46E5', '#0891B2', '#F59E0B', '#8B5CF6', '#16A34A'];
const EMPTY_FILTERS: { convenios: ApOption[]; socios: ApOption[]; predios: ApOption[]; campanias: ApOption[] } = {
  convenios: [], socios: [], predios: [], campanias: [],
};

@Component({
  selector: 'app-apappss-panel',
  standalone: true,
  imports: [ChartComponent],
  templateUrl: './apappss-panel.html',
  styleUrls: ['./dashboard-bi.css', './apappss-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApappssPanel implements OnDestroy {
  private readonly api = inject(ApappssInsightsService);
  private readonly perms = inject(PermissionService);
  private readonly theme = inject(ThemeService);
  private readonly uot = inject(UotContextStore);
  private filtersPending?: Subscription;
  private summaryPending?: Subscription;
  private lastUot: number | null | undefined;

  readonly tabs = computed(() => TABS.filter(item => this.perms.has(item.permiso)));
  readonly actual = signal<ApTab>('SOCIOS');
  readonly currentTab = computed(() => TABS.find(item => item.id === this.actual()) ?? TABS[0]);
  readonly today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  readonly desde = signal(this.offsetDate(this.today, -365));
  readonly hasta = signal(this.today);
  readonly convenio = signal('');
  readonly socio = signal('');
  readonly predio = signal('');
  readonly campania = signal('');
  readonly filtros = signal(EMPTY_FILTERS);
  readonly filtersLoading = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<ApSnapshot | null>(null);

  readonly filterError = computed(() => {
    if (!this.convenio()) return 'Seleccione un convenio.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.desde()) || !/^\d{4}-\d{2}-\d{2}$/.test(this.hasta())) {
      return 'Ingrese fechas válidas.';
    }
    if (this.desde() > this.hasta()) return 'La fecha de inicio debe ser anterior o igual a la fecha final.';
    if (this.hasta() > this.today) return 'La fecha final no puede ser posterior a hoy.';
    if (this.dayDifference(this.desde(), this.hasta()) > 365) return 'El rango máximo es de 366 días.';
    return null;
  });
  readonly indicators = computed(() =>
    [...(this.snapshot()?.indicadores ?? [])].sort((a, b) => a.orden - b.orden));
  readonly charts = computed(() => {
    const points = this.snapshot()?.puntos ?? [];
    const dark = this.theme.isDark();
    return GRAPHS[this.actual()].map(def => this.buildChart(def, points, dark));
  });
  readonly hasPredioFilter = computed(() => this.actual() === 'PREDIOS');
  readonly hasSocioFilter = computed(() => this.actual() === 'PREDIOS');
  readonly hasCampaniaFilter = computed(() =>
    this.actual() === 'CAMPANIAS' || this.actual() === 'VENTAS' || this.actual() === 'LIQUIDACIONES');

  constructor() {
    effect(() => {
      const id = this.uot.selectedId();
      if (id === this.lastUot) return;
      this.lastUot = id;
      this.filtersPending?.unsubscribe();
      this.summaryPending?.unsubscribe();
      this.filtersLoading.set(false);
      this.loading.set(false);
      this.filtros.set(EMPTY_FILTERS);
      this.convenio.set('');
      this.socio.set('');
      this.predio.set('');
      this.campania.set('');
      this.snapshot.set(null);
      this.error.set(null);
      const first = this.tabs()[0];
      if (first) this.actual.set(first.id);
      if (id !== null && first) this.fetchFilters();
    });
  }

  selectTab(tab: ApTab): void {
    if (tab === this.actual() || !this.tabs().some(item => item.id === tab)) return;
    this.actual.set(tab);
    this.socio.set('');
    this.predio.set('');
    this.campania.set('');
    this.load();
  }

  update(event: Event, field: 'convenio' | 'socio' | 'predio' | 'campania' | 'desde' | 'hasta'): void {
    const value = (event.target as HTMLSelectElement | HTMLInputElement).value;
    switch (field) {
      case 'convenio':
        if (value !== this.convenio()) {
          this.convenio.set(value);
          this.socio.set('');
          this.predio.set('');
          this.campania.set('');
          this.summaryPending?.unsubscribe();
          this.loading.set(false);
          this.snapshot.set(null);
          this.error.set(null);
          if (value) this.fetchFilters(Number(value));
        }
        break;
      case 'socio': this.socio.set(value); break;
      case 'predio': this.predio.set(value); break;
      case 'campania': this.campania.set(value); break;
      case 'desde': this.desde.set(value); break;
      case 'hasta': this.hasta.set(value); break;
    }
  }

  isActivePreset(days: number): boolean {
    return this.hasta() === this.today && this.desde() === this.offsetDate(this.today, -(days - 1));
  }

  preset(days: number): void {
    this.desde.set(this.offsetDate(this.today, -(days - 1)));
    this.hasta.set(this.today);
    this.load();
  }

  reset(): void {
    this.desde.set(this.offsetDate(this.today, -365));
    this.hasta.set(this.today);
    this.socio.set('');
    this.predio.set('');
    this.campania.set('');
    this.load();
  }

  load(): void {
    this.summaryPending?.unsubscribe();
    this.loading.set(false);
    this.snapshot.set(null);
    this.error.set(null);
    if (this.filtersLoading() || this.filterError() || !this.tabs().some(item => item.id === this.actual())) return;
    const request: ApFilters = {
      tab: this.actual(), desde: this.desde(), hasta: this.hasta(), convenioId: Number(this.convenio()),
    };
    if (this.hasSocioFilter() && this.socio()) request.socioId = Number(this.socio());
    if (this.hasPredioFilter() && this.predio()) request.predioId = Number(this.predio());
    if (this.hasCampaniaFilter() && this.campania()) request.campaniaId = Number(this.campania());
    this.loading.set(true);
    this.summaryPending = this.api.resumen(request).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        if (result.tab !== request.tab || result.convenioId !== request.convenioId) {
          this.error.set('Los datos recibidos no corresponden a la consulta solicitada.');
          return;
        }
        if (!Array.isArray(result.indicadores) || result.indicadores.length !== 4 || !Array.isArray(result.puntos)) {
          const kpis = Array.isArray(result.indicadores) ? result.indicadores.length : 'no es arreglo';
          const graficos = Array.isArray(result.puntos) ? result.puntos.length : 'no es arreglo';
          console.error('[APAPPSS] Contrato de resumen incompleto', {
            tab: request.tab, convenioId: request.convenioId, indicadores: kpis, puntos: graficos,
          });
          this.error.set(`No se pudo cargar la información.`);
          return;
        }
        this.snapshot.set(result);
      },
      error: exception => this.error.set(mapOpenApiError(exception).message),
    });
  }

  formattedKpi(kpi: ApKpi): string {
    const value = Number(kpi.valor);
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: kpi.unidad === 'PEN' ? 2 : 0,
      maximumFractionDigits: kpi.unidad === 'PEN' ? 2 : kpi.unidad === 'UND' ? 0 : 2,
    }).format(value);
  }

  ngOnDestroy(): void {
    this.filtersPending?.unsubscribe();
    this.summaryPending?.unsubscribe();
  }

  private fetchFilters(convenioId?: number): void {
    this.filtersPending?.unsubscribe();
    this.filtersLoading.set(true);
    this.filtersPending = this.api.filtros(convenioId).pipe(
      switchMap(options => {
        if (convenioId !== undefined || !options.convenios?.length) return of(options);
        this.convenio.set(String(options.convenios[0].id));
        return this.api.filtros(options.convenios[0].id);
      }),
      finalize(() => this.filtersLoading.set(false)),
    ).subscribe({
      next: options => {
        this.filtros.set({
          convenios: options.convenios ?? [], socios: options.socios ?? [],
          predios: options.predios ?? [], campanias: options.campanias ?? [],
        });
        if (!options.convenios?.length) {
          this.error.set('No hay convenios APAPPSS disponibles para esta unidad.');
          return;
        }
        if (!options.convenios.some(item => String(item.id) === this.convenio())) {
          this.error.set('El convenio seleccionado ya no está disponible.');
          return;
        }
        this.filtersLoading.set(false);
        this.load();
      },
      error: exception => this.error.set(mapOpenApiError(exception).message),
    });
  }

  private buildChart(def: GraphDefinition, points: readonly ApPoint[], dark: boolean): ChartView {
    const chartPoints = points.filter(point => point.grafico === def.id);
    const categories = [...new Map(chartPoints.map(point => [point.categoria, point.orden] as const))]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([category]) => category);
    const names = [...new Set(chartPoints.map(point => point.serie))];
    const donut = def.kind === 'donut';
    const series = donut
      ? categories.map(category => chartPoints.filter(point => point.categoria === category)
          .reduce((sum, point) => sum + Number(point.valor), 0))
      : names.map(name => ({ name, data: categories.map(category => chartPoints
          .filter(point => point.serie === name && point.categoria === category)
          .reduce((sum, point) => sum + Number(point.valor), 0)) }));
    const type: 'donut' | 'area' | 'bar' = donut ? 'donut' : def.kind === 'area' ? 'area' : 'bar';
    const options: ApexOptions = {
      series,
      chart: {
        type, height: 310, parentHeightOffset: 0, toolbar: { show: false },
        zoom: { enabled: false }, fontFamily: 'Inter, ui-sans-serif, sans-serif',
        animations: { enabled: true, speed: 420 },
      },
      colors: PALETTE,
      theme: { mode: dark ? 'dark' : 'light' },
      grid: { borderColor: dark ? '#303A4B' : '#E7ECF1', strokeDashArray: 4,
        padding: { left: 7, right: 15, bottom: 6 } },
      stroke: { width: def.kind === 'area' ? 3 : 0, curve: 'smooth' },
      markers: { size: 0, hover: { size: 5 } },
      fill: def.kind === 'area'
        ? { type: 'gradient', gradient: { shadeIntensity: 0.15, opacityFrom: 0.32, opacityTo: 0.02, stops: [0, 100] } }
        : { opacity: 0.95 },
      dataLabels: { enabled: false },
      plotOptions: {
        bar: {
          horizontal: def.kind === 'bar', borderRadius: 7,
          columnWidth: '45%', barHeight: '58%', distributed: names.length === 1,
        },
        pie: { donut: { size: '74%', labels: { show: true,
          value: { show: true, fontWeight: 750, fontSize: '21px' },
          total: { show: true, label: 'Total', fontSize: '12px', fontWeight: 600 },
        } } },
      },
      xaxis: donut ? undefined : {
        categories, labels: { style: { colors: dark ? '#9BA8BC' : '#65758B', fontSize: '11px' },
          rotate: -30, trim: true },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: donut ? undefined : { labels: { style: { colors: dark ? '#9BA8BC' : '#65758B', fontSize: '11px' } } },
      legend: { show: donut || names.length > 1, position: 'bottom', fontSize: '12px',
        labels: { colors: dark ? '#E5EDF5' : '#334155' } },
      labels: donut ? categories : undefined,
      tooltip: { theme: dark ? 'dark' : 'light', shared: true, intersect: false,
        y: { formatter: value => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value) } },
      responsive: [{ breakpoint: 600, options: { chart: { height: 290 }, legend: { position: 'bottom' } } }],
    };
    return { ...def, empty: chartPoints.length === 0, options };
  }

  private offsetDate(value: string, days: number): string {
    const date = new Date(`${value}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private dayDifference(from: string, to: string): number {
    return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  }
}
