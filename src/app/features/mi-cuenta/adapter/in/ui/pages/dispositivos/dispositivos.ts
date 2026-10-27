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
  faCheck,
  faClock,
  faComputer,
  faLocationDot,
  faRotate,
  faShieldHalved,
  faShieldVirus,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { AppAlertService } from '../../../../../../../shared/feedback/app-alert/app-alert.service';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { ListarDispositivosUseCase } from '../../../../../application/use-case/listar-dispositivos.use-case';
import { QuitarReconocimientoDispositivoUseCase } from '../../../../../application/use-case/quitar-reconocimiento-dispositivo.use-case';
import { ReconocerDispositivoUseCase } from '../../../../../application/use-case/reconocer-dispositivo.use-case';
import { DispositivoCuenta } from '../../../../../domain/dispositivo.model';

@Component({
  selector: 'app-dispositivos-page',
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
  templateUrl: './dispositivos.html',
  styleUrl: './dispositivos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DispositivosPage implements OnInit {
  private readonly listUseCase = inject(ListarDispositivosUseCase);
  private readonly recognizeUseCase = inject(ReconocerDispositivoUseCase);
  private readonly removeRecognitionUseCase = inject(
    QuitarReconocimientoDispositivoUseCase,
  );
  private readonly alert = inject(AppAlertService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly devices = signal<readonly DispositivoCuenta[]>([]);
  readonly processingId = signal<number | null>(null);

  readonly pageIcon = faComputer;
  readonly deviceIcon = faComputer;
  readonly shieldIcon = faShieldHalved;
  readonly untrustedIcon = faShieldVirus;
  readonly locationIcon = faLocationDot;
  readonly clockIcon = faClock;
  readonly checkIcon = faCheck;
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
        next: (devices) => this.devices.set(devices),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  async toggleRecognition(device: DispositivoCuenta): Promise<void> {
    if (this.processingId()) {
      return;
    }

    const recognize = !device.reconocidoVigente;
    const result = await this.alert.question(
      recognize ? 'Reconocer dispositivo' : 'Quitar reconocimiento',
      recognize
        ? `¿Deseas reconocer ${this.deviceName(device)}?`
        : `¿Deseas quitar el reconocimiento de ${this.deviceName(device)}?`,
      recognize ? 'Reconocer' : 'Quitar',
      'Cancelar',
    );

    if (!result.confirmed) {
      return;
    }

    this.processingId.set(device.dispositivoUsuarioId);

    const operation = recognize
      ? this.recognizeUseCase.execute(device.dispositivoUsuarioId)
      : this.removeRecognitionUseCase.execute(device.dispositivoUsuarioId);

    operation
      .pipe(finalize(() => this.processingId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(
            recognize ? 'Dispositivo reconocido' : 'Reconocimiento retirado',
          );
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo actualizar el dispositivo',
            mapOpenApiError(error).message,
          ),
      });
  }

  deviceName(device: DispositivoCuenta): string {
    return `${device.navegador || 'Navegador'} · ${
      device.sistemaOperativo || 'Dispositivo'
    }`;
  }
}
