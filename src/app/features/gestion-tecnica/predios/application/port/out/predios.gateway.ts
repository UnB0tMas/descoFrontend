import { InjectionToken } from '@angular/core'; import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { Predio, PredioCreate, PredioUpdate } from '../../../domain/predio.model'; import { PredioDetalle } from '../../../domain/predio-detalle.model'; import { PredioFiltro } from '../../../domain/predio-filtro.model';
export interface PrediosGateway { list(f:PredioFiltro):Observable<PageResult<Predio>>; get(id:number):Observable<PredioDetalle>; create(i:PredioCreate):Observable<number>; update(id:number,i:PredioUpdate):Observable<void>; retire(id:number,fechaRetiro:string,motivo:string):Observable<void>; }
export const PREDIOS_GATEWAY=new InjectionToken<PrediosGateway>('PREDIOS_GATEWAY');
