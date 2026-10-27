import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAt,
  faCheck,
  faEnvelopeCircleCheck,
  faKey,
  faLock,
  faPaperPlane,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessService } from '../../../../../../../core/access/access.service';
import { AccessStore } from '../../../../../../../core/access/access.store';
import { SessionStore } from '../../../../../../../core/session/session.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { AppAlertService } from '../../../../../../../shared/feedback/app-alert/app-alert.service';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { ObtenerContextoActualUseCase } from '../../../../../../acceso/application/use-case/obtener-contexto-actual.use-case';
import { CambiarPasswordUseCase } from '../../../../../application/use-case/cambiar-password.use-case';
import { ConfirmarCambioCorreoUseCase } from '../../../../../application/use-case/confirmar-cambio-correo.use-case';
import { SolicitarCambioCorreoUseCase } from '../../../../../application/use-case/solicitar-cambio-correo.use-case';

@Component({
  selector: 'app-seguridad-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    FaIconComponent,
    FormErrorComponent,
    PageHeaderComponent,
  ],
  templateUrl: './seguridad.html',
  styleUrl: './seguridad.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguridadPage {
  private readonly fb = inject(FormBuilder);
  private readonly passwordUseCase = inject(CambiarPasswordUseCase);
  private readonly requestEmailUseCase = inject(SolicitarCambioCorreoUseCase);
  private readonly confirmEmailUseCase = inject(ConfirmarCambioCorreoUseCase);
  private readonly currentContextUseCase = inject(ObtenerContextoActualUseCase);
  private readonly accessStore = inject(AccessStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly accessService = inject(AccessService);
  private readonly alert = inject(AppAlertService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly passwordLoading = signal(false);
  readonly emailLoading = signal(false);
  readonly confirmEmailLoading = signal(false);
  readonly emailCodeSent = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly emailError = signal<string | null>(null);

  readonly user = this.accessStore.user;

  readonly securityIcon = faShieldHalved;
  readonly passwordIcon = faKey;
  readonly lockIcon = faLock;
  readonly mailIcon = faAt;
  readonly sendIcon = faPaperPlane;
  readonly verifyIcon = faEnvelopeCircleCheck;
  readonly checkIcon = faCheck;

  readonly passwordForm = this.fb.nonNullable.group({
    passwordActual: ['', [Validators.required, Validators.maxLength(128)]],
    nuevoPassword: [
      '',
      [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    ],
    confirmarPassword: [
      '',
      [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    ],
  });

  readonly emailForm = this.fb.nonNullable.group({
    nuevoCorreo: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    codigo: ['', [Validators.pattern(/^\d{6,8}$/)]],
  });

  async changePassword(): Promise<void> {
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid || this.passwordLoading()) {
      return;
    }

    const values = this.passwordForm.getRawValue();

    if (values.nuevoPassword !== values.confirmarPassword) {
      this.passwordError.set('Las contraseñas deben coincidir.');
      return;
    }

    const confirmation = await this.alert.question(
      'Cambiar contraseña',
      'Al guardar el cambio deberás iniciar sesión nuevamente.',
      'Cambiar contraseña',
      'Cancelar',
    );

    if (!confirmation.confirmed) {
      return;
    }

    this.passwordError.set(null);
    this.passwordLoading.set(true);

    this.passwordUseCase
      .execute(values)
      .pipe(finalize(() => this.passwordLoading.set(false)))
      .subscribe({
        next: () => {
          this.sessionStore.clear();
          this.accessService.clear();
          this.toast.success(
            'Contraseña actualizada',
            'Inicia sesión nuevamente para continuar.',
          );
          void this.router.navigate(['/login']);
        },
        error: (error) =>
          this.passwordError.set(mapOpenApiError(error).message),
      });
  }

  requestEmailChange(): void {
    this.emailForm.controls.nuevoCorreo.markAsTouched();

    if (
      this.emailForm.controls.nuevoCorreo.invalid ||
      this.emailLoading()
    ) {
      return;
    }

    this.emailError.set(null);
    this.emailLoading.set(true);

    this.requestEmailUseCase
      .execute({
        nuevoCorreo: this.emailForm.controls.nuevoCorreo.value.trim(),
      })
      .pipe(finalize(() => this.emailLoading.set(false)))
      .subscribe({
        next: () => {
          this.emailCodeSent.set(true);
          this.toast.info(
            'Código enviado',
            'Revisa el nuevo correo para confirmar el cambio.',
          );
        },
        error: (error) =>
          this.emailError.set(mapOpenApiError(error).message),
      });
  }

  confirmEmailChange(): void {
    const codeControl = this.emailForm.controls.codigo;
    codeControl.addValidators([
      Validators.required,
      Validators.pattern(/^\d{6,8}$/),
    ]);
    codeControl.updateValueAndValidity();
    codeControl.markAsTouched();

    if (codeControl.invalid || this.confirmEmailLoading()) {
      return;
    }

    this.emailError.set(null);
    this.confirmEmailLoading.set(true);

    this.confirmEmailUseCase
      .execute({ codigo: codeControl.value })
      .pipe(finalize(() => this.confirmEmailLoading.set(false)))
      .subscribe({
        next: () => {
          this.emailCodeSent.set(false);
          this.emailForm.reset();
          this.toast.success(
            'Correo actualizado',
            'El nuevo correo quedó confirmado.',
          );

          this.currentContextUseCase.execute().subscribe({
            error: () => undefined,
          });
        },
        error: (error) =>
          this.emailError.set(mapOpenApiError(error).message),
      });
  }
}
