import { Provider } from '@angular/core';
import { E5HttpAdapter } from './adapter/out/http/e5-http.adapter';
import { E5UseCase } from './application/use-case/e5.use-case';
import { E5_GATEWAY } from './application/port/e5.gateway';
export function provideE5():Provider[]{return [E5HttpAdapter,{provide:E5_GATEWAY,useExisting:E5HttpAdapter},E5UseCase]}
