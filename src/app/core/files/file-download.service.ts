import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly platformId = inject(PLATFORM_ID);

  downloadBlob(blob: Blob, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    try {
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  }

  openUrl(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
