import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faFloppyDisk,
  faShieldHalved,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { closeAnimatedDialog, openAnimatedDialog } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { ActualizarPoliticaSeguridadUseCase } from '../../../../../application/use-case/actualizar-politica-seguridad.use-case';
import { PoliticaSeguridadDispositivo } from '../../../../../domain/politica-seguridad.model';

@Component({
  selector: 'app-politica-seguridad-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
  templateUrl: './politica-seguridad-form.html',
  styleUrl: './politica-seguridad-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaSeguridadFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly updateUseCase = inject(ActualizarPoliticaSeguridadUseCase);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly shieldIcon = faShieldHalved;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;

  readonly form = this.fb.nonNullable.group({
    diasDispositivoReconocido: [
      7,
      [Validators.required, Validators.min(1), Validators.max(365)],
    ],
  });

  private resolver: ((saved: boolean) => void) | null = null;
  private closing = false;

  open(policy: PoliticaSeguridadDispositivo): Promise<boolean> {
    this.errorMessage.set(null);
    this.form.reset({
      diasDispositivoReconocido: policy.diasDispositivoReconocido || 7,
    });
    this.closing = false;
    openAnimatedDialog(this.dialogRef.nativeElement);

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.saving() || this.closing) {
      return;
    }

    const days = Number(this.form.controls.diasDispositivoReconocido.value);
    this.saving.set(true);
    this.errorMessage.set(null);

    this.updateUseCase
      .execute(days)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Política de acceso actualizada');
          this.finish(true);
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo actualizar la política', message);
        },
      });
  }

  close(): void {
    if (!this.saving() && !this.closing) {
      this.finish(false);
    }
  }

  private finish(saved: boolean): void {
    if (this.closing) return;
    this.closing = true;

    closeAnimatedDialog(this.dialogRef.nativeElement, () => {
      this.resolver?.(saved);
      this.resolver = null;
      this.errorMessage.set(null);
      this.closing = false;
    });
  }
}
