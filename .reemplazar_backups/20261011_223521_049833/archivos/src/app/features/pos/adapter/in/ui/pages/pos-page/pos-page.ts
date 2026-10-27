import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCartShopping,
  faCashRegister,
  faCreditCard,
  faMagnifyingGlass,
  faMinus,
  faPlus,
  faRotate,
  faTrash,
  faUserCheck,
  faWarehouse,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessStore } from '../../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { CargarPosUseCase } from '../../../../../application/use-case/cargar-pos.use-case';
import { ProcesarVentaPosUseCase } from '../../../../../application/use-case/procesar-venta-pos.use-case';
import { ResolverClientePosUseCase } from '../../../../../application/use-case/resolver-cliente-pos.use-case';
import {
  PosCustomer,
  PosCustomerType,
  PosDocumentType,
  PosPaymentMethod,
  PosProduct,
} from '../../../../../domain/pos.model';
import { PosCartStore } from '../../../../../state/pos-cart.store';
import { PosProductImageComponent } from '../../components/pos-product-image/pos-product-image';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    FaIconComponent,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FormErrorComponent,
    PosProductImageComponent,
  ],
  templateUrl: './pos-page.html',
  styleUrl: './pos-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosPage implements OnInit {
  @ViewChild('manualCustomerDialog', { static: true })
  private readonly manualCustomerDialog!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly access = inject(AccessStore);
  private readonly loadPos = inject(CargarPosUseCase);
  private readonly resolveCustomerUseCase = inject(ResolverClientePosUseCase);
  private readonly checkoutUseCase = inject(ProcesarVentaPosUseCase);
  private readonly toast = inject(ToastService);

  readonly uot = inject(UotContextStore);
  readonly cart = inject(PosCartStore);

  readonly contextLoading = signal(false);
  readonly catalogLoading = signal(false);
  readonly customerLoading = signal(false);
  readonly manualSaving = signal(false);
  readonly processing = signal(false);

  readonly contextError = signal<string | null>(null);
  readonly catalogError = signal<string | null>(null);
  readonly customerMessage = signal<string | null>(null);
  readonly customerTone = signal<'neutral' | 'success' | 'warning' | 'error'>('neutral');
  readonly checkoutError = signal<string | null>(null);
  readonly lastSaleId = signal<number | null>(null);

  readonly warehouses = signal<readonly {
    warehouseId: number;
    code: string;
    name: string;
  }[]>([]);
  readonly paymentMethods = signal<readonly PosPaymentMethod[]>([]);
  readonly catalog = signal<readonly PosProduct[]>([]);
  readonly search = signal('');

  readonly pageIcon = faCashRegister;
  readonly cartIcon = faCartShopping;
  readonly searchIcon = faMagnifyingGlass;
  readonly refreshIcon = faRotate;
  readonly plusIcon = faPlus;
  readonly minusIcon = faMinus;
  readonly trashIcon = faTrash;
  readonly customerIcon = faUserCheck;
  readonly paymentIcon = faCreditCard;
  readonly warehouseIcon = faWarehouse;
  readonly closeIcon = faXmark;

  readonly filteredCatalog = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.catalog();
    }

    return this.catalog().filter((product) =>
      [
        product.code,
        product.name,
        product.description ?? '',
        product.category ?? '',
      ].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  });

  readonly customerForm = this.fb.nonNullable.group({
    type: ['PERSONA' as PosCustomerType, [Validators.required]],
    documentType: ['DNI' as PosDocumentType, [Validators.required]],
    documentNumber: ['', [Validators.required]],
  });

  readonly manualForm = this.fb.nonNullable.group({
    names: ['', [Validators.maxLength(120)]],
    paternalSurname: ['', [Validators.maxLength(80)]],
    maternalSurname: ['', [Validators.maxLength(80)]],
    businessName: ['', [Validators.maxLength(200)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(180)]],
  });

  readonly paymentForm = this.fb.nonNullable.group({
    paymentMethodId: [0, [Validators.required, Validators.min(1)]],
    operationNumber: ['', [Validators.maxLength(120)]],
    observation: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const uotId = this.uot.selectedId();
    const userId = this.access.user()?.usuarioId ?? 0;

    if (
      this.uot.isGeneral()
      || !uotId
      || uotId <= 0
      || userId <= 0
    ) {
      this.contextError.set(
        'El POS requiere una UOT específica. Seleccione una UOT antes de vender.',
      );
      return;
    }

    this.cart.initialize(userId, uotId);
    this.loadContext();
  }

  loadContext(): void {
    const uotId = this.currentUotId();

    if (!uotId) {
      return;
    }

    this.contextLoading.set(true);
    this.contextError.set(null);

    this.loadPos
      .context(uotId)
      .pipe(finalize(() => this.contextLoading.set(false)))
      .subscribe({
        next: ({ warehouses, paymentMethods }) => {
          this.warehouses.set(warehouses);
          this.paymentMethods.set(paymentMethods);

          const paymentId =
            this.paymentForm.controls.paymentMethodId.value;

          if (
            !paymentMethods.some(
              (item) => item.paymentMethodId === paymentId,
            )
          ) {
            this.paymentForm.controls.paymentMethodId.setValue(
              paymentMethods[0]?.paymentMethodId ?? 0,
            );
          }

          const currentWarehouseId = this.cart.warehouseId();
          const currentExists = warehouses.some(
            (item) => item.warehouseId === currentWarehouseId,
          );

          if (currentExists && currentWarehouseId) {
            this.loadCatalog();
            return;
          }

          if (this.cart.items().length > 0) {
            this.contextError.set(
              'El almacén guardado en el carrito ya no está disponible. No se modificó el borrador para evitar inconsistencias.',
            );
            return;
          }

          const firstWarehouseId =
            warehouses[0]?.warehouseId ?? 0;

          if (firstWarehouseId > 0) {
            this.cart.setWarehouse(firstWarehouseId);
            this.loadCatalog();
          }
        },
        error: (error) =>
          this.contextError.set(
            mapOpenApiError(error).message,
          ),
      });
  }

  loadCatalog(): void {
    const uotId = this.currentUotId();
    const warehouseId = this.cart.warehouseId();

    if (!uotId || !warehouseId) {
      this.catalog.set([]);
      return;
    }

    this.catalogLoading.set(true);
    this.catalogError.set(null);

    this.loadPos
      .catalog(uotId, warehouseId)
      .pipe(finalize(() => this.catalogLoading.set(false)))
      .subscribe({
        next: (products) => {
          this.catalog.set(products);
          this.cart.syncCatalog(products);
        },
        error: (error) =>
          this.catalogError.set(
            mapOpenApiError(error).message,
          ),
      });
  }

  changeWarehouse(value: string): void {
    const warehouseId = Number(value);

    if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
      return;
    }

    if (!this.cart.setWarehouse(warehouseId)) {
      this.toast.warning(
        'Carrito activo',
        'Vacíe el carrito antes de cambiar de almacén.',
      );
      return;
    }

    this.loadCatalog();
  }

  add(product: PosProduct): void {
    const error = this.cart.add(product);

    if (error) {
      this.toast.warning('No se agregó el producto', error);
    }
  }

  increment(productId: number): void {
    const item = this.cart.items().find(
      (candidate) => candidate.productId === productId,
    );

    if (!item) {
      return;
    }

    const error = this.cart.setQuantity(
      productId,
      item.quantity + 1,
    );

    if (error) {
      this.toast.warning('Cantidad no disponible', error);
    }
  }

  decrement(productId: number): void {
    const item = this.cart.items().find(
      (candidate) => candidate.productId === productId,
    );

    if (!item) {
      return;
    }

    this.cart.setQuantity(
      productId,
      item.quantity - 1,
    );
  }

  changeQuantity(productId: number, value: string): void {
    const quantity = Number(value);

    if (!Number.isFinite(quantity)) {
      return;
    }

    const error = this.cart.setQuantity(
      productId,
      quantity,
    );

    if (error) {
      this.toast.warning('Cantidad no disponible', error);
    }
  }

  clearCart(): void {
    if (!this.cart.clearEditableCart()) {
      this.toast.warning(
        'Venta en proceso',
        'No se puede vaciar un carrito que ya inició el registro de la venta.',
      );
      return;
    }

    this.customerMessage.set(null);
    this.customerTone.set('neutral');
    this.checkoutError.set(null);
  }

  onCustomerTypeChange(): void {
    const type = this.customerForm.controls.type.value;

    if (type === 'EMPRESA') {
      this.customerForm.controls.documentType.setValue('RUC');
    } else if (
      this.customerForm.controls.documentType.value !== 'DNI'
      && this.customerForm.controls.documentType.value !== 'RUC'
    ) {
      this.customerForm.controls.documentType.setValue('DNI');
    }

    this.resetCustomerSelection();
  }

  onCustomerDocumentTypeChange(): void {
    if (this.customerForm.controls.type.value === 'EMPRESA') {
      this.customerForm.controls.documentType.setValue('RUC');
    }

    this.resetCustomerSelection();
  }

  onCustomerDocumentInput(): void {
    const type = this.customerForm.controls.documentType.value;
    const control = this.customerForm.controls.documentNumber;
    const sanitized = control.value.replace(/\D+/g, '').slice(
      0,
      type === 'DNI' ? 8 : 11,
    );

    if (sanitized !== control.value) {
      control.setValue(sanitized, { emitEvent: false });
    }

    this.resetCustomerSelection();
  }

  resolveCustomer(): void {
    const type = this.customerForm.controls.type.value;
    const documentType =
      this.customerForm.controls.documentType.value;
    const documentNumber =
      this.customerForm.controls.documentNumber.value.trim();

    if (
      !this.validDocument(
        documentType,
        documentNumber,
      )
    ) {
      this.customerTone.set('error');
      this.customerMessage.set(
        documentType === 'DNI'
          ? 'El DNI debe contener 8 dígitos.'
          : 'El RUC debe contener 11 dígitos.',
      );
      return;
    }

    this.customerLoading.set(true);
    this.customerTone.set('neutral');
    this.customerMessage.set(null);

    this.resolveCustomerUseCase
      .resolve(
        type,
        documentType,
        documentNumber,
      )
      .pipe(finalize(() => this.customerLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.customerMessage.set(result.message);

          if (result.customer) {
            this.customerTone.set('success');
            this.cart.setCustomer(result.customer);
            this.toast.success(
              result.source === 'FACTILIZA'
                ? 'Cliente importado desde Factiliza'
                : 'Cliente encontrado',
              result.customer.displayName,
            );
            return;
          }

          this.cart.setCustomer(null);

          if (result.manualEntryAllowed) {
            this.customerTone.set('warning');
            this.openManualCustomer();
            return;
          }

          this.customerTone.set('neutral');
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.customerTone.set('error');
          this.customerMessage.set(message);
          this.cart.setCustomer(null);
        },
      });
  }

  openManualCustomer(): void {
    if (this.cart.locked()) {
      return;
    }

    this.manualForm.reset({
      names: '',
      paternalSurname: '',
      maternalSurname: '',
      businessName: '',
      phone: '',
      email: '',
    });

    this.manualCustomerDialog.nativeElement.showModal();
  }

  closeManualCustomer(): void {
    if (
      !this.manualSaving()
      && this.manualCustomerDialog.nativeElement.open
    ) {
      this.manualCustomerDialog.nativeElement.close();
    }
  }

  saveManualCustomer(): void {
    const uotId = this.currentUotId();

    if (!uotId || this.manualSaving()) {
      return;
    }

    this.manualForm.markAllAsTouched();

    if (this.manualForm.invalid) {
      return;
    }

    const type = this.customerForm.controls.type.value;
    const documentType =
      this.customerForm.controls.documentType.value;
    const documentNumber =
      this.customerForm.controls.documentNumber.value.trim();
    const raw = this.manualForm.getRawValue();

    if (type === 'PERSONA') {
      if (!raw.names.trim() || !raw.paternalSurname.trim()) {
        this.toast.warning(
          'Datos incompletos',
          'Ingrese nombres y apellido paterno del cliente.',
        );
        return;
      }
    } else if (!raw.businessName.trim()) {
      this.toast.warning(
        'Datos incompletos',
        'Ingrese la razón social del cliente.',
      );
      return;
    }

    this.manualSaving.set(true);

    this.resolveCustomerUseCase
      .registerManual({
        uotId,
        type,
        documentType,
        documentNumber,
        names: raw.names.trim() || undefined,
        paternalSurname:
          raw.paternalSurname.trim() || undefined,
        maternalSurname:
          raw.maternalSurname.trim() || undefined,
        businessName:
          raw.businessName.trim() || undefined,
        phone: raw.phone.trim() || undefined,
        email:
          raw.email.trim().toLowerCase() || undefined,
      })
      .pipe(finalize(() => this.manualSaving.set(false)))
      .subscribe({
        next: (customer) => {
          this.cart.setCustomer(customer);
          this.customerTone.set('success');
          this.customerMessage.set(
            'Cliente registrado manualmente y seleccionado para la venta.',
          );
          this.closeManualCustomer();
          this.toast.success(
            'Cliente registrado',
            customer.displayName,
          );
        },
        error: (error) => {
          this.toast.error(
            'No se pudo registrar el cliente',
            mapOpenApiError(error).message,
          );
        },
      });
  }

  checkout(): void {
    const draft = this.cart.draft();
    const uotId = this.currentUotId();
    const warehouseId = this.cart.warehouseId();
    const customer = this.cart.customer();
    const paymentMethodId =
      Number(this.paymentForm.controls.paymentMethodId.value);
    const method = this.selectedPaymentMethod();

    this.checkoutError.set(null);

    if (
      !draft
      || !uotId
      || !warehouseId
      || !customer
      || this.cart.items().length === 0
      || paymentMethodId <= 0
    ) {
      this.checkoutError.set(
        'Seleccione almacén, cliente, productos y método de pago antes de finalizar.',
      );
      return;
    }

    if (
      this.cart.items().some(
        (item) =>
          item.quantity <= 0
          || item.quantity > item.stockAvailable,
      )
    ) {
      this.checkoutError.set(
        'Revise las cantidades del carrito. Uno o más productos ya no tienen stock suficiente.',
      );
      return;
    }

    const operationNumber =
      this.paymentForm.controls.operationNumber.value.trim();

    if (
      method?.requiresOperationNumber
      && !operationNumber
    ) {
      this.checkoutError.set(
        'El método de pago seleccionado requiere número de operación.',
      );
      return;
    }

    this.processing.set(true);

    this.checkoutUseCase
      .execute({
        uotId,
        warehouseId,
        customer,
        items: this.cart.items(),
        paymentMethodId,
        paymentOperation:
          operationNumber || undefined,
        observation:
          this.paymentForm.controls.observation.value.trim()
          || undefined,
        pendingSaleId: draft.pendingSaleId,
        createIdempotencyKey:
          draft.createIdempotencyKey,
        paymentIdempotencyKey:
          draft.paymentIdempotencyKey,
        deliveryIdempotencyKey:
          draft.deliveryIdempotencyKey,
      })
      .pipe(finalize(() => this.processing.set(false)))
      .subscribe({
        next: (result) => {
          this.lastSaleId.set(result.saleId);

          this.toast.success(
            `Venta #${result.saleId} completada`,
            `${result.currency} ${result.total.toFixed(2)} · ${result.state}`,
          );

          this.cart.clearAfterSuccess();
          this.customerForm.reset({
            type: 'PERSONA',
            documentType: 'DNI',
            documentNumber: '',
          });
          this.customerMessage.set(null);
          this.customerTone.set('neutral');
          this.paymentForm.controls.operationNumber.setValue('');
          this.paymentForm.controls.observation.setValue('');
          this.loadCatalog();
        },
        error: (error) => {
          const baseMessage = mapOpenApiError(error).message;
          const recovery = this.cart.locked()
            ? ' La venta quedó protegida para reintento; vuelva a pulsar “Reanudar venta” sin modificar el carrito.'
            : '';

          this.checkoutError.set(
            `${baseMessage}${recovery}`,
          );

          this.toast.error(
            'No se pudo completar la venta',
            `${baseMessage}${recovery}`,
          );
        },
      });
  }

  customerSourceLabel(customer: PosCustomer): string {
    switch (customer.source) {
      case 'FACTILIZA':
        return 'Importado con Factiliza';
      case 'MANUAL':
        return 'Registro manual';
      default:
        return 'Registrado en DESCO';
    }
  }

  selectedPaymentMethod(): PosPaymentMethod | null {
    const id =
      Number(this.paymentForm.controls.paymentMethodId.value);

    return this.paymentMethods().find(
      (method) => method.paymentMethodId === id,
    ) ?? null;
  }

  customerDocumentMaxLength(): number {
    return this.customerForm.controls.documentType.value === 'DNI'
      ? 8
      : 11;
  }

  checkoutLabel(): string {
    if (this.processing()) {
      return 'Procesando venta...';
    }

    const saleId = this.cart.pendingSaleId();

    if (saleId) {
      return `Reanudar venta #${saleId}`;
    }

    if (this.cart.creationUncertain()) {
      return 'Reanudar venta';
    }

    return 'Cobrar y entregar';
  }

  canCheckout(): boolean {
    return !this.processing()
      && this.currentUotId() !== null
      && this.cart.warehouseId() !== null
      && this.cart.customer() !== null
      && this.cart.items().length > 0
      && Number(
        this.paymentForm.controls.paymentMethodId.value,
      ) > 0;
  }

  private currentUotId(): number | null {
    const id = this.uot.selectedId();

    return id && id > 0
      ? id
      : null;
  }

  private validDocument(
    type: PosDocumentType,
    value: string,
  ): boolean {
    return type === 'DNI'
      ? /^\d{8}$/.test(value)
      : /^\d{11}$/.test(value);
  }

  private resetCustomerSelection(): void {
    if (this.cart.locked()) {
      return;
    }

    this.cart.setCustomer(null);
    this.customerMessage.set(null);
    this.customerTone.set('neutral');
  }
}
