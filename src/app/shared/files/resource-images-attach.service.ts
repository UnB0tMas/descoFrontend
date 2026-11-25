import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concatMap, from, map, of, reduce } from 'rxjs';
import { LocalDocumentApiService } from './local-document-api.service';

export interface AttachedImagesResult {
  uploaded: number;
  failed: number;
}

@Injectable({ providedIn: 'root' })
export class ResourceImagesAttachService {
  private readonly documents = inject(LocalDocumentApiService);

  attach(uotId: number, linkType: 'BIEN' | 'PRODUCTO', linkId: number,
         category: 'BIEN_IMAGEN' | 'PRODUCTO_IMAGEN', files: readonly File[]): Observable<AttachedImagesResult> {
    if (!files.length) return of({ uploaded: 0, failed: 0 });
    if (!Number.isInteger(uotId) || uotId <= 0 || !Number.isInteger(linkId) || linkId <= 0) {
      return of({ uploaded: 0, failed: files.length });
    }
    return from(files).pipe(
      concatMap((file, index) => this.documents.upload({
        uotId, file, linkType, linkId, category, principal: index === 0,
      }).pipe(map(() => true), catchError(() => of(false)))),
      reduce((result, ok) => ({
        uploaded: result.uploaded + (ok ? 1 : 0),
        failed: result.failed + (ok ? 0 : 1),
      }), { uploaded: 0, failed: 0 } as AttachedImagesResult),
    );
  }
}
