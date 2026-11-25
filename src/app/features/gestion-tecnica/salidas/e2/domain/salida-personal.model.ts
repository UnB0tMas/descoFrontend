/** Datos confirmados por SQL para el usuario autenticado. */
export interface MiSalidaResumen {
  salidaId: number;
  codigo: string;
  nombre: string;
  estado: string;
  fechaSolicitud?: string | null;
  fechaInicioPrevista?: string | null;
  fechaFinPrevista?: string | null;
  destinosResumen?: string | null;
  visitas: number;
  puedeCancelar: boolean;
}
export interface MisSalidasPagina {
  total: number;
  items: MiSalidaResumen[];
}
export interface MiDestino {
  destinoId: number; predioId: number | null; nombrePredio: string | null;
  codigoPredio: string | null; referencia: string | null;
  actividadPrevista: string | null; orden: number;
}
export interface MiVisita {
  visitaId: number; predioId: number; tipoVisita: string; objetivo: string | null;
  resumen: string | null; recomendaciones: string | null; estado: string;
  fechaInicio: string; fechaFin: string | null;
  iniciadaPorMi: boolean; finalizadaPorMi: boolean;
}
export interface MiActuacion {
  actuacionId: number; visitaId: number; predioId: number; tipo: string;
  observacion: string; fecha: string;
}
export interface MiConsumo {
  consumoId: number; visitaId: number; predioId: number; tratamientoId: number;
  solicitudRecursoId: number; suministro: string; cantidad: number; unidad: string;
  lote: string | null; cantidadSolicitadaSalida: number;
  cantidadDevueltaValidadaSalida: number | null;
  tratamiento: string; fecha: string;
}
export interface MiEvidencia {
  archivoId: number; nombre: string; descripcion: string | null;
  visitaId: number | null; predioId: number | null; fecha: string;
}
export interface MiEvento {
  eventoId: number; tipo: string; detalle: string | null; usuarioId: number;
  usuario?: string | null; fecha: string;
}
export interface MiSalidaActividad {
  salidaId: number; codigo: string; nombre: string; estado: string; uotId: number;
  solicitanteNombre: string | null;
  fechaSolicitud: string; fechaInicioPrevista: string; fechaFinPrevista: string | null;
  fechaInicioReal: string | null; fechaFinReal: string | null;
  documentoId: number | null; puedeCancelar: boolean;
  destinos: MiDestino[]; visitas: MiVisita[]; actuaciones: MiActuacion[];
  consumos: MiConsumo[]; evidencias: MiEvidencia[];
  historialPropio: MiEvento[]; historialExpediente: MiEvento[];
}
