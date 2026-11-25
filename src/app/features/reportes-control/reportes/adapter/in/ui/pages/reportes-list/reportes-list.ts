import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileExcel, faDownload, faRotate, faClock, faFilter, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { forkJoin, finalize } from 'rxjs';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { ExcelReportService } from '../../../../../adapter/out/http/excel-report.service';
import type { ExcelJob, ExcelReport, ReportArea, SelectOption } from '../../../../../adapter/out/http/excel-report.service';
import { EspecialReportService } from '../../../../../../dashboard/adapter/in/ui/pages/dashboard-bi/apappss-insights.service';
import { EspecialReportPanel } from './especial-report';

const AREAS: readonly { id: ReportArea; nombre: string; permisos: readonly string[] }[] = [
  { id: 'POS', nombre: 'Comercial y ventas', permisos: ['VENTAS_REPORTES'] },
  { id: 'TECNICA', nombre: 'Gestión técnica', permisos: ['VISITAS_LISTAR', 'SALIDAS_LISTAR', 'SANIDAD_LISTAR'] },
  { id: 'RECURSOS', nombre: 'Recursos e inventario', permisos: ['INVENTARIO_LISTAR'] },
  { id: 'DOCUMENTOS', nombre: 'Documentos y evidencias', permisos: ['ARCHIVOS_LISTAR', 'DOCS_LISTAR'] },
];
@Component({
  selector: 'app-reportes-list-page', standalone: true,
  imports: [FaIconComponent, PageHeaderComponent, EspecialReportPanel],
  templateUrl: './reportes-list.html', styleUrl: './reportes-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesListPage implements OnInit {
  readonly excel = inject(ExcelReportService);
  readonly especiales = inject(EspecialReportService);
  readonly vistaSanidad = signal(false);
  readonly catalogoEspecial = signal<readonly {codigo:string;grupo:string}[]>([]);
  readonly tieneSanidad = computed(() => this.catalogoEspecial().some(r => r.codigo === 'TEC_SANIDAD_DOC'));
  private readonly perms = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly pageIcon = faFileExcel;
  readonly downloadIcon = faDownload;
  readonly reloadIcon = faRotate;
  readonly clockIcon = faClock;
  readonly checkIcon = faCheckCircle;
  readonly filterIcon = faFilter;
  readonly today = this.limaToday();
  readonly inicio = signal(this.today);
  readonly fin = signal(this.today);
  readonly almacen = signal('');
  readonly predio = signal('');
  readonly almacenes = signal<readonly SelectOption[]>([]);
  readonly predios = signal<readonly SelectOption[]>([]);
  readonly catalogo = signal<readonly ExcelReport[]>([]);
  readonly area = signal<ReportArea | 'APAPPSS'>('POS');
  readonly elegido = signal('');
  readonly cargando = signal(true);
  readonly generando = signal(false);
  readonly error = signal<string | null>(null);
  readonly tabs = computed(() => [
    ...AREAS.filter(a => a.permisos.some(p => this.perms.has(p)) && this.catalogo().some(r => r.grupo === a.id)),
    ...(this.perms.has('REPORTES_APAPPSS_VER') && this.catalogoEspecial().some(r => r.grupo === 'APAPPSS')
      ? [{id: 'APAPPSS' as const, nombre: 'APAPPSS', permisos: ['REPORTES_APAPPSS_VER']}] : []),
  ]);
  readonly actuales = computed(() => this.catalogo().filter(r => r.grupo === this.area()));
  readonly reportesRecientes = computed(() => this.excel.trabajos());
  readonly filtraAlmacen = computed(() => this.area() === 'POS' || this.area() === 'RECURSOS');
  readonly filtraPredio = computed(() => this.area() === 'TECNICA');
  readonly puedeExportar = computed(() => this.perms.has('REPORTES_EXPORTAR'));
  readonly invalid = computed(() => !this.elegido() || !this.inicio() || !this.fin()
      || this.inicio() > this.fin() || this.fin() > this.today
      || (Date.parse(this.fin() + 'T00:00:00Z') - Date.parse(this.inicio() + 'T00:00:00Z')) / 86400000 > 366);

  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    this.cargando.set(true); this.error.set(null);
    forkJoin({ catalogo: this.excel.catalogo(), segmentos: this.excel.segmentadores(), trabajos: this.excel.actualizar(),
      especiales: this.especiales.catalogo() })
      .pipe(finalize(() => this.cargando.set(false))).subscribe({
        next: result => {
          this.catalogo.set(result.catalogo);
          this.catalogoEspecial.set(result.especiales);
          this.almacenes.set(result.segmentos.almacenes);
          this.predios.set(result.segmentos.predios);
          const first = AREAS.find(a => result.catalogo.some(r => r.grupo === a.id));
          if (first) this.cambiarArea(first.id);
          else if (result.especiales.some(r => r.grupo === 'APAPPSS')) this.cambiarArea('APAPPSS');
        }, error: () => this.error.set('No se pudo cargar la información.'),
      });
  }
  cambiarArea(value: ReportArea | 'APAPPSS'): void {
    if (value === 'APAPPSS') {
      if (!this.catalogoEspecial().some(r=>r.grupo==='APAPPSS')) return;
      this.area.set(value); this.vistaSanidad.set(false);return;
    }
    if (!this.catalogo().some(r => r.grupo === value)) return;
    this.area.set(value); this.vistaSanidad.set(false);
    this.elegido.set(this.catalogo().find(r => r.grupo === value)?.codigo ?? '');
    this.almacen.set(''); this.predio.set('');
  }
  seleccionar(codigo: string): void { this.elegido.set(codigo); }
  desde(event: Event): void { this.inicio.set((event.target as HTMLInputElement).value); }
  hasta(event: Event): void { this.fin.set((event.target as HTMLInputElement).value); }
  seleccionarAlmacen(event: Event): void { this.almacen.set((event.target as HTMLSelectElement).value); }
  seleccionarPredio(event: Event): void { this.predio.set((event.target as HTMLSelectElement).value); }
  periodo(dias: number): void {
    const d = new Date(this.today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - dias + 1);
    this.inicio.set(d.toISOString().slice(0,10)); this.fin.set(this.today);
  }
  generar(): void {
    if (this.invalid() || this.generando() || !this.puedeExportar()) return;
    this.generando.set(true);
    const key = crypto.randomUUID();
    this.excel.generar({ codigo: this.elegido(), desde: this.inicio(), hasta: this.fin(),
      ...(this.filtraAlmacen() && this.almacen() ? { almacenId: Number(this.almacen()) } : {}),
      ...(this.filtraPredio() && this.predio() ? { predioId: Number(this.predio()) } : {}), clave: key })
      .pipe(finalize(() => this.generando.set(false))).subscribe({
        next: () => { this.toast.info('Reporte en preparación', 'Puedes seguir trabajando.'); this.actualizarTrabajos(); },
        error: () => this.toast.error('No se pudo generar el reporte.'),
      });
  }
  actualizarTrabajos(): void { this.excel.actualizar().subscribe({ error: () => {} }); }
  descargar(job: ExcelJob): void {
    if (job.estado !== 'LISTO') return;
    this.excel.descargar(job).subscribe({
      next: file => {
        try { this.excel.guardar(file, job); }
        catch { this.toast.error('No se pudo descargar el archivo.'); }
      },
      error: () => this.toast.error('No se pudo descargar el archivo.'),
    });
  }
  private limaToday(): string {
    const pieces = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (kind: string) => pieces.find(p => p.type === kind)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
}
