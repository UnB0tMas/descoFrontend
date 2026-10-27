import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  GeographyItem,
  ReferenceCatalogCode,
  ReferencePage,
} from './reference-data.model';

export interface ReferenceDataGateway {
  listCatalog(
    catalog: ReferenceCatalogCode,
    page: number,
    size: number,
  ): Observable<ReferencePage>;

  listDepartments(): Observable<readonly GeographyItem[]>;
  listProvinces(departmentCode: string): Observable<readonly GeographyItem[]>;
  listDistricts(provinceCode: string): Observable<readonly GeographyItem[]>;
  listPopulationCenters(
    districtCode: string,
  ): Observable<readonly GeographyItem[]>;
}

export const REFERENCE_DATA_GATEWAY =
  new InjectionToken<ReferenceDataGateway>('REFERENCE_DATA_GATEWAY');
