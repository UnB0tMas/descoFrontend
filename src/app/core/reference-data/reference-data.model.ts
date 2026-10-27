export interface ReferenceItem {
  id: number | string;
  code: string;
  label: string;
  description: string | null;
  active: boolean;
  inUse: boolean;
  usageCount: number;
}

export interface ReferencePage {
  items: readonly ReferenceItem[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

export interface GeographyItem {
  code: string;
  label: string;
  id: number | null;
}

export type ReferenceCatalogCode =
  | 'MOTIVO_SALIDA'
  | 'TIPO_EVALUACION'
  | 'VARIEDAD_PALTA'
  | 'PROBLEMA_FITOSANITARIO'
  | 'MODALIDAD_VENTA'
  | 'TIPO_GASTO'
  | 'REGLA_PRORRATEO'
  | 'TIPO_BIEN'
  | 'ZONA_PRODUCTIVA'
  | string;
