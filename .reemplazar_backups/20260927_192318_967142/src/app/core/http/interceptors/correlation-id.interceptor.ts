import {
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { SKIP_CORRELATION_ID } from '../context/http-context.tokens';
import { CorrelationIdService } from '../services/correlation-id.service';

export const correlationIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_CORRELATION_ID)) {
    return next(request);
  }

  const correlationId = inject(CorrelationIdService).create();

  const tracedRequest = request.clone({
    setHeaders: {
      'X-Correlation-Id': correlationId,
    },
  });

  const localUpload =
    tracedRequest.method === 'POST'
    && tracedRequest.url.includes('/api/v1/documentos/local');

  if (!localUpload) {
    return next(tracedRequest);
  }

  const body = tracedRequest.body;
  const isFormData =
    typeof FormData !== 'undefined'
    && body instanceof FormData;

  console.info(
    '[DESCO-UPLOAD-TRACE][FRONTEND][HTTP][OUT]',
    {
      method: tracedRequest.method,
      url: tracedRequest.urlWithParams,
      correlationId,
      contentTypeHeader:
        tracedRequest.headers.get('Content-Type'),
      bodyConstructor:
        body && typeof body === 'object'
          ? body.constructor?.name ?? '(desconocido)'
          : typeof body,
      isFormData,
      formDataEntries:
        isFormData
          ? summarizeFormData(body)
          : [],
    },
  );

  return next(tracedRequest).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          console.info(
            '[DESCO-UPLOAD-TRACE][FRONTEND][HTTP][IN]',
            {
              correlationId,
              status: event.status,
              url: event.url,
              responseContentType:
                event.headers.get('Content-Type'),
            },
          );
        }
      },
      error: (error: unknown) => {
        const record =
          error && typeof error === 'object'
            ? error as Record<string, unknown>
            : null;

        console.error(
          '[DESCO-UPLOAD-TRACE][FRONTEND][HTTP][ERROR]',
          {
            correlationId,
            status:
              typeof record?.['status'] === 'number'
                ? record['status']
                : null,
            statusText:
              typeof record?.['statusText'] === 'string'
                ? record['statusText']
                : null,
            url:
              typeof record?.['url'] === 'string'
                ? record['url']
                : tracedRequest.urlWithParams,
            name:
              error instanceof Error
                ? error.name
                : typeof error,
            message:
              error instanceof Error
                ? error.message
                : typeof record?.['message'] === 'string'
                  ? record['message']
                  : String(error),
            backendPayload:
              record?.['error'] ?? record?.['details'] ?? null,
          },
        );
      },
    }),
  );
};

function summarizeFormData(
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
