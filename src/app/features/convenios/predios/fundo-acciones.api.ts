import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { UotContextStore } from '../../uot/state/uot-context.store';

export interface FundoAptitud {
  predioId: number;
  habilitado: boolean;
  plantasActivas: number;
  version: number;
}
interface Respuesta<T> { exitoso?: boolean; datos?: T; mensaje?: string; }

@Injectable({ providedIn: 'root' })
export class FundoAccionesApi {
  private readonly http = inject(HttpClient);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly uot = inject(UotContextStore);
  private readonly base = `${inject(BASE_PATH).replace(/\/$/, '')}/api/v1/apappss/fundos`;

  private url(predioId: number): string { return `${this.base}/${predioId}`; }
  private params(convenioId: number): HttpParams {
    return new HttpParams().set('uotId', this.uot.selectedId() ?? 0).set('convenioId', convenioId);
  }
  private unwrap<T>(response: Respuesta<T>): T {
    if (!response.exitoso || response.datos == null) throw new Error(response.mensaje || 'No se pudo completar la operación.');
    return response.datos;
  }

  consultar(predioId: number, convenioId: number): Observable<FundoAptitud> {
    return this.http.get<Respuesta<FundoAptitud>>(`${this.url(predioId)}/habilitacion`,
      { params: this.params(convenioId) }).pipe(map(r => this.unwrap(r)));
  }

  cambiar(predioId: number, convenioId: number, actual: FundoAptitud): Observable<FundoAptitud> {
    const payload = { habilitado: !actual.habilitado, version: actual.version };
    const uri = `${this.url(predioId)}/habilitacion`;
    const scope = `PUT:${uri}:${this.uot.selectedId()}:${convenioId}`;
    return this.keys.idempotent(scope, payload, key => this.http.put<Respuesta<FundoAptitud>>(
      uri, payload, {params: this.params(convenioId), headers: new HttpHeaders({'X-Idempotency-Key': key})}
    ).pipe(map(r => this.unwrap(r))));
  }

  retirar(predioId: number, convenioId: number, motivo: string): Observable<{predioId:number;retirado:boolean}> {
    const uri = `${this.url(predioId)}/retirar`;
    const payload = {motivo};
    const scope = `POST:${uri}:${this.uot.selectedId()}:${convenioId}`;
    return this.keys.idempotent(scope, payload, key => this.http.post<Respuesta<{predioId:number;retirado:boolean}>>(
      uri, payload, {params: this.params(convenioId), headers: new HttpHeaders({'X-Idempotency-Key': key})}
    ).pipe(map(r => this.unwrap(r))));
  }
}
