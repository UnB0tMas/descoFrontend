export interface IncidenciaOperativa{incidenciaId:number;operativoVentaId:number;operativo:string|null;entregaSocioId:number|null;codigoLote:string|null;tipoIncidencia:string;fechaHora:string|null;pesoAfectadoKg:number|null;severidad:string;descripcion:string;estadoIncidencia:string;}
export interface IncidenciaArchivo{archivoId:number;nombreOriginal:string;mimeType:string;secureUrl:string|null;categoria:string|null;descripcion:string|null;}
export interface IncidenciaDetalle{incidencia:IncidenciaOperativa;archivos:readonly IncidenciaArchivo[];}
export interface IncidenciaCreate{operativoVentaId:number;entregaSocioId?:number;tipoIncidencia:string;pesoAfectadoKg?:number;severidad:string;descripcion:string;}
export interface IncidenciaReview{pesoAfectadoKg?:number;severidad:string;descripcion:string;}
