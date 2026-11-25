import { Injectable } from '@angular/core';

/** Descarga desde un Blob recibido completamente; no depende de reglas de negocio. */
@Injectable({ providedIn: 'root' })
export class BrowserFileDownloadService {
  save(blob: Blob, fileName: string): void {
    if (!blob || blob.size === 0) {
      throw new Error('Archivo vacío.');
    }
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
}
