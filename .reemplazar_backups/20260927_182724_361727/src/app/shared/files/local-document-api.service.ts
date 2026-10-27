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
    return this.api
      .documentosLocalesSubir(
        {
          uotId: input.uotId,
          xIdempotencyKey: this.idempotency.create(),
          archivo: input.file,
          categoria: input.category ?? 'DOCUMENTO',
          descripcion: input.description,
          vinculoTipo: input.linkType ?? 'NINGUNO',
          vinculoId: input.linkId,
          principal: input.principal ?? false,
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
}
