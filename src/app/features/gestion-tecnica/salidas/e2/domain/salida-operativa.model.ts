export interface OpcionE2 { id: number; nombre: string; codigo?: string; }
export interface RecursoOpcionE2 {
  id: number; tipo: string; nombre: string; codigo?: string; unidad?: string; disponible: number;
}
export interface CatalogosE2 {
  motivos: OpcionE2[]; tiposVisita: OpcionE2[]; bienes: RecursoOpcionE2[];
  participantes: OpcionE2[];
}
export interface DestinoEntradaE2 {predioId?:number; referencia?:string; actividadPrevista?:string;}
export interface DestinoE2 extends DestinoEntradaE2 {destinoId:number;orden:number;}
export interface RecursoEntradaE2 {bienId?:number;suministroId?:number;cantidad:number;}
export interface BienE2 {
  solicitudRecursoId:number; bienId?:number;suministroId?:number;tipo:string;codigo?:string;
  nombre:string;unidad?:string;cantidadSolicitada:number; cantidadDevueltaDeclarada?:number;
  cantidadDevueltaValidada?:number;estado:string;resultadoDeclarado?:string;
  resultadoValidado?:string;observacion?:string;observacionValidacion?:string;
}
export interface ParticipanteE2 {empleadoId:number;nombre:string;funcion?:string;responsable:boolean;}
export interface ParticipanteEntradaE2 {empleadoId:number;funcion?:string;}
export interface VisitaE2 {visitaId:number;destinoId:number;predioId:number;fechaInicio?:string;fechaFin?:string;
  estado:string;objetivo?:string;resumen?:string;recomendaciones?:string;tipoVisita?:string;}
export interface EventoE2 {eventoId:number;tipo:string;detalle?:string;usuarioId:number;fechaHora?:string;}
export interface ResumenE2 {salidaId:number;nombre:string;estado:string;fechaSolicitud?:string;
  fechaInicioPrevista?:string;fechaFinPrevista?:string;solicitanteEmpleadoId:number;}
export interface DetalleE2 extends ResumenE2 {uotId:number;convenioId?:number;motivoSalidaId:number;
  descripcion?:string;fechaInicioReal?:string;fechaFinReal?:string;fechaAprobacion?:string;
  destinos:DestinoE2[];participantes:ParticipanteE2[];bienes:BienE2[];
  visitas:VisitaE2[];historial:EventoE2[];
  observacionRetorno?:string;justificacionSinVisita?:string;observacionInspeccion?:string;}
export interface SolicitudE2 {
  nombre:string;motivoSalidaId:number;fechaInicioPrevista:string;fechaFinPrevista?:string;
  descripcion?:string;destinos:DestinoEntradaE2[];bienes:RecursoEntradaE2[];
  participantes:ParticipanteEntradaE2[];borrador?:boolean;
}
export interface CorreccionE2 {
  nombre:string;descripcion?:string;motivoSalidaId:number;fechaInicioPrevista:string;
  fechaFinPrevista?:string;destinos?:DestinoEntradaE2[];bienes?:RecursoEntradaE2[];
  participantes?:ParticipanteEntradaE2[];enviar?:boolean;
}
export interface EstadoBienE2 {solicitudRecursoId:number;
  resultado:'CONFORME'|'DANADO'|'FALTANTE'|'CONSUMIDO';cantidadDevuelta?:number;observacion?:string;}
export type ResultadoE2={salidaId:number;visitaId?:number;estado:string};
export type ListaE2={total:number;items:ResumenE2[]};
