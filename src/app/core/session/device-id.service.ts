import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { DEVICE_STORAGE_KEY } from './session.constants';

@Injectable({ providedIn: 'root' })
export class DeviceIdService {
  private readonly platformId = inject(PLATFORM_ID);
  private memoryId: string | null = null;

  getOrCreate(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return this.memoryId ?? (this.memoryId = this.createId());
    }

    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);

    if (existing) {
      return existing;
    }

    const created = this.createId();
    localStorage.setItem(DEVICE_STORAGE_KEY, created);
    return created;
  }

  reset(): string {
    const created = this.createId();
    this.memoryId = created;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(DEVICE_STORAGE_KEY, created);
    }

    return created;
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }
}
