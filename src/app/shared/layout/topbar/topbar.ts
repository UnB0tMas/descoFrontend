import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  DestroyRef,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PermissionService } from '../../../core/access/permission.service';
import { ExcelJob, ExcelReportService } from '../../../features/reportes-control/reportes/adapter/out/http/excel-report.service';
import { ReportJobEventService } from '../../../features/reportes-control/reportes/application/service/report-job-event.service';
import { EspecialJob, EspecialReportService } from '../../../features/reportes-control/dashboard/adapter/in/ui/pages/dashboard-bi/apappss-insights.service';
import { ToastService } from '../../feedback/toast-center/toast.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faChevronDown,
  faCircleUser,
  faClockRotateLeft,
  faDisplay,
  faMoon,
  faShieldHalved,
  faSun,
  faBell,
  faFileExcel,
} from '@fortawesome/free-solid-svg-icons';

import { AccessStore } from '../../../core/access/access.store';
import { UotContextStore } from '../../../features/uot/state/uot-context.store';
import { ThemeService } from '../../../core/ui/theme.service';
import { UotContextSwitcherComponent } from '../../../features/uot/adapter/in/ui/components/uot-context-switcher/uot-context-switcher';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    RouterLink,
    FaIconComponent,
    BreadcrumbComponent,
    UotContextSwitcherComponent,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  readonly excel = inject(ExcelReportService);
  readonly especiales = inject(EspecialReportService);
  readonly perms = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly uot = inject(UotContextStore);
  private readonly events = inject(ReportJobEventService);
  private ambitoConsultado = '';
  readonly bellIcon = faBell;
  readonly excelIcon = faFileExcel;
  private readonly accessStore = inject(AccessStore);
  readonly theme = inject(ThemeService);

  @Output() menuToggle = new EventEmitter<void>();

  readonly menuIcon = faBars;
  readonly userIcon = faCircleUser;
  readonly sessionsIcon = faClockRotateLeft;
  readonly devicesIcon = faDisplay;
  readonly securityIcon = faShieldHalved;
  readonly chevronIcon = faChevronDown;
  readonly lightIcon = faSun;
  readonly darkIcon = faMoon;
  readonly user = this.accessStore.user;
  readonly mostrarReportes = computed(() => this.perms.has('REPORTES_CONTROL_VER') && this.perms.has('REPORTES_LISTAR'));
  constructor() {
    void this.events;
    effect(() => {
      const unidad = this.uot.selectedId();
      const user = this.accessStore.user();
      const autorizado = this.mostrarReportes() && this.uot.isSpecific() && unidad !== null && !!user;
      const ambito = `${user?.sesionPublicaId ?? ''}:${this.uot.modo()}:${unidad ?? ''}:${autorizado}`;
      if (!isPlatformBrowser(this.platformId) || ambito === this.ambitoConsultado) return;
      this.ambitoConsultado = ambito;
      if (!autorizado) {
        this.excel.trabajos.set([]);
        this.especiales.trabajos.set([]);
        return;
      }
      // Solo al ingresar/cambiar de UOT: recupera trabajos activos tras recargar la página.
      this.excel.actualizar().pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => console.warn('No se pudieron recuperar los reportes.') });
      this.especiales.actualizar().pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => console.warn('No se pudieron recuperar los informes.') });
    });
  }

  descargarEspecial(job: EspecialJob): void {
    this.especiales.descargar(job).subscribe({
      next: file => {
        try { this.especiales.guardar(file, job); }
        catch { this.toast.error('No se pudo descargar el informe.'); }
      },
      error: () => this.toast.error('No se pudo descargar el informe.'),
    });
  }
  descargarReporte(job: ExcelJob): void {
    this.excel.descargar(job).subscribe({
      next: file => {
        try { this.excel.guardar(file, job); }
        catch { this.toast.error('No se pudo descargar el archivo.'); }
      },
      error: () => this.toast.error('No se pudo descargar el archivo.'),
    });
  }

  readonly displayName = computed(
    () =>
      this.user()?.nombreCompleto ||
      this.user()?.nombreUsuario ||
      'Usuario DESCO',
  );

  readonly initials = computed(() =>
    this.displayName()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
}
