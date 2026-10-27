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
  faKey,
  faPen,
  faSitemap,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { concatMap, finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import {
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
} from '../../../../../../../shared/forms/validators/desco-input.validators';
import {
  AdminModalResult,
  AdminSelectOption,
} from '../../../../../../administracion/shared/admin-modal.types';
import { UotApiService } from '../../../../out/http/uot-api.service';
import { UotUnit } from '../../../../../domain/uot.model';

type UotFormMode = 'create' | 'edit' | 'access';

export interface UotFormOptions {
  units: readonly UotUnit[];
  users?: readonly AdminSelectOption[];
  roles?: readonly AdminSelectOption[];
}

@Component({
  selector: 'app-uot-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
  templateUrl: './uot-form.html',
  styleUrl: './uot-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UotFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UotApiService);
  private readonly toast = inject(ToastService);

  readonly mode = signal<UotFormMode>('create');
  readonly current = signal<UotUnit | null>(null);
  readonly units = signal<readonly UotUnit[]>([]);
  readonly users = signal<readonly AdminSelectOption[]>([]);
  readonly roles = signal<readonly AdminSelectOption[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly addIcon = faSitemap;
  readonly editIcon = faPen;
  readonly accessIcon = faKey;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;

  private resolver: ((value: AdminModalResult) => void) | null = null;

  readonly unitForm = this.fb.nonNullable.group({
    uotPadreId: [0, [Validators.required, Validators.min(1)]],
    ubicacionId: [0, [Validators.min(0)]],
    codigo: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(40)],
    ],
    nombre: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(180)],
    ],
    descripcion: ['', [Validators.maxLength(500)]],
    estado: [true],
  });

  readonly accessForm = this.fb.nonNullable.group({
    usuarioId: [0, [Validators.required, Validators.min(1)]],
    rolId: [0, [Validators.required, Validators.min(1)]],
    predeterminada: [false],
  });

  openCreate(options: UotFormOptions): Promise<AdminModalResult> {
    this.prepare('create', options, null);
    const parent =
      options.units.find((item) => item.esRaiz && item.estado) ??
      options.units.find((item) => item.estado) ??
      null;

    this.unitForm.reset({
      uotPadreId: parent?.uotId ?? 0,
      ubicacionId: 0,
      codigo: '',
      nombre: '',
      descripcion: '',
      estado: true,
    });
    this.unitForm.controls.codigo.enable({ emitEvent: false });
    return this.show();
  }

  openEdit(
    unit: UotUnit,
    options: UotFormOptions,
  ): Promise<AdminModalResult> {
    this.prepare('edit', options, unit);
    this.unitForm.reset({
      uotPadreId: unit.uotPadreId ?? 0,
      ubicacionId: unit.ubicacionId ?? 0,
      codigo: unit.codigo,
      nombre: unit.nombre,
      descripcion: unit.descripcion ?? '',
      estado: unit.estado,
    });
    this.unitForm.controls.codigo.disable({ emitEvent: false });
    return this.show();
  }

  openAccess(
    unit: UotUnit,
    options: UotFormOptions,
  ): Promise<AdminModalResult> {
    this.prepare('access', options, unit);
    this.accessForm.reset({
      usuarioId: options.users?.[0]?.value ?? 0,
      rolId: options.roles?.[0]?.value ?? 0,
      predeterminada: false,
    });
    return this.show();
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  title(): string {
    if (this.mode() === 'access') return 'Asignar acceso UOT';
    return this.mode() === 'edit' ? 'Editar UOT' : 'Registrar UOT';
  }

  save(): void {
    if (this.saving()) return;

    if (this.mode() === 'access') {
      this.saveAccess();
      return;
    }

    this.saveUnit();
  }

  parentOptions(): readonly UotUnit[] {
    const currentId = this.current()?.uotId ?? null;
    return this.units().filter(
      (item) => item.estado && item.uotId !== currentId,
    );
  }

  private saveUnit(): void {
    this.unitForm.markAllAsTouched();
    if (this.unitForm.invalid) return;

    const raw = this.unitForm.getRawValue();
    const current = this.current();
    this.saving.set(true);
    this.errorMessage.set(null);

    const operation = current
      ? this.api.update(current.uotId, {
          uotPadreId:
            Number(raw.uotPadreId) > 0 ? Number(raw.uotPadreId) : undefined,
          ubicacionId:
            Number(raw.ubicacionId) > 0 ? Number(raw.ubicacionId) : undefined,
          nombre: normalizeText(raw.nombre),
          descripcion: normalizeOptionalText(raw.descripcion),
          estado: raw.estado,
        })
      : this.api.create({
          uotPadreId: Number(raw.uotPadreId),
          ubicacionId:
            Number(raw.ubicacionId) > 0 ? Number(raw.ubicacionId) : undefined,
          codigo: raw.codigo.trim().toUpperCase(),
          nombre: normalizeText(raw.nombre),
          descripcion: normalizeOptionalText(raw.descripcion),
        });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            current ? 'UOT actualizada' : 'UOT registrada',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo guardar la UOT', message);
        },
      });
  }

  private saveAccess(): void {
    this.accessForm.markAllAsTouched();
    const unit = this.current();

    if (this.accessForm.invalid || !unit) return;

    const raw = this.accessForm.getRawValue();
    const usuarioId = Number(raw.usuarioId);
    const rolId = Number(raw.rolId);

    this.saving.set(true);
    this.errorMessage.set(null);

    this.api
      .assignUser(unit.uotId, {
        usuarioId,
        predeterminada: raw.predeterminada,
      })
      .pipe(
        concatMap(() =>
          this.api.assignRole(unit.uotId, {
            usuarioId,
            rolId,
          }),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success('Acceso UOT asignado');
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo asignar el acceso', message);
        },
      });
  }

  private prepare(
    mode: UotFormMode,
    options: UotFormOptions,
    current: UotUnit | null,
  ): void {
    this.mode.set(mode);
    this.current.set(current);
    this.units.set(options.units);
    this.users.set(options.users ?? []);
    this.roles.set(options.roles ?? []);
    this.errorMessage.set(null);
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) {
      this.dialogRef.nativeElement.close();
    }
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
