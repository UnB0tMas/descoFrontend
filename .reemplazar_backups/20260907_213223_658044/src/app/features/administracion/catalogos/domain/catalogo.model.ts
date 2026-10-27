export type CatalogoGrupoCodigo =
  | 'GESTION_TECNICA'
  | 'GESTION_COMERCIAL'
  | 'FINANZAS'
  | 'RECURSOS'
  | 'TERRITORIO';

export interface Catalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  requiereCategoria: boolean;
  grupoCodigo: CatalogoGrupoCodigo;
  grupoNombre: string;
}

export interface CatalogoGrupo {
  codigo: CatalogoGrupoCodigo;
  nombre: string;
  catalogos: readonly Catalogo[];
}

export const CATALOGOS_ADMINISTRABLES: readonly Catalogo[] = [
  {
    codigo: 'MOTIVO_SALIDA',
    nombre: 'Motivos de salida',
    descripcion: 'Motivos utilizados en la programación de salidas de campo.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
  },
  {
    codigo: 'TIPO_EVALUACION',
    nombre: 'Tipos de evaluación',
    descripcion: 'Tipos disponibles para evaluaciones agronómicas.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
  },
  {
    codigo: 'VARIEDAD_PALTA',
    nombre: 'Variedades de palta',
    descripcion: 'Variedades utilizadas en parcelas, evaluaciones y procesos comerciales.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
  },
  {
    codigo: 'PROBLEMA_FITOSANITARIO',
    nombre: 'Problemas fitosanitarios',
    descripcion: 'Plagas, enfermedades y otros problemas de sanidad vegetal.',
    requiereCategoria: true,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
  },
  {
    codigo: 'MODALIDAD_VENTA',
    nombre: 'Modalidades de venta',
    descripcion: 'Modalidades empleadas en condiciones comerciales.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_COMERCIAL',
    grupoNombre: 'Gestión comercial',
  },
  {
    codigo: 'TIPO_GASTO',
    nombre: 'Tipos de gasto',
    descripcion: 'Clasificación de gastos de campaña.',
    requiereCategoria: false,
    grupoCodigo: 'FINANZAS',
    grupoNombre: 'Finanzas',
  },
  {
    codigo: 'REGLA_PRORRATEO',
    nombre: 'Reglas de distribución',
    descripcion: 'Reglas disponibles para distribuir los gastos entre participantes.',
    requiereCategoria: false,
    grupoCodigo: 'FINANZAS',
    grupoNombre: 'Finanzas',
  },
  {
    codigo: 'TIPO_BIEN',
    nombre: 'Tipos de bien',
    descripcion: 'Clasificación utilizada en inventario y vehículos.',
    requiereCategoria: false,
    grupoCodigo: 'RECURSOS',
    grupoNombre: 'Recursos',
  },
  {
    codigo: 'ZONA_PRODUCTIVA',
    nombre: 'Zonas productivas',
    descripcion: 'Zonas utilizadas para organizar la intervención territorial.',
    requiereCategoria: false,
    grupoCodigo: 'TERRITORIO',
    grupoNombre: 'Territorio',
  },
] as const;

const GRUPOS: readonly {
  codigo: CatalogoGrupoCodigo;
  nombre: string;
}[] = [
  { codigo: 'GESTION_TECNICA', nombre: 'Gestión técnica' },
  { codigo: 'GESTION_COMERCIAL', nombre: 'Gestión comercial' },
  { codigo: 'FINANZAS', nombre: 'Finanzas' },
  { codigo: 'RECURSOS', nombre: 'Recursos' },
  { codigo: 'TERRITORIO', nombre: 'Territorio' },
];

export const CATALOGOS_AGRUPADOS: readonly CatalogoGrupo[] = GRUPOS.map(
  (grupo) => ({
    codigo: grupo.codigo,
    nombre: grupo.nombre,
    catalogos: CATALOGOS_ADMINISTRABLES.filter(
      (catalogo) => catalogo.grupoCodigo === grupo.codigo,
    ),
  }),
).filter((grupo) => grupo.catalogos.length > 0);
