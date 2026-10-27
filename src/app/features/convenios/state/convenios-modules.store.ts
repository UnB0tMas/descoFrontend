import { Injectable, computed, signal } from '@angular/core';

export interface ModuloConvenio {
  codigo: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class ConveniosModulesStore {
  private readonly values = signal<readonly ModuloConvenio[]>([]);
  readonly modules = this.values.asReadonly();
  readonly active = computed(() => this.values().length > 0);

  has(code: string): boolean {
    return this.values().some((module) => module.codigo === code);
  }

  set(modules: readonly ModuloConvenio[]): void {
    this.values.set([...modules]);
  }

  clear(): void {
    this.values.set([]);
  }
}
