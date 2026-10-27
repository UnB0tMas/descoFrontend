import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faEnvelopeCircleCheck,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { ConfirmarValidacionCorreoUseCase } from '../../../../../application/use-case/confirmar-validacion-correo.use-case';
import { SolicitarValidacionCorreoUseCase } from '../../../../../application/use-case/solicitar-validacion-correo.use-case';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout';
import { AuthFlowStore } from '../../state/auth-flow.store';

@Component({
  selector: 'app-validacion-correo-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    FormErrorComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './validacion-correo.html',
  styleUrl: './validacion-correo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidacionCorreoPage {
  private readonly fb = inject(FormBuilder);
  private readonly confirmUseCase = inject(ConfirmarValidacionCorreoUseCase);
  private readonly requestUseCase = inject(SolicitarValidacionCorreoUseCase);
  private readonly flow = inject(AuthFlowStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly challenge = this.flow.challenge;

  readonly mailIcon = faEnvelopeCircleCheck;
  readonly sendIcon = faPaperPlane;
  readonly backIcon = faArrowLeft;

  readonly form = this.fb.nonNullable.group({
    nombreUsuario: [
      this.challenge()?.nombreUsuario ?? '',
      [Validators.required, Validators.maxLength(80)],
    ],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6,8}$/)]],
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.loading()) {
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    const values = this.form.getRawValue();
    const challenge = this.challenge();

    this.confirmUseCase
      .execute({
        usuarioId: challenge?.usuarioId,
        nombreUsuario: values.nombreUsuario,
        correlacionId: challenge?.correlacionId,
        codigo: values.codigo,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.flow.clearChallenge();
          this.toast.success(
            'Correo verificado',
            'Ya puedes iniciar sesión con tu cuenta.',
          );
          void this.router.navigate(['/login']);
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  resend(): void {
    const nombreUsuario = this.form.controls.nombreUsuario.value.trim();

    if (!nombreUsuario || this.resending()) {
      this.form.controls.nombreUsuario.markAsTouched();
      return;
    }

    this.resending.set(true);

    this.requestUseCase
      .execute(nombreUsuario)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: () =>
          this.toast.info(
            'Código enviado',
            'Revisa tu correo de seguridad.',
          ),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }
}
