import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

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
  evidence?: { tipo: string; origen: string; fecha?: string; latitud?: number; longitud?: number };
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

    if(input.evidence) {
      params=params.set('tipoEvidencia',input.evidence.tipo).set('origenCaptura',input.evidence.origen);
      if(input.evidence.fecha) params=params.set('fechaCaptura',input.evidence.fecha);
      if(input.evidence.latitud!=null) params=params.set('latitudCaptura',String(input.evidence.latitud));
      if(input.evidence.longitud!=null) params=params.set('longitudCaptura',String(input.evidence.longitud));
    }
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
    const headers = new HttpHeaders({
      'X-Idempotency-Key': this.idempotency.create(),
    });

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
