export interface SalidaParticipante {salidaParticipanteId:number;empleadoId:number;codigoEmpleado:string|null;nombres:string;apellidoPaterno:string;apellidoMaterno:string|null;funcion:string|null;esResponsable:boolean;estado:boolean;}
export interface SalidaParticipanteInput {empleadoId:number;funcion?:string;esResponsable:boolean;}
