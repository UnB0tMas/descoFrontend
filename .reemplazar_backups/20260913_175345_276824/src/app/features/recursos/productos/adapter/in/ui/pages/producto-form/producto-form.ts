import { NgTemplateOutlet } from '@angular/common';
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
  faCoins,
  faFloppyDisk,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { ResourceProductResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductResponse';
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
import { ResourceApiService } from '../../../../../../shared/resource-api.service';

type ProductFormMode = 'create' | 'price';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent, NgTemplateOutlet],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ResourceApiService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<ProductFormMode>('create');
  readonly current = signal<ResourceProductResponse | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly addIcon = faPlus;
  readonly priceIcon = faCoins;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly createForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    codigo: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(60)],
    ],
    nombre: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(180)],
    ],
    descripcion: ['', [Validators.maxLength(500)]],
    unidadMedida: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(40)],
    ],
    categoria: ['', [Validators.maxLength(100)]],
  });

  readonly priceForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    alcance: ['UOT' as 'UOT' | 'GLOBAL'],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['PEN', [Validators.required, Validators.maxLength(3)]],
  });

  openCreate(): Promise<AdminModalResult> {
    this.mode.set('create');
    this.current.set(null);
    this.errorMessage.set(null);
    this.createForm.reset({
      uotContextoId: this.uot.selectedId() ?? this.uot.memberships()[0]?.uotId ?? 0,
      codigo: '',
      nombre: '',
      descripcion: '',
      unidadMedida: '',
      categoria: '',
    });
    return this.show();
  }

  openPrice(item: ResourceProductResponse): Promise<AdminModalResult> {
    this.mode.set('price');
    this.current.set(item);
    this.errorMessage.set(null);
    this.priceForm.reset({
      uotContextoId: this.uot.selectedId() ?? this.uot.memberships()[0]?.uotId ?? 0,
      alcance: 'UOT',
      precio: item.precioVenta ?? 0,
      moneda: item.moneda ?? 'PEN',
    });
    return this.show();
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    if (this.mode() === 'price') {
      this.savePrice();
      return;
    }
    this.saveProduct();
  }

  private saveProduct(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid || this.saving()) return;

    const raw = this.createForm.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);

    this.api
      .createProduct({
        uotContextoId: Number(raw.uotContextoId),
        codigo: raw.codigo.trim().toUpperCase(),
        nombre: normalizeText(raw.nombre),
        descripcion: normalizeOptionalText(raw.descripcion),
        unidadMedida: raw.unidadMedida.trim().toUpperCase(),
        categoria: normalizeOptionalText(raw.categoria),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Producto registrado');
          this.finish({ saved: true, value: null });
        },
        error: (error) => this.fail(error),
      });
  }

  private savePrice(): void {
    const product = this.current();
    this.priceForm.markAllAsTouched();

    if (!product?.productoId || this.priceForm.invalid || this.saving()) return;

    const raw = this.priceForm.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);

    this.api
      .versionProductPrice(product.productoId, {
        uotContextoId: Number(raw.uotContextoId),
        uotPrecioId: raw.alcance === 'UOT' ? Number(raw.uotContextoId) : undefined,
        precio: Number(raw.precio),
        moneda: raw.moneda.trim().toUpperCase(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Nueva versión de precio registrada');
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
  }
}
