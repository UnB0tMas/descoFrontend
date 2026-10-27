import { computed, Injectable, signal } from '@angular/core';

import { UotContext } from '../domain/uot.model';

@Injectable({ providedIn: 'root' })
export class UotContextStore {
  private readonly contextSignal = signal<UotContext | null>(null);

  readonly context = this.contextSignal.asReadonly();
  readonly loaded = computed(() => this.contextSignal() !== null);
  readonly modo = computed(() => this.contextSignal()?.modo ?? 'ESPECIFICA');
  readonly memberships = computed(() => this.contextSignal()?.uots ?? []);
  readonly selectedId = computed(() => this.contextSignal()?.uotSeleccionadaId ?? null);
  readonly requiresSelection = computed(() => this.contextSignal()?.requiereSeleccion ?? false);
  readonly canUseGeneral = computed(() => this.contextSignal()?.permiteModoGeneral ?? false);
  readonly isGeneral = computed(() => this.modo() === 'GENERAL');
  readonly isSpecific = computed(() => this.modo() === 'ESPECIFICA');

  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? this.memberships().find((item) => item.uotId === id) ?? null : null;
  });

  readonly label = computed(() =>
    this.isGeneral()
      ? 'Vista general'
      : this.selected()?.nombre ?? 'Seleccionar UOT',
  );

  set(context: UotContext): void {
    this.contextSignal.set({
      ...context,
      uots: [...context.uots],
    });
  }

  clear(): void {
    this.contextSignal.set(null);
  }
}
