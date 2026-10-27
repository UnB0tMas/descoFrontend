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
  faArrowRightArrowLeft,
  faBoxOpen,
  faFloppyDisk,
  faPen,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';

import { SupplySummaryResponse } from '../../../../../../../../infrastructure/openapi/generated/model/supplySummaryResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { SupplyApiService } from '../../../../../../shared/supply-api.service';

type SupplyFormMode = 'create' | 'edit' | 'movement';

@Component({
  selector: 'app-suministro-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
  templateUrl: './suministro-form.html',
  styleUrl: './suministro-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuministroFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SupplyApiService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<SupplyFormMode>('create');
  readonly current = signal<SupplySummaryResponse | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly addIcon = faBoxOpen;
  readonly editIcon = faPen;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    codigo: ['', [Validators.required, notBlankValidator, Validators.maxLength(40)]],
    nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(150)]],
    unidadMedida: ['', [Validators.required, notBlankValidator, Validators.maxLength(20)]],
    stockInicial: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [0, [Validators.min(0)]],
  });

  readonly movementForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    tipoMovimiento: ['ENTRADA', [Validators.required]],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    documentoReferencia: ['', [Validators.maxLength(120)]],
    observacion: ['', [Validators.maxLength(300)]],
  });

  openCreate(preferredUotId?: number): Promise<AdminModalResult> {
    this.mode.set('create');
    this.current.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      uotId: preferredUotId ?? this.uot.selectedId() ?? this.uot.memberships()[0]?.uotId ?? 0,
      codigo: '',
      nombre: '',
      unidadMedida: 'UND',
      stockInicial: 0,
      stockMinimo: 0,
    });

    if (this.uot.modo() === 'ESPECIFICA') {
      this.form.controls.uotId.disable({ emitEvent: false });
    } else {
      this.form.controls.uotId.enable({ emitEvent: false });
    }
    return this.show();
  }

  openEdit(item: SupplySummaryResponse): Promise<AdminModalResult> {
    this.mode.set('edit');
    this.current.set(item);
    this.errorMessage.set(null);
    this.form.reset({
      uotId: Number(item.uotId ?? 0),
      codigo: item.codigo ?? '',
      nombre: item.nombre ?? '',
      unidadMedida: item.unidadMedida ?? 'UND',
      stockInicial: Number(item.stockActual ?? item.stock ?? 0),
      stockMinimo: Number(item.stockMinimo ?? 0),
    });
    this.form.controls.uotId.disable({ emitEvent: false });
    this.form.controls.codigo.disable({ emitEvent: false });
    this.form.controls.stockInicial.disable({ emitEvent: false });
    return this.show();
  }

  openMovement(item: SupplySummaryResponse): Promise<AdminModalResult> {
    this.mode.set('movement');
    this.current.set(item);
    this.errorMessage.set(null);
    this.movementForm.reset({
      uotId: Number(item.uotId ?? 0),
      tipoMovimiento: 'ENTRADA',
      cantidad: 0,
      documentoReferencia: '',
      observacion: '',
    });
    this.movementForm.controls.uotId.disable({ emitEvent: false });
    return this.show();
  }

  availableUnits() {
    return this.uot.memberships();
  }

  title(): string {
    if (this.mode() === 'edit') return 'Editar suministro';
    if (this.mode() === 'movement') return 'Registrar movimiento';
    return 'Registrar suministro';
  }

  icon() {
    if (this.mode() === 'edit') return this.editIcon;
    if (this.mode() === 'movement') return this.movementIcon;
    return this.addIcon;
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    if (this.mode() === 'movement') {
      this.saveMovement();
    } else {
      this.saveSupply();
    }
  }

  private saveSupply(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const raw = this.form.getRawValue();
    const uotId = Number(raw.uotId);
    if (uotId <= 0) {
      this.errorMessage.set('Seleccione una UOT.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const operation: Observable<unknown> =
      this.mode() === 'edit' && this.current()?.suministroId
        ? this.api.update(Number(this.current()!.suministroId), {
            uotId,
            nombre: normalizeText(raw.nombre),
            unidadMedida: raw.unidadMedida.trim().toUpperCase(),
            stockMinimo: Number(raw.stockMinimo),
          })
        : this.api.create({
            uotId,
            codigo: raw.codigo.trim().toUpperCase(),
            nombre: normalizeText(raw.nombre),
            unidadMedida: raw.unidadMedida.trim().toUpperCase(),
            stockInicial: Number(raw.stockInicial),
            stockMinimo: Number(raw.stockMinimo),
          });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(this.mode() === 'edit' ? 'Suministro actualizado' : 'Suministro registrado');
          this.finish({ saved: true, value: null });
        },
        error: (error) => this.fail(error),
      });
  }

  private saveMovement(): void {
    const supply = this.current();
    this.movementForm.markAllAsTouched();
    if (!supply?.suministroId || this.movementForm.invalid || this.saving()) return;

    const raw = this.movementForm.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);

    this.api
      .registerMovement(Number(supply.suministroId), {
        uotId: Number(raw.uotId),
        tipoMovimiento: raw.tipoMovimiento,
        cantidad: Number(raw.cantidad),
        documentoReferencia: normalizeOptionalText(raw.documentoReferencia),
        observacion: normalizeOptionalText(raw.observacion),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Movimiento registrado');
          this.finish({ saved: true, value: null });
        },
        error: (error) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    const message = mapOpenApiError(error).message;
    this.errorMessage.set(message);
    this.toast.error('No se pudo completar la operación', message);
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
