import { ErrorHandler, Injectable } from '@angular/core';

import { isApiError } from '../http/models/api-error.model';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (isApiError(error)) {
      console.error(
        `[DESCO][${error.code}] ${error.message}`,
        error.correlationId
          ? { correlationId: error.correlationId }
          : undefined,
      );
      return;
    }

    console.error('[DESCO] Error no controlado', error);
  }
}
