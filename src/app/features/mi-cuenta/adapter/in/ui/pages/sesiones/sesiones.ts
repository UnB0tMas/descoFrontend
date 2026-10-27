import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faClock,
  faComputer,
  faGlobe,
  faLocationDot,
  faRotate,
  faShieldHalved,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { AppAlertService } from '../../../../../../../shared/feedback/app-alert/app-alert.service';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { CerrarOtrasSesionesCuentaUseCase } from '../../../../../application/use-case/cerrar-otras-sesiones.use-case';
import { CerrarSesionRemotaUseCase } from '../../../../../application/use-case/cerrar-sesion-remota.use-case';
import { ListarSesionesUseCase } from '../../../../../application/use-case/listar-sesiones.use-case';
import { SesionCuenta } from '../../../../../domain/sesion.model';

@Component({
  selector: 'app-sesiones-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    RouterLinkActive,
    FaIconComponent,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './sesiones.html',
  styleUrl: './sesiones.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SesionesPage implements OnInit {
  private readonly listUseCase = inject(ListarSesionesUseCase);
  private readonly closeUseCase = inject(CerrarSesionRemotaUseCase);
  private readonly closeOthersUseCase = inject(CerrarOtrasSesionesCuentaUseCase);
  private readonly alert = inject(AppAlertService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly sessions = signal<readonly SesionCuenta[]>([]);
  readonly processingSessionId = signal<string | null>(null);
  readonly closingOthers = signal(false);

  readonly sessionIcon = faShieldHalved;
  readonly deviceIcon = faComputer;
  readonly locationIcon = faLocationDot;
  readonly globeIcon = faGlobe;
  readonly clockIcon = faClock;
  readonly closeIcon = faXmark;
  readonly refreshIcon = faRotate;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (sessions) => this.sessions.set(sessions),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  async closeSession(session: SesionCuenta): Promise<void> {
    if (
      session.sesionActual ||
      !session.activa ||
      this.processingSessionId()
    ) {
      return;
    }

    const result = await this.alert.question(
      'Cerrar sesión',
      `¿Deseas cerrar la sesión de ${this.deviceName(session)}?`,
      'Cerrar sesión',
      'Cancelar',
    );

    if (!result.confirmed) {
      return;
    }

    this.processingSessionId.set(session.sesionPublicaId);

    this.closeUseCase
      .execute(session.sesionPublicaId)
      .pipe(finalize(() => this.processingSessionId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Sesión cerrada');
          this.load();
        },
        error: (error) =>
          this.toast.error('No se pudo cerrar la sesión', mapOpenApiError(error).message),
      });
  }

  async closeOthers(): Promise<void> {
    if (this.closingOthers()) {
      return;
    }

    const result = await this.alert.question(
      'Cerrar otras sesiones',
      'Se cerrarán todas las sesiones activas excepto la actual.',
      'Cerrar otras',
      'Cancelar',
    );

    if (!result.confirmed) {
      return;
    }

    this.closingOthers.set(true);

    this.closeOthersUseCase
      .execute()
      .pipe(finalize(() => this.closingOthers.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Otras sesiones cerradas');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudieron cerrar las sesiones',
            mapOpenApiError(error).message,
          ),
      });
  }

  deviceName(session: SesionCuenta): string {
    const browser = session.navegador || 'Navegador';
    const os = session.sistemaOperativo || 'Dispositivo';

    return `${browser} · ${os}`;
  }
}
