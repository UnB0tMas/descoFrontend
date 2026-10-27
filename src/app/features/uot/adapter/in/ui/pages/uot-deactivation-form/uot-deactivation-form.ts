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
  faPowerOff,
  faRotate,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin, finalize } from 'rxjs';

import { ResourceAssetListItemResponse } from '../../../../../../../infrastructure/openapi/generated/model/resourceAssetListItemResponse';
import { ResourceWarehouseResponse } from '../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { SupplySummaryResponse } from '../../../../../../../infrastructure/openapi/generated/model/supplySummaryResponse';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import {
  closeAnimatedDialog,
  openAnimatedDialog,
} from '../../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import {
  normalizeText,
  notBlankValidator,
} from '../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../administracion/shared/admin-modal.types';
import { ResourceApiService } from '../../../../../../recursos/shared/resource-api.service';
import { SupplyApiService } from '../../../../../../recursos/shared/supply-api.service';
import { UotApiService } from '../../../../out/http/uot-api.service';
import {
  UotDeactivationImpact,
  UotUnit,
} from '../../../../../domain/uot.model';

@Component({
  selector: 'app-uot-deactivation-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
  templateUrl: './uot-deactivation-form.html',
  styleUrl: './uot-deactivation-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UotDeactivationFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UotApiService);
  private readonly resources = inject(ResourceApiService);
  private readonly suppliesApi = inject(SupplyApiService);
  private readonly toast = inject(ToastService);

  readonly current = signal<UotUnit | null>(null);
  readonly units = signal<readonly UotUnit[]>([]);
  readonly impact = signal<UotDeactivationImpact | null>(null);
  readonly assets = signal<readonly ResourceAssetListItemResponse[]>([]);
  readonly supplies = signal<readonly SupplySummaryResponse[]>([]);
  readonly sourceWarehouses = signal<readonly ResourceWarehouseResponse[]>([]);
  readonly targetWarehouses = signal<readonly ResourceWarehouseResponse[]>([]);

  readonly loading = signal(false);
  readonly targetLoading = signal(false);
  readonly transferring = signal(false);
  readonly deactivating = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly closeIcon = faXmark;
  readonly transferIcon = faArrowRightArrowLeft;
  readonly deactivateIcon = faPowerOff;
  readonly refreshIcon = faRotate;
  readonly warningIcon = faTriangleExclamation;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    uotDestinoId: [0],
    almacenOrigenId: [0],
    almacenDestinoId: [0],
    transferirStock: [true],
    motivo: [
      '',
      [
        Validators.required,
        notBlankValidator,
        Validators.minLength(5),
        Validators.maxLength(300),
      ],
    ],
  });

  open(
    unit: UotUnit,
    units: readonly UotUnit[],
  ): Promise<AdminModalResult> {
    this.current.set(unit);
    this.units.set(units);
    this.errorMessage.set(null);
    this.impact.set(null);
    this.assets.set([]);
    this.supplies.set([]);
    this.sourceWarehouses.set([]);
    this.targetWarehouses.set([]);

    const defaultTarget =
      units.find(
        (item) =>
          item.estado &&
          item.uotId !== unit.uotId &&
          !this.isDescendantOf(item, unit.uotId),
      ) ?? null;

    this.form.reset({
      uotDestinoId: defaultTarget?.uotId ?? 0,
      almacenOrigenId: 0,
      almacenDestinoId: 0,
      transferirStock: true,
      motivo: '',
    });

    this.loadSource();
    if (defaultTarget) {
      this.loadTargetWarehouses(defaultTarget.uotId);
    }

    openAnimatedDialog(this.dialogRef.nativeElement);
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  close(): void {
    if (
      !this.loading() &&
      !this.transferring() &&
      !this.deactivating()
    ) {
      this.finish({ saved: false, value: null });
    }
  }

  targetOptions(): readonly UotUnit[] {
    const current = this.current();
    if (!current) return [];

    return this.units().filter(
      (item) =>
        item.estado &&
        item.uotId !== current.uotId &&
        !this.isDescendantOf(item, current.uotId),
    );
  }

  onTargetChange(raw: string): void {
    const id = Number(raw);
    this.form.controls.almacenDestinoId.setValue(0);

    if (!Number.isFinite(id) || id <= 0) {
      this.targetWarehouses.set([]);
      return;
    }

    this.loadTargetWarehouses(id);
  }

  refresh(): void {
    this.loadSource();
  }

  transfer(): void {
    const unit = this.current();
    const impact = this.impact();

    if (!unit || !impact || this.transferring()) return;

    this.form.controls.motivo.markAsTouched();
    const raw = this.form.getRawValue();
    const targetId = Number(raw.uotDestinoId);

    if (targetId <= 0) {
      this.errorMessage.set('Seleccione la UOT que recibirá los recursos.');
      return;
    }

    if (this.form.controls.motivo.invalid) {
      this.errorMessage.set('Indique el motivo de la transferencia.');
      return;
    }

    const transferStock =
      raw.transferirStock &&
      (impact.productosConStock > 0 || impact.stockReservado > 0);

    const sourceWarehouseId = Number(raw.almacenOrigenId);
    const targetWarehouseId = Number(raw.almacenDestinoId);

    if (
      transferStock &&
      (sourceWarehouseId <= 0 || targetWarehouseId <= 0)
    ) {
      this.errorMessage.set(
        'Para transferir stock seleccione el almacén origen y el almacén destino.',
      );
      return;
    }

    const assetIds = this.assets()
      .filter((item) => item.estado !== false)
      .map((item) => Number(item.bienInventarioId))
      .filter((id) => id > 0);

    const supplyIds = this.supplies()
      .filter(
        (item) =>
          item.estado !== false &&
          Number(item.stockActual ?? item.stock ?? 0) > 0,
      )
      .map((item) => Number(item.suministroId))
      .filter((id) => id > 0);

    this.transferring.set(true);
    this.errorMessage.set(null);

    this.api
      .transferResources(unit.uotId, {
        uotDestinoId: targetId,
        almacenOrigenId:
          transferStock && sourceWarehouseId > 0
            ? sourceWarehouseId
            : undefined,
        almacenDestinoId:
          transferStock && targetWarehouseId > 0
            ? targetWarehouseId
            : undefined,
        transferirStock: transferStock,
        bienIds: assetIds.length ? assetIds : undefined,
        suministroIds: supplyIds.length ? supplyIds : undefined,
        motivo: normalizeText(raw.motivo),
      })
      .pipe(finalize(() => this.transferring.set(false)))
      .subscribe({
        next: (result) => {
          this.toast.success(
            'Recursos transferidos',
            `${result.productosTransferidos} productos, ${result.bienesTransferidos} bienes y ${result.suministrosTransferidos} suministros procesados.`,
          );
          this.loadSource();
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudieron transferir los recursos', message);
        },
      });
  }

  deactivate(): void {
    const unit = this.current();
    const impact = this.impact();

    if (
      !unit ||
      !impact?.puedeDeshabilitar ||
      this.deactivating()
    ) {
      return;
    }

    this.form.controls.motivo.markAsTouched();
    if (this.form.controls.motivo.invalid) {
      this.errorMessage.set('Indique el motivo de la baja de la UOT.');
      return;
    }

    this.deactivating.set(true);
    this.errorMessage.set(null);

    this.api
      .deactivate(unit.uotId, normalizeText(this.form.controls.motivo.value))
      .pipe(finalize(() => this.deactivating.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('UOT deshabilitada');
          this.finish({ saved: true, value: unit.uotId });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo deshabilitar la UOT', message);
        },
      });
  }

  requiresResourceTransfer(): boolean {
    const value = this.impact();
    return Boolean(
      value &&
        (value.productosConStock > 0 ||
          value.bienesActivos > 0 ||
          value.suministrosConStock > 0),
    );
  }

  hasOperationalBlocks(): boolean {
    const value = this.impact();
    return Boolean(
      value &&
        (value.ventasAbiertas > 0 ||
          value.campaniasAbiertas > 0 ||
          value.operativosAbiertos > 0 ||
          value.salidasAbiertas > 0 ||
          value.recursosAbiertos > 0 ||
          value.stockReservado > 0 ||
          value.suministrosReservados > 0),
    );
  }

  private loadSource(): void {
    const unit = this.current();
    if (!unit) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      impact: this.api.impact(unit.uotId),
      assets: this.resources.listAllAssets(unit.uotId),
      supplies: this.suppliesApi.listAll(unit.uotId),
      warehouses: this.resources.listWarehouses(unit.uotId),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ impact, assets, supplies, warehouses }) => {
          this.impact.set(impact);
          this.assets.set(assets);
          this.supplies.set(supplies);
          this.sourceWarehouses.set(
            warehouses.filter(
              (item) =>
                item.estado !== false &&
                item.permiteSalida !== false,
            ),
          );

          const sourceId = Number(this.form.controls.almacenOrigenId.value);
          if (
            sourceId <= 0 ||
            !this.sourceWarehouses().some(
              (item) => Number(item.almacenId) === sourceId,
            )
          ) {
            this.form.controls.almacenOrigenId.setValue(
              Number(this.sourceWarehouses()[0]?.almacenId ?? 0),
            );
          }
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
        },
      });
  }

  private loadTargetWarehouses(uotId: number): void {
    this.targetLoading.set(true);

    this.resources
      .listWarehouses(uotId)
      .pipe(finalize(() => this.targetLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.targetWarehouses.set(
            items.filter(
              (item) =>
                item.estado !== false &&
                item.permiteEntrada !== false,
            ),
          );
          this.form.controls.almacenDestinoId.setValue(
            Number(this.targetWarehouses()[0]?.almacenId ?? 0),
          );
        },
        error: (error) => {
          this.targetWarehouses.set([]);
          this.errorMessage.set(mapOpenApiError(error).message);
        },
      });
  }

  private isDescendantOf(
    candidate: UotUnit,
    ancestorId: number,
  ): boolean {
    let parentId = candidate.uotPadreId;
    const visited = new Set<number>();

    while (parentId && !visited.has(parentId)) {
      if (parentId === ancestorId) return true;
      visited.add(parentId);
      parentId =
        this.units().find((item) => item.uotId === parentId)
          ?.uotPadreId ?? null;
    }

    return false;
  }

  private finish(result: AdminModalResult): void {
    closeAnimatedDialog(this.dialogRef.nativeElement, () => {
      this.resolver?.(result);
      this.resolver = null;
      this.current.set(null);
      this.impact.set(null);
      this.errorMessage.set(null);
    });
  }
}
