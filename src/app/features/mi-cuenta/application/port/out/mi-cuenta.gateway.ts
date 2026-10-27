import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { DispositivoCuenta } from '../../../domain/dispositivo.model';
import {
  CambioPasswordCuenta,
  ConfirmacionCambioCorreo,
  SolicitudCambioCorreo,
} from '../../../domain/seguridad-cuenta.model';
import { SesionCuenta } from '../../../domain/sesion.model';

export interface MiCuentaGateway {
  changePassword(input: CambioPasswordCuenta): Observable<void>;

  requestEmailChange(input: SolicitudCambioCorreo): Observable<void>;

  confirmEmailChange(input: ConfirmacionCambioCorreo): Observable<void>;

  listSessions(): Observable<readonly SesionCuenta[]>;

  closeSession(sesionPublicaId: string): Observable<void>;

  closeOtherSessions(): Observable<void>;

  listDevices(): Observable<readonly DispositivoCuenta[]>;

  updateDeviceRecognition(
    dispositivoUsuarioId: number,
    reconocer: boolean,
  ): Observable<void>;
}

export const MI_CUENTA_GATEWAY =
  new InjectionToken<MiCuentaGateway>('MI_CUENTA_GATEWAY');
