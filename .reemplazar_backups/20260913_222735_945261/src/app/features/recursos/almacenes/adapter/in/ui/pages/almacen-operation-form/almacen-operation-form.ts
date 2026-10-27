import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightArrowLeft,
  faFloppyDisk,
  faPlus,
  faShareNodes,
  faTrashCan,
  faWarehouse,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import {
  ResourceMovementRegisterRequestNaturalezaEnum,
  ResourceMovementRegisterRequestTipoEnum,
} from '../../../../../../../../infrastructure/openapi/generated/model/resourceMovementRegisterRequest';
import { ResourceProductResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductResponse';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
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

type WarehouseFormMode = 'create' | 'share' | 'movement';

export interface WarehouseOperationOptions {
  warehouses: readonly ResourceWarehouseResponse[];
  products: readonly ResourceProductResponse[];
}

@Component({
  selector: 'app-almacen-operation-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent, NgTemplateOutlet],
  templateUrl: './almacen-operation-form.html',
  styleUrl: './almacen-operation-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenOperationFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ResourceApiService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<WarehouseFormMode>('create');
  readonly currentWarehouse = signal<ResourceWarehouseResponse | null>(null);
  readonly warehouses = signal<readonly ResourceWarehouseResponse[]>([]);
  readonly products = signal<readonly ResourceProductResponse[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly warehouseIcon = faWarehouse;
  readonly shareIcon = faShareNodes;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly addIcon = faPlus;
  readonly removeIcon = faTrashCan;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  readonly movementTypes = [
    { value: ResourceMovementRegisterRequestTipoEnum.Compra, label: 'Compra' },
    { value: ResourceMovementRegisterRequestTipoEnum.Donacion, label: 'Donación' },
    { value: ResourceMovementRegisterRequestTipoEnum.Devolucion, label: 'Devolución' },
    { value: ResourceMovementRegisterRequestTipoEnum.Consumo, label: 'Consumo' },
    { value: ResourceMovementRegisterRequestTipoEnum.Transferencia, label: 'Transferencia' },
    { value: ResourceMovementRegisterRequestTipoEnum.Ajuste, label: 'Ajuste' },
    { value: ResourceMovementRegisterRequestTipoEnum.Merma, label: 'Merma' },
    { value: ResourceMovementRegisterRequestTipoEnum.Otro, label: 'Otro' },
  ] as const;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly createForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    ubicacionId: [0, [Validators.min(0)]],
    codigo: ['', [Validators.required, notBlankValidator, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(160)]],
    descripcion: ['', [Validators.maxLength(500)]],
  });

  readonly shareForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    permiteEntrada: [true],
    permiteSalida: [true],
  });

  readonly movementForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    almacenId: [0, [Validators.required, Validators.min(1)]],
    tipo: [ResourceMovementRegisterRequestTipoEnum.Compra, [Validators.required]],
    naturaleza: [ResourceMovementRegisterRequestNaturalezaEnum.E, [Validators.required]],
    documentoReferencia: ['', [Validators.maxLength(100)]],
    observacion: ['', [Validators.maxLength(500)]],
    detalle: this.fb.array([this.createLine()]),
  });

  get lines(): FormArray {
    return this.movementForm.controls.detalle;
  }

  openCreate(options: WarehouseOperationOptions): Promise<AdminModalResult> {
    this.prepare('create', options, null);
    this.createForm.reset({
      uotId: this.uot.selectedId() ?? this.uot.memberships()[0]?.uotId ?? 0,
      ubicacionId: 0,
      codigo: '',
      nombre: '',
      descripcion: '',
    });
    return this.show();
  }

  openShare(
    warehouse: ResourceWarehouseResponse,
    options: WarehouseOperationOptions,
  ): Promise<AdminModalResult> {
    this.prepare('share', options, warehouse);
    this.shareForm.reset({
      uotId: 0,
      permiteEntrada: true,
      permiteSalida: true,
    });
    return this.show();
  }

  openMovement(options: WarehouseOperationOptions): Promise<AdminModalResult> {
    this.prepare('movement', options, null);
    this.lines.clear();
    this.lines.push(this.createLine());
    this.movementForm.reset({
      uotId: this.uot.selectedId() ?? this.uot.memberships()[0]?.uotId ?? 0,
      almacenId: options.warehouses[0]?.almacenId ?? 0,
      tipo: ResourceMovementRegisterRequestTipoEnum.Compra,
      naturaleza: ResourceMovementRegisterRequestNaturalezaEnum.E,
      documentoReferencia: '',
      observacion: '',
    });
    return this.show();
  }

  addLine(): void {
    this.lines.push(this.createLine());
  }

  removeLine(index: number): void {
    if (this.lines.length <= 1) return;
    this.lines.removeAt(index);
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    if (this.mode() === 'share') {
      this.saveShare();
    } else if (this.mode() === 'movement') {
      this.saveMovement();
    } else {
      this.saveWarehouse();
    }
  }

  title(): string {
    if (this.mode() === 'share') return 'Compartir almacén';
    if (this.mode() === 'movement') return 'Registrar movimiento';
    return 'Registrar almacén';
  }

  icon() {
    if (this.mode() === 'share') return this.shareIcon;
    if (this.mode() === 'movement') return this.movementIcon;
    return this.warehouseIcon;
  }

  warehousesForUnit(): readonly ResourceWarehouseResponse[] {
    const unitId = Number(this.movementForm.controls.uotId.value);
    if (unitId <= 0) return this.warehouses();
    return this.warehouses().filter(
      (item) =>
        item.uotPropietariaId === unitId ||
        item.tipoAcceso?.toUpperCase() === 'COMPARTIDO',
    );
  }

  onMovementUnitChange(): void {
    const currentId = Number(this.movementForm.controls.almacenId.value);
    const valid = this.warehousesForUnit().some((x) => x.almacenId === currentId);
    if (!valid) {
      this.movementForm.controls.almacenId.setValue(
        this.warehousesForUnit()[0]?.almacenId ?? 0,
      );
    }
  }

  private saveWarehouse(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid || this.saving()) return;
    const raw = this.createForm.getRawValue();

    this.run(
      this.api.createWarehouse({
        uotId: Number(raw.uotId),
        ubicacionId: Number(raw.ubicacionId) > 0 ? Number(raw.ubicacionId) : undefined,
        codigo: raw.codigo.trim().toUpperCase(),
        nombre: normalizeText(raw.nombre),
        descripcion: normalizeOptionalText(raw.descripcion),
      }),
      'Almacén registrado',
    );
  }

  private saveShare(): void {
    const warehouse = this.currentWarehouse();
    this.shareForm.markAllAsTouched();

    if (!warehouse?.almacenId || this.shareForm.invalid || this.saving()) return;
    const raw = this.shareForm.getRawValue();

    if (Number(raw.uotId) === warehouse.uotPropietariaId) {
      this.errorMessage.set('Selecciona una UOT distinta de la propietaria.');
      return;
    }

    this.run(
      this.api.shareWarehouse(warehouse.almacenId, {
        uotId: Number(raw.uotId),
        permiteEntrada: raw.permiteEntrada,
        permiteSalida: raw.permiteSalida,
      }),
      'Acceso de almacén actualizado',
    );
  }

  private saveMovement(): void {
    this.movementForm.markAllAsTouched();
    if (this.movementForm.invalid || this.saving()) return;

    const raw = this.movementForm.getRawValue();
    const productIds = raw.detalle.map((line) => Number(line.productoId));

    if (new Set(productIds).size !== productIds.length) {
      this.errorMessage.set('No repitas un producto dentro del mismo movimiento.');
      return;
    }

    this.run(
      this.api.registerMovement({
        uotId: Number(raw.uotId),
        almacenId: Number(raw.almacenId),
        tipo: raw.tipo,
        naturaleza: raw.naturaleza,
        documentoReferencia: normalizeOptionalText(raw.documentoReferencia),
        observacion: normalizeOptionalText(raw.observacion),
        detalle: raw.detalle.map((line) => ({
          productoId: Number(line.productoId),
          cantidad: Number(line.cantidad),
          costoUnitario:
            Number(line.costoUnitario) > 0
              ? Number(line.costoUnitario)
              : undefined,
          moneda: line.moneda.trim().toUpperCase() || undefined,
          lote: normalizeOptionalText(line.lote),
          fechaVencimiento: line.fechaVencimiento || undefined,
        })),
      }),
      'Movimiento registrado',
    );
  }

  private run(operation: import('rxjs').Observable<unknown>, success: string): void {
    this.saving.set(true);
    this.errorMessage.set(null);

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(success);
        this.finish({ saved: true, value: null });
      },
      error: (error) => {
        const message = mapOpenApiError(error).message;
        this.errorMessage.set(message);
        this.toast.error('No se pudo completar la operación', message);
      },
    });
  }

  private createLine() {
    return this.fb.nonNullable.group({
      productoId: [0, [Validators.required, Validators.min(1)]],
      cantidad: [1, [Validators.required, Validators.min(0.001)]],
      costoUnitario: [0, [Validators.min(0)]],
      moneda: ['PEN', [Validators.maxLength(3)]],
      lote: ['', [Validators.maxLength(80)]],
      fechaVencimiento: [''],
    });
  }

  private prepare(
    mode: WarehouseFormMode,
    options: WarehouseOperationOptions,
    warehouse: ResourceWarehouseResponse | null,
  ): void {
    this.mode.set(mode);
    this.warehouses.set(options.warehouses);
    this.products.set(options.products);
    this.currentWarehouse.set(warehouse);
    this.errorMessage.set(null);
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
    this.currentWarehouse.set(null);
  }
}
