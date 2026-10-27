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
  faPen,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

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

type ProductFormMode = 'create' | 'edit' | 'price';
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
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly productForm = this.fb.nonNullable.group({
    uotContextoId: [0, [Validators.required, Validators.min(1)]],
    codigo: ['', [Validators.maxLength(50)]],
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

  openCreate(preferredUotId?: number): Promise<AdminModalResult> {
    this.mode.set('create');
    this.current.set(null);
    this.errorMessage.set(null);
    this.productForm.reset({
      uotContextoId: this.resolveCreateUotId(preferredUotId),
      codigo: '',
      nombre: '',
      descripcion: '',
      unidadMedida: '',
      categoria: '',
      requiereLote: false,
      controlaVencimiento: false,
      precioInicial: 0,
      precioVenta: 0,
      moneda: 'PEN',
    });
    this.productForm.controls.uotContextoId[
      this.uot.modo() === 'ESPECIFICA' ? 'disable' : 'enable'
    ]({ emitEvent: false });
    this.productForm.controls.codigo.enable({ emitEvent: false });
    this.setCommercialControls(true);
    this.loadReferences();
    this.loadSuggestedCode(true);
    return this.show();
  }

  openEdit(item: ProductTarget, uotId: number): Promise<AdminModalResult> {
    this.mode.set('edit');
    this.current.set(item);
    this.errorMessage.set(null);
    this.productForm.reset({
      uotContextoId: uotId,
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
    this.productForm.controls.codigo.disable({ emitEvent: false });
    this.setCommercialControls(false);
    this.loadReferences();
    return this.show();
  }

  openPrice(item: ProductTarget, uotId: number): Promise<AdminModalResult> {
    this.mode.set('price');
    this.current.set(item);
    this.errorMessage.set(null);
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

  availableUnits() {
    return this.uot.memberships();
  }

  onCreateUotChange(): void {
    if (this.mode() === 'create') this.loadSuggestedCode(true);
  }

  uotLabel(form: 'product' | 'price' = 'product'): string {
    const id = form === 'price'
      ? Number(this.priceForm.getRawValue().uotContextoId)
      : Number(this.productForm.getRawValue().uotContextoId);
    return this.uot.memberships().find((unit) => unit.uotId === id)?.nombre ?? 'UOT no seleccionada';
  }

  title(): string {
    if (this.mode() === 'edit') return 'Editar producto';
    if (this.mode() === 'price') return 'Versionar precio';
    return 'Registrar producto';
  }

  icon() {
    if (this.mode() === 'edit') return this.editIcon;
    if (this.mode() === 'price') return this.priceIcon;
    return this.addIcon;
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
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid || this.saving() || this.referencesLoading()) return;

    const raw = this.productForm.getRawValue();
    const uotId = Number(raw.uotContextoId);
    if (uotId <= 0) {
      this.errorMessage.set('Seleccione una UOT antes de guardar.');
      return;
    }

    const current = this.current();
    this.saving.set(true);
    this.errorMessage.set(null);

    const operation = this.mode() === 'edit' && current?.productoId
      ? this.api.updateProduct(current.productoId, {
          uotContextoId: uotId,
          nombre: normalizeText(raw.nombre),
          descripcion: normalizeOptionalText(raw.descripcion),
          unidadMedida: raw.unidadMedida.trim().toUpperCase(),
          categoria: raw.categoria.trim().toUpperCase() || undefined,
          requiereLote: raw.requiereLote,
          controlaVencimiento: raw.controlaVencimiento,
        })
      : this.api.createProduct({
          uotContextoId: uotId,
          codigo: raw.codigo.trim().toUpperCase() || undefined,
          nombre: normalizeText(raw.nombre),
          descripcion: normalizeOptionalText(raw.descripcion),
          unidadMedida: raw.unidadMedida.trim().toUpperCase(),
          categoria: raw.categoria.trim().toUpperCase() || undefined,
          precioInicial: Number(raw.precioInicial),
          precioVenta: Number(raw.precioVenta),
          moneda: raw.moneda.trim().toUpperCase(),
        });

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(this.mode() === 'edit' ? 'Producto actualizado' : 'Producto registrado');
        this.finish({ saved: true, value: null });
      },
      error: (error) => this.fail(error),
    });
  }

  private savePrice(): void {
    const product = this.current();
    this.priceForm.markAllAsTouched();
    if (!product?.productoId || this.priceForm.invalid || this.saving() || this.referencesLoading()) return;

    const raw = this.priceForm.getRawValue();
    const uotId = Number(raw.uotContextoId);
    if (uotId <= 0) {
      this.errorMessage.set('Seleccione una UOT antes de guardar.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.api.versionProductPrice(product.productoId, {
      uotContextoId: uotId,
      uotPrecioId: uotId,
      precioInicial: Number(raw.precioInicial),
      precioVenta: Number(raw.precioVenta),
      moneda: raw.moneda.trim().toUpperCase(),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success('Nueva versión de precio registrada');
        this.finish({ saved: true, value: null });
      },
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
        if (!this.productForm.controls.unidadMedida.value) {
          this.productForm.controls.unidadMedida.setValue(this.units()[0]?.code ?? 'UND');
        }
      },
      error: (error) => this.fail(error),
    });
  }

  private loadSuggestedCode(force = false): void {
    if (this.mode() !== 'create' || this.codeLoading()) return;
    const uotId = Number(this.productForm.getRawValue().uotContextoId);
    if (uotId <= 0) return;
    if (!force && this.productForm.controls.codigo.value.trim()) return;
    this.codeLoading.set(true);
    this.api.suggestCode(uotId, 'PRODUCTO')
      .pipe(finalize(() => this.codeLoading.set(false)))
      .subscribe({ next: (code) => this.productForm.controls.codigo.setValue(code) });
  }

  private resolveCreateUotId(preferredUotId?: number): number {
    if (this.uot.isSpecific()) return this.uot.selectedId() ?? 0;
    return preferredUotId ?? this.uot.memberships()[0]?.uotId ?? 0;
  }

  private setCommercialControls(enabled: boolean): void {
    const controls = [
      this.productForm.controls.precioInicial,
      this.productForm.controls.precioVenta,
      this.productForm.controls.moneda,
    ];
    for (const control of controls) control[enabled ? 'enable' : 'disable']({ emitEvent: false });
  }

  private fail(error: unknown): void {
    const message = mapOpenApiError(error).message;
    this.errorMessage.set(message);
    this.toast.error('No se pudo guardar el producto', message);
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => { this.resolver = resolve; });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
