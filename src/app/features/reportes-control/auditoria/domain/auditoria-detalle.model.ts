import { AuditoriaEvento } from './auditoria-evento.model';
export interface AuditoriaTransicion {
    transicionEstadoId: number;
    campoEstado: string | null;
    estadoAnterior: string | null;
    estadoNuevo: string | null;
    motivo: string | null;
    fechaHoraUtc: string | null;
}
export interface AuditoriaDetalle {
    evento: AuditoriaEvento;
    transiciones: readonly AuditoriaTransicion[];
}
