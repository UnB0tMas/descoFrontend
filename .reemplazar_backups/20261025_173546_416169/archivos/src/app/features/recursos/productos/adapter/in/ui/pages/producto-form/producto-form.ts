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
import { faCoins, faFloppyDisk, faPen, faPlus, faRotate, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, Observable } from 'rxjs';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ResourceProductDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductDetailResponse';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
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

type ProductFormMode = 'create' | 'edit' | 'price' | 'state';
type ProductTarget = ResourceProductListItemResponse | ResourceProductDetailResponse;

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
  private readonly refs = inject(ReferenceDataService);
  private readonly toast = inject(ToastService);

  readonly uot = inject(UotContextStore);
  readonly mode = signal<ProductFormMode>('create');
  readonly current = signal<ProductTarget | null>(null);
  readonly saving = signal(false);
  readonly codeLoading = signal(false);
  readonly referencesLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly units = signal<readonly { code: string; label: string }[]>([]);
  readonly categories = signal<readonly { code: string; label: string }[]>([]);
  readonly currencies = signal<readonly { code: string; label: string }[]>([]);

  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly priceIcon = faCoins;
  readonly stateIcon = faRotate;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly productForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    codigo: ['', [Validators.required, notBlankValidator, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(180)]],
    descripcion: ['', [Validators.maxLength(700)]],
    unidadMedida: ['', [Validators.required, notBlankValidator, Validators.maxLength(20)]],
    categoria: ['', [Validators.maxLength(40)]],
    requiereLote: [false],
    controlaVencimiento: [false],
    precioInicial: [0, [Validators.required, Validators.min(0)]],
    precioVenta: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['PEN', [Validators.required, Validators.maxLength(3)]],
  });

  readonly priceForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    precioInicial: [0, [Validators.required, Validators.min(0)]],
    precioVenta: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['PEN', [Validators.required, Validators.maxLength(3)]],
  });

  readonly stateForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    estado: [true],
    motivo: ['', [Validators.required, notBlankValidator, Validators.maxLength(500)]],
  });

  openCreate(preferredUotId?: number): Promise<AdminModalResult> {
    this.resetState('create', null);
    this.productForm.reset({
      uotContextoId: this.resolveCreateUotId(preferredUotId),
      codigo: '', nombre: '', descripcion: '', unidadMedida: '', categoria: '',
      requiereLote: false, controlaVencimiento: false,
      precioInicial: 0, precioVenta: 0, moneda: 'PEN',
    });
    this.productForm.controls.uotContextoId[this.uot.isSpecific() ? 'disable' : 'enable']({ emitEvent: false });
    this.setCommercialControls(true);
    this.loadReferences();
    this.loadSuggestedCode(true);
    return this.show();
  }

  openEdit(item: ProductTarget, uotId?: number): Promise<AdminModalResult> {
    this.resetState('edit', item);
    this.productForm.reset({
      uotContextoId: Number(uotId ?? item.uotId ?? 0),
      codigo: item.codigo ?? '',
      nombre: item.nombre ?? '',
      descripcion: item.descripcion ?? '',
      unidadMedida: item.unidadMedidaCodigo ?? '',
      categoria: item.categoriaCodigo ?? '',
      requiereLote: item.requiereLote ?? false,
      controlaVencimiento: item.controlaVencimiento ?? false,
      precioInicial: Number(item.precioInicial ?? 0),
      precioVenta: Number(item.precioVigente ?? 0),
      moneda: item.moneda ?? 'PEN',
    });
    this.productForm.controls.uotContextoId.disable({ emitEvent: false });
    this.setCommercialControls(false);
    this.loadReferences();
    return this.show();
  }

  openPrice(item: ProductTarget, uotId: number): Promise<AdminModalResult> {
    this.resetState('price', item);
    this.priceForm.reset({
      uotContextoId: uotId,
      precioInicial: Number(item.precioInicial ?? 0),
      precioVenta: Number(item.precioVigente ?? 0),
      moneda: item.moneda ?? 'PEN',
    });
    this.priceForm.controls.uotContextoId.disable({ emitEvent: false });
    this.loadReferences();
    return this.show();
  }

  openState(item: ProductTarget, uotId?: number): Promise<AdminModalResult> {
    this.resetState('state', item);
    this.stateForm.reset({
      uotContextoId: Number(uotId ?? item.uotId ?? 0),
      estado: item.estado === false,
      motivo: '',
    });
    this.stateForm.controls.uotContextoId.disable({ emitEvent: false });
    return this.show();
  }

  availableUnits() { return this.uot.memberships(); }
  onCreateUotChange(): void { if (this.mode() === 'create') this.loadSuggestedCode(true); }
  close(): void { if (!this.saving()) this.finish({ saved: false, value: null }); }

  title(): string {
    if (this.mode() === 'edit') return 'Editar producto';
    if (this.mode() === 'price') return 'Versionar precio';
    if (this.mode() === 'state') return this.current()?.estado === false ? 'Reactivar producto' : 'Desactivar producto';
    return 'Registrar producto';
  }

  icon() {
    if (this.mode() === 'edit') return this.editIcon;
    if (this.mode() === 'price') return this.priceIcon;
    if (this.mode() === 'state') return this.stateIcon;
    return this.addIcon;
  }

  save(): void {
    if (this.mode() === 'price') { this.savePrice(); return; }
    if (this.mode() === 'state') { this.saveState(); return; }
    this.saveProduct();
  }

  private saveProduct(): void {
    const current = this.current();
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid || this.saving() || this.referencesLoading()) return;
    const raw = this.productForm.getRawValue();
    const uotId = Number(raw.uotContextoId);
    if (uotId <= 0) { this.errorMessage.set('Seleccione una UOT antes de guardar.'); return; }

    this.saving.set(true); this.errorMessage.set(null);
    const common = {
      uotContextoId: uotId,
      codigo: raw.codigo.trim().toUpperCase(),
      nombre: normalizeText(raw.nombre),
      descripcion: normalizeOptionalText(raw.descripcion),
      unidadMedida: raw.unidadMedida.trim().toUpperCase(),
      categoria: raw.categoria.trim().toUpperCase() || undefined,
    };

    const operation: Observable<unknown> =
      this.mode() === 'edit' && current?.productoId
        ? this.api.updateProduct(current.productoId, {
            ...common,
            requiereLote: raw.requiereLote,
            controlaVencimiento: raw.controlaVencimiento,
          })
        : this.api.createProduct({
            ...common,
            precioInicial: Number(raw.precioInicial),
            precioVenta: Number(raw.precioVenta),
            moneda: raw.moneda.trim().toUpperCase(),
          });

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.toast.success(this.mode() === 'edit' ? 'Producto actualizado' : 'Producto registrado'); this.finish({ saved: true, value: null }); },
      error: (error: unknown) => this.fail(error),
    });
  }

  private savePrice(): void {
    const product = this.current();
    this.priceForm.markAllAsTouched();
    if (!product?.productoId || this.priceForm.invalid || this.saving() || this.referencesLoading()) return;
    const raw = this.priceForm.getRawValue();
    const uotId = Number(raw.uotContextoId);
    if (uotId <= 0) { this.errorMessage.set('Seleccione una UOT antes de guardar.'); return; }
    this.saving.set(true); this.errorMessage.set(null);
    this.api.versionProductPrice(product.productoId, {
      uotContextoId: uotId,
      uotPrecioId: uotId,
      precioInicial: Number(raw.precioInicial),
      precioVenta: Number(raw.precioVenta),
      moneda: raw.moneda.trim().toUpperCase(),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.toast.success('Nueva versión de precio registrada'); this.finish({ saved: true, value: null }); },
      error: (error: unknown) => this.fail(error),
    });
  }

  private saveState(): void {
    const product = this.current();
    this.stateForm.markAllAsTouched();
    if (!product?.productoId || this.stateForm.invalid || this.saving()) return;
    const raw = this.stateForm.getRawValue();
    this.saving.set(true); this.errorMessage.set(null);
    this.api.changeProductState(product.productoId, {
      uotContextoId: Number(raw.uotContextoId),
      estado: raw.estado,
      motivo: normalizeText(raw.motivo),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.toast.success(raw.estado ? 'Producto reactivado' : 'Producto desactivado'); this.finish({ saved: true, value: null }); },
      error: (error: unknown) => this.fail(error),
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
        if (!this.productForm.controls.unidadMedida.value) this.productForm.controls.unidadMedida.setValue(this.units()[0]?.code ?? 'UND');
        const defaultCurrency = this.currencies()[0]?.code ?? 'PEN';
        if (!this.currencies().some((item) => item.code === this.productForm.controls.moneda.value)) this.productForm.controls.moneda.setValue(defaultCurrency);
        if (!this.currencies().some((item) => item.code === this.priceForm.controls.moneda.value)) this.priceForm.controls.moneda.setValue(defaultCurrency);
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }

  private setCommercialControls(enabled: boolean): void {
    for (const control of [this.productForm.controls.precioInicial, this.productForm.controls.precioVenta, this.productForm.controls.moneda]) {
      control[enabled ? 'enable' : 'disable']({ emitEvent: false });
    }
  }

  private resolveCreateUotId(preferredUotId?: number): number {
    if (this.uot.isSpecific()) return this.uot.selectedId() ?? 0;
    return preferredUotId && preferredUotId > 0 ? preferredUotId : 0;
  }

  private loadSuggestedCode(force = false): void {
    const uotId = Number(this.productForm.getRawValue().uotContextoId);
    const control = this.productForm.controls.codigo;
    if (uotId <= 0) { if (force) control.setValue('', { emitEvent: false }); return; }
    if (!force && control.dirty && control.value.trim()) return;
    this.codeLoading.set(true);
    this.api.suggestCode(uotId, 'PRODUCTO').pipe(finalize(() => this.codeLoading.set(false))).subscribe({
      next: (code) => { if (code) { control.setValue(code, { emitEvent: false }); control.markAsPristine(); } },
      error: () => { if (force) { control.setValue('', { emitEvent: false }); control.markAsPristine(); } },
    });
  }

  private resetState(mode: ProductFormMode, item: ProductTarget | null): void {
    this.mode.set(mode); this.current.set(item); this.errorMessage.set(null);
  }

  private fail(error: unknown): void {
    const message = mapOpenApiError(error).message;
    this.errorMessage.set(message);
    this.toast.error('No se pudo completar la operación', message);
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => { this.resolver = resolve; });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result); this.resolver = null; this.current.set(null);
  }
}
