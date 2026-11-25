
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AccessStore } from '../../core/access/access.store';
import { BorradorDocumento } from './gestion-documentaria.api';

export interface BorradorTemporal {
  borradorId: number;
  contenido: BorradorDocumento;
  archivos: File[];
  fechaActualizacion: string;
}

/** Borradores temporales por usuario y pestaña: no utilizan BD ni almacenamiento del navegador. */
@Injectable({ providedIn: 'root' })
export class GestionDocumentariaDraftsStore {
  private readonly access = inject(AccessStore);
  private sequence = 0;
  private ownerId: number | null = null;
  private readonly state = signal<BorradorTemporal[]>([]);
  readonly drafts = computed(() => this.access.user()?.usuarioId === this.ownerId ? this.state() : []);

  constructor() {
    effect(() => {
      const userId = this.access.user()?.usuarioId ?? null;
      if (userId !== this.ownerId) {
        this.ownerId = userId;
        this.sequence = 0;
        this.state.set([]);
      }
    });
  }

  save(contenido: BorradorDocumento, archivos: File[], id: number | null): number {
    const userId = this.access.user()?.usuarioId ?? null;
    if (userId === null) return 0;
    if (this.ownerId !== userId) {
      this.ownerId = userId;
      this.sequence = 0;
      this.state.set([]);
    }
    const draftId = id !== null && this.state().some(item => item.borradorId === id) ? id : ++this.sequence;
    const actual: BorradorTemporal = {
      borradorId: draftId,
      contenido: {
        ...contenido,
        seleccionados: [...contenido.seleccionados],
        adjuntosGuardados: [...(contenido.adjuntosGuardados ?? [])],
        archivosCompartidos: [...(contenido.archivosCompartidos ?? [])],
      },
      archivos: [...archivos],
      fechaActualizacion: new Date().toISOString(),
    };
    this.state.update(items => [actual, ...items.filter(item => item.borradorId !== draftId)]);
    return draftId;
  }

  get(id: number): BorradorTemporal | undefined {
    return this.drafts().find(item => item.borradorId === id);
  }

  discard(id: number): void {
    if (!this.drafts().some(item => item.borradorId === id)) return;
    this.state.update(items => items.filter(item => item.borradorId !== id));
  }

  clear(): void {
    this.state.set([]);
    this.sequence = 0;
  }
}

