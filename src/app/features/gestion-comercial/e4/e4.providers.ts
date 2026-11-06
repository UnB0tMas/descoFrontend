import { Provider } from '@angular/core';
import { E4_GATEWAY } from './application/port/e4.gateway';
import { E4UseCase } from './application/use-case/e4.use-case';
import { E4HttpAdapter } from './adapter/out/http/e4-http.adapter';
export function provideE4(): Provider[] {
  return [E4HttpAdapter,{provide:E4_GATEWAY,useExisting:E4HttpAdapter},E4UseCase];
}
