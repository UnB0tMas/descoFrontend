import {SalidaParticipante,SalidaParticipanteInput} from './salida-participante.model';import {SalidaBien,SalidaRecurso} from './salida-recurso.model';
export interface SalidaCampo {salidaCampoId:number;motivoSalidaId:number;motivo:string;fechaHoraProgramada:string|null;fechaHoraSalidaReal:string|null;fechaHoraRetornoReal:string|null;descripcion:string|null;estadoProceso:string;estado:boolean;participantes:number;recursosProgramados:number;}
export interface SalidaVisita {visitaTecnicaId:number;salidaParticipanteId:number;predioId:number;predioCodigo:string;predioNombre:string;fechaHoraInicio:string|null;fechaHoraFin:string|null;estadoProceso:string;estado:boolean;}
export interface SalidaDetalle {salida:SalidaCampo;motivoCodigo:string|null;participantes:readonly SalidaParticipante[];recursos:readonly SalidaRecurso[];bienes:readonly SalidaBien[];visitas:readonly SalidaVisita[];}
export interface SalidaInput {motivoSalidaId:number;fechaHoraProgramada:string;descripcion?:string;participantes:readonly SalidaParticipanteInput[];}
export interface SalidaFiltro {estadoProceso?:string;motivoSalidaId?:number;fechaDesde?:string;fechaHasta?:string;page:number;size:number;}
