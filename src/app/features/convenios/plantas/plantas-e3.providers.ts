import {Provider} from '@angular/core';
import {PLANTAS_E3_GATEWAY} from './application/port/plantas-e3.gateway';
import {PlantasE3UseCase} from './application/use-case/plantas-e3.use-case';
import {PlantasE3HttpAdapter} from './adapter/out/http/plantas-e3-http.adapter';
export function providePlantasE3():Provider[]{
 return [PlantasE3HttpAdapter,{provide:PLANTAS_E3_GATEWAY,useExisting:PlantasE3HttpAdapter},PlantasE3UseCase];
}
