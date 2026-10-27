export interface VisitaTecnica{visitaTecnicaId:number;salidaParticipanteId:number;salidaCampoId:number;empleadoId:number;tecnico:string;predioId:number;codigoPredio:string;predio:string;fechaHoraInicio:string|null;fechaHoraFin:string|null;objetivo:string;estadoProceso:string;latitud:number|null;longitud:number|null;}
export interface VisitaStart{salidaParticipanteId:number;predioId:number;fechaHoraInicio:string;latitud:number;longitud:number;objetivo:string;}
export interface VisitaUpdate{objetivo:string;resumen?:string;recomendaciones?:string;}
