import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiEnvelope,
  unwrapApiResponse,
} from '../infrastructure/openapi/api-response-unwrapper';
import {
  GeographyItem,
  ReferenceCatalogCode,
  ReferencePage,
} from '../core/reference-data/reference-data.model';
import { ReferenceDataGateway } from '../core/reference-data/reference-data.gateway';
import { ReferenceDataHttpMapper } from './reference-data-http.mapper';

@Injectable({ providedIn: 'root' })
export class ReferenceDataHttpAdapter implements ReferenceDataGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listCatalog(
    catalog: ReferenceCatalogCode,
    page: number,
    size: number,
  ): Observable<ReferencePage> {
    const params = new HttpParams()
      .set('catalogo', catalog)
      .set('pagina', page)
      .set('tamano', size);

    return this.http
      .get<ApiEnvelope<unknown>>(
        `${this.baseUrl}/api/v1/catalogos`,
        {
          params,
          transferCache: false,
        },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) =>
          ReferenceDataHttpMapper.catalogPage(value),
        ),
      );
  }

  listDepartments(): Observable<readonly GeographyItem[]> {
    return this.http
      .get<ApiEnvelope<unknown>>(
        `${this.baseUrl}/api/v1/geografia/departamentos`,
        {
          transferCache: false,
        },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) =>
          ReferenceDataHttpMapper.departments(value),
        ),
      );
  }

  listProvinces(
    departmentCode: string,
  ): Observable<readonly GeographyItem[]> {
    return this.http
      .get<ApiEnvelope<unknown>>(
        `${this.baseUrl}/api/v1/geografia/departamentos/${encodeURIComponent(
          departmentCode,
        )}/provincias`,
        {
          transferCache: false,
        },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) =>
          ReferenceDataHttpMapper.provinces(value),
        ),
      );
  }

  listDistricts(
    provinceCode: string,
  ): Observable<readonly GeographyItem[]> {
    return this.http
      .get<ApiEnvelope<unknown>>(
        `${this.baseUrl}/api/v1/geografia/provincias/${encodeURIComponent(
          provinceCode,
        )}/distritos`,
        {
          transferCache: false,
        },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) =>
          ReferenceDataHttpMapper.districts(value),
        ),
      );
  }

  listPopulationCenters(
    districtCode: string,
  ): Observable<readonly GeographyItem[]> {
    return this.http
      .get<ApiEnvelope<unknown>>(
        `${this.baseUrl}/api/v1/geografia/distritos/${encodeURIComponent(
          districtCode,
        )}/centros-poblados`,
        {
          transferCache: false,
        },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) =>
          ReferenceDataHttpMapper.populationCenters(value),
        ),
      );
  }
}
