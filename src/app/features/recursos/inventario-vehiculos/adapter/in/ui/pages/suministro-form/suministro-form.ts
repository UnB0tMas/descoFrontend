import { DialogBackdropDirective } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { decimalPrecisionValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
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
import { ResourceIdentityFieldsComponent } from '../../../../../../../../shared/forms/resource-identity-fields/resource-identity-fields';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
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
  imports: [DialogBackdropDirective, ReactiveFormsModule, FaIconComponent, FormErrorComponent, ResourceIdentityFieldsComponent],
  templateUrl: './suministro-form.html',
  styleUrl: './suministro-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuministroFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SupplyApiService);
  private readonly productsApi = inject(ResourceApiService);
  private readonly refs = inject(ReferenceDataService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<SupplyFormMode>('create');
  readonly current = signal<SupplySummaryResponse | null>(null);
  readonly saving = signal(false);
  readonly referencesLoading = signal(false);
  readonly units = signal<readonly { code: string; label: string }[]>([]);
  readonly products = signal<readonly ResourceProductListItemResponse[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly addIcon = faBoxOpen;
  readonly editIcon = faPen;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    codigo: ['', [Validators.maxLength(40)]],
    productoId: [0],
    nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(150)]],
    unidadMedida: ['', [Validators.required, notBlankValidator, Validators.maxLength(20)]],
    stockInicial: [0, [Validators.required, Validators.min(0), decimalPrecisionValidator(11, 3)]],
    stockMinimo: [0, [Validators.min(0), decimalPrecisionValidator(11, 3)]],
  });

  readonly movementForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    tipoMovimiento: ['ENTRADA', [Validators.required]],
    cantidad: [0, [Validators.required, Validators.min(0.001), decimalPrecisionValidator(11, 3)]],
    documentoReferencia: ['', [Validators.maxLength(120)]],
    observacion: ['', [Validators.maxLength(300)]],
  });

  openCreate(preferredUotId?: number): Promise<AdminModalResult> {
    this.mode.set('create');
    this.current.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      uotId: this.resolveCreateUotId(preferredUotId),
      codigo: '',
      productoId: 0,
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
    this.form.controls.codigo.disable({ emitEvent: false });
    this.form.controls.stockInicial.enable({ emitEvent: false });
    this.form.controls.productoId.enable({ emitEvent: false });
    this.form.controls.nombre.enable({ emitEvent: false });
    this.form.controls.unidadMedida.enable({ emitEvent: false });

    this.loadUnits();
    this.loadProducts();
    return this.show();
  }

  openEdit(item: SupplySummaryResponse): Promise<AdminModalResult> {
    this.mode.set('edit');
    this.current.set(item);
    this.errorMessage.set(null);
    this.form.reset({
      uotId: Number(item.uotId ?? 0),
      codigo: item.codigo ?? '',
      productoId: item.productoId ?? 0,
      nombre: item.nombre ?? '',
      unidadMedida: item.unidadMedida ?? 'UND',
      stockInicial: Number(item.stockActual ?? item.stock ?? 0),
      stockMinimo: Number(item.stockMinimo ?? 0),
    });
    this.form.controls.uotId.disable({ emitEvent: false });
    this.form.controls.codigo.disable({ emitEvent: false });
    this.form.controls.stockInicial.disable({ emitEvent: false });
    this.form.controls.productoId.disable({ emitEvent: false });
    this.form.controls.nombre[item.productoId ? 'disable' : 'enable']({ emitEvent: false });
    this.form.controls.unidadMedida[item.productoId ? 'disable' : 'enable']({ emitEvent: false });
    this.loadUnits();
    this.loadProducts();
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

  onUotChange(): void {
    this.form.controls.codigo.setValue('', { emitEvent: false });
    this.onProductChange('0');
    this.form.controls.nombre.setValue('');
    this.form.controls.unidadMedida.setValue('UND');
    this.products.set([]);
    this.loadProducts();
  }

  private loadProducts(): void {
    const uotId = Number(this.form.getRawValue().uotId);
    if (uotId <= 0) return;
    this.productsApi.listAllProducts(uotId).subscribe({
      next: (items) => {
        if (Number(this.form.getRawValue().uotId) === uotId) {
          this.products.set(items.filter((item) => item.uotId === uotId && item.estado !== false));
        }
      },
      error: () => this.products.set([]),
    });
  }

  onProductChange(value: string): void {
    const id = Number(value) || 0;
    this.form.controls.productoId.setValue(id);
    const item = this.products().find((product) => product.productoId === id);
    if (!item) {
      this.form.controls.nombre.enable({ emitEvent: false });
      this.form.controls.unidadMedida.enable({ emitEvent: false });
      this.form.controls.stockInicial.enable({ emitEvent: false });
      return;
    }
    this.form.controls.nombre.setValue((item.nombre ?? '').slice(0, 150));
    this.form.controls.unidadMedida.setValue(item.unidadMedidaCodigo ?? '');
    this.form.controls.stockInicial.setValue(0);
    this.form.controls.nombre.disable({ emitEvent: false });
    this.form.controls.unidadMedida.disable({ emitEvent: false });
    this.form.controls.stockInicial.disable({ emitEvent: false });
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
    if (this.form.invalid || this.saving() || this.referencesLoading()) return;

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
            productoId: raw.productoId || undefined,
            nombre: normalizeText(raw.nombre),
            unidadMedida: raw.unidadMedida.trim().toUpperCase(),
            stockMinimo: Number(raw.stockMinimo),
          })
        : this.api.create({
            uotId,
            codigo: undefined,
            productoId: raw.productoId || undefined,
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

  private loadUnits(): void {
    this.referencesLoading.set(true);
    this.refs.catalog('UNIDAD_MEDIDA')
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.units.set(items.map((item) => ({ code: item.code, label: item.label })));
          const current = this.form.controls.unidadMedida.value;
          if (!this.units().some((item) => item.code === current)) {
            this.form.controls.unidadMedida.setValue(this.units()[0]?.code ?? 'UND');
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
