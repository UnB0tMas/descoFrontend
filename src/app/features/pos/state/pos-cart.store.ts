import { isPlatformBrowser } from '@angular/common';
import {
  Inject,
  Injectable,
  PLATFORM_ID,
  computed,
  signal,
} from '@angular/core';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import {
  PosCartDraft,
  PosCartItem,
  PosCustomer,
  PosProduct,
} from '../domain/pos.model';

@Injectable()
export class PosCartStore {
  private readonly storagePrefix = 'desco:pos:cart:v1';
  private storageKey: string | null = null;

  private readonly draftSignal = signal<PosCartDraft | null>(null);

  readonly draft = this.draftSignal.asReadonly();
  readonly items = computed(() => this.draftSignal()?.items ?? []);
  readonly customer = computed(() => this.draftSignal()?.customer ?? null);
  readonly warehouseId = computed(() => this.draftSignal()?.warehouseId ?? null);
  readonly pendingSaleId = computed(() => this.draftSignal()?.pendingSaleId ?? null);
  readonly creationUncertain = computed(
    () => this.draftSignal()?.creationUncertain ?? false,
  );
  readonly locked = computed(
    () => this.pendingSaleId() !== null || this.creationUncertain(),
  );
  readonly currency = computed(
    () => this.items()[0]?.currency ?? 'PEN',
  );
  readonly total = computed(() =>
    this.items().reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),
  );
  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );

  constructor(
    private readonly idempotency: IdempotencyKeyService,
    @Inject(PLATFORM_ID)
    private readonly platformId: object,
  ) {}

  initialize(userId: number, uotId: number): void {
    this.storageKey =
      `${this.storagePrefix}:${userId}:${uotId}`;

    const stored = this.read();

    if (
      stored
      && stored.version === 1
      && stored.userId === userId
      && stored.uotId === uotId
    ) {
      this.draftSignal.set(stored);
      return;
    }

    this.draftSignal.set(
      this.emptyDraft(userId, uotId),
    );
    this.persist();
  }

  setWarehouse(warehouseId: number): boolean {
    const current = this.requireDraft();

    if (
      current.warehouseId === warehouseId
      || warehouseId <= 0
    ) {
      return current.warehouseId === warehouseId;
    }

    if (current.items.length > 0 || this.locked()) {
      return false;
    }

    this.update({
      ...current,
      warehouseId,
    });

    return true;
  }

  setCustomer(customer: PosCustomer | null): void {
    const current = this.requireDraft();

    if (this.locked()) {
      return;
    }

    this.update({
      ...current,
      customer,
    });
  }

  add(product: PosProduct): string | null {
    const current = this.requireDraft();

    if (this.locked()) {
      return 'La venta ya está en proceso. Finalícela antes de modificar el carrito.';
    }

    if (product.stockAvailable <= 0) {
      return 'El producto no tiene stock disponible.';
    }

    const currentCurrency =
      current.items[0]?.currency ?? product.currency;

    if (currentCurrency !== product.currency) {
      return 'No se pueden mezclar productos con monedas distintas en una misma venta.';
    }

    const existing = current.items.find(
      (item) => item.productId === product.productId,
    );

    if (existing) {
      if (existing.quantity >= product.stockAvailable) {
        return 'La cantidad ya alcanzó el stock disponible.';
      }

      const items = current.items.map((item) =>
        item.productId === product.productId
          ? {
              ...item,
              unitPrice: product.unitPrice,
              initialPrice: product.initialPrice,
              stockAvailable: product.stockAvailable,
              quantity: item.quantity + 1,
            }
          : item,
      );

      this.update({ ...current, items });
      return null;
    }

    const item: PosCartItem = {
      productId: product.productId,
      code: product.code,
      name: product.name,
      unit: product.unit,
      unitPrice: product.unitPrice,
      initialPrice: product.initialPrice,
      currency: product.currency,
      quantity: 1,
      stockAvailable: product.stockAvailable,
      imageFileId: product.imageFileId,
      imageUrl: product.imageUrl,
    };

    this.update({
      ...current,
      items: [...current.items, item],
    });

    return null;
  }

  setQuantity(
    productId: number,
    quantity: number,
  ): string | null {
    const current = this.requireDraft();

    if (this.locked()) {
      return 'La venta ya está en proceso. No puede modificar cantidades.';
    }

    const item = current.items.find(
      (candidate) => candidate.productId === productId,
    );

    if (!item) {
      return null;
    }

    if (quantity <= 0) {
      this.remove(productId);
      return null;
    }

    if (quantity > item.stockAvailable) {
      return `Stock disponible: ${item.stockAvailable}.`;
    }

    this.update({
      ...current,
      items: current.items.map((candidate) =>
        candidate.productId === productId
          ? { ...candidate, quantity }
          : candidate,
      ),
    });

    return null;
  }

  remove(productId: number): void {
    const current = this.requireDraft();

    if (this.locked()) {
      return;
    }

    this.update({
      ...current,
      items: current.items.filter(
        (item) => item.productId !== productId,
      ),
    });
  }

  syncCatalog(products: readonly PosProduct[]): void {
    const current = this.requireDraft();

    if (current.items.length === 0) {
      return;
    }

    const byId = new Map(
      products.map((product) => [product.productId, product] as const),
    );

    const items = current.items.map((item) => {
      const product = byId.get(item.productId);

      if (!product) {
        return {
          ...item,
          stockAvailable: 0,
        };
      }

      return {
        ...item,
        unitPrice: product.unitPrice,
        initialPrice: product.initialPrice,
        currency: product.currency,
        stockAvailable: product.stockAvailable,
        imageFileId: product.imageFileId,
        imageUrl: product.imageUrl,
      };
    });

    this.update({
      ...current,
      items,
    });
  }

  markPendingSale(saleId: number): void {
    const current = this.requireDraft();

    this.update({
      ...current,
      pendingSaleId: saleId,
      creationUncertain: false,
    });
  }

  markCreationUncertain(value: boolean): void {
    const current = this.requireDraft();

    this.update({
      ...current,
      creationUncertain: value,
    });
  }

  clearAfterSuccess(): void {
    const current = this.requireDraft();

    this.draftSignal.set({
      ...this.emptyDraft(
        current.userId,
        current.uotId,
      ),
      warehouseId: current.warehouseId,
    });

    this.persist();
  }

  clearEditableCart(): boolean {
    const current = this.requireDraft();

    if (this.locked()) {
      return false;
    }

    this.update({
      ...this.emptyDraft(
        current.userId,
        current.uotId,
      ),
      warehouseId: current.warehouseId,
    });

    return true;
  }

  private requireDraft(): PosCartDraft {
    const current = this.draftSignal();

    if (!current) {
      throw new Error('El carrito POS todavía no fue inicializado.');
    }

    return current;
  }

  private emptyDraft(
    userId: number,
    uotId: number,
  ): PosCartDraft {
    return {
      version: 1,
      userId,
      uotId,
      warehouseId: null,
      customer: null,
      items: [],
      pendingSaleId: null,
      creationUncertain: false,
      createIdempotencyKey: this.idempotency.create(),
      paymentIdempotencyKey: this.idempotency.create(),
      deliveryIdempotencyKey: this.idempotency.create(),
      updatedAt: new Date().toISOString(),
    };
  }

  private update(draft: PosCartDraft): void {
    this.draftSignal.set({
      ...draft,
      items: [...draft.items],
      updatedAt: new Date().toISOString(),
    });

    this.persist();
  }

  private persist(): void {
    if (
      !this.storageKey
      || !isPlatformBrowser(this.platformId)
    ) {
      return;
    }

    const draft = this.draftSignal();

    if (!draft) {
      return;
    }

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(draft),
    );
  }

  private read(): PosCartDraft | null {
    if (
      !this.storageKey
      || !isPlatformBrowser(this.platformId)
    ) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);

      if (!raw) {
        return null;
      }

      const value = JSON.parse(raw) as Partial<PosCartDraft>;

      if (
        value.version !== 1
        || typeof value.userId !== 'number'
        || typeof value.uotId !== 'number'
        || !Array.isArray(value.items)
        || typeof value.createIdempotencyKey !== 'string'
        || typeof value.paymentIdempotencyKey !== 'string'
        || typeof value.deliveryIdempotencyKey !== 'string'
      ) {
        return null;
      }

      return {
        version: 1,
        userId: value.userId,
        uotId: value.uotId,
        warehouseId:
          typeof value.warehouseId === 'number'
            ? value.warehouseId
            : null,
        customer:
          value.customer
            ? value.customer as PosCustomer
            : null,
        items: value.items as PosCartItem[],
        pendingSaleId:
          typeof value.pendingSaleId === 'number'
            ? value.pendingSaleId
            : null,
        creationUncertain: value.creationUncertain === true,
        createIdempotencyKey: value.createIdempotencyKey,
        paymentIdempotencyKey: value.paymentIdempotencyKey,
        deliveryIdempotencyKey: value.deliveryIdempotencyKey,
        updatedAt:
          typeof value.updatedAt === 'string'
            ? value.updatedAt
            : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
