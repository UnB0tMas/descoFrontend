import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
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
  faBoxesStacked,
  faFloppyDisk,
  faFileArrowUp,
  faFileCircleCheck,
  faPlus,
  faShareNodes,
  faTrashCan,
  faWarehouse,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable, of, switchMap } from 'rxjs';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';

import {
  ResourceMovementRegisterRequestNaturalezaEnum,
  ResourceMovementRegisterRequestTipoEnum,
} from '../../../../../../../../infrastructure/openapi/generated/model/resourceMovementRegisterRequest';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { ResourceStockResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { LocalDocumentFileResponse } from '../../../../../../../../infrastructure/openapi/generated/model/localDocumentFileResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { LocalDocumentApiService } from '../../../../../../../../shared/files/local-document-api.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import {
  normalizeOptionalText,
  normalizeText,
  todayLocalIsoDate,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';

type WarehouseFormMode = 'create' | 'share' | 'configure' | 'movement';

export interface WarehouseOperationOptions {
  warehouses: readonly ResourceWarehouseResponse[];
  products: readonly ResourceProductListItemResponse[];
  stock: readonly ResourceStockResponse[];
}

@Component({
  selector: 'app-almacen-operation-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './almacen-operation-form.html',
  styleUrl: './almacen-operation-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenOperationFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('supportFileInput') private supportFileInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ResourceApiService);
  private readonly refs = inject(ReferenceDataService);
  private readonly toast = inject(ToastService);
  private readonly documents = inject(LocalDocumentApiService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<WarehouseFormMode>('create');
  readonly currentWarehouse = signal<ResourceWarehouseResponse | null>(null);
  readonly warehouses = signal<readonly ResourceWarehouseResponse[]>([]);
  readonly products = signal<readonly ResourceProductListItemResponse[]>([]);
  readonly configureProducts = signal<readonly ResourceProductListItemResponse[]>([]);
  readonly stock = signal<readonly ResourceStockResponse[]>([]);
  readonly saving = signal(false);
  readonly loadingProducts = signal(false);
  readonly codeLoading = signal(false);
  readonly currencies = signal<readonly { code: string; label: string }[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);
  readonly configureSupportFile = signal<File | null>(null);
  readonly supportDragActive = signal(false);
  readonly supportPhase = signal<'idle' | 'upload' | 'register'>('idle');
  readonly supportFileError = signal<string | null>(null);
  readonly supportFileIcon = faFileArrowUp;
  readonly supportSelectedIcon = faFileCircleCheck;
  readonly supportRemoveIcon = faTrashCan;
  readonly maxSupportFileBytes = 10 * 1024 * 1024;

  readonly today = todayLocalIsoDate();

  readonly warehouseIcon = faWarehouse;
  readonly shareIcon = faShareNodes;
  readonly configureIcon = faBoxesStacked;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly addIcon = faPlus;
  readonly removeIcon = faTrashCan;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  readonly movementNature = signal<'E' | 'S'>('E');

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

  // Un formulario por naturaleza: no se permite combinar COMPRA con salida
  // ni CONSUMO con entrada. VENTA se registra exclusivamente desde el POS.
  readonly allowedMovementTypes = computed(() => {
    const incoming = this.movementNature() === 'E';
    return this.movementTypes.filter(({ value }) => incoming
      ? ([
          ResourceMovementRegisterRequestTipoEnum.Compra,
          ResourceMovementRegisterRequestTipoEnum.Donacion,
          ResourceMovementRegisterRequestTipoEnum.Devolucion,
          ResourceMovementRegisterRequestTipoEnum.Ajuste,
          ResourceMovementRegisterRequestTipoEnum.Otro,
        ] as readonly ResourceMovementRegisterRequestTipoEnum[]).includes(value)
      : ([
          ResourceMovementRegisterRequestTipoEnum.Consumo,
          ResourceMovementRegisterRequestTipoEnum.Transferencia,
          ResourceMovementRegisterRequestTipoEnum.Merma,
          ResourceMovementRegisterRequestTipoEnum.Ajuste,
          ResourceMovementRegisterRequestTipoEnum.Otro,
        ] as readonly ResourceMovementRegisterRequestTipoEnum[]).includes(value),
    );
  });

  readonly configurableProducts = computed(() => {
    const warehouseId = Number(this.currentWarehouse()?.almacenId ?? 0);
    const configured = new Set(
      this.stock()
        .filter((item) => Number(item.almacenId ?? 0) === warehouseId)
        .map((item) => Number(item.productoId ?? 0)),
    );

    return this.configureProducts().filter(
      (item) =>
        item.estado !== false &&
        Number(item.productoId ?? 0) > 0 &&
        !configured.has(Number(item.productoId)),
    );
  });

  selectedConfigureProduct(): ResourceProductListItemResponse | null {
    const productId = Number(this.configureForm.controls.productoId.value);
    return (
      this.configureProducts().find(
        (item) => Number(item.productoId ?? 0) === productId,
      ) ?? null
    );
  }

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly createForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    distritoCodigo: [
      '',
      [Validators.required, Validators.pattern(/^\d{6}$/)],
    ],
    centroPobladoId: [0],
    referencia: ['', [Validators.maxLength(300)]],
    codigo: ['', [Validators.maxLength(40)]],
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    descripcion: ['', [Validators.maxLength(400)]],
  });

  readonly shareForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    permiteEntrada: [true],
    permiteSalida: [true],
  });

  readonly configureForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    productoId: [0, [Validators.required, Validators.min(1)]],
    stockInicial: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [0, [Validators.min(0)]],
    costoUnitario: [0, [Validators.min(0)]],
    precioVenta: [0, [Validators.min(0)]],
    moneda: ['PEN', [Validators.maxLength(3)]],
    lote: ['', [Validators.maxLength(80)]],
    fechaVencimiento: [''],
    observacion: ['', [Validators.maxLength(500)]],
  });

  readonly movementForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    almacenId: [0, [Validators.required, Validators.min(1)]],
    tipo: [ResourceMovementRegisterRequestTipoEnum.Compra, [Validators.required]],
    naturaleza: [ResourceMovementRegisterRequestNaturalezaEnum.E, [Validators.required]],
    documentoReferencia: ['', [Validators.maxLength(120)]],
    observacion: ['', [Validators.maxLength(500)]],
    detalle: this.fb.array([this.createLine()]),
  });

  get lines(): FormArray {
    return this.movementForm.controls.detalle;
  }

  openCreate(
    options: WarehouseOperationOptions,
    preferredUotId?: number,
  ): Promise<AdminModalResult> {
    this.prepare('create', options, null);
    const uotId = this.resolveCreateUotId(preferredUotId);

    this.createForm.reset({
      uotId,
      distritoCodigo: '',
      centroPobladoId: 0,
      referencia: '',
      codigo: '',
      nombre: '',
      descripcion: '',
    });
    this.createForm.controls.uotId[
      this.uot.modo() === 'GENERAL' ? 'enable' : 'disable'
    ]({ emitEvent: false });
    this.initialDistrictCode.set('');
    this.initialPopulationCenterId.set(null);
    this.loadSuggestedCode(true);
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

  openConfigure(
    warehouse: ResourceWarehouseResponse,
    options: WarehouseOperationOptions,
    preferredUotId?: number,
  ): Promise<AdminModalResult> {
    this.prepare('configure', options, warehouse);

    const uotId = this.uot.isSpecific()
      ? this.uot.selectedId() ?? warehouse.uotPropietariaId ?? 0
      : preferredUotId ?? warehouse.uotPropietariaId ?? 0;

    this.configureForm.reset({
      uotId,
      productoId: 0,
      stockInicial: 0,
      stockMinimo: 0,
      costoUnitario: 0,
      precioVenta: 0,
      moneda: 'PEN',
      lote: '',
      fechaVencimiento: '',
      observacion: '',
    });

    this.resetSupportState();

    this.configureForm.controls.uotId[
      this.uot.modo() === 'GENERAL' ? 'enable' : 'disable'
    ]({ emitEvent: false });

    this.loadConfigureProducts();
    return this.show();
  }

  openMovement(
    options: WarehouseOperationOptions,
    preferredUotId?: number,
    selection?: { warehouseId?: number; productId?: number; nature?: 'E' | 'S' },
  ): Promise<AdminModalResult> {
    this.prepare('movement', options, null);
    this.movementNature.set(selection?.nature === 'S' ? 'S' : 'E');
    this.lines.clear();
    this.lines.push(this.createLine());
    this.movementForm.reset({
      uotId: this.resolveCreateUotId(preferredUotId),
      almacenId: options.warehouses[0]?.almacenId ?? 0,
      tipo: this.movementNature() === 'S'
        ? ResourceMovementRegisterRequestTipoEnum.Consumo
        : ResourceMovementRegisterRequestTipoEnum.Compra,
      naturaleza: this.movementNature() === 'S'
        ? ResourceMovementRegisterRequestNaturalezaEnum.S
        : ResourceMovementRegisterRequestNaturalezaEnum.E,
      documentoReferencia: '',
      observacion: '',
    });
    this.movementForm.controls.uotId[
      this.uot.isGeneral() ? 'enable' : 'disable'
    ]({ emitEvent: false });
    this.onMovementUnitChange();
    if (selection?.warehouseId && this.warehousesForUnit().some(
      (item) => item.almacenId === selection.warehouseId,
    )) {
      this.movementForm.controls.almacenId.setValue(selection.warehouseId);
    }
    if (selection?.productId && this.products().some(
      (item) => item.productoId === selection.productId,
    )) {
      this.lines.at(0).get('productoId')?.setValue(selection.productId);
    }
    return this.show();
  }

  addLine(): void {
    this.lines.push(this.createLine());
  }

  removeLine(index: number): void {
    if (this.lines.length <= 1) return;
    this.lines.removeAt(index);
  }

  setGeography(selection: GeographySelection): void {
    this.createForm.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.createForm.controls.distritoCodigo.markAsTouched();
  }

  onCreateUnitChange(): void {
    this.loadSuggestedCode(true);
  }

  onConfigureUnitChange(): void {
    this.configureForm.controls.productoId.setValue(0);
    this.loadConfigureProducts();
  }

  onConfigureProductChange(): void {
    this.syncConfigureProductRules();
  }

  onConfigureSupportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectSupportFile(input.files?.item(0) ?? null);
    if (this.supportFileError()) input.value = '';
  }

  onSupportDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.canSelectSupportFile()) this.supportDragActive.set(true);
  }

  onSupportDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.supportDragActive.set(false);
  }

  onSupportDrop(event: DragEvent): void {
    event.preventDefault();
    this.supportDragActive.set(false);
    if (!this.canSelectSupportFile()) return;
    this.selectSupportFile(event.dataTransfer?.files.item(0) ?? null);
  }

  canSelectSupportFile(): boolean {
    return Number(this.configureForm.controls.stockInicial.value) > 0 && !this.saving();
  }

  supportFileSize(bytes: number): string {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  }

  clearConfigureSupportFile(input?: HTMLInputElement): void {
    if (this.saving()) return;
    this.configureSupportFile.set(null);
    this.supportFileError.set(null);
    if (input) input.value = '';
  }

  private selectSupportFile(file: File | null): void {
    this.supportFileError.set(null);
    this.configureSupportFile.set(null);
    if (!file) return;
    if (!this.canSelectSupportFile()) {
      this.supportFileError.set('Ingresa primero un stock inicial mayor que cero.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'webp']);
    if (!allowed.has(ext)) {
      this.supportFileError.set('Formato no admitido. Usa PDF, Office, CSV, TXT o una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size <= 0 || file.size > this.maxSupportFileBytes) {
      this.supportFileError.set('El archivo debe tener contenido y pesar como máximo 10 MB.');
      return;
    }
    this.configureSupportFile.set(file);
  }

  private resetSupportState(): void {
    if (this.supportFileInput) this.supportFileInput.nativeElement.value = '';
    this.configureSupportFile.set(null);
    this.supportFileError.set(null);
    this.supportDragActive.set(false);
    this.supportPhase.set('idle');
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    if (this.mode() === 'share') {
      this.saveShare();
    } else if (this.mode() === 'configure') {
      this.saveConfigure();
    } else if (this.mode() === 'movement') {
      this.saveMovement();
    } else {
      this.saveWarehouse();
    }
  }

  title(): string {
    if (this.mode() === 'share') return 'Compartir almacén';
    if (this.mode() === 'configure') return 'Agregar producto al almacén';
    if (this.mode() === 'movement') return this.movementNature() === 'E'
      ? 'Registrar entrada de productos' : 'Registrar salida de productos';
    return 'Registrar almacén';
  }

  icon() {
    if (this.mode() === 'share') return this.shareIcon;
    if (this.mode() === 'configure') return this.configureIcon;
    if (this.mode() === 'movement') return this.movementIcon;
    return this.warehouseIcon;
  }

  warehousesForUnit(): readonly ResourceWarehouseResponse[] {
    const unitId = Number(this.movementForm.controls.uotId.value);
    if (unitId <= 0) {
      return this.uot.isGeneral() ? [] : this.warehouses();
    }
    return this.warehouses().filter(
      (item) =>
        (item.uotPropietariaId === unitId ||
          item.tipoAcceso?.toUpperCase() === 'COMPARTIDO') &&
        (this.movementNature() === 'E'
          ? item.permiteEntrada !== false
          : item.permiteSalida !== false),
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
    const code = raw.codigo.trim().toUpperCase();

    this.run(
      this.api.createWarehouse({
        uotId: Number(raw.uotId),
        ubicacion: {
          distritoCodigo: raw.distritoCodigo.trim(),
          centroPobladoId:
            Number(raw.centroPobladoId) > 0
              ? Number(raw.centroPobladoId)
              : undefined,
          referencia: normalizeOptionalText(raw.referencia),
        },
        codigo: code || undefined,
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

    if (!raw.permiteEntrada && !raw.permiteSalida) {
      this.errorMessage.set('Habilite entrada, salida o ambas para compartir el almacén.');
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

  private saveConfigure(): void {
    const warehouse = this.currentWarehouse();
    this.syncConfigureProductRules(false);
    this.configureForm.updateValueAndValidity({ emitEvent: false });
    this.configureForm.markAllAsTouched();

    if (
      !warehouse?.almacenId ||
      this.configureForm.invalid ||
      this.saving() ||
      this.loadingProducts()
    ) {
      return;
    }

    const raw = this.configureForm.getRawValue();
    const initialStock = Number(raw.stockInicial);
    const cost = Number(raw.costoUnitario);
    const salePrice = Number(raw.precioVenta);
    const selectedProduct = this.selectedConfigureProduct();
    if (salePrice > 0 && selectedProduct?.permiteVenta !== true) {
      this.errorMessage.set('Este producto está definido como exclusivamente operativo.');
      return;
    }
    const supportFile = this.configureSupportFile();

    if (supportFile && initialStock <= 0) {
      this.errorMessage.set(
        'El documento de sustento solo corresponde cuando el stock inicial genera una entrada en Kardex.',
      );
      return;
    }

    this.saving.set(true);
    this.supportPhase.set(supportFile ? 'upload' : 'register');
    this.errorMessage.set(null);

    let uploadedFileId = 0;
    const supportUpload$: Observable<
      LocalDocumentFileResponse | undefined
    > = supportFile
      ? this.documents.upload({
          uotId: Number(raw.uotId),
          file: supportFile,
          category: 'DOCUMENTO_ALMACEN',
          description: 'Sustento del stock inicial del almacén',
        })
      : of(undefined);

    supportUpload$
      .pipe(
        switchMap((uploaded) => {
          uploadedFileId = Number(uploaded?.archivoId ?? 0);
          this.supportPhase.set('register');

          return this.api.configureWarehouseProduct(warehouse.almacenId!, {
            uotId: Number(raw.uotId),
            productoId: Number(raw.productoId),
            stockInicial: initialStock,
            stockMinimo: Number(raw.stockMinimo),
            costoUnitario: cost > 0 ? cost : undefined,
            precioVenta: salePrice > 0 ? salePrice : undefined,
            moneda:
              cost > 0 || salePrice > 0
                ? raw.moneda.trim().toUpperCase() || 'PEN'
                : undefined,
            lote: normalizeOptionalText(raw.lote),
            fechaVencimiento: raw.fechaVencimiento || undefined,
            archivoSustentoId:
              uploadedFileId > 0 ? uploadedFileId : undefined,
            observacion: normalizeOptionalText(raw.observacion),
          });
        }),
        finalize(() => {
          this.saving.set(false);
          this.supportPhase.set('idle');
        }),
      )
      .subscribe({
        next: () => {
          this.toast.success('Producto agregado al almacén');
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          if (uploadedFileId > 0) {
            this.documents
              .retire(
                uploadedFileId,
                'El registro de stock inicial no pudo completarse.',
              )
              .subscribe({ error: () => undefined });
          }

          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo agregar el producto al almacén', message);
        },
      });
  }

  private saveMovement(): void {
    this.movementForm.markAllAsTouched();
    if (this.movementForm.invalid || this.saving()) return;

    const raw = this.movementForm.getRawValue();
    const movementNature = this.movementNature();
    if (raw.naturaleza !== movementNature ||
        !this.allowedMovementTypes().some((type) => type.value === raw.tipo)) {
      this.errorMessage.set('El tipo de movimiento no corresponde a la operación seleccionada.');
      return;
    }

    const selectedWarehouse = this.warehouses().find(
      (item) => item.almacenId === Number(raw.almacenId),
    );
    if (!selectedWarehouse || (movementNature === 'E'
      ? selectedWarehouse.permiteEntrada === false
      : selectedWarehouse.permiteSalida === false)) {
      this.errorMessage.set('El almacén no permite esta operación.');
      return;
    }

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
        naturaleza: movementNature === 'E'
          ? ResourceMovementRegisterRequestNaturalezaEnum.E
          : ResourceMovementRegisterRequestNaturalezaEnum.S,
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
      movementNature === 'E' ? 'Entrada registrada' : 'Salida registrada',
    );
  }

  private resolveCreateUotId(preferredUotId?: number): number {
    if (this.uot.isSpecific()) {
      return this.uot.selectedId() ?? 0;
    }

    return preferredUotId && preferredUotId > 0 ? preferredUotId : 0;
  }

  private loadSuggestedCode(force = false): void {
    const uotId = Number(this.createForm.getRawValue().uotId);
    const control = this.createForm.controls.codigo;

    if (uotId <= 0) {
      if (force) control.setValue('', { emitEvent: false });
      return;
    }

    if (!force && control.dirty && control.value.trim()) return;

    this.codeLoading.set(true);
    this.api
      .suggestCode(uotId, 'ALMACEN')
      .pipe(finalize(() => this.codeLoading.set(false)))
      .subscribe({
        next: (code) => {
          if (!code) return;
          control.setValue(code, { emitEvent: false });
          control.markAsPristine();
        },
        error: () => {
          if (force) {
            control.setValue('', { emitEvent: false });
            control.markAsPristine();
          }
        },
      });
  }

  private loadConfigureProducts(): void {
    const uotId = Number(this.configureForm.getRawValue().uotId);
    this.configureProducts.set([]);
    this.syncConfigureProductRules(false);

    if (uotId <= 0) return;

    this.loadingProducts.set(true);
    this.api
      .listAllProducts(uotId)
      .pipe(finalize(() => this.loadingProducts.set(false)))
      .subscribe({
        next: (items) => this.configureProducts.set(items),
        error: (error) => {
          this.errorMessage.set(mapOpenApiError(error).message);
        },
      });
  }

  private syncConfigureProductRules(emitEvent = true): void {
    const product = this.selectedConfigureProduct();
    const lot = this.configureForm.controls.lote;
    const expiration = this.configureForm.controls.fechaVencimiento;

    lot.setValidators(
      product?.requiereLote
        ? [Validators.required, Validators.maxLength(80)]
        : [Validators.maxLength(80)],
    );
    expiration.setValidators([
      ...(product?.controlaVencimiento ? [Validators.required] : []),
      (control) => {
        const value = String(control.value ?? '').trim();
        return value && value < this.today ? { pastDate: true } : null;
      },
    ]);

    lot.updateValueAndValidity({ emitEvent });
    expiration.updateValueAndValidity({ emitEvent });
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
    this.configureProducts.set([]);
    this.stock.set(options.stock);
    this.currentWarehouse.set(warehouse);
    this.errorMessage.set(null);
    this.loadingProducts.set(false);
    this.codeLoading.set(false);
    if (this.currencies().length === 0) {
      this.refs.catalog('MONEDA').subscribe({
        next: (items) => this.currencies.set(
          items.map((item) => ({ code: item.code, label: item.label })),
        ),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
    }
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
    this.configureProducts.set([]);
    this.resetSupportState();
  }
}
