import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { ApiEnvelope, unwrapApiResponse } from '../../../../../../../infrastructure/openapi/api-response-unwrapper';

export interface PredioSalida {
  predioId: number;
  nombre: string;
  codigo: string;
}
@Injectable({ providedIn: 'root' })
export class PrediosSalidaApi {
  private readonly http = inject(HttpClient);
  listar(uotId: number, buscar?: string) {
    let params=new HttpParams().set('uotId', uotId);
    if(buscar?.trim())params=params.set('buscar',buscar.trim());
    return this.http.get<ApiEnvelope<PredioSalida[]>>(
      `${environment.apiBaseUrl}/api/v1/salidas-operativas/predios`, {params})
      .pipe(map(response => unwrapApiResponse<PredioSalida[]>(response) ?? []));
  }
}
