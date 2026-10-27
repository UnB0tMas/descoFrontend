export interface CambioPasswordCuenta {
  passwordActual: string;
  nuevoPassword: string;
  confirmarPassword: string;
}

export interface SolicitudCambioCorreo {
  nuevoCorreo: string;
}

export interface ConfirmacionCambioCorreo {
  codigo: string;
}
