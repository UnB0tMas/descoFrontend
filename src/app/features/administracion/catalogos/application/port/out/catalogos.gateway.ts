import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { CatalogoFiltro } from '../../../domain/catalogo-filtro.model';
import {
  CatalogoItem,
  CatalogoItemCreate,
  CatalogoItemUpdate,
} from '../../../domain/catalogo-item.model';

export interface CatalogosGateway {
  list(filter: CatalogoFiltro): Observable<PageResult<CatalogoItem>>;
  create(input: CatalogoItemCreate): Observable<number>;
  update(id: number, input: CatalogoItemUpdate): Observable<void>;
  disable(id: number, catalogo: string, motivo: string): Observable<void>;
}

export const CATALOGOS_GATEWAY =
  new InjectionToken<CatalogosGateway>('CATALOGOS_GATEWAY');
