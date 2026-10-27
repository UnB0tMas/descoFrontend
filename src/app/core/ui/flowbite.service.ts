import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FlowbiteService {
  private readonly platformId = inject(PLATFORM_ID);

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const flowbite = await import('flowbite');
    flowbite.initFlowbite();
  }
}
