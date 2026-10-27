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
  faEnvelope,
  faKey,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { SolicitarRecuperacionPasswordUseCase } from '../../../../../application/use-case/solicitar-recuperacion-password.use-case';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout';
import { AuthFlowStore } from '../../state/auth-flow.store';

@Component({
  selector: 'app-recuperar-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    FormErrorComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './recuperar-password.html',
  styleUrl: './recuperar-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly useCase = inject(SolicitarRecuperacionPasswordUseCase);
  private readonly flow = inject(AuthFlowStore);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly keyIcon = faKey;
  readonly userIcon = faUser;
  readonly mailIcon = faEnvelope;
  readonly backIcon = faArrowLeft;

  readonly form = this.fb.nonNullable.group({
    nombreUsuario: ['', [Validators.required, Validators.maxLength(80)]],
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.loading()) {
      return;
    }

    const nombreUsuario = this.form.controls.nombreUsuario.value.trim();
    this.errorMessage.set(null);
    this.loading.set(true);

    this.useCase
      .execute(nombreUsuario)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.flow.setRecoveryUser(nombreUsuario);
          void this.router.navigate(['/restablecer-password'], {
            queryParams: { usuario: nombreUsuario },
          });
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }
}
