import { inject, Injectable } from '@angular/core';

import { AccessStore } from './access.store';
import { AccessContext } from './models/access-context.model';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly store = inject(AccessStore);

  hydrate(context: AccessContext): void {
    this.store.set(context);
  }

  clear(): void {
    this.store.clear();
  }

  current(): AccessContext | null {
    return this.store.snapshot();
  }
}
