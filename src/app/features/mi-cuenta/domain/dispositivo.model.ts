export interface DispositivoCuenta {
  dispositivoUsuarioId: number;
  navegador: string | null;
  sistemaOperativo: string | null;
  fechaPrimeraDeteccionUtc: string | null;
  fechaUltimaActividadUtc: string | null;
  ultimaIp: string | null;
  reconocidoVigente: boolean;
  fechaReconocimientoUtc: string | null;
  fechaExpiracionReconocimientoUtc: string | null;
  dispositivoActual: boolean;
}
