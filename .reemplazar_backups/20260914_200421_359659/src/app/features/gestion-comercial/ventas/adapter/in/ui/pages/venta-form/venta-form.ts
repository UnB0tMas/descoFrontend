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
  faCartPlus,
  faFloppyDisk,
  faPlus,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { ResourceProductResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductResponse';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  localDateTimeInputNow,
  normalizeOptionalText,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { ResourceApiService } from '../../../../../../../recursos/shared/resource-api.service';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { VentasApiService } from '../../../../../shared/ventas-api.service';

@Component({
  selector: 'app-venta-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
  templateUrl: './venta-form.html',
  styleUrl: './venta-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly sales = inject(VentasApiService);
  private readonly resources = inject(ResourceApiService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly saving = signal(false);
  readonly referencesLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly products = signal<readonly ResourceProductResponse[]>([]);
  readonly warehouses = signal<readonly ResourceWarehouseResponse[]>([]);

  readonly pageIcon = faCartPlus;
  readonly addIcon = faPlus;
  readonly removeIcon = faTrashCan;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  private resolver: ((result: AdminModalResult<number>) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    almacenId: [0, [Validators.required, Validators.min(1)]],
    separar: [false],
    reservaHasta: [''],
    clientePersonaId: [0, [Validators.min(0)]],
    clienteEmpresaId: [0, [Validators.min(0)]],
    observacion: ['', [Validators.maxLength(500)]],
    detalle: this.fb.array([this.createLine()]),
  });

  get lines(): FormArray {
    return this.form.controls.detalle;
  }

  open(): Promise<AdminModalResult<number>> {
    this.errorMessage.set(null);
    this.lines.clear();
    this.lines.push(this.createLine());

    const uotId =
      this.uot.selectedId() ??
      this.uot.memberships()[0]?.uotId ??
      0;

    this.form.reset({
      uotId,
      almacenId: 0,
      separar: false,
      reservaHasta: '',
      clientePersonaId: 0,
      clienteEmpresaId: 0,
      observacion: '',
    });

    this.loadReferences(uotId);
    return this.show();
  }

  addLine(): void {
    this.lines.push(this.createLine());
  }

  removeLine(index: number): void {
    if (this.lines.length <= 1) return;
    this.lines.removeAt(index);
  }

  onUnitChange(): void {
    const uotId = Number(this.form.controls.uotId.value);
    this.form.controls.almacenId.setValue(0);
    this.loadReferences(uotId);
  }

  onSeparatedChange(): void {
    const separated = this.form.controls.separar.value;
    const control = this.form.controls.reservaHasta;

    if (separated) {
      control.setValidators([Validators.required]);
      if (!control.value) {
        const now = new Date();
        now.setHours(now.getHours() + 24);
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        control.setValue(local.toISOString().slice(0, 16));
      }
    } else {
      control.clearValidators();
      control.setValue('');
    }

    control.updateValueAndValidity();
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    this.onSeparatedChange();
    this.form.markAllAsTouched();

    if (this.form.invalid || this.saving() || this.referencesLoading()) return;

    const raw = this.form.getRawValue();
    const productIds = raw.detalle.map((line) => Number(line.productoId));

    if (new Set(productIds).size !== productIds.length) {
      this.errorMessage.set('No repitas un producto dentro de la misma venta.');
      return;
    }

    if (raw.separar && raw.reservaHasta) {
      const reserveUntil = new Date(raw.reservaHasta);
      if (!Number.isFinite(reserveUntil.getTime()) || reserveUntil <= new Date()) {
        this.errorMessage.set('La reserva debe vencer en una fecha futura.');
        return;
      }
    }

    const personId = Number(raw.clientePersonaId);
    const companyId = Number(raw.clienteEmpresaId);

    if (personId > 0 && companyId > 0) {
      this.errorMessage.set('Selecciona un solo tipo de cliente.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.sales
      .create({
        uotId: Number(raw.uotId),
        almacenId: Number(raw.almacenId),
        clientePersonaId: personId > 0 ? personId : undefined,
        clienteEmpresaId: companyId > 0 ? companyId : undefined,
        detalle: raw.detalle.map((line) => ({
          productoId: Number(line.productoId),
          cantidad: Number(line.cantidad),
        })),
        separar: raw.separar,
        reservaHasta: raw.separar ? raw.reservaHasta : undefined,
        observacion: normalizeOptionalText(raw.observacion),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (value) => {
          const id =
            value && typeof value === 'object' && 'ventaId' in value
              ? Number((value as { ventaId?: number }).ventaId)
              : 0;
          this.toast.success(raw.separar ? 'Separación registrada' : 'Venta registrada');
          this.finish({
            saved: true,
            value: Number.isFinite(id) && id > 0 ? id : null,
          });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo registrar la venta', message);
        },
      });
  }

  private loadReferences(uotId: number): void {
    if (uotId <= 0) {
      this.products.set([]);
      this.warehouses.set([]);
      return;
    }

    this.referencesLoading.set(true);
    forkJoin({
      products: this.resources.listProducts(uotId),
      warehouses: this.resources.listWarehouses(uotId),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ products, warehouses }) => {
          this.products.set(products.filter((item) => item.estado !== false));
          this.warehouses.set(
            warehouses.filter(
              (item) => item.estado !== false && item.permiteSalida !== false,
            ),
          );
          this.form.controls.almacenId.setValue(
            this.warehouses()[0]?.almacenId ?? 0,
          );
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private createLine() {
    return this.fb.nonNullable.group({
      productoId: [0, [Validators.required, Validators.min(1)]],
      cantidad: [1, [Validators.required, Validators.min(0.001)]],
    });
  }

  private show(): Promise<AdminModalResult<number>> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: AdminModalResult<number>): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.errorMessage.set(null);
  }
}
