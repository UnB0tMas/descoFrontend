import { Injectable, effect, inject } from '@angular/core';
import { SessionStore } from '../../core/session/session.store';
import { environment } from '../../../environments/environment';

/** Un canal SSE por sesión. Las vistas solo se actualizan al recibir un aviso. */
@Injectable({ providedIn: 'root' })
export class GestionDocumentariaRealtime {
  private readonly session = inject(SessionStore);
  private readonly endpoint = `${environment.apiBaseUrl}/api/v1/gestion-documentaria/eventos`;
  private readonly observers = new Set<() => void>();
  private controller: AbortController | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 1000;
  private token: string | null = null;
  private generation = 0;
  private refreshQueued = false;

  constructor() {
    // La renovación del token no debe dejar desconectada la bandeja.
    effect(() => this.ensureConnected());
  }

  watch(refresh: () => void): () => void {
    this.observers.add(refresh);
    this.ensureConnected();
    return () => {
      this.observers.delete(refresh);
      if (!this.observers.size) this.disconnect();
    };
  }

  private emitChanged(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      for (const observer of [...this.observers]) observer();
    });
  }

  private ensureConnected(): void {
    const token = this.session.accessToken();
    if (!token || !this.observers.size) { this.disconnect(); return; }
    if (this.token !== token) this.disconnect();
    if (this.controller || this.retry) return;
    this.token = token;
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    void this.readStream(token, controller, generation);
  }

  private async readStream(token: string, controller: AbortController, generation: number): Promise<void> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const response = await fetch(this.endpoint, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal, cache: 'no-store', credentials: 'omit',
      });
      if (controller.signal.aborted || generation !== this.generation) return;
      if (response.status === 401 || response.status === 403) {
        this.disconnect();
        return;
      }
      if (!response.ok || !response.body) throw new Error('Canal no disponible');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!controller.signal.aborted && generation === this.generation) {
        const result = await reader.read();
        if (result.done || controller.signal.aborted || generation !== this.generation) break;
        buffer += decoder.decode(result.value, { stream: true });
        if (buffer.length > 65536) { buffer = ''; continue; }
        const pieces = buffer.split(/\r?\n\r?\n/);
        buffer = pieces.pop() ?? '';
        for (const piece of pieces) {
          const lines = piece.split(/\r?\n/);
          const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
          if (event === 'actualizar') this.emitChanged();
          if (event === 'conectado') {
            // Recupera avisos ocurridos mientras el canal estaba desconectado.
            this.retryDelay = 1000;
            this.emitChanged();
          }
        }
      }
    } catch {
      // Sin peticiones periódicas. Recuperación en la siguiente conexión.
    } finally {
      try { await reader?.cancel(); } catch { /* stream ya cerrado */ }
      if (generation !== this.generation) return;
      this.controller = null;
      if (this.observers.size && this.session.accessToken() === token) {
        const delay = this.retryDelay;
        this.retryDelay = Math.min(this.retryDelay * 2, 30000);
        this.retry = setTimeout(() => { this.retry = null; this.ensureConnected(); }, delay);
      }
    }
  }

  private disconnect(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    this.token = null;
    this.retryDelay = 1000;
  }
}
