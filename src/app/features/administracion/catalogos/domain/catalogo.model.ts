export type CatalogoGrupoCodigo =
  | 'ADMINISTRACION'
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

  /**
   * Longitudes reales de la tabla que respalda el catálogo.
   * CatalogoDetailComponent usa estos valores para construir
   * los validadores y maxlength del formulario.
   */
  codigoMaxLength: number;
  nombreMaxLength: number;

  /**
   * Indica si la entidad física dispone de columna descripcion.
   * No debe mostrarse ni enviarse este campo cuando la tabla
   * correspondiente no lo almacena.
   */
  admiteDescripcion: boolean;
}

export interface CatalogoGrupo {
  codigo: CatalogoGrupoCodigo;
  nombre: string;
  catalogos: readonly Catalogo[];
}

export const CATALOGOS_ADMINISTRABLES: readonly Catalogo[] = [
  {
    codigo: 'TIPO_DOCUMENTO_COMPRADOR',
    nombre: 'Tipos de documento de comprador',
    descripcion: 'Documentos habilitados para identificar compradores de APAPPSS.',
    requiereCategoria: false,
    grupoCodigo: 'ADMINISTRACION',
    grupoNombre: 'Administración',
    codigoMaxLength: 15,
    nombreMaxLength: 120,
    admiteDescripcion: true,
  },
  {
    codigo: 'CARGO_EMPLEADO',
    nombre: 'Cargos de empleado',
    descripcion: 'Cargos disponibles para la asignación de empleados a áreas.',
    requiereCategoria: false,
    grupoCodigo: 'ADMINISTRACION',
    grupoNombre: 'Administración',
    codigoMaxLength: 40,
    nombreMaxLength: 120,
    admiteDescripcion: true,
  },
  {
    codigo: 'MOTIVO_SALIDA',
    nombre: 'Motivos de salida',
    descripcion: 'Motivos utilizados en la programación de salidas de campo.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
    codigoMaxLength: 40,
    nombreMaxLength: 120,
    admiteDescripcion: false,
  },
  {
    codigo: 'TIPO_EVALUACION',
    nombre: 'Tipos de evaluación',
    descripcion: 'Tipos disponibles para evaluaciones agronómicas.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
    codigoMaxLength: 40,
    nombreMaxLength: 120,
    admiteDescripcion: false,
  },
  {
    codigo: 'VARIEDAD_PALTA',
    nombre: 'Variedades de palta',
    descripcion:
      'Variedades utilizadas en parcelas, evaluaciones y procesos comerciales.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
    codigoMaxLength: 30,
    nombreMaxLength: 100,
    admiteDescripcion: false,
  },
  {
    codigo: 'PROBLEMA_FITOSANITARIO',
    nombre: 'Problemas fitosanitarios',
    descripcion: 'Plagas, enfermedades y otros problemas de sanidad vegetal.',
    requiereCategoria: true,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
    codigoMaxLength: 40,
    nombreMaxLength: 140,
    admiteDescripcion: false,
  },
  {
    codigo: 'SANCION_VENTA',
    nombre: 'Sanciones de venta',
    descripcion: 'Motivos administrables de sanción comercial.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_COMERCIAL',
    grupoNombre: 'Gestión comercial',
    codigoMaxLength: 40,
    nombreMaxLength: 120,
    admiteDescripcion: true,
  },
  {
    codigo: 'MODALIDAD_VENTA',
    nombre: 'Modalidades de venta',
    descripcion: 'Modalidades empleadas en condiciones comerciales.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_COMERCIAL',
    grupoNombre: 'Gestión comercial',
    codigoMaxLength: 30,
    nombreMaxLength: 100,
    admiteDescripcion: false,
  },
  {
    codigo: 'TIPO_GASTO',
    nombre: 'Tipos de gasto',
    descripcion: 'Clasificación de gastos de campaña.',
    requiereCategoria: false,
    grupoCodigo: 'FINANZAS',
    grupoNombre: 'Finanzas',
    codigoMaxLength: 30,
    nombreMaxLength: 120,
    admiteDescripcion: false,
  },
  {
    codigo: 'REGLA_PRORRATEO',
    nombre: 'Reglas de distribución',
    descripcion:
      'Reglas disponibles para distribuir los gastos entre participantes.',
    requiereCategoria: false,
    grupoCodigo: 'FINANZAS',
    grupoNombre: 'Finanzas',
    codigoMaxLength: 30,
    nombreMaxLength: 120,
    admiteDescripcion: false,
  },
  {
    codigo: 'TIPO_BIEN',
    nombre: 'Tipos de bien',
    descripcion: 'Clasificación utilizada en inventario y vehículos.',
    requiereCategoria: false,
    grupoCodigo: 'RECURSOS',
    grupoNombre: 'Recursos',
    codigoMaxLength: 30,
    nombreMaxLength: 100,
    admiteDescripcion: false,
  },
  {
    codigo: 'TIPO_VEHICULO',
    nombre: 'Tipos de vehículo',
    descripcion: 'Clasificación administrable para los vehículos asociados al inventario.',
    requiereCategoria: false,
    grupoCodigo: 'RECURSOS',
    grupoNombre: 'Recursos',
    codigoMaxLength: 30,
    nombreMaxLength: 150,
    admiteDescripcion: true,
  },
  {
    codigo: 'UNIDAD_MEDIDA',
    nombre: 'Unidades de medida',
    descripcion: 'Unidades disponibles para productos, suministros y movimientos.',
    requiereCategoria: false,
    grupoCodigo: 'RECURSOS',
    grupoNombre: 'Recursos',
    codigoMaxLength: 20,
    nombreMaxLength: 150,
    admiteDescripcion: true,
  },
  {
    codigo: 'CATEGORIA_PRODUCTO',
    nombre: 'Categorías de producto',
    descripcion: 'Clasificación administrable del catálogo de productos.',
    requiereCategoria: false,
    grupoCodigo: 'RECURSOS',
    grupoNombre: 'Recursos',
    codigoMaxLength: 40,
    nombreMaxLength: 150,
    admiteDescripcion: true,
  },
  {
    codigo: 'MONEDA',
    nombre: 'Monedas',
    descripcion: 'Monedas habilitadas para precios y costos de recursos.',
    requiereCategoria: false,
    grupoCodigo: 'RECURSOS',
    grupoNombre: 'Recursos',
    codigoMaxLength: 3,
    nombreMaxLength: 150,
    admiteDescripcion: true,
  },
  {
    codigo: 'TIPO_TITULARIDAD',
    nombre: 'Tipos de titularidad',
    descripcion: 'Clasificaciones de las personas titulares de un predio.',
    requiereCategoria: false,
    grupoCodigo: 'GESTION_TECNICA',
    grupoNombre: 'Gestión técnica',
    codigoMaxLength: 20,
    nombreMaxLength: 120,
    admiteDescripcion: false,
  },
  {
    codigo: 'ZONA_PRODUCTIVA',
    nombre: 'Zonas productivas',
    descripcion: 'Zonas utilizadas para organizar la intervención territorial.',
    requiereCategoria: false,
    grupoCodigo: 'TERRITORIO',
    grupoNombre: 'Territorio',
    codigoMaxLength: 30,
    nombreMaxLength: 150,
    admiteDescripcion: true,
  },
] as const;

const GRUPOS: readonly {
  codigo: CatalogoGrupoCodigo;
  nombre: string;
}[] = [
  { codigo: 'ADMINISTRACION', nombre: 'Administración' },
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
