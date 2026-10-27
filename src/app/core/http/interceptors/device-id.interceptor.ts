import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SKIP_DEVICE_ID } from '../context/http-context.tokens';
import { DeviceIdService } from '../../session/device-id.service';

export const deviceIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_DEVICE_ID)) {
    return next(request);
  }

  const deviceId = inject(DeviceIdService).getOrCreate();

  return next(
    request.clone({
      setHeaders: {
        'X-Device-Id': deviceId,
      },
    }),
  );
};
