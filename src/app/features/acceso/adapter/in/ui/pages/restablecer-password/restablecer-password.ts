import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faEye,
  faEyeSlash,
  faKey,
  faLock,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { RestablecerPasswordUseCase } from '../../../../../application/use-case/restablecer-password.use-case';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout';
import { AuthFlowStore } from '../../state/auth-flow.store';

@Component({
  selector: 'app-restablecer-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    FormErrorComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './restablecer-password.html',
  styleUrl: './restablecer-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly useCase = inject(RestablecerPasswordUseCase);
  private readonly flow = inject(AuthFlowStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly keyIcon = faKey;
  readonly userIcon = faUser;
  readonly lockIcon = faLock;
  readonly checkIcon = faCheck;
  readonly backIcon = faArrowLeft;
  readonly eyeIcon = faEye;
  readonly eyeSlashIcon = faEyeSlash;

  readonly form = this.fb.nonNullable.group({
    nombreUsuario: [
      this.route.snapshot.queryParamMap.get('usuario') ||
        this.flow.recoveryUser() ||
        '',
      [Validators.required, Validators.maxLength(80)],
    ],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6,8}$/)]],
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
          this.flow.clear();
          this.toast.success(
            'Contraseña actualizada',
            'Ya puedes iniciar sesión con tu nueva contraseña.',
          );
          void this.router.navigate(['/login']);
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }
}
