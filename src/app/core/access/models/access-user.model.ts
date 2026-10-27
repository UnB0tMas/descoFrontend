export interface AccessUser {
  usuarioId: number;
  nombreUsuario: string;
  estadoCuenta: string | null;
  ultimoAccesoCorrectoUtc: string | null;
  requiereCambioPassword: boolean;
  segundoFactorHabilitado: boolean;
  tokenVersion: number | null;
  personaId: number | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombreCompleto: string | null;
  telefono: string | null;
  codigoEmpleado: string | null;
  empresaId: number | null;
  correoSeguridad: string | null;
  correoSeguridadVerificado: boolean;
  sesionPublicaId: string | null;
  fechaSesionUtc: string | null;
  fechaExpiracionRenovacionUtc: string | null;
  dispositivoUsuarioId: number | null;
  navegador: string | null;
  sistemaOperativo: string | null;
  dispositivoReconocido: boolean;
}
