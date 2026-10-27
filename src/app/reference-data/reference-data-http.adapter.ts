import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  CatlogosService,
  GeografaService,
} from '../infrastructure/openapi/generated';
import {
  GeographyItem,
  ReferenceCatalogCode,
  ReferencePage,
} from '../core/reference-data/reference-data.model';
import { ReferenceDataGateway } from '../core/reference-data/reference-data.gateway';
import { unwrapApiResponse } from '../infrastructure/openapi/api-response-unwrapper';
import { ReferenceDataHttpMapper } from './reference-data-http.mapper';

@Injectable({ providedIn: 'root' })
export class ReferenceDataHttpAdapter implements ReferenceDataGateway {
  private readonly catalogs = inject(CatlogosService);
  private readonly geography = inject(GeografaService);

  listCatalog(
    catalog: ReferenceCatalogCode,
    page: number,
    size: number,
  ): Observable<ReferencePage> {
    return this.catalogs
      .catalogosListar(
        { catalogo: catalog, pagina: page, tamano: size },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) => ReferenceDataHttpMapper.catalogPage(value)),
      );
  }

  listDepartments(): Observable<readonly GeographyItem[]> {
    return this.geography
      .geografiaListarDepartamentos(undefined, 'body', false, { transferCache: false })
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) => ReferenceDataHttpMapper.departments(value)),
      );
  }

  listProvinces(departmentCode: string): Observable<readonly GeographyItem[]> {
    return this.geography
      .geografiaListarProvincias(
        { codigo: departmentCode.trim() },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) => ReferenceDataHttpMapper.provinces(value)),
      );
  }

  listDistricts(provinceCode: string): Observable<readonly GeographyItem[]> {
    return this.geography
      .geografiaListarDistritos(
        { codigo: provinceCode.trim() },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) => ReferenceDataHttpMapper.districts(value)),
      );
  }

  listPopulationCenters(districtCode: string): Observable<readonly GeographyItem[]> {
    return this.geography
      .geografiaListarCentrosPoblados(
        { codigo: districtCode.trim() },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map((value) => ReferenceDataHttpMapper.populationCenters(value)),
      );
  }
}
