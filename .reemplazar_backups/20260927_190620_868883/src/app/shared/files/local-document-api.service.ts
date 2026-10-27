import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../core/http/services/idempotency-key.service';
import { DocumentosLocalesService } from '../../infrastructure/openapi/generated/api/documentosLocales.service';
import { LocalDocumentFileResponse } from '../../infrastructure/openapi/generated/model/localDocumentFileResponse';
import { unwrapApiResponse } from '../../infrastructure/openapi/api-response-unwrapper';

export interface LocalFileUpload {
  uotId: number;
  file: File;
  category?: string;
  description?: string;
  linkType?: string;
  linkId?: number;
  principal?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LocalDocumentApiService {
  private readonly api = inject(DocumentosLocalesService);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(uotId?: number) {
    return this.api
      .documentosLocalesListar(
        { uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<LocalDocumentFileResponse[]>(response) ?? [],
        ),
      );
  }

  upload(input: LocalFileUpload) {
    const category = this.normalizeCategory(input.category);
    const linkType = (input.linkType ?? 'NINGUNO')
      .trim()
      .toUpperCase();

    return this.api
      .documentosLocalesSubir(
        {
          uotId: input.uotId,
          archivo: input.file,
          categoria: category,
          descripcion: input.description?.trim() || undefined,
          vinculoTipo: linkType,
          vinculoId:
            (input.linkId ?? 0) > 0
              ? input.linkId
              : undefined,
          principal: input.principal ?? false,
          xIdempotencyKey: this.idempotency.create(),
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          unwrapApiResponse<LocalDocumentFileResponse>(response),
        ),
      );
  }

  content(archivoId: number) {
    return this.api.documentosLocalesContenido(
      { archivoId },
      'body',
      false,
      { transferCache: false },
    );
  }

  retire(archivoId: number, reason: string) {
    return this.api
      .documentosLocalesRetirar(
        {
          archivoId,
          motivo: reason,
          xIdempotencyKey: this.idempotency.create(),
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  private normalizeCategory(value?: string): string {
    const category = (value ?? 'DOCUMENTO')
      .trim()
      .toUpperCase();

    if (
      category === 'IMAGEN'
      || category === 'BIEN_IMAGEN'
      || category === 'PRODUCTO_IMAGEN'
    ) {
      return 'FOTOGRAFIA';
    }

    return category || 'DOCUMENTO';
  }

}
