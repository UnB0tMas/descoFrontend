export interface Catalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  requiereCategoria: boolean;
  codigoMaxLength?: number;
  nombreMaxLength?: number;
  admiteDescripcion?: boolean;
}

export const CATALOGOS_ADMINISTRABLES: readonly Catalogo[] = [
  {
    codigo: 'MOTIVO_SALIDA',
    nombre: 'Motivos de salida',
    descripcion: 'Motivos utilizados en la programación de salidas de campo.',
    requiereCategoria: false,
  },
  {
    codigo: 'TIPO_EVALUACION',
    nombre: 'Tipos de evaluación',
    descripcion: 'Tipos disponibles para evaluaciones agronómicas.',
    requiereCategoria: false,
  },
  {
    codigo: 'VARIEDAD_PALTA',
    nombre: 'Variedades de palta',
    descripcion: 'Variedades utilizadas en parcelas y procesos comerciales.',
    requiereCategoria: false,
  },
  {
    codigo: 'PROBLEMA_FITOSANITARIO',
    nombre: 'Problemas fitosanitarios',
    descripcion: 'Plagas, enfermedades y otros problemas de sanidad vegetal.',
    requiereCategoria: true,
  },
  {
    codigo: 'MODALIDAD_VENTA',
    nombre: 'Modalidades de venta',
    descripcion: 'Modalidades empleadas en condiciones comerciales.',
    requiereCategoria: false,
  },
  {
    codigo: 'TIPO_GASTO',
    nombre: 'Tipos de gasto',
    descripcion: 'Clasificación de gastos de campaña.',
    requiereCategoria: false,
  },
  {
    codigo: 'REGLA_PRORRATEO',
    nombre: 'Reglas de prorrateo',
    descripcion: 'Reglas disponibles para distribuir gastos.',
    requiereCategoria: false,
  },
  {
    codigo: 'TIPO_BIEN',
    nombre: 'Tipos de bien',
    descripcion: 'Clasificación del inventario y vehículos.',
    requiereCategoria: false,
    codigoMaxLength: 30,
    nombreMaxLength: 100,
    admiteDescripcion: false,
  },
  {
    codigo: 'ZONA_PRODUCTIVA',
    nombre: 'Zonas productivas',
    descripcion: 'Zonas utilizadas para organizar la intervención territorial.',
    requiereCategoria: false,
  },
] as const;
