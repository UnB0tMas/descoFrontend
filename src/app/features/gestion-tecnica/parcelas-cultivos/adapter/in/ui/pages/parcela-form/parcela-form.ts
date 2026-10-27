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
  faLayerGroup,
  faPen,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  decimalPrecisionValidator,
  normalizeText,
  notBlankValidator,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearParcelaUseCase } from '../../../../../application/use-case/crear-parcela.use-case';
import { EditarParcelaUseCase } from '../../../../../application/use-case/editar-parcela.use-case';
import { Parcela } from '../../../../../domain/parcela.model';

interface PredioOption {
  id: number;
  label: string;
  codigo: string;
}

@Component({
  selector: 'app-parcela-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
  ],
  templateUrl: './parcela-form.html',
  styleUrl: './parcela-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelaFormComponent {
  @ViewChild('dialog', { static: true })
  private dialog!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly create = inject(CrearParcelaUseCase);
  private readonly update = inject(EditarParcelaUseCase);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly current = signal<Parcela | null>(null);
  readonly options = signal<readonly PredioOption[]>([]);
  readonly error = signal<string | null>(null);

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly pageIcon = faLayerGroup;
  readonly editIcon = faPen;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;

  readonly form = this.fb.nonNullable.group({
    predioId: [0, [Validators.required, Validators.min(1)]],
    nombre: [
      '',
      [
        Validators.required,
        notBlankValidator,
        Validators.maxLength(120),
      ],
    ],
    areaHa: [
      0,
      [
        Validators.required,
        Validators.min(0.0001),
        Validators.max(999999.9999),
        decimalPrecisionValidator(6, 4),
      ],
    ],
  });

  open(
    options: readonly PredioOption[],
    current: Parcela | null = null,
  ): Promise<AdminModalResult> {
    this.current.set(current);
    this.options.set(options);
    this.error.set(null);

    this.form.reset({
      predioId: current?.predioId ?? options[0]?.id ?? 0,
      nombre: current?.nombre ?? '',
      areaHa: current?.areaHa ?? 0,
    });

    this.dialog.nativeElement.showModal();

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.saving()) {
      return;
    }

    const value = this.form.getRawValue();
    const input = {
      predioId: Number(value.predioId),
      nombre: normalizeText(value.nombre),
      areaHa: Number(value.areaHa),
    };

    this.saving.set(true);
    this.error.set(null);

    const operation: Observable<unknown> = this.current()
      ? this.update.execute(this.current()!.parcelaId, input)
      : this.create.execute(input);

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            this.current()
              ? 'Parcela actualizada'
              : 'Parcela registrada',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          this.error.set(mapOpenApiError(error).message);
        },
      });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialog.nativeElement.open) {
      this.dialog.nativeElement.close();
    }

    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.error.set(null);
  }
}
