export interface SesionCuenta {
  sesionPublicaId: string;
  fechaCreacionUtc: string | null;
  fechaUltimaActividadUtc: string | null;
  fechaExpiracionRenovacionUtc: string | null;
  ipCreacion: string | null;
  ipUltimaActividad: string | null;
  sesionActual: boolean;
  activa: boolean;
  dispositivoUsuarioId: number | null;
  navegador: string | null;
  sistemaOperativo: string | null;
  fechaPrimeraDeteccionUtc: string | null;
  fechaUltimaActividadDispositivoUtc: string | null;
  reconocido: boolean;
}
