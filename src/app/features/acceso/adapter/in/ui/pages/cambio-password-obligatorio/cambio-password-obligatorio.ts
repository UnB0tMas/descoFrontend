import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faKey,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessService } from '../../../../../../../core/access/access.service';
import { SessionStore } from '../../../../../../../core/session/session.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { CambiarPasswordUseCase } from '../../../../../../mi-cuenta/application/use-case/cambiar-password.use-case';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout';

@Component({
  selector: 'app-cambio-password-obligatorio-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './cambio-password-obligatorio.html',
  styleUrl: './cambio-password-obligatorio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambioPasswordObligatorioPage {
  private readonly fb = inject(FormBuilder);
  private readonly useCase = inject(CambiarPasswordUseCase);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly keyIcon = faKey;
  readonly lockIcon = faLock;
  readonly checkIcon = faCheck;

  readonly form = this.fb.nonNullable.group({
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

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.loading()) {
      return;
    }

    const values = this.form.getRawValue();

    if (values.nuevoPassword !== values.confirmarPassword) {
      this.errorMessage.set('Las contraseñas deben coincidir.');
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    this.useCase
      .execute(values)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.session.clear();
          this.access.clear();
          this.toast.success(
            'Contraseña actualizada',
            'Inicia sesión nuevamente para continuar.',
          );
          void this.router.navigate(['/login']);
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }
}
