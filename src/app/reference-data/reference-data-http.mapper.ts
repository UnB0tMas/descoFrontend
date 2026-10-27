import {
  GeographyItem,
  ReferenceItem,
  ReferencePage,
} from '../core/reference-data/reference-data.model';

interface CatalogItemDto {
  id?: unknown;
  codigo?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  estado?: unknown;
  cantidadUso?: unknown;
  enUso?: unknown;
}

interface PageDto {
  items?: unknown;
  pagina?: unknown;
  tamanio?: unknown;
  totalRegistros?: unknown;
  totalPaginas?: unknown;
}

interface DepartmentDto {
  departamentoCodigo?: unknown;
  departamentoNombre?: unknown;
}

interface ProvinceDto {
  provinciaCodigo?: unknown;
  provinciaNombre?: unknown;
}

interface DistrictDto {
  distritoCodigo?: unknown;
  distritoNombre?: unknown;
}

interface PopulationCenterDto {
  centroPobladoId?: unknown;
  codigoInei?: unknown;
  centroPobladoNombre?: unknown;
}

export class ReferenceDataHttpMapper {
  static catalogPage(value: unknown): ReferencePage {
    const page = (value ?? {}) as PageDto;
    const items = Array.isArray(page.items) ? page.items : [];

    return {
      items: items.map((item) =>
        ReferenceDataHttpMapper.catalogItem(item as CatalogItemDto),
      ),
      page: ReferenceDataHttpMapper.number(page.pagina, 1),
      size: ReferenceDataHttpMapper.number(page.tamanio, items.length),
      totalRecords: ReferenceDataHttpMapper.number(
        page.totalRegistros,
        items.length,
      ),
      totalPages: ReferenceDataHttpMapper.number(
        page.totalPaginas,
        items.length > 0 ? 1 : 0,
      ),
    };
  }

  static departments(value: unknown): readonly GeographyItem[] {
    return ReferenceDataHttpMapper.array(value)
      .map((item) => {
        const row = item as DepartmentDto;

        return {
          id: null,
          code: ReferenceDataHttpMapper.text(row.departamentoCodigo),
          label: ReferenceDataHttpMapper.text(row.departamentoNombre),
        };
      })
      .filter((item) => item.code && item.label);
  }

  static provinces(value: unknown): readonly GeographyItem[] {
    return ReferenceDataHttpMapper.array(value)
      .map((item) => {
        const row = item as ProvinceDto;

        return {
          id: null,
          code: ReferenceDataHttpMapper.text(row.provinciaCodigo),
          label: ReferenceDataHttpMapper.text(row.provinciaNombre),
        };
      })
      .filter((item) => item.code && item.label);
  }

  static districts(value: unknown): readonly GeographyItem[] {
    return ReferenceDataHttpMapper.array(value)
      .map((item) => {
        const row = item as DistrictDto;

        return {
          id: null,
          code: ReferenceDataHttpMapper.text(row.distritoCodigo),
          label: ReferenceDataHttpMapper.text(row.distritoNombre),
        };
      })
      .filter((item) => item.code && item.label);
  }

  static populationCenters(
    value: unknown,
  ): readonly GeographyItem[] {
    return ReferenceDataHttpMapper.array(value)
      .map((item) => {
        const row = item as PopulationCenterDto;
        const id = ReferenceDataHttpMapper.number(
          row.centroPobladoId,
          0,
        );

        return {
          id: id > 0 ? id : null,
          code: ReferenceDataHttpMapper.text(row.codigoInei),
          label: ReferenceDataHttpMapper.text(
            row.centroPobladoNombre,
          ),
        };
      })
      .filter((item) => item.id !== null && item.label);
  }

  private static catalogItem(row: CatalogItemDto): ReferenceItem {
    const idValue =
      typeof row.id === 'number' || typeof row.id === 'string'
        ? row.id
        : ReferenceDataHttpMapper.text(row.codigo);

    return {
      id: idValue,
      code: ReferenceDataHttpMapper.text(row.codigo),
      label: ReferenceDataHttpMapper.text(row.nombre),
      description:
        typeof row.descripcion === 'string'
          ? row.descripcion
          : null,
      active: row.estado !== false,
      inUse: row.enUso === true,
      usageCount: ReferenceDataHttpMapper.number(
        row.cantidadUso,
        0,
      ),
    };
  }

  private static array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private static text(value: unknown): string {
    return typeof value === 'string'
      ? value.trim()
      : String(value ?? '').trim();
  }

  private static number(
    value: unknown,
    fallback: number,
  ): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
}
