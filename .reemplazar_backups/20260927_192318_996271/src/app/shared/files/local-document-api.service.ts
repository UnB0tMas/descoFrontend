import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, tap } from 'rxjs';

import { IdempotencyKeyService } from '../../core/http/services/idempotency-key.service';
import { DocumentosLocalesService } from '../../infrastructure/openapi/generated/api/documentosLocales.service';
import { LocalDocumentFileResponse } from '../../infrastructure/openapi/generated/model/localDocumentFileResponse';
import {
  ApiEnvelope,
  unwrapApiResponse,
} from '../../infrastructure/openapi/api-response-unwrapper';
import { environment } from '../../../environments/environment';

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
  private readonly http = inject(HttpClient);
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
    const body = new FormData();
    body.append('archivo', input.file, input.file.name);

    let params = new HttpParams()
      .set('uotId', String(input.uotId))
      .set('categoria', this.normalizeCategory(input.category))
      .set(
        'vinculoTipo',
        (input.linkType ?? 'NINGUNO').trim().toUpperCase(),
      )
      .set('principal', String(input.principal ?? false));

    const description = input.description?.trim();
    if (description) {
      params = params.set('descripcion', description);
    }

    if ((input.linkId ?? 0) > 0) {
      params = params.set('vinculoId', String(input.linkId));
    }

    /*
     * No establecer Content-Type manualmente.
     * El navegador agrega multipart/form-data con su boundary real.
     */
    const idempotencyKey = this.idempotency.create();

    const headers = new HttpHeaders({
      'X-Idempotency-Key': idempotencyKey,
    });

    console.info(
      '[DESCO-UPLOAD-TRACE][FRONTEND][API][PREPARE]',
      {
        url:
          `${environment.apiBaseUrl}/api/v1/documentos/local`,
        query: params.toString(),
        uotId: input.uotId,
        category: this.normalizeCategory(input.category),
        linkType:
          (input.linkType ?? 'NINGUNO').trim().toUpperCase(),
        linkId: input.linkId ?? null,
        principal: input.principal ?? false,
        file: {
          name: input.file.name,
          size: input.file.size,
          type: input.file.type,
          lastModified: input.file.lastModified,
        },
        bodyIsFormData: body instanceof FormData,
        bodyHasArchivo: body.has('archivo'),
        bodyEntries: this.summarizeFormData(body),
        contentTypeHeader: headers.get('Content-Type'),
        idempotencyPresent: Boolean(idempotencyKey),
      },
    );

    return this.http
      .post<ApiEnvelope<LocalDocumentFileResponse>>(
        `${environment.apiBaseUrl}/api/v1/documentos/local`,
        body,
        {
          params,
          headers,
        },
      )
      .pipe(
        tap({
          next: (response) => {
            console.info(
              '[DESCO-UPLOAD-TRACE][FRONTEND][API][RESPONSE]',
              {
                exitoso: response.exitoso,
                codigo: response.codigo,
                mensaje: response.mensaje,
                correlacionId: response.correlacionId,
              },
            );
          },
          error: (error: unknown) => {
            console.error(
              '[DESCO-UPLOAD-TRACE][FRONTEND][API][ERROR]',
              error,
            );
          },
        }),
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


  private summarizeFormData(
    body: FormData,
  ): readonly Record<string, unknown>[] {
    return Array.from(body.entries()).map(
      ([key, value]) => {
        if (
          typeof File !== 'undefined'
          && value instanceof File
        ) {
          return {
            key,
            kind: 'File',
            name: value.name,
            size: value.size,
            type: value.type,
            lastModified: value.lastModified,
          };
        }

        if (
          typeof Blob !== 'undefined'
          && value instanceof Blob
        ) {
          return {
            key,
            kind: 'Blob',
            size: value.size,
            type: value.type,
          };
        }

        return {
          key,
          kind: 'text',
          value: String(value),
        };
      },
    );
  }

}
