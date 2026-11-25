import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { BASE_PATH } from '../../../infrastructure/openapi/generated';
import { ApiEnvelope, unwrapApiResponse } from '../../../infrastructure/openapi/api-response-unwrapper';
import { EntityDraft } from '../../../shared/forms/person-registration/entity-registration-modal';

export interface Proveedor {
  id:number; tipo:'PERSONA'|'EMPRESA'; entidadId:number; nombre:string;
  tipoDocumento:string; documento:string; telefono?:string|null; correo?:string|null; estado:boolean;
  nombres?:string|null; apellidoPaterno?:string|null; apellidoMaterno?:string|null;
  razonSocial?:string|null; nombreComercial?:string|null; fechaNacimiento?:string|null; sexo?:string|null;
}
export interface ProveedoresPage {total:number; items:Proveedor[];}

@Injectable({providedIn:'root'})
export class ProveedoresApiService {
  private readonly http=inject(HttpClient);
  private readonly keys=inject(IdempotencyKeyService);
  private readonly url=String(inject(BASE_PATH)).replace(/\/$/,'')+'/api/v1/proveedores';

  list(uotId:number,pagina=1,tamano=20,buscar='',tipo='',soloActivos=false):Observable<ProveedoresPage> {
    let params=new HttpParams().set('uotId',uotId).set('pagina',pagina).set('tamano',tamano)
      .set('buscar',buscar).set('soloActivos',soloActivos);
    if(tipo)params=params.set('tipo',tipo);
    return this.http.get<ApiEnvelope<ProveedoresPage>>(this.url,{params,transferCache:false})
      .pipe(map(unwrapApiResponse));
  }
  allActive(uotId:number):Observable<Proveedor[]> {
    const size=100;
    return this.list(uotId,1,size,'','',true).pipe(
      expand((r,index)=>(index+1)*size<r.total
        ?this.list(uotId,index+2,size,'','',true):EMPTY),
      map(r=>r.items??[]),
      reduce((all,items)=>[...all,...items],[] as Proveedor[]),
    );
  }
  register(uotId:number,data:EntityDraft):Observable<number> {
    const tipo=data.tipoDocumento==='RUC'?'EMPRESA':'PERSONA';
    const body={uotId,tipo,tipoDocumento:data.tipoDocumento,numeroDocumento:data.numeroDocumento,
      nombres:data.nombres||undefined,apellidoPaterno:data.apellidoPaterno||undefined,
      apellidoMaterno:data.apellidoMaterno||undefined,razonSocial:data.razonSocial||undefined,
      nombreComercial:data.nombreComercial||undefined,fechaNacimiento:data.fechaNacimiento||undefined,
      sexo:data.sexo||undefined,telefono:data.telefono||undefined,correo:data.correo||undefined};
    return this.keys.idempotent(`proveedores:registrar:${uotId}`,body,key=>
      this.http.post<ApiEnvelope<{id:number}>>(this.url,body,{headers:new HttpHeaders({'X-Idempotency-Key':key})})
        .pipe(map(unwrapApiResponse),map(r=>r.id)));
  }
  update(uotId:number,id:number,data:EntityDraft):Observable<number> {
    const body={uotId,tipo:data.tipoDocumento==='RUC'?'EMPRESA':'PERSONA',
      tipoDocumento:data.tipoDocumento,numeroDocumento:data.numeroDocumento,
      nombres:data.nombres||undefined,apellidoPaterno:data.apellidoPaterno||undefined,
      apellidoMaterno:data.apellidoMaterno||undefined,razonSocial:data.razonSocial||undefined,
      nombreComercial:data.nombreComercial||undefined,fechaNacimiento:data.fechaNacimiento||undefined,
      sexo:data.sexo||undefined,telefono:data.telefono||undefined,correo:data.correo||undefined};
    return this.keys.idempotent(`proveedores:actualizar:${uotId}:${id}`,body,key=>
      this.http.put<ApiEnvelope<{id:number}>>(`${this.url}/${id}`,body,
        {headers:new HttpHeaders({'X-Idempotency-Key':key})})
        .pipe(map(unwrapApiResponse),map(r=>r.id)));
  }
  setState(uotId:number,id:number,estado:boolean):Observable<number> {
    return this.keys.idempotent(`proveedores:estado:${uotId}:${id}`,{estado},key=>
      this.http.put<ApiEnvelope<{id:number}>>(`${this.url}/${id}/estado`,{},
        {params:new HttpParams().set('uotId',uotId).set('estado',estado),
         headers:new HttpHeaders({'X-Idempotency-Key':key})})
        .pipe(map(unwrapApiResponse),map(r=>r.id)));
  }
}
