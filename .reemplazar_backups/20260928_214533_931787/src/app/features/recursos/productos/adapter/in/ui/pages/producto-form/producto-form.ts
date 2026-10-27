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
import { faCoins, faFloppyDisk, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ResourceProductDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductDetailResponse';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { normalizeOptionalText, normalizeText, notBlankValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';

type ProductFormMode = 'create' | 'price';
type ProductPriceTarget = ResourceProductListItemResponse | ResourceProductDetailResponse;

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent, NgTemplateOutlet],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoFormComponent {
  @ViewChild('dialog', { static: true }) private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ResourceApiService);
  private readonly refs = inject(ReferenceDataService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<ProductFormMode>('create');
  readonly current = signal<ProductPriceTarget | null>(null);
  readonly saving = signal(false);
  readonly codeLoading = signal(false);
  readonly referencesLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly units = signal<readonly { code: string; label: string }[]>([]);
  readonly categories = signal<readonly { code: string; label: string }[]>([]);
  readonly currencies = signal<readonly { code: string; label: string }[]>([]);

  readonly addIcon = faPlus;
  readonly priceIcon = faCoins;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly createForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    codigo: ['', [Validators.maxLength(50)]],
    nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(180)]],
    descripcion: ['', [Validators.maxLength(700)]],
    unidadMedida: ['', [Validators.required, notBlankValidator, Validators.maxLength(20)]],
    categoria: ['', [Validators.maxLength(40)]],
  });

  readonly priceForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['PEN', [Validators.required, Validators.maxLength(3)]],
  });

  openCreate(preferredUotId?: number): Promise<AdminModalResult> {
    this.mode.set('create');
    this.current.set(null);
    this.errorMessage.set(null);
    this.createForm.reset({
      uotContextoId: this.resolveCreateUotId(preferredUotId),
      codigo: '', nombre: '', descripcion: '', unidadMedida: '', categoria: '',
    });
    this.createForm.controls.uotContextoId[this.uot.modo() === 'ESPECIFICA' ? 'disable' : 'enable']({ emitEvent: false });
    this.loadReferences();
    this.loadSuggestedCode(true);
    return this.show();
  }

  openPrice(item: ProductPriceTarget, uotId: number): Promise<AdminModalResult> {
    this.mode.set('price');
    this.current.set(item);
    this.errorMessage.set(null);
    this.priceForm.reset({
      uotContextoId: uotId,
      precio: item.precioVigente ?? 0,
      moneda: item.moneda ?? 'PEN',
    });
    this.priceForm.controls.uotContextoId.disable({ emitEvent: false });
    this.loadReferences();
    return this.show();
  }

  availableUnits() { return this.uot.memberships(); }
  onCreateUotChange(): void { this.loadSuggestedCode(true); }

  uotLabel(form: 'create' | 'price' = 'create'): string {
    const id = form === 'price'
      ? Number(this.priceForm.getRawValue().uotContextoId)
      : Number(this.createForm.getRawValue().uotContextoId);
    return this.uot.memberships().find((unit) => unit.uotId === id)?.nombre ?? 'UOT no seleccionada';
  }

  close(): void { if (!this.saving()) this.finish({ saved: false, value: null }); }
  save(): void { this.mode() === 'price' ? this.savePrice() : this.saveProduct(); }

  private saveProduct(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid || this.saving() || this.referencesLoading()) return;
    const raw = this.createForm.getRawValue();
    if (Number(raw.uotContextoId) <= 0) { this.errorMessage.set('Seleccione una UOT antes de guardar.'); return; }
    this.saving.set(true); this.errorMessage.set(null);
    this.api.createProduct({
      uotContextoId: Number(raw.uotContextoId),
      codigo: raw.codigo.trim().toUpperCase() || undefined,
      nombre: normalizeText(raw.nombre),
      descripcion: normalizeOptionalText(raw.descripcion),
      unidadMedida: raw.unidadMedida.trim().toUpperCase(),
      categoria: raw.categoria.trim().toUpperCase() || undefined,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.toast.success('Producto registrado'); this.finish({ saved: true, value: null }); },
      error: (error) => this.fail(error),
    });
  }

  private savePrice(): void {
    const product = this.current();
    this.priceForm.markAllAsTouched();
    if (!product?.productoId || this.priceForm.invalid || this.saving() || this.referencesLoading()) return;
    const raw = this.priceForm.getRawValue();
    if (Number(raw.uotContextoId) <= 0) { this.errorMessage.set('Seleccione una UOT antes de guardar.'); return; }
    this.saving.set(true); this.errorMessage.set(null);
    this.api.versionProductPrice(product.productoId, {
      uotContextoId: Number(raw.uotContextoId),
      uotPrecioId: Number(raw.uotContextoId),
      precio: Number(raw.precio),
      moneda: raw.moneda.trim().toUpperCase(),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.toast.success('Nueva versión de precio registrada'); this.finish({ saved: true, value: null }); },
      error: (error) => this.fail(error),
    });
  }

  private loadReferences(): void {
    if (this.referencesLoading()) return;
    this.referencesLoading.set(true);
    forkJoin({
      units: this.refs.catalog('UNIDAD_MEDIDA'),
      categories: this.refs.catalog('CATEGORIA_PRODUCTO'),
      currencies: this.refs.catalog('MONEDA'),
    }).pipe(finalize(() => this.referencesLoading.set(false))).subscribe({
      next: ({ units, categories, currencies }) => {
        this.units.set(units.map((item) => ({ code: item.code, label: item.label })));
        this.categories.set(categories.map((item) => ({ code: item.code, label: item.label })));
        this.currencies.set(currencies.map((item) => ({ code: item.code, label: item.label })));
        if (this.mode() === 'create' && !this.createForm.controls.unidadMedida.value) {
          this.createForm.controls.unidadMedida.setValue(this.units()[0]?.code ?? 'UND');
        }
        const currency = this.priceForm.controls.moneda.value;
        if (!this.currencies().some((item) => item.code === currency)) {
          this.priceForm.controls.moneda.setValue(this.currencies()[0]?.code ?? 'PEN');
        }
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }

  private resolveCreateUotId(preferredUotId?: number): number {
    if (this.uot.isSpecific()) {
      return this.uot.selectedId() ?? 0;
    }

    return preferredUotId && preferredUotId > 0 ? preferredUotId : 0;
  }

  private loadSuggestedCode(force = false): void {
    const uotId = Number(this.createForm.getRawValue().uotContextoId);
    const control = this.createForm.controls.codigo;
    if (uotId <= 0) { if (force) control.setValue('', { emitEvent: false }); return; }
    if (!force && control.dirty && control.value.trim()) return;
    this.codeLoading.set(true);
    this.api.suggestCode(uotId, 'PRODUCTO').pipe(finalize(() => this.codeLoading.set(false))).subscribe({
      next: (code) => { if (code) { control.setValue(code, { emitEvent: false }); control.markAsPristine(); } },
      error: () => { if (force) { control.setValue('', { emitEvent: false }); control.markAsPristine(); } },
    });
  }

  private fail(error: unknown): void {
    const message = mapOpenApiError(error).message;
    this.errorMessage.set(message); this.toast.error('No se pudo completar la operación', message);
  }
  private show(): Promise<AdminModalResult> { this.dialogRef.nativeElement.showModal(); return new Promise((resolve) => { this.resolver = resolve; }); }
  private finish(result: AdminModalResult): void { if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close(); this.resolver?.(result); this.resolver = null; this.current.set(null); }
}
