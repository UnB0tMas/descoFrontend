import { Injectable, signal } from '@angular/core';

import { ReferenceCatalogCode, ReferenceItem } from './reference-data.model';

@Injectable({ providedIn: 'root' })
export class ReferenceDataStore {
  private readonly catalogsSignal = signal<
    Readonly<Record<string, readonly ReferenceItem[]>>
  >({});

  readonly catalogs = this.catalogsSignal.asReadonly();

  get(code: ReferenceCatalogCode): readonly ReferenceItem[] | null {
    return this.catalogsSignal()[code] ?? null;
  }

  set(code: ReferenceCatalogCode, items: readonly ReferenceItem[]): void {
    this.catalogsSignal.update((current) => ({
      ...current,
      [code]: [...items],
    }));
  }

  remove(code: ReferenceCatalogCode): void {
    this.catalogsSignal.update((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
  }

  clear(): void {
    this.catalogsSignal.set({});
  }
}
