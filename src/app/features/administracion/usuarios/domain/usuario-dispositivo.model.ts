export interface UsuarioDispositivo {
  dispositivoUsuarioId: number;
  navegador: string | null;
  sistemaOperativo: string | null;
  primeraDeteccion: string | null;
  ultimaActividad: string | null;
  esReconocido: boolean;
  fechaReconocimiento: string | null;
  fechaRetiroReconocimiento: string | null;
  estado: boolean;
}
