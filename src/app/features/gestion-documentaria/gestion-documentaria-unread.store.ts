import { Injectable, inject, signal, computed } from '@angular/core';
import { finalize } from 'rxjs';
import { GestionDocumentariaApi } from './gestion-documentaria.api';

export interface IndicadoresCorrespondencia {
  noLeidos: number;
  pendientes: number;
  finalizados: number;
  vencidos: number;
}

@Injectable({ providedIn: 'root' })
export class GestionDocumentariaUnreadStore {
  private readonly api = inject(GestionDocumentariaApi);
  private readonly stats = signal<IndicadoresCorrespondencia>({noLeidos:0,pendientes:0,finalizados:0,vencidos:0});
  readonly indicadores = this.stats.asReadonly();
  readonly pendientes = computed(() => this.stats().noLeidos);
  private loading = false;
  private dirty: number | null = null;
  private currentUot: number | null = null;
  refrescar(uotId: number): void {
    if (this.currentUot !== uotId) {
      this.currentUot = uotId;
      this.stats.set({noLeidos:0,pendientes:0,finalizados:0,vencidos:0});
    }
    if (this.loading) { this.dirty = uotId; return; }
    this.loading = true;
    this.api.indicadores(uotId).pipe(finalize(() => {
      this.loading = false;
      if (this.dirty != null) {
        const next = this.dirty;
        this.dirty = null;
        this.refrescar(next);
      }
    })).subscribe({
      next: value => { if (this.currentUot === uotId) this.stats.set(value); },
      error: () => { /* Mantener los valores visibles hasta la siguiente actualización. */ },
    });
  }
  limpiar(): void {
    this.currentUot = null;
    this.dirty = null;
    this.stats.set({noLeidos:0,pendientes:0,finalizados:0,vencidos:0});
  }
}
