import { HttpBackend, HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { InjectionToken, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EvidenceStorageGateway } from '../../../application/port/out/evidence-storage.gateway';
import { EvidenceStorageEvent } from '../../../domain/documento-evidencia.model';

export interface CloudinaryEvidenceStorageConfig {
  cloudName: string;
  uploadPreset: string;
  folder: string;
}

export const CLOUDINARY_EVIDENCE_STORAGE_CONFIG =
  new InjectionToken<CloudinaryEvidenceStorageConfig>('CLOUDINARY_EVIDENCE_STORAGE_CONFIG');

export function runtimeCloudinaryEvidenceStorageConfig(): CloudinaryEvidenceStorageConfig {
  const runtime = (globalThis as {
    __DESCO_CONFIG__?: { cloudinary?: Partial<CloudinaryEvidenceStorageConfig> };
  }).__DESCO_CONFIG__?.cloudinary;

  return {
    cloudName: runtime?.cloudName?.trim() ?? '',
    uploadPreset: runtime?.uploadPreset?.trim() ?? '',
    folder: runtime?.folder?.trim() || 'desco/evidencias',
  };
}

interface CloudinaryUploadResponse {
  public_id?: string;
  secure_url?: string;
  bytes?: number;
  resource_type?: string;
  format?: string;
}

@Injectable()
export class CloudinaryEvidenceStorageAdapter implements EvidenceStorageGateway {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly config = inject(CLOUDINARY_EVIDENCE_STORAGE_CONFIG);

  upload(file: File): Observable<EvidenceStorageEvent> {
    this.assertConfigured();
    if (!file || file.size <= 0) throw new Error('Selecciona un archivo válido antes de continuar.');

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('upload_preset', this.config.uploadPreset);
    if (this.config.folder) formData.append('folder', this.config.folder);

    const request = new HttpRequest<FormData>(
      'POST',
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.config.cloudName)}/auto/upload`,
      formData,
      { reportProgress: true },
    );

    return this.http.request<CloudinaryUploadResponse>(request).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? file.size;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          return { kind: 'progress', progress } as EvidenceStorageEvent;
        }
        if (event.type === HttpEventType.Response) {
          const body = event.body;
          if (!body?.public_id || !body.secure_url) throw new Error('El almacenamiento externo no devolvió una referencia válida.');
          return {
            kind: 'completed',
            result: {
              publicId: body.public_id,
              secureUrl: body.secure_url,
              bytes: body.bytes ?? file.size,
              mimeType: file.type || 'application/octet-stream',
              originalName: file.name,
            },
          } as EvidenceStorageEvent;
        }
        return { kind: 'progress', progress: 0 } as EvidenceStorageEvent;
      }),
    );
  }

  private assertConfigured(): void {
    if (!this.config.cloudName || !this.config.uploadPreset) {
      throw new Error(
        'El almacenamiento de evidencias todavía no está configurado. Define window.__DESCO_CONFIG__.cloudinary.cloudName y uploadPreset antes de subir archivos.',
      );
    }
  }
}
