import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ChartComponent, ApexOptions } from 'ng-apexcharts';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs';
import { AccessStore } from '../../../../../../../../core/access/access.store';
import { ThemeService } from '../../../../../../../../core/ui/theme.service';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ConveniosModulesStore } from '../../../../../../../convenios/state/convenios-modules.store';
import { ApappssPanel } from './apappss-panel';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {
  BiFilter, BiKpi, BiOption, BiPoint, BiSnapshot, BiTab, DashboardBiHttpAdapter,
} from '../../../../../adapter/out/http/dashboard-bi-http.adapter';

type GraphKind = 'area' | 'column' | 'bar' | 'donut';
interface GraphDefinition { id: string; title: string; subtitle: string; kind: GraphKind; }
interface TabDefinition { id: BiTab; title: string; caption: string; requirement: readonly string[]; }
interface ChartView { id: string; title: string; subtitle: string; kind: GraphKind; empty: boolean; options: ApexOptions; }

const TABS: readonly TabDefinition[] = [
  { id: 'POS', title: 'Comercial y ventas', caption: '', requirement: ['VENTAS_REPORTES'] },
  { id: 'TECNICA', title: 'Gestión técnica', caption: '', requirement: ['SALIDAS_LISTAR', 'VISITAS_LISTAR', 'SANIDAD_LISTAR'] },
  { id: 'RECURSOS', title: 'Recursos e inventario', caption: '', requirement: ['INVENTARIO_LISTAR'] },
  { id: 'DOCUMENTOS', title: 'Documentos y evidencias', caption: '', requirement: ['ARCHIVOS_LISTAR', 'DOCS_LISTAR'] },
];

const GRAPHS: Record<BiTab, readonly GraphDefinition[]> = {
  POS: [
    { id: 'VENTAS_DIA', title: 'Evolución de ventas', subtitle: 'Ventas por día', kind: 'area' },
    { id: 'TOP_PRODUCTOS', title: 'Ventas por producto', subtitle: 'Productos con mayores ventas', kind: 'bar' },
    { id: 'METODOS_PAGO', title: 'Medios de pago', subtitle: 'Total por medio de pago', kind: 'donut' },
    { id: 'VENTAS_CAJA', title: 'Ventas por caja', subtitle: 'Importe por caja', kind: 'bar' },
  ],
  TECNICA: [
    { id: 'VISITAS_DIA', title: 'Cobertura de visitas', subtitle: 'Visitas por día', kind: 'area' },
    { id: 'SALIDAS_ESTADO', title: 'Estado de las salidas', subtitle: 'Salidas por estado', kind: 'donut' },
    { id: 'CASOS_SEVERIDAD', title: 'Gravedad de casos', subtitle: 'Casos por gravedad', kind: 'column' },
    { id: 'TRATAMIENTOS_PROBLEMA', title: 'Tratamientos por problema', subtitle: 'Problemas atendidos', kind: 'bar' },
  ],
  RECURSOS: [
    { id: 'FLUJO_DIA', title: 'Flujo del inventario', subtitle: 'Movimientos diarios', kind: 'area' },
    { id: 'TIPOS_MOVIMIENTO', title: 'Tipos de movimiento', subtitle: 'Movimientos por tipo', kind: 'bar' },
    { id: 'ALMACENES', title: 'Actividad por almacén', subtitle: 'Movimientos por almacén', kind: 'donut' },
    { id: 'PRODUCTOS_TOP', title: 'Productos de mayor rotación', subtitle: 'Productos con mayor movimiento', kind: 'bar' },
  ],
  DOCUMENTOS: [
    { id: 'ACTIVIDAD_DIA', title: 'Actividad documental', subtitle: 'Documentos y evidencias por día', kind: 'area' },
    { id: 'TIPOS_DOC', title: 'Tipos de documento', subtitle: 'Documentos por tipo', kind: 'bar' },
    { id: 'LECTURA_DOC', title: 'Estado de lectura', subtitle: 'Documentos recibidos', kind: 'donut' },
    { id: 'FORMATOS_EVID', title: 'Formatos de evidencia', subtitle: 'Evidencias por formato', kind: 'donut' },
  ],
};

const PALETTE = ['#2563EB', '#60A5FA', '#4F46E5', '#0891B2', '#F59E0B', '#8B5CF6', '#16A34A'];

