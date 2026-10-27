import { ReporteSeccion } from './reporte-seccion.model';
export interface Reporte {
    codigo: string;
    nombre: string;
    grupo: string | null;
    descripcion: string | null;
}
export interface ReporteDatos {
    reporte: string;
    secciones: readonly ReporteSeccion[];
}
