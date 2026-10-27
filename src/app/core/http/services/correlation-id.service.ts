import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CorrelationIdService {
  create(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
