import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faEye,
  faEyeSlash,
  faLock,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { LoginUseCase } from '../../../../../application/use-case/login.use-case';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout';
import { AuthFlowStore } from '../../state/auth-flow.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    FormErrorComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly flow = inject(AuthFlowStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly passwordVisible = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly userIcon = faUser;
  readonly lockIcon = faLock;
  readonly continueIcon = faArrowRight;
  readonly eyeIcon = faEye;
  readonly eyeSlashIcon = faEyeSlash;

  readonly form = this.fb.nonNullable.group({
    nombreUsuario: [
      '',
      [
        Validators.required,
        Validators.maxLength(80),
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.maxLength(128),
      ],
    ],
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.loading()) {
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    this.loginUseCase
      .execute(this.form.getRawValue())
      .pipe(
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (
            result.paso ===
            'EMAIL_VERIFICATION_REQUIRED'
          ) {
            this.flow.setChallenge(result.desafio);
            this.toast.info(
              'Verifica tu correo',
              'Ingresa el código enviado a tu correo de seguridad.',
            );
            void this.router.navigate([
              '/validacion-correo',
            ]);
            return;
          }

          if (
            result.paso ===
            'TWO_FACTOR_REQUIRED'
          ) {
            this.flow.setChallenge(result.desafio);
            this.toast.info(
              'Verificación adicional',
              'Te enviamos un código de seguridad para completar el acceso.',
            );
            void this.router.navigate([
              '/segundo-factor',
            ]);
            return;
          }

          this.flow.clear();

          if (
            result.contexto?.usuario
              .requiereCambioPassword
          ) {
            this.toast.success(
              'Credenciales verificadas',
              'Actualiza tu contraseña para terminar de configurar el acceso.',
            );
            void this.router.navigate([
              '/cambio-password-obligatorio',
            ]);
            return;
          }

          this.toast.success(
            'Bienvenido',
            'Inicio de sesión exitoso.',
          );

          void this.router.navigate(['/inicio']);
        },
        error: (error: unknown) => {
          const message =
            mapOpenApiError(error).message;

          this.errorMessage.set(message);
          this.toast.error(
            'No se pudo iniciar sesión',
            message,
          );
        },
      });
  }
}
