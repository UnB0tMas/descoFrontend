import { DialogBackdropDirective } from '../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  untracked,
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
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { IdempotencyKeyService } from '../../../../../../../core/http/services/idempotency-key.service';
import { POS_GATEWAY, PosGateway } from '../../../../../application/port/out/pos.gateway';

import { AccessStore } from '../../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { DataTableComponent } from '../../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../../shared/data-display/data-table/data-table.types';
import { PaginatorComponent } from '../../../../../../../shared/data-display/paginator/paginator';
import { RecordCardComponent } from '../../../../../../../shared/data-display/record-card/record-card';
import { ListViewMode, ListViewSwitchComponent } from '../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { PersonDataFieldsComponent } from '../../../../../../../shared/forms/person-registration/person-data-fields';
import { PersonLookupComponent, PersonDocumentOption } from '../../../../../../../shared/forms/person-registration/person-lookup';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
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
  PosSaleRecord, PosSaleDetail,
} from '../../../../../domain/pos.model';
import { PosCartStore } from '../../../../../state/pos-cart.store';
import { PosProductImageComponent } from '../../components/pos-product-image/pos-product-image';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    DialogBackdropDirective,
    ActionConfirmDialogComponent,
    DataTableComponent,
    PaginatorComponent,
    RecordCardComponent,
    ListViewSwitchComponent,
    PersonDataFieldsComponent,
    PersonLookupComponent,
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
export class PosPage {
  @ViewChild(ActionConfirmDialogComponent) private confirmation?: ActionConfirmDialogComponent;
  @ViewChild(PersonLookupComponent) private customerLookup?: PersonLookupComponent;
  @ViewChild('checkoutDialog') private checkoutDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('saleDetailDialog') private saleDetailDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('receiptDialog') private receiptDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('manualCustomerDialog', { static: true })
  private readonly manualCustomerDialog!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly access = inject(AccessStore);
  readonly permissions = inject(PermissionService);
  private readonly operations: PosGateway = inject(POS_GATEWAY);
  private readonly idempotency = inject(IdempotencyKeyService);
  private lastIdentity = '';
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
  readonly activeView = signal<'venta' | 'historial'>('venta');
  readonly catalogView = signal<ListViewMode>('table');
  readonly historyView = signal<ListViewMode>('table');
  readonly catalogPage = signal(1);
  readonly catalogPageSize = signal(10);
  readonly historyPage = signal(1);
  readonly historyPageSize = signal(10);
  readonly historySearch = signal('');
  readonly receiptSale = signal<PosSaleDetail | null>(null);
  readonly receiptLoading = signal(false);
  readonly receiptError = signal<string | null>(null);
  readonly sales = signal<readonly PosSaleRecord[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly selectedSale = signal<PosSaleDetail | null>(null);
  readonly saleActionId = signal<number | null>(null);
  readonly cancelReason = signal('');
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
  readonly personDocumentOptions: readonly PersonDocumentOption[] = [{ value: 'DNI', label: 'DNI' }, { value: 'RUC', label: 'RUC' }];
  readonly companyDocumentOptions: readonly PersonDocumentOption[] = [{ value: 'RUC', label: 'RUC' }];

  readonly generalCustomer: PosCustomer = {
    type: 'PERSONA', personId: null, companyId: null,
    documentType: 'DNI', documentNumber: '', displayName: 'Cliente varios',
  };

  useGeneralCustomer(): void {
    if (this.cart.locked() || this.processing()) return;
    this.cart.setCustomer(null);
    this.customerForm.controls.documentNumber.setValue('');
    this.customerMessage.set(null);
    this.customerTone.set('neutral');
    this.customerLookup?.focusDocument();
  }

  customerDocumentOptions(): readonly PersonDocumentOption[] {
    return this.customerForm.controls.type.value === 'EMPRESA' ? this.companyDocumentOptions : this.personDocumentOptions;
  }

  setHistoryView(view: ListViewMode): void {
    this.historyView.set(view);
    try { localStorage.setItem('desco:pos:history-view', view); } catch { /* storage disabled */ }
  }

  setCatalogView(view: ListViewMode): void {
    this.catalogView.set(view);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('desco:pos:view', view); } catch { /* storage disabled */ }
    }
  }

  onCatalogSearch(value: string): void {
    this.search.set(value);
    this.catalogPage.set(1);
  }

  onHistorySearch(value: string): void {
    this.historySearch.set(value);
    this.historyPage.set(1);
  }

  async openCheckoutDialog(): Promise<void> {
    if (!this.canCheckout()) return;
    // Cuando el registro es incierto o ya tiene ID, no se altera el cliente del reintento.
    if (!this.cart.customer() && !this.cart.locked()) {
      const response = await this.confirmation?.show({
        title: 'Venta sin cliente',
        message: '¿Está seguro de continuar sin identificar al cliente?',
        confirmLabel: 'Continuar sin cliente',
        cancelLabel: 'Agregar cliente',
        tone: 'warning',
      });
      if (!response?.confirmed) {
        this.customerLookup?.focusDocument();
        return;
      }
    }
    if (this.canCheckout() && !this.checkoutDialog?.nativeElement.open) {
      this.checkoutDialog?.nativeElement.showModal();
    }
  }

  closeCheckoutDialog(): void {
    if (!this.processing()) this.checkoutDialog?.nativeElement.close();
  }

  closeSaleDetail(): void {
    this.saleDetailDialog?.nativeElement.close();
    this.selectedSale.set(null);
  }

  openReceipt(saleId: number): void {
    this.receiptSale.set(null);
    this.receiptError.set(null);
    this.receiptLoading.set(true);
    this.receiptDialog?.nativeElement.showModal();
    this.operations.getSaleDetail(saleId).pipe(finalize(() => this.receiptLoading.set(false))).subscribe({
      next: (detail) => this.receiptSale.set(detail),
      error: (error) => this.receiptError.set(mapOpenApiError(error).message),
    });
  }

  closeReceipt(): void { this.receiptDialog?.nativeElement.close(); }

  printReceipt(): void { if (this.receiptSale()) window.print(); }

  readonly savings = computed(() => this.cart.items().reduce((total, item) =>
    total + Math.max(0, item.initialPrice - item.unitPrice) * item.quantity, 0));
  readonly salesCount = computed(() => this.sales().length);
  readonly salesTotal = computed(() => this.sales().reduce((sum, item) => sum + item.total, 0));
  readonly salesPaid = computed(() => this.sales().reduce((sum, item) => sum + item.paid, 0));

  readonly productColumns: readonly DataTableColumn<PosProduct>[] = [
    { key: 'name', label: 'Producto', format: (_value, row) => `${row.name}${row.code ? ' · ' + row.code : ''}` },
    { key: 'category', label: 'Categoría', format: (_value, row) => row.category || '—' },
    { key: 'unitPrice', label: 'Precio', align: 'right', format: (_value, row) => `${row.currency} ${row.unitPrice.toFixed(2)}` },
    { key: 'stockAvailable', label: 'Disponible', align: 'right', format: (_value, row) => `${row.stockAvailable} ${row.unit}` },
  ];

  readonly saleColumns: readonly DataTableColumn<PosSaleRecord>[] = [
    { key: 'saleId', label: 'Venta', format: (_value, row) => `#${row.saleId}` },
    { key: 'date', label: 'Fecha' },
    { key: 'customer', label: 'Cliente', format: (_value, row) => row.customer || 'Cliente varios' },
    { key: 'state', label: 'Estado' },
    { key: 'total', label: 'Total', align: 'right', format: (_value, row) => `${row.currency} ${row.total.toFixed(2)}` },
    { key: 'paid', label: 'Pagado', align: 'right', format: (_value, row) => row.paid.toFixed(2) },
    { key: 'balance', label: 'Saldo', align: 'right', format: (_value, row) => row.balance.toFixed(2) },
  ];

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

  readonly catalogTotalPages = computed(() => Math.ceil(this.filteredCatalog().length / this.catalogPageSize()));
  readonly currentCatalogPage = computed(() => Math.min(this.catalogPage(), Math.max(1, this.catalogTotalPages())));
  readonly catalogPageItems = computed(() => {
    const start = (this.currentCatalogPage() - 1) * this.catalogPageSize();
    return this.filteredCatalog().slice(start, start + this.catalogPageSize());
  });

  readonly filteredSales = computed(() => {
    const term = this.historySearch().trim().toLocaleLowerCase();
    if (!term) return this.sales();
    return this.sales().filter((sale) =>
      [sale.saleId.toString(), sale.customer, sale.state, sale.date]
        .some((value) => value.toLocaleLowerCase().includes(term)));
  });
  readonly historyTotalPages = computed(() => Math.ceil(this.filteredSales().length / this.historyPageSize()));
  readonly currentHistoryPage = computed(() => Math.min(this.historyPage(), Math.max(1, this.historyTotalPages())));
  readonly historyPageItems = computed(() => {
    const start = (this.currentHistoryPage() - 1) * this.historyPageSize();
    return this.filteredSales().slice(start, start + this.historyPageSize());
  });

  readonly customerForm = this.fb.nonNullable.group({
    type: ['PERSONA' as PosCustomerType, [Validators.required]],
    documentType: ['DNI' as PosDocumentType, [Validators.required]],
    documentNumber: ['', [Validators.required]],
  });

  readonly manualForm = this.fb.nonNullable.group({
    tipoDocumento: ['DNI'],
    numeroDocumento: [''],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80)]],
    apellidoMaterno: ['', [Validators.required, Validators.maxLength(80)]],
    fechaNacimiento: [''],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: [''],
    centroPobladoId: [0],
    referencia: [''],
    businessName: ['', [Validators.maxLength(200)]],
  });

  readonly paymentForm = this.fb.nonNullable.group({
    paymentMethodId: [0, [Validators.required, Validators.min(1)]],
    operationNumber: ['', [Validators.maxLength(120)]],
    observation: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    effect(() => {
      const uotId = this.uot.isGeneral() ? null : this.uot.selectedId();
      const userId = this.access.user()?.usuarioId ?? 0;
      untracked(() => this.activateContext(uotId, userId));
    });
  }

  private activateContext(uotId: number | null, userId: number): void {
    const key = `${userId}:${uotId ?? 0}`;
    if (this.lastIdentity === key) return;
    this.lastIdentity = key;
    this.warehouses.set([]);
    this.catalog.set([]);
    this.sales.set([]);
    this.selectedSale.set(null);
    this.catalogPage.set(1);
    this.historyPage.set(1);
    this.contextError.set(null);
    this.catalogError.set(null);
    this.historyError.set(null);
    if (!uotId || uotId <= 0 || userId <= 0) {
      this.contextError.set('Seleccione una UOT específica y una sesión válida para operar.');
      return;
    }
    this.cart.initialize(userId, uotId);
    try {
      this.catalogView.set(localStorage.getItem('desco:pos:view') === 'cards' ? 'cards' : 'table');
      this.historyView.set(localStorage.getItem('desco:pos:history-view') === 'cards' ? 'cards' : 'table');
    } catch { /* storage unavailable */ }
    this.loadContext();
  }

  changeView(view: 'venta' | 'historial'): void {
    if (this.processing()) return;
    this.activeView.set(view);
    if (view === 'historial') this.loadHistory();
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
          if (uotId !== this.currentUotId()) return;
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
          if (uotId !== this.currentUotId() || warehouseId !== this.cart.warehouseId()) return;
          this.catalog.set(products);
          this.catalogPage.set(1);
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
    if (this.cart.locked() || this.processing()) return;
    const error = this.cart.add(product);

    if (error) {
      this.toast.warning('No se agregó el producto', error);
    }
  }

  async removeProduct(productId: number): Promise<void> {
    if (this.cart.locked() || this.processing()) return;
    const item = this.cart.items().find(x => x.productId === productId);
    if (!item) return;
    const response = await this.confirmation?.show({
      title: 'Quitar producto', message: `¿Quitar ${item.name} del carrito?`,
      confirmLabel: 'Quitar', cancelLabel: 'Conservar', tone: 'warning',
    });
    if (response?.confirmed) this.cart.remove(productId);
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

  async clearCart(): Promise<void> {
    if (this.cart.items().length === 0 || this.processing()) return;
    if (this.cart.locked()) {
      this.toast.warning('Venta en proceso', 'Reanude la operación pendiente.');
      return;
    }
    const response = await this.confirmation?.show({
      title: 'Vaciar carrito',
      message: 'Se quitarán todos los productos de la venta actual.',
      confirmLabel: 'Vaciar',
      cancelLabel: 'Conservar',
      tone: 'danger',
    });
    if (!response?.confirmed) return;
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

  onCustomerDocumentTypeChange(type?: string): void {
    this.customerForm.controls.documentType.setValue(
      this.customerForm.controls.type.value === 'EMPRESA' ? 'RUC' : (type === 'RUC' ? 'RUC' : 'DNI'),
    );
    this.customerForm.controls.documentNumber.setValue('');
    this.resetCustomerSelection();
  }

  onCustomerDocumentInput(value?: string): void {
    const type = this.customerForm.controls.documentType.value;
    const control = this.customerForm.controls.documentNumber;
    const sanitized = (value ?? control.value).replace(/\D+/g, '').slice(
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

    const isPerson = this.customerForm.controls.type.value === 'PERSONA';
    for (const control of [
      this.manualForm.controls.nombres, this.manualForm.controls.apellidoPaterno,
      this.manualForm.controls.apellidoMaterno,
    ]) {
      control.setValidators(isPerson ? [Validators.required] : []);
      control.updateValueAndValidity({ emitEvent: false });
    }
    this.manualForm.controls.businessName.setValidators(isPerson ? [] : [Validators.required]);
    this.manualForm.controls.businessName.updateValueAndValidity({ emitEvent: false });
    this.manualForm.reset({
      tipoDocumento: this.customerForm.controls.documentType.value,
      numeroDocumento: this.customerForm.controls.documentNumber.value,
      nombres: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '',
      telefono: '', correo: '', distritoCodigo: '', centroPobladoId: 0, referencia: '',
      businessName: '',
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
      if (!raw.nombres.trim() || !raw.apellidoPaterno.trim() || !raw.apellidoMaterno.trim()) {
        this.toast.warning(
          'Datos incompletos',
          'Complete nombres y apellidos del cliente.',
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
        names: raw.nombres.trim() || undefined,
        paternalSurname:
          raw.apellidoPaterno.trim() || undefined,
        maternalSurname:
          raw.apellidoMaterno.trim() || undefined,
        businessName:
          raw.businessName.trim() || undefined,
        phone: raw.telefono.trim() || undefined,
        email:
          raw.correo.trim().toLowerCase() || undefined,
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
    const customer = this.cart.customer() ?? this.generalCustomer;
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
        'Seleccione almacén, productos y método de pago antes de finalizar.',
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
          this.checkoutDialog?.nativeElement.close();
          this.openReceipt(result.saleId);

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
          this.sales.set([]);
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

  loadHistory(): void {
    const uotId = this.currentUotId();
    if (!uotId) return;
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.operations.listSales(uotId)
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: (sales) => {
          if (uotId === this.currentUotId()) { this.sales.set(sales); this.historyPage.set(1); }
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message),
      });
  }

  viewSale(saleId: number): void {
    if (this.saleActionId() !== null) return;
    this.saleActionId.set(saleId);
    this.historyError.set(null);
    this.operations.getSaleDetail(saleId)
      .pipe(finalize(() => this.saleActionId.set(null)))
      .subscribe({
        next: (detail) => {
          this.selectedSale.set(detail);
          if (!this.saleDetailDialog?.nativeElement.open) this.saleDetailDialog?.nativeElement.showModal();
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message),
      });
  }

  paySelectedSale(): void {
    const sale = this.selectedSale()?.sale;
    const method = this.selectedPaymentMethod();
    const operationNumber = this.paymentForm.controls.operationNumber.value.trim();
    if (!sale || this.saleActionId() || !method || sale.balance <= 0
      || sale.state === 'ANULADA' || sale.state === 'ENTREGADA'
      || (method.requiresOperationNumber && !operationNumber)) {
      this.historyError.set('Seleccione un método válido e ingrese la referencia del pago cuando corresponda.');
      return;
    }
    const input = { saleId: sale.saleId, paymentMethodId: method.paymentMethodId,
      amount: sale.balance, operationNumber };
    this.saleActionId.set(sale.saleId);
    this.historyError.set(null);
    this.idempotency.idempotent(`pos:gestor:pagar:${sale.saleId}`, input, (key) =>
      this.operations.paySale(sale.saleId, method.paymentMethodId, sale.balance,
        operationNumber || undefined, key))
      .pipe(finalize(() => this.saleActionId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(`Pago registrado en venta #${sale.saleId}`);
          this.viewSale(sale.saleId);
          this.loadHistory();
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message
          + ' Consulte el detalle actualizado antes de reintentar.'),
      });
  }

  deliverSelectedSale(): void {
    const sale = this.selectedSale()?.sale;
    if (!sale || this.saleActionId() || sale.balance > 0
      || sale.state === 'ENTREGADA' || sale.state === 'ANULADA') {
      this.historyError.set('La venta debe estar pagada y pendiente de entrega.');
      return;
    }
    this.saleActionId.set(sale.saleId);
    this.historyError.set(null);
    this.idempotency.idempotent(`pos:gestor:entregar:${sale.saleId}`, { saleId: sale.saleId },
      (key) => this.operations.deliverSale(sale.saleId, key))
      .pipe(finalize(() => this.saleActionId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(`Venta #${sale.saleId} entregada`, 'Stock descontado por Kardex.');
          if (this.cart.pendingSaleId() === sale.saleId) this.cart.clearAfterSuccess();
          this.viewSale(sale.saleId);
          this.loadHistory();
          this.loadCatalog();
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message
          + ' Consulte el detalle actualizado antes de reintentar.'),
      });
  }

  cancelSelectedSale(): void {
    const sale = this.selectedSale()?.sale;
    const reason = this.cancelReason().trim();
    if (!sale || this.saleActionId() || reason.length < 5 || reason.length > 300
      || sale.paid > 0 || sale.state === 'ENTREGADA' || sale.state === 'ANULADA') {
      this.historyError.set('Para anular, ingrese un motivo de 5 a 300 caracteres. La venta no debe tener pagos ni estar entregada.');
      return;
    }
    this.saleActionId.set(sale.saleId);
    this.historyError.set(null);
    this.operations.cancelSale(sale.saleId, reason)
      .pipe(finalize(() => this.saleActionId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(`Venta #${sale.saleId} anulada`);
          if (this.cart.pendingSaleId() === sale.saleId) this.cart.clearAfterSuccess();
          this.closeSaleDetail();
          this.cancelReason.set('');
          this.loadHistory();
          this.loadCatalog();
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message),
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
      && this.cart.items().length > 0
      && Number(this.paymentForm.controls.paymentMethodId.value) > 0
      && this.selectedPaymentMethod() !== null
      && this.cart.items().every((item) => item.quantity > 0
        && item.quantity <= item.stockAvailable);
  }

  private currentUotId(): number | null {
    const id = this.uot.selectedId();

    return !this.uot.isGeneral() && id && id > 0
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
