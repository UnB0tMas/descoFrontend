import * as QRCode from 'qrcode';
import { DialogBackdropDirective } from '../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { ModalShellComponent } from '../../../../../../../shared/feedback/modal-shell/modal-shell';
import { IsolatedPrintService } from '../../../../../../../shared/printing/isolated-print.service';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CajaPosApiService, CajaSesion, VentaReporte, PosComprobante } from '../../../../../shared/caja-pos-api.service';
import { EntityRegistrationModalComponent } from '../../../../../../../shared/forms/person-registration/entity-registration-modal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  faPrint,
  faReceipt,
  faRotate,
  faTrash,
  faUserCheck,
  faWarehouse,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
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
import { PersonLookupComponent, PersonDocumentOption } from '../../../../../../../shared/forms/person-registration/person-lookup';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
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
import { E3FileDropzoneComponent } from '../../../../../../../shared/files/file-dropzone/file-dropzone';
import { PagoVentaEvidenciaService } from '../../../../../shared/pago-venta-evidencia.service';
import { PosPaymentAllocation } from '../../../../../domain/pos.model';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    DialogBackdropDirective,
    ModalShellComponent,
    RouterLink,
    EntityRegistrationModalComponent,
    ActionConfirmDialogComponent,
    DataTableComponent,
    PaginatorComponent,
    RecordCardComponent,
    ListViewSwitchComponent,
    PersonLookupComponent,
    DecimalPipe,
    ReactiveFormsModule,
    FaIconComponent,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PosProductImageComponent,
    E3FileDropzoneComponent,
  ],
  templateUrl: './pos-page.html',
  styleUrl: './pos-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosPage {
  @ViewChild(ActionConfirmDialogComponent) private confirmation?: ActionConfirmDialogComponent;
  @ViewChild(EntityRegistrationModalComponent) private entityModal?: EntityRegistrationModalComponent;
  @ViewChild(PersonLookupComponent) private customerLookup?: PersonLookupComponent;
  @ViewChild('checkoutDialog') private checkoutDialog?: ModalShellComponent;
  @ViewChild('saleDetailDialog') private saleDetailDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('receiptDialog') private receiptDialog?: ModalShellComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly cajaApi = inject(CajaPosApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly printer = inject(IsolatedPrintService);
  private readonly destroyRef = inject(DestroyRef);
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
  private readonly pagoEvidencia = inject(PagoVentaEvidenciaService);

  readonly uot = inject(UotContextStore);
  readonly cart = inject(PosCartStore);

  readonly contextLoading = signal(false);
  readonly catalogLoading = signal(false);
  readonly customerLoading = signal(false);
  readonly processing = signal(false);

  readonly contextError = signal<string | null>(null);
  readonly catalogError = signal<string | null>(null);
  readonly customerMessage = signal<string | null>(null);
  readonly customerTone = signal<'neutral' | 'success' | 'warning' | 'error'>('neutral');
  readonly checkoutError = signal<string | null>(null);
  readonly activeView = signal<'venta' | 'historial'>(this.route.snapshot.data['posView'] === 'historial' ? 'historial' : 'venta');
  readonly cajaActiva = signal<CajaSesion | null>(null);
  readonly cajaLoading = signal(false);
  readonly reporte = signal<readonly VentaReporte[]>([]);
  readonly reporteLoading = signal(false);
  readonly reporteError = signal<string | null>(null);
  readonly reporteGrupo = signal<'DIA'|'MES'>('DIA');
  readonly reporteDesde = signal(new Date(new Date().getFullYear(),new Date().getMonth(),1).toLocaleDateString('en-CA'));
  readonly reporteHasta = signal(new Date().toLocaleDateString('en-CA'));
  readonly receiptData = signal<PosComprobante | null>(null);
  readonly receiptQr = signal<string | null>(null);
  readonly pdfLoading = signal(false);
  readonly receiptPdfPreview = signal<SafeResourceUrl | null>(null);
  private receiptPdfBlob: Blob | null = null;
  private receiptPdfObjectUrl: string | null = null;
  private readonly pendingReceiptSaleId = signal<number | null>(null);
  readonly receiptLayout = signal<'thermal' | 'a4'>('thermal');
  readonly catalogView = signal<ListViewMode>('table');
  readonly historyView = signal<ListViewMode>('table');
  readonly catalogPage = signal(1);
  readonly catalogPageSize = signal(10);
  readonly historyPage = signal(1);
  readonly historyPageSize = signal(10);
  readonly historySearch = signal('');
  readonly receiptLoading = signal(false);
  readonly receiptError = signal<string | null>(null);
  readonly sales = signal<readonly PosSaleRecord[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly selectedSale = signal<PosSaleDetail | null>(null);
  readonly saleActionId = signal<number | null>(null);
  readonly cancelReason = signal('');
  readonly devolucionConfirmada = signal(false);
  readonly historialCompleto = signal(false);
  readonly pagos = signal<{paymentMethodId:number;amount:number;operationNumber:string;files:File[]}[]>([]);
  readonly pagoPendienteImporte = signal<number>(0);
  readonly fotoPagoHistorial = signal<File[]>([]);
  readonly pagoTotal = computed(() => Math.round(this.pagos().reduce((s,p)=>s+(Number(p.amount)||0),0)*100)/100);
  readonly pagoDiferencia = computed(() => Math.round((this.cart.total()-this.pagoTotal())*100)/100);
  agregarPago():void {
    if(this.cart.locked())return;
    this.pagos.update(rows=>[...rows,{paymentMethodId:this.paymentMethods()[0]?.paymentMethodId??0,
      amount:Math.max(0,this.pagoDiferencia()),operationNumber:'',files:[]}]);
  }
  quitarPago(index:number):void {if(!this.cart.locked())this.pagos.update(rows=>rows.filter((_,i)=>i!==index));}
  editarPago(index:number,field:'paymentMethodId'|'amount'|'operationNumber',value:string):void {
    if(this.cart.locked())return;
    this.pagos.update(rows=>rows.map((r,i)=>i===index?{...r,[field]:field==='operationNumber'?value:Number(value)}:r));
  }
  fotosPago(index:number,files:File[]):void {
    if(!this.cart.locked())this.pagos.update(rows=>rows.map((r,i)=>i===index?{...r,files}:r));
  }
  metodoFila(id:number):PosPaymentMethod|undefined {
    return this.paymentMethods().find(m=>m.paymentMethodId===id);
  }

  readonly saleNote = signal('');
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
  readonly printIcon = faPrint;
  readonly receiptIcon = faReceipt;
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
    const stored = this.cart.draft()?.checkoutPayments;
    if(stored?.length){
      this.pagos.set(stored.map(p=>({paymentMethodId:p.paymentMethodId,amount:p.amount,
        operationNumber:p.operationNumber??'',files:[]})));
    } else if(!this.pagos().length) {
      this.pagos.set([{paymentMethodId:this.paymentMethods()[0]?.paymentMethodId??0,
        amount:Math.round(this.cart.total()*100)/100,operationNumber:'',files:[]}]);
    }
    // Cuando el registro es incierto o ya tiene ID, no se altera el cliente del reintento.
    if (!this.cart.customer() && !this.cart.locked()) {
      const response = await this.confirmation?.show({
        title: 'Venta sin cliente',
        message: '¿Continuar la venta sin identificar al cliente?',
        confirmLabel: 'Continuar sin cliente',
        cancelLabel: 'Cancelar',
        tone: 'warning',
      });
      // Cerrar o cancelar nunca abre otro formulario.
      if (!response?.confirmed) return;
    }
    if (this.canCheckout()) this.checkoutDialog?.open();
  }

  closeCheckoutDialog(): void {
    if (!this.processing()) this.checkoutDialog?.close();
  }

  onCheckoutClosed(): void {
    const saleId = this.pendingReceiptSaleId();
    this.pendingReceiptSaleId.set(null);
    if (saleId !== null) this.openReceipt(saleId);
  }

  closeSaleDetail(): void {
    this.saleDetailDialog?.nativeElement.close();
    this.selectedSale.set(null);
  }

  openReceipt(saleId: number): void {
    this.receiptData.set(null);
    this.receiptError.set(null);
    this.receiptQr.set(null);
    this.clearReceiptPdf();
    this.receiptLoading.set(true);
    this.receiptDialog?.open();
    this.cajaApi.comprobante(saleId).pipe(finalize(() => this.receiptLoading.set(false))).subscribe({
      next: (receipt) => {
        if (!receipt) {
          this.receiptError.set('No se pudo cargar el documento.');
          return;
        }
        this.receiptData.set(receipt);
        const layout = receipt.tipoDocumento === 'FACTURA' ? 'a4' : 'thermal';
        this.receiptLayout.set(layout);
        if (layout === 'a4') this.loadReceiptPdf();
        if (receipt.qrContenido) {
          void QRCode.toDataURL(receipt.qrContenido, { width: 200, margin: 2, errorCorrectionLevel: 'M' })
            .then(data => { if (this.receiptData()?.ventaId === receipt.ventaId) this.receiptQr.set(data); })
            .catch(() => this.receiptQr.set(null));
        }
      },
      error: (error) => this.receiptError.set(mapOpenApiError(error).message),
    });
  }

  numeroComprobante(receipt: PosComprobante): string {
    const serie = receipt.serie?.trim() || '';
    const numero = String(receipt.numero ?? receipt.ventaId).padStart(8, '0');
    return serie ? `${serie}-${numero}` : numero;
  }

  changeReceiptLayout(value: string): void {
    const layout = value === 'a4' ? 'a4' : 'thermal';
    this.receiptLayout.set(layout);
    if (layout === 'a4' && !this.receiptPdfBlob) this.loadReceiptPdf();
  }

  clearReceiptPdf(): void {
    if (this.receiptPdfObjectUrl) URL.revokeObjectURL(this.receiptPdfObjectUrl);
    this.receiptPdfObjectUrl = null;
    this.receiptPdfBlob = null;
    this.receiptPdfPreview.set(null);
  }

  closeReceipt(): void { this.receiptDialog?.close(); }

  loadReceiptPdf(): void {
    const receipt = this.receiptData();
    if (!receipt || this.pdfLoading()) return;
    this.pdfLoading.set(true);
    this.cajaApi.comprobantePdf(receipt.ventaId).pipe(finalize(() => this.pdfLoading.set(false)))
      .subscribe({
        next: blob => {
          if (this.receiptData()?.ventaId !== receipt.ventaId) return;
          this.clearReceiptPdf();
          this.receiptPdfBlob = blob;
          this.receiptPdfObjectUrl = URL.createObjectURL(blob);
          this.receiptPdfPreview.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.receiptPdfObjectUrl));
        },
        error: error => this.receiptError.set(mapOpenApiError(error).message),
      });
  }

  downloadReceiptPdf(): void {
    const receipt = this.receiptData();
    if (!receipt || this.pdfLoading()) return;
    if (!this.receiptPdfBlob) {
      this.loadReceiptPdf();
      return;
    }
    const url = URL.createObjectURL(this.receiptPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante-${receipt.ventaId}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  printReceipt(): void {
    if (!this.receiptData() || this.receiptLayout() !== 'thermal') return;
    const receipt = document.getElementById('pos-print-receipt');
    if (receipt instanceof HTMLElement) this.printer.printElement(receipt, 80);
  }

  puedeOperar(): boolean {return !!this.cajaActiva() || this.permissions.has('POS_SIN_CAJA');}

  loadCaja(): void {
    const uotId=this.currentUotId();
    this.cajaActiva.set(null);
    if (!uotId || !this.permissions.has('POS_OPERAR')) return;
    this.cajaLoading.set(true);
    this.cajaApi.activa(uotId).pipe(finalize(()=>this.cajaLoading.set(false))).subscribe({
      next:s=>{if (uotId===this.currentUotId()) this.cajaActiva.set(s);},
      error:e=>this.contextError.set(mapOpenApiError(e).message),
    });
  }

  loadReport(): void {
    const uotId=this.currentUotId();
    if (!uotId || !this.permissions.has('VENTAS_REPORTES')) return;
    this.reporteLoading.set(true);this.reporteError.set(null);
    this.cajaApi.reporte(uotId,this.reporteGrupo(),this.reporteDesde(),this.reporteHasta())
      .pipe(finalize(()=>this.reporteLoading.set(false))).subscribe({
        next:rows=>{if(uotId===this.currentUotId())this.reporte.set(rows);},
        error:e=>this.reporteError.set(mapOpenApiError(e).message),
      });
  }

  exportReport(): void {
    const rows=this.reporte();if (!rows.length)return;
    const esc=(x:unknown)=>'"'+String(x??'').replace(/"/g,'""')+'"';
    const csv=[['Período','Cantidad','Vendido','Cobrado','Efectivo'],...rows.map(r=>[r.periodo,r.cantidad,r.vendido,r.cobrado,r.efectivo])]
      .map(row=>row.map(esc).join(';')).join('\r\n');
    const uri=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=uri;a.download=`ventas_${this.reporteGrupo()}_${this.reporteDesde()}.csv`;a.click();
    setTimeout(()=>URL.revokeObjectURL(uri),1000);
  }

  async openCustomerModal(): Promise<void> {
    if (this.cart.locked() || this.processing() || !this.entityModal) return;
    const type=this.customerForm.controls.documentType.value;
    const number=this.customerForm.controls.documentNumber.value;
    const result=await this.entityModal.open({
      eyebrow:'PUNTO DE VENTA',title:'Identificar cliente',saveLabel:'Usar este cliente',
      documents:this.personDocumentOptions,rucKind:'EMPRESA',captureOnly:true,
      startDocument:{type,number},
      requireDistrictForManual:false,
    });
    if (!result?.data) return;
    const data=result.data;
    const docType=data.tipoDocumento==='RUC'?'RUC':'DNI';
    const clientType=docType==='RUC'?'EMPRESA':'PERSONA';
    const document=data.numeroDocumento;
    if (!this.validDocument(docType,document)) {
      this.toast.warning('Documento no válido','Ingrese un DNI o RUC válido.');return;
    }
    this.customerForm.patchValue({type:clientType,documentType:docType,documentNumber:document});
    this.customerLoading.set(true);
    this.resolveCustomerUseCase.resolve(clientType,docType,document).subscribe({
      next:lookup=>{
        if (lookup.customer) {
          this.customerLoading.set(false);this.cart.setCustomer(lookup.customer);
          this.customerTone.set('success');this.customerMessage.set('Cliente seleccionado.');
          return;
        }
        const uotId=this.currentUotId();
        if (!uotId){this.customerLoading.set(false);return;}
        this.resolveCustomerUseCase.registerManual({
          uotId,type:clientType,documentType:docType,documentNumber:document,
          names:data.nombres||undefined,paternalSurname:data.apellidoPaterno||undefined,
          maternalSurname:data.apellidoMaterno||undefined,businessName:data.razonSocial||undefined,
          phone:data.telefono||undefined,email:data.correo||undefined,
        }).pipe(finalize(()=>this.customerLoading.set(false))).subscribe({
          next:customer=>{this.cart.setCustomer(customer);this.customerTone.set('success');
            this.customerMessage.set('Cliente registrado y seleccionado.');this.toast.success('Cliente listo',customer.displayName);},
          error:e=>this.toast.error('No se registró el cliente',mapOpenApiError(e).message),
        });
      },
      error:e=>{this.customerLoading.set(false);this.toast.error('No se identificó al cliente',mapOpenApiError(e).message);},
    });
  }

  readonly savings = computed(() => this.cart.items().reduce((total, item) =>
    total + Math.max(0, item.initialPrice - item.unitPrice) * item.quantity, 0));
  readonly salesCount = computed(() => this.sales().filter(v=>v.state!=='ANULADA').length);
  readonly salesTotal = computed(() => this.sales().filter(v=>v.state!=='ANULADA').reduce((sum, item) => sum + item.total, 0));
  readonly salesPaid = computed(() => this.sales().filter(v=>v.state!=='ANULADA').reduce((sum, item) => sum + item.paid, 0));

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
    { key: 'acciones', label: 'Acciones', align: 'right' },
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

  readonly paymentForm = this.fb.nonNullable.group({
    paymentMethodId: [0, [Validators.required, Validators.min(1)]],
    operationNumber: ['', [Validators.maxLength(120)]],
    observation: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearReceiptPdf());
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
    this.historialCompleto.set(false);
    this.pagos.set([]);
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
    if (this.activeView()==='venta') {this.loadContext();this.loadCaja();}
    else {this.loadHistory();if(this.permissions.has('VENTAS_REPORTES'))this.loadReport();if(this.permissions.has('POS_OPERAR')){this.loadContext();this.loadCaja();}}
  }

  changeView(view: 'venta' | 'historial'): void {
    if (this.processing()) return;
    this.activeView.set(view);
    if (view === 'historial') this.loadHistory();
  }

  refreshPage(): void {
    if (this.activeView()==='historial') {this.loadHistory();this.loadReport();if(this.permissions.has('POS_OPERAR'))this.loadCaja();}
    else {this.loadContext();this.loadCaja();}
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
    if (this.cart.locked() || this.processing() || !this.puedeOperar()) return;
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
            void this.openCustomerModal();
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

  checkout(): void {
    const draft=this.cart.draft();const uotId=this.currentUotId();
    const warehouseId=this.cart.warehouseId();const customer=this.cart.customer()??this.generalCustomer;
    this.checkoutError.set(null);
    if(!draft||!this.puedeOperar()||!uotId||!warehouseId||!customer||!this.cart.items().length){
      this.checkoutError.set('Verifica tu disponibilidad, el almacén y los productos.');return;
    }
    if(this.cart.items().some(p=>p.quantity<=0||p.quantity>p.stockAvailable)){
      this.checkoutError.set('Revise las cantidades y el stock disponible.');return;
    }
    const rows=this.pagos();
    if(!rows.length||rows.some(p=>!this.metodoFila(p.paymentMethodId)||!Number.isFinite(p.amount)
      ||p.amount<=0||Math.abs(Math.round(p.amount*100)-p.amount*100)>0.00001)
      ||Math.abs(this.pagoDiferencia())>0.001){
      this.checkoutError.set('Distribuya el total exacto entre medios de pago e importes positivos de dos decimales.');return;
    }
    this.processing.set(true);
    const stored=draft.checkoutPayments;
    // No se pueden modificar medios ni importes tras comenzar el registro de venta.
    const upload$=stored?.length?of(stored):forkJoin(rows.map(p=>
      this.pagoEvidencia.cargar(uotId,p.files[0]).pipe(map(archivoId=>({
        paymentMethodId:p.paymentMethodId,amount:p.amount,
        operationNumber:p.operationNumber.trim()||undefined,archivoId
      } as PosPaymentAllocation)))));
    upload$.pipe(switchMap(payments=>{
      this.cart.storeCheckoutPayments(payments);
      return this.checkoutUseCase.execute({
        uotId,warehouseId,customer,items:this.cart.items(),payments,
        observation:this.paymentForm.controls.observation.value.trim()||undefined,
        pendingSaleId:draft.pendingSaleId,createIdempotencyKey:draft.createIdempotencyKey,
        paymentIdempotencyKey:draft.paymentIdempotencyKey,deliveryIdempotencyKey:draft.deliveryIdempotencyKey
      });
    }))
      .pipe(finalize(() => this.processing.set(false)))
      .subscribe({
        next: (result) => {
          this.pendingReceiptSaleId.set(result.saleId);
          this.checkoutDialog?.close(true);

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
          this.pagos.set([]);
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
    this.operations.listSales(uotId,this.historialCompleto() && this.permissions.has('VENTAS_TODAS_VER'))
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
          this.pagoPendienteImporte.set(Math.round(detail.sale.balance*100)/100);
          if (!this.saleDetailDialog?.nativeElement.open) this.saleDetailDialog?.nativeElement.showModal();
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message),
      });
  }

  saveSaleNote():void {
    const venta=this.selectedSale()?.sale;
    const text=this.saleNote().trim();
    const uotId=this.currentUotId();
    if(!venta||!uotId||!this.permissions.has('VENTAS_EDITAR')||this.saleActionId()||!text||text.length>500)return;
    this.saleActionId.set(venta.saleId);this.historyError.set(null);
    this.cajaApi.editarObservacionVenta(venta.saleId,{uotId,observacion:text})
      .pipe(finalize(()=>this.saleActionId.set(null)))
      .subscribe({next:()=>{this.toast.success('Venta actualizada');this.saleNote.set('');this.loadHistory();},
        error:e=>this.historyError.set(mapOpenApiError(e).message)});
  }

  paySelectedSale(): void {
    const sale = this.selectedSale()?.sale;
    const method = this.selectedPaymentMethod();
    const operationNumber = this.paymentForm.controls.operationNumber.value.trim();
    if (!this.puedeOperar() || !sale || this.saleActionId() || !method || sale.balance <= 0
      || sale.state === 'ANULADA' || sale.state === 'ENTREGADA'
      || !Number.isFinite(this.pagoPendienteImporte()) || this.pagoPendienteImporte()<=0
      || this.pagoPendienteImporte()>sale.balance) {
      this.historyError.set('Indique un método y un monto positivo no mayor al saldo pendiente.');
      return;
    }
    const input = { saleId: sale.saleId, paymentMethodId: method.paymentMethodId,
      amount: this.pagoPendienteImporte(), operationNumber };
    this.saleActionId.set(sale.saleId);
    this.historyError.set(null);
    this.pagoEvidencia.cargar(this.currentUotId()!,this.fotoPagoHistorial()[0]).pipe(
      switchMap(archivoId=>this.idempotency.idempotent(`pos:gestor:pagar:${sale.saleId}`, {...input,archivoId},(key)=>
        this.operations.paySale(sale.saleId,method.paymentMethodId,input.amount,
          operationNumber||undefined,key,archivoId))))
      .pipe(finalize(() => this.saleActionId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(`Pago registrado en venta #${sale.saleId}`);
          this.fotoPagoHistorial.set([]);
          this.pagoPendienteImporte.set(0);
          this.viewSale(sale.saleId);
          this.loadHistory();
        },
        error: (error) => this.historyError.set(mapOpenApiError(error).message
          + ' Consulte el detalle actualizado antes de reintentar.'),
      });
  }

  deliverSelectedSale(): void {
    const sale = this.selectedSale()?.sale;
    if (!this.puedeOperar() || !sale || this.saleActionId() || sale.balance > 0
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
    if ((!this.puedeOperar() && !this.permissions.has('VENTAS_TODAS_VER')) || !sale || this.saleActionId() || reason.length < 5 || reason.length > 300
      || (sale.paid > 0 && !this.devolucionConfirmada()) || sale.state === 'ANULADA') {
      this.historyError.set('Indique un motivo válido y confirme la devolución íntegra si hubo cobros.');
      return;
    }
    this.saleActionId.set(sale.saleId);
    this.historyError.set(null);
    this.operations.cancelSale(sale.saleId, reason, this.devolucionConfirmada())
      .pipe(finalize(() => this.saleActionId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(`Venta #${sale.saleId} anulada`);
          if (this.cart.pendingSaleId() === sale.saleId) this.cart.clearAfterSuccess();
          this.closeSaleDetail();
          this.cancelReason.set('');this.devolucionConfirmada.set(false);
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
      && !!this.puedeOperar()
      && this.currentUotId() !== null
      && this.cart.warehouseId() !== null
      && this.cart.items().length > 0
      && this.paymentMethods().length > 0
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
