import { inject, Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';

import {
  REFERENCE_DATA_GATEWAY,
  ReferenceDataGateway,
} from './reference-data.gateway';
import {
  GeographyItem,
  ReferenceCatalogCode,
  ReferenceItem,
} from './reference-data.model';
import { ReferenceDataStore } from './reference-data.store';

@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private readonly gateway: ReferenceDataGateway = inject(REFERENCE_DATA_GATEWAY);
  private readonly store = inject(ReferenceDataStore);

  catalog(
    code: ReferenceCatalogCode,
    force = false,
  ): Observable<readonly ReferenceItem[]> {
    const cached = this.store.get(code);

    if (!force && cached) {
      return of(cached);
    }

    return this.gateway.listCatalog(code, 1, 100).pipe(
      map((page) => page.items.filter((item) => item.active)),
      tap((items) => this.store.set(code, items)),
    );
  }

  invalidateCatalog(code: ReferenceCatalogCode): void {
    this.store.remove(code);
  }

  departments(): Observable<readonly GeographyItem[]> {
    return this.gateway.listDepartments();
  }

  provinces(departmentCode: string): Observable<readonly GeographyItem[]> {
    return this.gateway.listProvinces(departmentCode);
  }

  districts(provinceCode: string): Observable<readonly GeographyItem[]> {
    return this.gateway.listDistricts(provinceCode);
  }

  populationCenters(
    districtCode: string,
  ): Observable<readonly GeographyItem[]> {
    return this.gateway.listPopulationCenters(districtCode);
  }
}
