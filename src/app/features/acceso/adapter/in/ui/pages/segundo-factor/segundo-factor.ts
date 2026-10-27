import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
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
  faArrowLeft,
  faEnvelope,
  faRotateRight,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { SolicitarSegundoFactorUseCase } from '../../../../../application/use-case/solicitar-segundo-factor.use-case';
import { VerificarSegundoFactorUseCase } from '../../../../../application/use-case/verificar-segundo-factor.use-case';
import { AuthLayoutComponent } from '../../layout/auth-layout/auth-layout';
import { AuthFlowStore } from '../../state/auth-flow.store';

@Component({
  selector: 'app-segundo-factor-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    FormErrorComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './segundo-factor.html',
  styleUrl: './segundo-factor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegundoFactorPage
  implements OnInit
{
  @ViewChildren('otpInput')
  private readonly otpInputs!:
    QueryList<ElementRef<HTMLInputElement>>;

  private readonly fb = inject(FormBuilder);
  private readonly verifyUseCase =
    inject(VerificarSegundoFactorUseCase);
  private readonly requestUseCase =
    inject(SolicitarSegundoFactorUseCase);
  private readonly flow = inject(AuthFlowStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly errorMessage =
    signal<string | null>(null);
  readonly challenge = this.flow.challenge;

  readonly otpIndexes =
    [0, 1, 2, 3, 4, 5] as const;

  readonly shieldIcon = faShieldHalved;
  readonly mailIcon = faEnvelope;
  readonly backIcon = faArrowLeft;
  readonly resendIcon = faRotateRight;

  readonly form =
    this.fb.nonNullable.group({
      codigo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{6}$/),
        ],
      ],
    });

  ngOnInit(): void {
    const challenge = this.challenge();

    if (
      !challenge?.usuarioId ||
      !challenge.correlacionId
    ) {
      void this.router.navigate(['/login']);
    }
  }

  digitAt(index: number): string {
    return this.form.controls.codigo
      .value
      .charAt(index);
  }

  onDigitInput(
    event: Event,
    index: number,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const raw =
      input.value.replace(/\D/g, '');

    if (raw.length > 1) {
      this.applyCode(raw);
      return;
    }

    const digit = raw.slice(-1);
    const digits = this.currentDigits();

    digits[index] = digit;

    this.form.controls.codigo.setValue(
      digits.join(''),
    );

    input.value = digit;

    if (
      digit &&
      index < this.otpIndexes.length - 1
    ) {
      this.focusInput(index + 1);
    }
  }

  onDigitKeydown(
    event: KeyboardEvent,
    index: number,
  ): void {
    const input =
      event.target as HTMLInputElement;

    if (
      event.key === 'Backspace' &&
      !input.value &&
      index > 0
    ) {
      event.preventDefault();

      const digits = this.currentDigits();
      digits[index - 1] = '';

      this.form.controls.codigo.setValue(
        digits.join(''),
      );

      this.focusInput(index - 1);
      return;
    }

    if (
      event.key === 'ArrowLeft' &&
      index > 0
    ) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }

    if (
      event.key === 'ArrowRight' &&
      index <
        this.otpIndexes.length - 1
    ) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const clipboard =
      event.clipboardData
        ?.getData('text') ?? '';

    const code =
      clipboard
        .replace(/\D/g, '')
        .slice(0, 6);

    if (!code) {
      return;
    }

    event.preventDefault();
    this.applyCode(code);
  }

  submit(): void {
    this.form.markAllAsTouched();

    const challenge = this.challenge();

    if (
      this.form.invalid ||
      this.loading() ||
      this.resending() ||
      !challenge?.usuarioId ||
      !challenge.correlacionId
    ) {
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    this.verifyUseCase
      .execute({
        usuarioId: challenge.usuarioId,
        correlacionId:
          challenge.correlacionId,
        codigo:
          this.form.controls.codigo.value,
      })
      .pipe(
        finalize(() =>
          this.loading.set(false),
        ),
      )
      .subscribe({
        next: (result) => {
          this.flow.clearChallenge();

          this.toast.success(
            'Acceso verificado',
            'El código es correcto y tu sesión se inició correctamente.',
          );

          if (
            result.contexto?.usuario
              .requiereCambioPassword
          ) {
            void this.router.navigate([
              '/cambio-password-obligatorio',
            ]);
            return;
          }

          void this.router.navigate(['/inicio']);
        },
        error: (error: unknown) => {
          const message =
            mapOpenApiError(error).message;

          this.errorMessage.set(message);
          this.toast.error(
            'Código no válido',
            message,
          );

          this.selectFirstInput();
        },
      });
  }

  resend(): void {
    const challenge = this.challenge();

    if (
      this.resending() ||
      this.loading() ||
      !challenge?.usuarioId ||
      !challenge.correlacionId
    ) {
      return;
    }

    this.errorMessage.set(null);
    this.resending.set(true);

    this.requestUseCase
      .execute({
        usuarioId: challenge.usuarioId,
        correlacionId:
          challenge.correlacionId,
      })
      .pipe(
        finalize(() =>
          this.resending.set(false),
        ),
      )
      .subscribe({
        next: (nextChallenge) => {
          this.flow.setChallenge(
            nextChallenge,
          );
          this.clearCode();

          this.toast.success(
            'Nuevo código enviado',
            'Revisa tu correo de seguridad e ingresa el último código recibido.',
          );
        },
        error: (error: unknown) => {
          const message =
            mapOpenApiError(error).message;

          this.errorMessage.set(message);
          this.toast.error(
            'No se pudo reenviar el código',
            message,
          );
        },
      });
  }

  private currentDigits(): string[] {
    const value =
      this.form.controls.codigo.value;

    return Array.from(
      {
        length:
          this.otpIndexes.length,
      },
      (_, index) =>
        value.charAt(index),
    );
  }

  private applyCode(value: string): void {
    const code =
      value
        .replace(/\D/g, '')
        .slice(0, 6);

    this.form.controls.codigo.setValue(
      code,
    );

    this.otpInputs.forEach(
      (reference, index) => {
        reference.nativeElement.value =
          code.charAt(index);
      },
    );

    this.focusInput(
      Math.min(
        code.length,
        this.otpIndexes.length - 1,
      ),
    );
  }

  private clearCode(): void {
    this.form.controls.codigo.setValue('');

    this.otpInputs.forEach(
      (reference) => {
        reference.nativeElement.value = '';
      },
    );

    this.focusInput(0);
  }

  private selectFirstInput(): void {
    const first =
      this.otpInputs.get(0)
        ?.nativeElement;

    first?.focus();
    first?.select();
  }

  private focusInput(index: number): void {
    const input =
      this.otpInputs.get(index)
        ?.nativeElement;

    input?.focus();
    input?.select();
  }
}