@Component({
  selector: 'app-dashboard-bi',
  standalone: true,
  imports: [ChartComponent, ApappssPanel],
  templateUrl: './dashboard-bi.html',
  styleUrl: './dashboard-bi.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardBiPage implements OnInit, OnDestroy {
  private pending?: Subscription;
  private readonly api = inject(DashboardBiHttpAdapter);
  private readonly access = inject(AccessStore);
  private readonly theme = inject(ThemeService);
  private readonly perms = inject(PermissionService);
  private readonly convenios = inject(ConveniosModulesStore);
  readonly modo = signal<'GENERAL' | 'APAPPSS'>('GENERAL');
  readonly apappssDisponible = computed(() => this.perms.hasAll(['REPORTES_CONTROL_VER','DASHBOARD_APAPPSS_VER'])
    && this.convenios.has('COMERCIALIZACION_ASOCIATIVA'));
  readonly today = this.todayLima();
  readonly desde = signal(this.today);
  readonly hasta = signal(this.today);
  readonly tab = signal<BiTab>('POS');
  readonly almacenId = signal('');
  readonly predioId = signal('');
  readonly almacenes = signal<readonly BiOption[]>([]);
  readonly predios = signal<readonly BiOption[]>([]);
  readonly loading = signal(false);
  readonly filtersLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<BiSnapshot | null>(null);
  readonly tabs = computed(() => {
    const permitted = new Set(this.access.permissions().map(permission => permission.codigo.trim().toUpperCase()));
    return TABS.filter(item => item.requirement.every(permission => permitted.has(permission)));
  });
  readonly currentTab = computed(() => TABS.find(item => item.id === this.tab()) ?? TABS[0]);
  readonly isWarehouseTab = computed(() => this.tab() === 'POS' || this.tab() === 'RECURSOS');
  readonly isPredioTab = computed(() => this.tab() === 'TECNICA');
  readonly filterError = computed(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.desde()) || !/^\d{4}-\d{2}-\d{2}$/.test(this.hasta())) {
      return 'Ingresa fechas válidas.';
    }
    if (this.desde() > this.hasta()) return 'La fecha de inicio debe ser anterior o igual a la fecha final.';
    if (this.hasta() > this.today) return 'La fecha final no puede ser posterior a hoy.';
    if (this.dayDifference(this.desde(), this.hasta()) > 365) return 'El rango máximo es de 366 días.';
    return null;
  });
  readonly indicators = computed(() =>
    [...(this.snapshot()?.indicadores ?? [])].sort((a, b) => a.orden - b.orden),
  );
  readonly charts = computed(() => {
    const points = this.snapshot()?.puntos ?? [];
    const dark = this.theme.isDark();
    return GRAPHS[this.tab()].map(definition => this.buildChart(definition, points, dark));
  });

  ngOnInit(): void {
    const first = this.tabs()[0];
    if (!first) { if (this.apappssDisponible()) this.modo.set('APAPPSS'); return; }
    this.tab.set(first.id);
    this.fetchSegmenters();
    this.load();
  }

  selectTab(next: BiTab): void {
    if (this.tab() === next || !this.tabs().some(t => t.id === next)) return;
    this.tab.set(next);
    this.snapshot.set(null);
    this.error.set(null);
    this.load();
  }

  updateDesde(event: Event): void { this.desde.set((event.target as HTMLInputElement).value); }
  updateHasta(event: Event): void { this.hasta.set((event.target as HTMLInputElement).value); }
  updateAlmacen(event: Event): void { this.almacenId.set((event.target as HTMLSelectElement).value); }
  updatePredio(event: Event): void { this.predioId.set((event.target as HTMLSelectElement).value); }

  isActivePreset(days: number): boolean {
    return this.hasta() === this.today && this.desde() === this.offsetDate(this.today, -(days - 1));
  }

  preset(days: number): void {
    this.desde.set(this.offsetDate(this.today, -(days - 1)));
    this.hasta.set(this.today);
    this.load();
  }

  reset(): void {
    this.desde.set(this.today);
    this.hasta.set(this.today);
    this.almacenId.set('');
    this.predioId.set('');
    this.load();
  }

  load(): void {
    if (this.filterError() || !this.tabs().some(item => item.id === this.tab())) return;
    const filter: BiFilter = { tab: this.tab(), desde: this.desde(), hasta: this.hasta() };
    if (this.isWarehouseTab() && this.almacenId()) filter.almacenId = Number(this.almacenId());
    if (this.isPredioTab() && this.predioId()) filter.predioId = Number(this.predioId());
    this.pending?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pending = this.api.summary(filter).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => this.snapshot.set(result),
      error: exception => {
        this.snapshot.set(null);
        this.error.set(exception instanceof Error && !('status' in exception)
          ? exception.message : mapOpenApiError(exception).message);
      },
    });
  }

  ngOnDestroy(): void { this.pending?.unsubscribe(); }

  formattedKpi(kpi: BiKpi): string {
    const value = Number(kpi.valor ?? 0);
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: kpi.unidad === 'PEN' ? 2 : 0,
      maximumFractionDigits: kpi.unidad === 'PEN' ? 2 : kpi.unidad === 'MB' ? 1 : 0,
    }).format(value);
  }

  private fetchSegmenters(): void {
    this.filtersLoading.set(true);
    this.api.segmenters().pipe(finalize(() => this.filtersLoading.set(false))).subscribe({
      next: filters => {
        this.almacenes.set(filters.almacenes ?? []);
        this.predios.set(filters.predios ?? []);
      },
      error: () => { this.almacenes.set([]); this.predios.set([]); },
    });
  }

  private buildChart(def: GraphDefinition, points: readonly BiPoint[], dark: boolean): ChartView {
    const chartPoints = points.filter(point => point.grafico === def.id);
    const categories = [...new Map(chartPoints.map(point => [point.categoria, point.orden] as const))]
      .sort((a, b) => a[1] - b[1]).map(([category]) => category);
    const names = [...new Set(chartPoints.map(point => point.serie))];
    const colors = def.id === 'CASOS_SEVERIDAD'
      ? ['#F59E0B', '#E11D48', '#2563EB', '#4F46E5'] : PALETTE;
    const donut = def.kind === 'donut';
    const series = donut
      ? categories.map(category => chartPoints.filter(p => p.categoria === category)
          .reduce((sum, point) => sum + Number(point.valor), 0))
      : names.map(name => ({ name, data: categories.map(category =>
          Number(chartPoints.find(point => point.serie === name && point.categoria === category)?.valor ?? 0)) }));
    const type: 'donut' | 'area' | 'bar' = donut ? 'donut' : def.kind === 'area' ? 'area' : 'bar';
    const options: ApexOptions = {
      series,
      chart: {
        type, height: 310, parentHeightOffset: 0, toolbar: { show: false },
        zoom: { enabled: false }, fontFamily: 'Inter, ui-sans-serif, sans-serif',
        animations: { enabled: true, speed: 420 },
      },
      colors,
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
    return { id: def.id, title: def.title, subtitle: def.subtitle, kind: def.kind,
      empty: chartPoints.length === 0, options };
  }

  private todayLima(): string {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
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
