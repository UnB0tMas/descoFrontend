import { computed, Injectable, signal } from '@angular/core';

import { AccessContext } from './models/access-context.model';

@Injectable({ providedIn: 'root' })
export class AccessStore {
  private readonly contextSignal = signal<AccessContext | null>(null);

  readonly context = this.contextSignal.asReadonly();
  readonly loaded = computed(() => this.contextSignal() !== null);
  readonly user = computed(() => this.contextSignal()?.usuario ?? null);
  readonly roles = computed(() => this.contextSignal()?.roles ?? []);
  readonly modules = computed(() => this.contextSignal()?.modulos ?? []);
  readonly permissions = computed(() => this.contextSignal()?.permisos ?? []);

  set(context: AccessContext): void {
    this.contextSignal.set({
      usuario: context.usuario,
      roles: [...context.roles],
      modulos: [...context.modulos],
      permisos: [...context.permisos],
    });
  }

  clear(): void {
    this.contextSignal.set(null);
  }

  snapshot(): AccessContext | null {
    return this.contextSignal();
  }
}
