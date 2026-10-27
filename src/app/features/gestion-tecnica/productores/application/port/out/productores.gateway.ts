import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { ProductorDetalle } from '../../../domain/productor-detalle.model';
import { ProductorFiltro } from '../../../domain/productor-filtro.model';
import { Productor, ProductorCreate, ProductorUpdate } from '../../../domain/productor.model';

export interface ProductoresGateway {
  list(filter: ProductorFiltro): Observable<PageResult<Productor>>;
  get(id: number): Observable<ProductorDetalle>;
  create(input: ProductorCreate): Observable<number>;
  update(id: number, input: ProductorUpdate): Observable<void>;
  retire(id: number, fechaRetiro: string, motivo: string): Observable<void>;
}

export const PRODUCTORES_GATEWAY =
  new InjectionToken<ProductoresGateway>('PRODUCTORES_GATEWAY');
