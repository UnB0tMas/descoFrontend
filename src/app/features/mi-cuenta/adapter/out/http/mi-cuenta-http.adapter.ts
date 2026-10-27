import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import {
  ChangeOwnPasswordRequest,
  CloseAccountSessionRequest,
  ConfirmOwnEmailChangeRequest,
  DeviceRecognitionRequest,
  MiCuentaService,
  RequestOwnEmailChangeRequest,
} from '../../../../../infrastructure/openapi/generated';
import { MiCuentaGateway } from '../../../application/port/out/mi-cuenta.gateway';
import {
  CambioPasswordCuenta,
  ConfirmacionCambioCorreo,
  SolicitudCambioCorreo,
} from '../../../domain/seguridad-cuenta.model';
import { MiCuentaHttpMapper } from './mi-cuenta-http.mapper';

@Injectable()
export class MiCuentaHttpAdapter implements MiCuentaGateway {
  private readonly api = inject(MiCuentaService);
  private readonly mapper = inject(MiCuentaHttpMapper);

  changePassword(input: CambioPasswordCuenta) {
    const changeOwnPasswordRequest: ChangeOwnPasswordRequest = input;

    return this.api
      .accountPasswordChange(
        { changeOwnPasswordRequest },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  requestEmailChange(input: SolicitudCambioCorreo) {
    const requestOwnEmailChangeRequest: RequestOwnEmailChangeRequest = input;

    return this.api
      .accountEmailChangeRequest(
        { requestOwnEmailChangeRequest },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  confirmEmailChange(input: ConfirmacionCambioCorreo) {
    const confirmOwnEmailChangeRequest: ConfirmOwnEmailChangeRequest = input;

    return this.api
      .accountEmailChangeConfirm(
        { confirmOwnEmailChangeRequest },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  listSessions() {
    return this.api
      .accountSessionsList(
        undefined,
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.sessions(response)));
  }

  closeSession(sesionPublicaId: string) {
    const closeAccountSessionRequest: CloseAccountSessionRequest = {
      sesionPublicaId,
    };

    return this.api
      .accountSessionClose(
        { closeAccountSessionRequest },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  closeOtherSessions() {
    return this.api
      .accountSessionsCloseOthers(
        undefined,
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  listDevices() {
    return this.api
      .accountDevicesList(
        undefined,
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.devices(response)));
  }

  updateDeviceRecognition(
    dispositivoUsuarioId: number,
    reconocer: boolean,
  ) {
    const deviceRecognitionRequest: DeviceRecognitionRequest = {
      dispositivoUsuarioId,
      reconocer,
    };

    return this.api
      .accountDeviceRecognitionUpdate(
        { deviceRecognitionRequest },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }
}
