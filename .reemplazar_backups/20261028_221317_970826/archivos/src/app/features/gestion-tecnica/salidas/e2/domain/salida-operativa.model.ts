export interface OpcionE2 { id: number; nombre: string; codigo?: string; }
export interface CatalogosE2 { motivos: OpcionE2[]; tiposVisita: OpcionE2[]; bienes: OpcionE2[]; }
export interface DestinoE2 { destinoId: number; predioId?: number; referencia?: string; orden: number; }
export interface BienE2 { solicitudRecursoId: number; bienId: number; nombre: string;
  estado: string; resultadoDeclarado?: string; resultadoValidado?: string; observacion?: string; }
export interface VisitaE2 { visitaId: number; predioId: number; fechaInicio?: string; fechaFin?: string;
  estado: string; objetivo?: string; resumen?: string; tipoVisita?: string; }
export interface EventoE2 { eventoId: number; tipo: string; detalle?: string; usuarioId: number; fechaHora?: string; }
export interface ResumenE2 { salidaId: number; nombre: string; estado: string; fechaSolicitud?: string;
  fechaInicioPrevista?: string; fechaFinPrevista?: string; solicitanteEmpleadoId: number; }
export interface DetalleE2 extends ResumenE2 { uotId: number; convenioId?: number; motivoSalidaId: number;
  descripcion?: string; fechaInicioReal?: string; fechaFinReal?: string; fechaAprobacion?: string;
  destinos: DestinoE2[]; bienes: BienE2[]; visitas: VisitaE2[]; historial: EventoE2[];
  observacionRetorno?: string; }
export interface SolicitudE2 { nombre: string; motivoSalidaId: number; fechaInicioPrevista: string;
  fechaFinPrevista?: string; descripcion?: string; destinos: { predioId?: number; referencia?: string }[];
  bienes: { bienId: number }[]; }
export interface EstadoBienE2 { solicitudRecursoId: number; resultado: 'CONFORME'|'DANADO'|'FALTANTE'; observacion?: string; }
export type ResultadoE2 = { salidaId: number; visitaId?: number; estado: string };
export type ListaE2 = { total: number; items: ResumenE2[] };
