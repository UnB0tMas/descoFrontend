export type EvidenciaContextoTipo =
  | 'SOCIO'
  | 'EMPLEADO'
  | 'PREDIO'
  | 'PARCELA'
  | 'CULTIVO'
  | 'CENSO'
  | 'SALIDA'
  | 'VISITA'
  | 'EVALUACION'
  | 'CASO_SANIDAD'
  | 'TRATAMIENTO'
  | 'SEGUIMIENTO'
  | 'PRODUCCION'
  | 'CAMPANIA'
  | 'PRECIO'
  | 'PARTICIPANTE'
  | 'OPERATIVO'
  | 'JABA_ASIGNACION'
  | 'JABA_DEVOLUCION'
  | 'ENTREGA'
  | 'INCIDENCIA'
  | 'AJUSTE'
  | 'BIEN'
  | 'RECURSO'
  | 'GASTO'
  | 'LIQUIDACION'
  | 'PAGO'
  | 'COBRO';

export interface EvidenciaContexto {
  tipo: EvidenciaContextoTipo;
  id: number;
  etiqueta?: string | null;
}

export interface EvidenciaContextoDescriptor {
  tipo: EvidenciaContextoTipo;
  etiqueta: string;
  campoVinculo: string;
}

export const EVIDENCIA_CONTEXTOS: readonly EvidenciaContextoDescriptor[] = [
  { tipo: 'SOCIO', etiqueta: 'Productor / socio', campoVinculo: 'socioId' },
  { tipo: 'EMPLEADO', etiqueta: 'Empleado', campoVinculo: 'empleadoId' },
  { tipo: 'PREDIO', etiqueta: 'Predio', campoVinculo: 'predioId' },
  { tipo: 'PARCELA', etiqueta: 'Parcela', campoVinculo: 'parcelaId' },
  { tipo: 'CULTIVO', etiqueta: 'Cultivo', campoVinculo: 'parcelaCultivoId' },
  { tipo: 'CENSO', etiqueta: 'Censo de plantas', campoVinculo: 'censoPlantasId' },
  { tipo: 'SALIDA', etiqueta: 'Salida de campo', campoVinculo: 'salidaCampoId' },
  { tipo: 'VISITA', etiqueta: 'Visita técnica', campoVinculo: 'visitaTecnicaId' },
  { tipo: 'EVALUACION', etiqueta: 'Evaluación agronómica', campoVinculo: 'evaluacionAgronomicaId' },
  { tipo: 'CASO_SANIDAD', etiqueta: 'Caso de sanidad vegetal', campoVinculo: 'casoFitosanitarioId' },
  { tipo: 'TRATAMIENTO', etiqueta: 'Tratamiento sanitario', campoVinculo: 'tratamientoId' },
  { tipo: 'SEGUIMIENTO', etiqueta: 'Seguimiento sanitario', campoVinculo: 'seguimientoFitosanitarioId' },
  { tipo: 'PRODUCCION', etiqueta: 'Producción disponible', campoVinculo: 'disponibilidadProduccionId' },
  { tipo: 'CAMPANIA', etiqueta: 'Campaña de venta', campoVinculo: 'campaniaVentaId' },
  { tipo: 'PRECIO', etiqueta: 'Precio comercial', campoVinculo: 'precioComercialId' },
  { tipo: 'PARTICIPANTE', etiqueta: 'Participación en campaña', campoVinculo: 'participacionCampaniaSocioId' },
  { tipo: 'OPERATIVO', etiqueta: 'Operativo de venta', campoVinculo: 'operativoVentaId' },
  { tipo: 'JABA_ASIGNACION', etiqueta: 'Asignación de jabas', campoVinculo: 'jabaAsignacionId' },
  { tipo: 'JABA_DEVOLUCION', etiqueta: 'Devolución de jabas', campoVinculo: 'jabaDevolucionId' },
  { tipo: 'ENTREGA', etiqueta: 'Entrega del socio', campoVinculo: 'entregaSocioId' },
  { tipo: 'INCIDENCIA', etiqueta: 'Incidencia operativa', campoVinculo: 'incidenciaOperativaId' },
  { tipo: 'AJUSTE', etiqueta: 'Ajuste de precio', campoVinculo: 'ajustePrecioSocioId' },
  { tipo: 'BIEN', etiqueta: 'Bien de inventario', campoVinculo: 'bienInventarioId' },
  { tipo: 'RECURSO', etiqueta: 'Recurso programado', campoVinculo: 'recursoProgramadoId' },
  { tipo: 'GASTO', etiqueta: 'Gasto de campaña', campoVinculo: 'gastoCampaniaId' },
  { tipo: 'LIQUIDACION', etiqueta: 'Liquidación', campoVinculo: 'liquidacionSocioId' },
  { tipo: 'PAGO', etiqueta: 'Pago al socio', campoVinculo: 'pagoSocioId' },
  { tipo: 'COBRO', etiqueta: 'Cobro del comprador', campoVinculo: 'cobroCompradorId' },
] as const;

export function evidenciaContextoLabel(tipo: string | null | undefined): string {
  if (!tipo) return 'Sin contexto';
  const descriptor = EVIDENCIA_CONTEXTOS.find((item) => item.tipo === tipo);
  return descriptor?.etiqueta ?? tipo;
}
