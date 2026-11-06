# DESCO — ETAPA 2 — actividad.md (frontend)

## Resumen de propósito
Etapa 2 DESCO/APAPPSS: flujo de solicitud, aprobación, entrega física, visitas, retorno, inspección y cierre.
Se conserva la información histórica y el kardex existente.

## Pasos de validación
1. Ejecutar `--simular` con el reemplazador de cada proyecto.
2. Aplicar backend, resolver previamente colisiones Flyway existentes y ejecutar las nuevas migraciones.
3. Levantar el backend, regenerar OpenAPI Angular con la configuración del proyecto y aplicar frontend.
4. Compilar y ejecutar pruebas; verificar T05, T06, T07, 3 destinos, permisos y reintentos contra SQL Server real.

## Mapa de archivos afectados
`src/app/features/gestion-tecnica/salidas/e2/domain/salida-operativa.model.ts`, `src/app/features/gestion-tecnica/salidas/e2/application/port/salidas-e2.gateway.ts`, `src/app/features/gestion-tecnica/salidas/e2/application/use-case/salidas-e2.use-case.ts`, `src/app/features/gestion-tecnica/salidas/e2/adapter/out/http/salidas-e2-http.adapter.ts`, `src/app/features/gestion-tecnica/salidas/salidas.routes.ts`, `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativas-list/operativas-list.ts`, `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativas-list/operativas-list.html`, `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativa-detail/operativa-detail.ts`, `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativa-detail/operativa-detail.html`

## Contratos OpenAPI y sincronización

| Backend controlador / esquema | operationId | Angular generado | Adaptador consumidor |
|---|---|---|---|
| `E2Controller.solicitar / E2SolicitudRequest` | `salidasOperativasSolicitar` | `SalidasOperativasService.salidasOperativasSolicitar / E2SolicitudRequest` | `salidas-e2-http.adapter.ts` |
| `E2Controller.corregir / E2CorreccionRequest` | `salidasOperativasCorregir` | `SalidasOperativasService.salidasOperativasCorregir / E2CorreccionRequest` | mismo adaptador |
| `E2Controller.regularizarFin / E2FechaFinRequest` | `salidasOperativasRegularizarFin` | `SalidasOperativasService.salidasOperativasRegularizarFin / E2FechaFinRequest` | mismo adaptador |
| `E2Controller.listar/ver/catalogos / E2SalidasResponse, E2SalidaDetalleResponse, E2CatalogosResponse` | `salidasOperativasListar`, `salidasOperativasVer`, `salidasOperativasCatalogos` | `SalidasOperativasService`, modelos E2 existentes | mismo adaptador |
| `E2Controller.decidir, entregar, iniciar, visitar, finalizarVisita, retornar, inspeccionar, cerrar, vincularDestino, cancelar` | `salidasOperativasDecidir`, `salidasOperativasEntregar`, `salidasOperativasIniciar`, `salidasOperativasVisitar`, `salidasOperativasVisitaFinalizar`, `salidasOperativasRetornar`, `salidasOperativasInspeccionar`, `salidasOperativasCerrar`, `salidasOperativasVincularDestino`, `salidasOperativasCancelar` | `SalidasOperativasService` y los modelos E2 vigentes | mismo adaptador |

## Operaciones completas

Ruta: `src/app/features/gestion-tecnica/salidas/e2/domain/salida-operativa.model.ts`
Contenido: completo
```typescript
export interface OpcionE2 { id: number; nombre: string; codigo?: string; }
export interface CatalogosE2 { motivos: OpcionE2[]; tiposVisita: OpcionE2[]; bienes: OpcionE2[]; }
export interface DestinoE2 { destinoId: number; predioId?: number; referencia?: string; orden: number; }
export interface BienE2 { solicitudRecursoId: number; bienId: number; nombre: string;
  estado: string; resultadoDeclarado?: string; resultadoValidado?: string; observacion?: string; }
export interface VisitaE2 { visitaId: number; predioId: number; fechaInicio?: string; fechaFin?: string;
  estado: string; objetivo?: string; resumen?: string; tipoVisita?: string; }
export interface EventoE2 { eventoId: number; tipo: string; detalle?: string; usuarioId: number; fechaHora?: string; }
export interface ResumenE2 { salidaId: number; nombre: string; estado: string; fechaSolicitud?: string;
  fechaInicioPrevista?: string; fechaFinPrevista?: string; solicitanteEmpleadoId: number; }
export interface DetalleE2 extends ResumenE2 { uotId: number; convenioId?: number; motivoSalidaId: number;
  descripcion?: string; fechaInicioReal?: string; fechaFinReal?: string; fechaAprobacion?: string;
  destinos: DestinoE2[]; bienes: BienE2[]; visitas: VisitaE2[]; historial: EventoE2[];
  observacionRetorno?: string; }
export interface SolicitudE2 { nombre: string; motivoSalidaId: number; fechaInicioPrevista: string;
  fechaFinPrevista?: string; descripcion?: string; destinos: { predioId?: number; referencia?: string }[];
  bienes: { bienId: number }[]; }
export interface EstadoBienE2 { solicitudRecursoId: number; resultado: 'CONFORME'|'DANADO'|'FALTANTE'; observacion?: string; }
export type ResultadoE2 = { salidaId: number; visitaId?: number; estado: string };
export type ListaE2 = { total: number; items: ResumenE2[] };

export interface CorreccionE2 {
  nombre: string;
  descripcion?: string;
  motivoSalidaId?: number;
  fechaInicioPrevista?: string;
  fechaFinPrevista?: string;
  destinos?: {predioId?: number; referencia?: string}[];
  bienes?: {bienId: number}[];
}
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/application/port/salidas-e2.gateway.ts`
Contenido: completo
```typescript
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogosE2, CorreccionE2, DetalleE2, EstadoBienE2, ListaE2, ResultadoE2, SolicitudE2 } from '../../domain/salida-operativa.model';
export interface SalidasE2Gateway {
  catalogos(uotId: number, convenioId?: number): Observable<CatalogosE2>;
  listar(uotId: number, convenioId?: number, estado?: string, pagina?: number, tamano?: number): Observable<ListaE2>;
  ver(uotId: number, id: number, convenioId?: number): Observable<DetalleE2>;
  solicitar(uotId: number, entrada: SolicitudE2, convenioId?: number): Observable<ResultadoE2>;
  corregir(uotId: number, id: number, correccion: CorreccionE2, convenioId?: number): Observable<ResultadoE2>;
  decidir(uotId: number, id: number, decision: 'APROBADA'|'OBSERVADA'|'RECHAZADA', motivo?: string, convenioId?: number): Observable<ResultadoE2>;
  entregar(uotId: number, id: number, convenioId?: number): Observable<ResultadoE2>;
  iniciar(uotId: number, id: number, convenioId?: number): Observable<ResultadoE2>;
  visitar(uotId: number, id: number, destinoId: number, tipoVisitaId: number, objetivo?: string, convenioId?: number): Observable<ResultadoE2>;
  finalizarVisita(uotId: number, id: number, visitaId: number, resumen: string, convenioId?: number): Observable<ResultadoE2>;
  retornar(uotId: number, id: number, observacionGeneral: string, bienes: EstadoBienE2[], convenioId?: number): Observable<ResultadoE2>;
  inspeccionar(uotId: number, id: number, bienes: EstadoBienE2[], observacion?: string, convenioId?: number): Observable<ResultadoE2>;
  vincularDestino(uotId:number,id:number,destinoId:number,predioId:number,convenioId?:number): Observable<ResultadoE2>;
  cancelar(uotId:number,id:number,motivo:string,convenioId?:number): Observable<ResultadoE2>;
  regularizarFin(uotId: number, id: number, fechaFinPrevista: string, convenioId?: number): Observable<ResultadoE2>;
  cerrar(uotId: number, id: number, convenioId?: number): Observable<ResultadoE2>;
}
export const SALIDAS_E2_GATEWAY = new InjectionToken<SalidasE2Gateway>('SalidasE2Gateway');
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/application/use-case/salidas-e2.use-case.ts`
Contenido: completo
```typescript
import { Injectable, inject } from '@angular/core';
import { SALIDAS_E2_GATEWAY } from '../port/salidas-e2.gateway';
import { CorreccionE2, EstadoBienE2, SolicitudE2 } from '../../domain/salida-operativa.model';
@Injectable()
export class SalidasE2UseCase {
  private readonly data = inject(SALIDAS_E2_GATEWAY);
  catalogos(uot: number, convenio?: number) { return this.data.catalogos(uot, convenio); }
  listar(uot: number, convenio?: number, estado?: string, pagina=1, tamano=20) { return this.data.listar(uot, convenio, estado, pagina, tamano); }
  ver(uot: number, id: number, convenio?: number) { return this.data.ver(uot, id, convenio); }
  solicitar(uot: number, datos: SolicitudE2, convenio?: number) { return this.data.solicitar(uot, datos, convenio); }
  corregir(uot: number, id: number, correccion: CorreccionE2, convenio?: number) { return this.data.corregir(uot,id,correccion,convenio); }
  decidir(uot: number, id: number, decision: 'APROBADA'|'OBSERVADA'|'RECHAZADA', motivo?: string, convenio?: number) { return this.data.decidir(uot,id,decision,motivo,convenio); }
  entregar(uot: number, id: number, convenio?: number) { return this.data.entregar(uot,id,convenio); }
  iniciar(uot: number, id: number, convenio?: number) { return this.data.iniciar(uot,id,convenio); }
  visitar(uot: number, id: number, destinoId: number, tipo: number, objetivo?: string, convenio?: number) { return this.data.visitar(uot,id,destinoId,tipo,objetivo,convenio); }
  finalizarVisita(uot: number, id: number, visitaId: number, resumen: string, convenio?: number) { return this.data.finalizarVisita(uot,id,visitaId,resumen,convenio); }
  retornar(uot: number, id: number, obs: string, bienes: EstadoBienE2[], convenio?: number) { return this.data.retornar(uot,id,obs,bienes,convenio); }
  inspeccionar(uot: number, id: number, bienes: EstadoBienE2[], obs?: string, convenio?: number) { return this.data.inspeccionar(uot,id,bienes,obs,convenio); }
  vincularDestino(uot:number,id:number,destinoId:number,predioId:number,convenio?:number){return this.data.vincularDestino(uot,id,destinoId,predioId,convenio);}
  cancelar(uot:number,id:number,motivo:string,convenio?:number){return this.data.cancelar(uot,id,motivo,convenio);}
  regularizarFin(uot: number, id: number, fechaFinPrevista: string, convenio?: number) {
    return this.data.regularizarFin(uot,id,fechaFinPrevista,convenio);
  }
  cerrar(uot: number, id: number, convenio?: number) { return this.data.cerrar(uot,id,convenio); }
}
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/adapter/out/http/salidas-e2-http.adapter.ts`
Contenido: completo
```typescript
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import {
  SalidasOperativasService, E2SolicitudRequest, E2DecisionRequest,
  E2CorreccionRequest, E2FechaFinRequest, E2VisitaRequest, E2VisitaCierreRequest,
  E2RetornoRequest, E2InspeccionRequest, E2VincularDestinoRequest, E2CancelarRequest,
  E2SalidasResponse, E2SalidaDetalleResponse, E2CatalogosResponse, E2OperacionResponse,
} from '../../../../../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../../../../../core/http/services/idempotency-key.service';
import { SalidasE2Gateway } from '../../../application/port/salidas-e2.gateway';
import {
  CatalogosE2, CorreccionE2, DetalleE2, EstadoBienE2, ListaE2, ResultadoE2, SolicitudE2,
} from '../../../domain/salida-operativa.model';

function required<T>(value: T | undefined | null, nombre: string): T {
  if (value === undefined || value === null) throw new Error(`Respuesta incompleta: ${nombre}`);
  return value;
}
function operation(data?: E2OperacionResponse): ResultadoE2 {
  return {salidaId: required(data?.salidaId,'salidaId'), visitaId:data?.visitaId,
    estado: data?.estado ?? ''};
}
function detail(data?: E2SalidaDetalleResponse): DetalleE2 {
  const d = required(data,'detalle');
  return {
    salidaId: required(d.salidaId,'salidaId'), nombre:d.nombre ?? '', estado:d.estado ?? '',
    uotId: required(d.uotId,'uotId'), convenioId:d.convenioId,
    solicitanteEmpleadoId:required(d.solicitanteEmpleadoId,'solicitanteEmpleadoId'),
    motivoSalidaId: required(d.motivoSalidaId,'motivoSalidaId'),
    fechaSolicitud:d.fechaSolicitud, descripcion:d.descripcion,
    fechaInicioPrevista:d.fechaInicioPrevista,fechaFinPrevista:d.fechaFinPrevista,
    fechaInicioReal:d.fechaInicioReal,fechaFinReal:d.fechaFinReal,fechaAprobacion:d.fechaAprobacion,
    destinos:(d.destinos ?? []).map(x=>({destinoId:required(x.destinoId,'destinoId'),
      predioId:x.predioId,referencia:x.referencia,orden:x.orden ?? 0})),
    bienes:(d.bienes ?? []).map(x=>({solicitudRecursoId:required(x.solicitudRecursoId,'solicitudRecursoId'),
      bienId:required(x.bienId,'bienId'),nombre:x.nombre ?? '',estado:x.estado ?? '',
      resultadoDeclarado:x.resultadoDeclarado,resultadoValidado:x.resultadoValidado,observacion:x.observacion})),
    visitas:(d.visitas ?? []).map(x=>({visitaId:required(x.visitaId,'visitaId'),predioId:required(x.predioId,'predioId'),
      fechaInicio:x.fechaInicio,fechaFin:x.fechaFin,estado:x.estado ?? '',
      objetivo:x.objetivo,resumen:x.resumen,tipoVisita:x.tipoVisita})),
    historial:(d.historial ?? []).map(x=>({eventoId:required(x.eventoId,'eventoId'),
      tipo:x.tipo ?? '',detalle:x.detalle,usuarioId:required(x.usuarioId,'usuarioId'),fechaHora:x.fechaHora})),
    observacionRetorno:d.observacionRetorno,
  };
}
@Injectable()
export class SalidasE2HttpAdapter implements SalidasE2Gateway {
  private readonly api = inject(SalidasOperativasService);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly options = {transferCache:false};
  catalogos(uotId:number,convenioId?:number) {
    return this.api.salidasOperativasCatalogos({uotId,convenioId},'body',false,this.options)
      .pipe(map(r=>this.mapCatalogs(r.datos)));
  }
  listar(uotId:number,convenioId?:number,estado?:string,pagina=1,tamano=20) {
    return this.api.salidasOperativasListar({uotId,convenioId,estado,pagina,tamano},'body',false,this.options)
      .pipe(map(r=>this.mapList(r.datos)));
  }
  ver(uotId:number,id:number,convenioId?:number) {
    return this.api.salidasOperativasVer({id,uotId,convenioId},'body',false,this.options)
      .pipe(map(r=>detail(r.datos)));
  }
  solicitar(uotId:number,data:SolicitudE2,convenioId?:number) {
    const e2SolicitudRequest:E2SolicitudRequest={...data};
    return this.keys.idempotent(`E2:solicitar:${uotId}:${convenioId??0}`,e2SolicitudRequest,key=>
      this.api.salidasOperativasSolicitar({uotId,convenioId,xIdempotencyKey:key,e2SolicitudRequest},
        'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  corregir(uotId:number,id:number,correccion:CorreccionE2,convenioId?:number) {
    const e2CorreccionRequest:E2CorreccionRequest={...correccion};
    return this.keys.idempotent(`E2:corregir:${id}`,e2CorreccionRequest,key=>
      this.api.salidasOperativasCorregir({id,uotId,convenioId,xIdempotencyKey:key,e2CorreccionRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  decidir(uotId:number,id:number,decision:'APROBADA'|'OBSERVADA'|'RECHAZADA',motivo?:string,convenioId?:number) {
    const e2DecisionRequest:E2DecisionRequest={decision,motivo};
    return this.keys.idempotent(`E2:decidir:${id}`,e2DecisionRequest,key=>
      this.api.salidasOperativasDecidir({id,uotId,convenioId,xIdempotencyKey:key,e2DecisionRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  entregar(uotId:number,id:number,convenioId?:number) {
    return this.keys.idempotent(`E2:entregar:${id}`,{},key=>
      this.api.salidasOperativasEntregar({id,uotId,convenioId,xIdempotencyKey:key},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  iniciar(uotId:number,id:number,convenioId?:number) {
    return this.keys.idempotent(`E2:iniciar:${id}`,{},key=>
      this.api.salidasOperativasIniciar({id,uotId,convenioId,xIdempotencyKey:key},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  visitar(uotId:number,id:number,destinoId:number,tipoVisitaId:number,objetivo?:string,convenioId?:number) {
    const e2VisitaRequest:E2VisitaRequest={destinoId,tipoVisitaId,objetivo};
    return this.keys.idempotent(`E2:visitar:${id}`,e2VisitaRequest,key=>
      this.api.salidasOperativasVisitar({id,uotId,convenioId,xIdempotencyKey:key,e2VisitaRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  finalizarVisita(uotId:number,id:number,visitaId:number,resumen:string,convenioId?:number) {
    const e2VisitaCierreRequest:E2VisitaCierreRequest={resumen};
    return this.keys.idempotent(`E2:visita-fin:${visitaId}`,e2VisitaCierreRequest,key=>
      this.api.salidasOperativasVisitaFinalizar({id,visitaId,uotId,convenioId,
      xIdempotencyKey:key,e2VisitaCierreRequest},'body',false,this.options)
      .pipe(map(r=>operation(r.datos))));
  }
  retornar(uotId:number,id:number,observacionGeneral:string,bienes:EstadoBienE2[],convenioId?:number) {
    const e2RetornoRequest:E2RetornoRequest={observacionGeneral,bienes};
    return this.keys.idempotent(`E2:retorno:${id}`,e2RetornoRequest,key=>
      this.api.salidasOperativasRetornar({id,uotId,convenioId,xIdempotencyKey:key,e2RetornoRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  inspeccionar(uotId:number,id:number,bienes:EstadoBienE2[],observacion?:string,convenioId?:number) {
    const e2InspeccionRequest:E2InspeccionRequest={observacion,bienes};
    return this.keys.idempotent(`E2:inspeccion:${id}`,e2InspeccionRequest,key=>
      this.api.salidasOperativasInspeccionar({id,uotId,convenioId,xIdempotencyKey:key,e2InspeccionRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  vincularDestino(uotId:number,id:number,destinoId:number,predioId:number,convenioId?:number) {
    const e2VincularDestinoRequest:E2VincularDestinoRequest={destinoId,predioId};
    return this.keys.idempotent(`E2:vincular:${id}:${destinoId}`,e2VincularDestinoRequest,key=>
      this.api.salidasOperativasVincularDestino({id,uotId,convenioId,xIdempotencyKey:key,e2VincularDestinoRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  cancelar(uotId:number,id:number,motivo:string,convenioId?:number) {
    const e2CancelarRequest:E2CancelarRequest={motivo};
    return this.keys.idempotent(`E2:cancelar:${id}`,e2CancelarRequest,key=>
      this.api.salidasOperativasCancelar({id,uotId,convenioId,xIdempotencyKey:key,e2CancelarRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  regularizarFin(uotId:number,id:number,fechaFinPrevista:string,convenioId?:number) {
    const e2FechaFinRequest:E2FechaFinRequest={fechaFinPrevista};
    return this.keys.idempotent(`E2:fecha-fin:${id}`,e2FechaFinRequest,key=>
      this.api.salidasOperativasRegularizarFin({id,uotId,convenioId,xIdempotencyKey:key,e2FechaFinRequest},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  cerrar(uotId:number,id:number,convenioId?:number) {
    return this.keys.idempotent(`E2:cerrar:${id}`,{},key=>
      this.api.salidasOperativasCerrar({id,uotId,convenioId,xIdempotencyKey:key},
      'body',false,this.options).pipe(map(r=>operation(r.datos))));
  }
  private mapList(d?: E2SalidasResponse): ListaE2 {
    return {total:d?.total ?? 0,items:(d?.items ?? []).map(x=>({
      salidaId:required(x.salidaId,'salidaId'),nombre:x.nombre ?? '',estado:x.estado ?? '',
      fechaSolicitud:x.fechaSolicitud,fechaInicioPrevista:x.fechaInicioPrevista,
      fechaFinPrevista:x.fechaFinPrevista,
      solicitanteEmpleadoId:required(x.solicitanteEmpleadoId,'solicitanteEmpleadoId'),
    }))};
  }
  private mapCatalogs(d?: E2CatalogosResponse): CatalogosE2 {
    const mapOption=(x:{id?:number;nombre?:string;codigo?:string})=>({id:required(x.id,'opcionId'),nombre:x.nombre ?? '',codigo:x.codigo});
    return {motivos:(d?.motivos ?? []).map(mapOption),tiposVisita:(d?.tiposVisita ?? []).map(mapOption),
      bienes:(d?.bienes ?? []).map(mapOption)};
  }
}
```

Ruta: `src/app/features/gestion-tecnica/salidas/salidas.routes.ts`
Contenido: completo
```typescript
import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const salidasRoutes: Routes = [
  {
    path: 'salidas',
    data: {breadcrumb: 'Salidas de campo', module: 'SALIDAS', permission: 'SALIDAS_LISTAR'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./e2/adapter/in/ui/pages/operativas-list/operativas-list')
      .then(m => m.OperativasListPage),
  },
  {
    path: 'salidas/historico',
    data: {breadcrumb: 'Histórico de salidas', module: 'SALIDAS', permission: 'SALIDAS_LISTAR'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/salidas-list/salidas-list')
      .then(m => m.SalidasListPage),
  },
  {
    path: 'salidas/operativas',
    data: {breadcrumb: 'Salidas operativas', module: 'SALIDAS', permission: 'SALIDAS_LISTAR'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./e2/adapter/in/ui/pages/operativas-list/operativas-list')
      .then(m => m.OperativasListPage),
  },
  {
    path: 'salidas/operativas/:id',
    data: {breadcrumb: 'Expediente de salida', module: 'SALIDAS', permission: 'SALIDAS_VER'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./e2/adapter/in/ui/pages/operativa-detail/operativa-detail')
      .then(m => m.OperativaDetailPage),
  },
  {
    path: 'salidas/:id',
    data: {breadcrumb: 'Detalle de salida histórica', module: 'SALIDAS', permission: 'SALIDAS_VER'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/salida-detail/salida-detail')
      .then(m => m.SalidaDetailPage),
  },
];
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativas-list/operativas-list.ts`
Contenido: completo
```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { faRoute } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { ExpedienteE1UseCase } from '../../../../../../../predios/expediente/application/expediente-e1.use-case';
import { provideExpedienteE1 } from '../../../../../../../predios/expediente/expediente-e1.providers';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { PaginatorComponent } from '../../../../../../../../../shared/data-display/paginator/paginator';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../../../shared/data-display/empty-state/empty-state';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { PermissionDirective } from '../../../../../../../../../core/access/permission.directive';
import { CatalogosE2, ResumenE2, SolicitudE2 } from '../../../../../domain/salida-operativa.model';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';

function localInput(): string {
  const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
@Component({selector:'app-operativas-list',standalone:true,
  imports:[DatePipe,FormsModule,RouterLink,PageHeaderComponent,PaginatorComponent,LoadingStateComponent,
           ErrorStateComponent,EmptyStateComponent,PermissionDirective],
  providers:[...provideSalidasE2(),...provideExpedienteE1()],
  templateUrl:'./operativas-list.html',styleUrl:'./operativas-list.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativasListPage implements OnInit {
  private readonly api=inject(SalidasE2UseCase);
  private readonly e1=inject(ExpedienteE1UseCase);
  private readonly uot=inject(UotContextStore);
  private readonly route=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private readonly toast=inject(ToastService);
  readonly icon=faRoute;
  readonly items=signal<ResumenE2[]>([]);
  readonly total=signal(0);
  readonly pendingCount=signal(0);
  readonly loading=signal(false);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly catalogos=signal<CatalogosE2>({motivos:[],tiposVisita:[],bienes:[]});
  readonly candidates=signal<{predioId:number;nombre:string;codigo:string}[]>([]);
  readonly destinos=signal<{predioId?:number;referencia?:string}[]>([]);
  readonly bienes=signal<{bienId:number;nombre:string}[]>([]);
  readonly showForm=signal(false);
  readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId')) || undefined;
  readonly uotId=this.uot.selectedId;
  estado='';page=1;size=20;
  nombre='';motivoId=0;inicio=localInput();fin='';descripcion='';
  destinoBuscar='';predioSeleccionado=0;referencia='';bienSeleccionado=0;
  ngOnInit():void {this.load();this.loadCatalogs();this.refreshPending();}
  private context():number|null {const id=this.uotId();if(!id)this.error.set('Seleccione primero la unidad territorial.');return id;}
  load():void {
    const uot=this.context();if(!uot)return;
    this.loading.set(true);this.error.set(null);
    this.refreshPending();
    this.api.listar(uot,this.convenioId,this.estado||undefined,this.page,this.size)
      .pipe(finalize(()=>this.loading.set(false))).subscribe({
        next:r=>{this.items.set(r.items);this.total.set(r.total);},
        error:e=>this.error.set(mapOpenApiError(e).message),
      });
  }
  refreshPending():void {
    const uot=this.uotId();if(!uot)return;
    this.api.listar(uot,this.convenioId,'SOLICITADA',1,1).subscribe({
      next:r=>this.pendingCount.set(r.total),error:()=>this.pendingCount.set(0),
    });
  }
  showPending():void {this.estado='SOLICITADA';this.page=1;this.load();}
  loadCatalogs():void {
    const uot=this.context();if(!uot)return;
    this.api.catalogos(uot,this.convenioId).subscribe({next:c=>this.catalogos.set(c),
      error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  searchPredios():void {
    const uot=this.context();if(!uot || !this.destinoBuscar.trim())return;
    this.e1.buscarPredios(uot,this.destinoBuscar.trim(),this.convenioId).subscribe({
      next:items=>this.candidates.set(items.map(x=>({predioId:x.predioId,nombre:x.nombre,codigo:x.codigo}))),
      error:e=>this.toast.error('No se pudo buscar predios',mapOpenApiError(e).message),
    });
  }
  addDestino():void {
    if(this.predioSeleccionado>0){
      if(this.destinos().some(x=>x.predioId===this.predioSeleccionado))return;
      this.destinos.update(x=>[...x,{predioId:this.predioSeleccionado}]);
      this.predioSeleccionado=0;this.referencia='';return;
    }
    if(this.referencia.trim()) {this.destinos.update(x=>[...x,{referencia:this.referencia.trim()}]);this.referencia='';}
  }
  removeDestino(index:number):void {this.destinos.update(items=>items.filter((_,i)=>i!==index));}
  addBien():void {
    const bien=this.catalogos().bienes.find(x=>x.id===this.bienSeleccionado);
    if(bien && !this.bienes().some(x=>x.bienId===bien.id))this.bienes.update(x=>[...x,{bienId:bien.id,nombre:bien.nombre}]);
    this.bienSeleccionado=0;
  }
  removeBien(id:number):void {this.bienes.update(x=>x.filter(b=>b.bienId!==id));}
  solicitar():void {
    const uot=this.context();if(!uot||this.saving())return;
    if(!this.nombre.trim()||!this.motivoId||!this.inicio||!this.destinos().length){
      this.toast.error('Ingrese nombre, motivo, fecha inicial y al menos un destino.');return;
    }
    const entrada:SolicitudE2={nombre:this.nombre.trim(),motivoSalidaId:this.motivoId,
      fechaInicioPrevista:new Date(this.inicio).toISOString(),
      fechaFinPrevista:this.fin?new Date(this.fin).toISOString():undefined,
      descripcion:this.descripcion.trim()||undefined,destinos:this.destinos(),
      bienes:this.bienes().map(x=>({bienId:x.bienId}))};
    if(entrada.fechaFinPrevista && entrada.fechaFinPrevista<entrada.fechaInicioPrevista){
      this.toast.error('La fecha final no puede ser anterior a la inicial.');return;
    }
    this.saving.set(true);
    this.api.solicitar(uot,entrada,this.convenioId).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:r=>{this.toast.success('Solicitud enviada para aprobación');
        this.router.navigate(['/gestion-tecnica/salidas/operativas',r.salidaId],
          {queryParams:this.convenioId?{convenioId:this.convenioId}:undefined});},
      error:e=>this.toast.error('No se pudo enviar la solicitud',mapOpenApiError(e).message),
    });
  }
  totalPages():number {return Math.ceil(this.total()/this.size);}
  changePage(page:number):void {this.page=page;this.load();}
  changeSize(size:number):void {this.size=size;this.page=1;this.load();}
  open(id:number):void {this.router.navigate(['/gestion-tecnica/salidas/operativas',id],
    {queryParams:this.convenioId?{convenioId:this.convenioId}:undefined});}
}
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativas-list/operativas-list.html`
Contenido: completo
```html
<div class="desco-page">
  <app-page-header title="Salidas operativas" eyebrow="Gestión técnica" [icon]="icon"
      subtitle="Solicitudes, autorizaciones, visitas y control de bienes.">
    <div pageActions class="flex gap-2 flex-wrap">
      <a class="admin-secondary-button" routerLink="/gestion-tecnica/salidas/historico">Histórico de salidas</a>
      <button *appPermission="'SALIDAS_CREAR'" type="button" class="admin-primary-button"
        (click)="showForm.set(!showForm())">{{showForm()?'Ocultar formulario':'Solicitar salida'}}</button>
    </div>
  </app-page-header>
  @if(showForm()){
  <section class="admin-surface mt-4">
    <div class="admin-section-header"><div><p>Solicitud única</p><h2>Datos principales</h2></div></div>
    <form class="admin-form-grid" (ngSubmit)="solicitar()">
      <div class="admin-field"><label for="e2nombre">Nombre de salida</label>
        <input id="e2nombre" class="admin-input" name="nombre" [(ngModel)]="nombre" required maxlength="180"/></div>
      <div class="admin-field"><label for="e2motivo">Motivo</label>
        <select id="e2motivo" class="admin-select" name="motivo" [(ngModel)]="motivoId" required>
          <option [ngValue]="0">Seleccione</option>
          @for(m of catalogos().motivos;track m.id){<option [ngValue]="m.id">{{m.nombre}}</option>}
        </select></div>
      <div class="admin-field"><label for="e2inicio">Inicio previsto</label>
        <input id="e2inicio" class="admin-input" type="datetime-local" name="inicio" [(ngModel)]="inicio" required/></div>
      <div class="admin-field"><label for="e2fin">Fin previsto (opcional)</label>
        <input id="e2fin" class="admin-input" type="datetime-local" name="fin" [(ngModel)]="fin"/></div>
      <div class="admin-field admin-field-span-2"><label for="e2descripcion">Propósito (opcional)</label>
        <textarea id="e2descripcion" class="admin-textarea" name="descripcion" [(ngModel)]="descripcion" maxlength="400"></textarea></div>
    </form>
    <div class="admin-section-header mt-4"><div><p>Lugares</p><h2>Destinos de la salida</h2></div></div>
    <div class="e2-grid">
      <div class="admin-field"><label>Buscar predio existente</label>
        <div class="flex gap-2"><input class="admin-input" [(ngModel)]="destinoBuscar" placeholder="Nombre o código"/>
          <button type="button" class="admin-secondary-button" (click)="searchPredios()">Buscar</button></div></div>
      <div class="admin-field"><label>Predio encontrado</label>
        <select class="admin-select" [(ngModel)]="predioSeleccionado"><option [ngValue]="0">Otro destino</option>
        @for(p of candidates();track p.predioId){<option [ngValue]="p.predioId">{{p.codigo}} — {{p.nombre}}</option>}
        </select></div>
      <div class="admin-field"><label>O referencia de lugar no registrado</label>
        <input class="admin-input" [(ngModel)]="referencia" placeholder="Nombre del lugar, sector, referencia"/></div>
      <div class="flex items-end"><button type="button" class="admin-secondary-button" (click)="addDestino()">Añadir destino</button></div>
    </div>
    <div class="e2-chips">@for(d of destinos();track $index){
      <span class="e2-chip">{{d.predioId?'Predio #'+d.predioId:d.referencia}}
        <button type="button" [attr.aria-label]="'Quitar destino'" (click)="removeDestino($index)">×</button></span>
    }</div>
    <div class="admin-section-header mt-4"><div><p>Opcional</p><h2>Bienes a solicitar</h2></div></div>
    <div class="flex flex-wrap gap-2">
      <select class="admin-select" [(ngModel)]="bienSeleccionado"><option [ngValue]="0">Seleccione bien disponible</option>
        @for(b of catalogos().bienes;track b.id){<option [ngValue]="b.id">{{b.nombre}}</option>}
      </select><button type="button" class="admin-secondary-button" (click)="addBien()">Añadir bien</button>
    </div>
    <div class="e2-chips">@for(b of bienes();track b.bienId){<span class="e2-chip">{{b.nombre}}
      <button type="button" (click)="removeBien(b.bienId)" aria-label="Quitar bien">×</button></span>}</div>
    <div class="admin-modal-actions mt-4"><button type="button" class="admin-primary-button"
      [disabled]="saving()||!destinos().length" (click)="solicitar()">{{saving()?'Enviando...':'Enviar a aprobación'}}</button></div>
  </section>}
  <section class="admin-surface mt-5">
    <div class="admin-toolbar flex flex-wrap gap-2">
      <button type="button" class="admin-secondary-button" (click)="showPending()">
        Por aprobar ({{pendingCount()}})
      </button>
      <div class="admin-field"><label>Estado</label><select class="admin-select" [(ngModel)]="estado" (change)="page=1;load()">
        <option value="">Todos</option><option value="SOLICITADA">Por aprobar</option><option value="OBSERVADA">Observada</option>
        <option value="APROBADA">Aprobada</option><option value="EN_EJECUCION">En campo</option>
        <option value="EN_RETORNO">Por inspeccionar</option><option value="CERRADA">Cerrada</option>
        <option value="RECHAZADA">Rechazada</option></select></div>
      <button type="button" class="admin-secondary-button" (click)="load()">Actualizar</button>
    </div>
    @if(loading()){<app-loading-state title="Cargando solicitudes" message="Consultando la UOT actual."/>}
    @else if(error()){<app-error-state [message]="error()||'Error de consulta'" (retry)="load()"/>}
    @else if(!items().length){<app-empty-state title="Sin solicitudes" message="No hay salidas con estos filtros."/>}
    @else {<div class="admin-table-wrap"><table class="admin-table"><thead><tr>
      <th>Salida</th><th>Solicitada</th><th>Inicio</th><th>Estado</th><th>Acción</th>
    </tr></thead><tbody>@for(s of items();track s.salidaId){<tr>
      <td><strong>{{s.nombre}}</strong></td><td>{{s.fechaSolicitud|date:'dd/MM/yyyy HH:mm'}}</td>
      <td>{{s.fechaInicioPrevista|date:'dd/MM/yyyy HH:mm'}}</td><td>{{s.estado}}</td>
      <td><button class="admin-secondary-button" type="button" (click)="open(s.salidaId)">Ver expediente</button></td>
    </tr>}</tbody></table></div>}
    <app-paginator [page]="page" [size]="size" [totalRecords]="total()"
      [totalPages]="totalPages()" (pageChange)="changePage($event)" (sizeChange)="changeSize($event)"/>
  </section>
</div>
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativa-detail/operativa-detail.ts`
Contenido: completo
```typescript
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { faRoute } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../../../shared/data-display/empty-state/empty-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { PermissionDirective } from '../../../../../../../../../core/access/permission.directive';
import { EvidencePanelComponent } from '../../../../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { CatalogosE2, CorreccionE2, DetalleE2, EstadoBienE2, ResultadoE2 } from '../../../../../domain/salida-operativa.model';
import { ExpedienteE1UseCase } from '../../../../../../../predios/expediente/application/expediente-e1.use-case';
import { provideExpedienteE1 } from '../../../../../../../predios/expediente/expediente-e1.providers';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';

function localDateInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime()-date.getTimezoneOffset()*60000)
    .toISOString().slice(0,16);
}

@Component({selector:'app-operativa-detail',standalone:true,
  imports:[DatePipe,FormsModule,RouterLink,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent,
    EmptyStateComponent,ActionConfirmDialogComponent,PermissionDirective,EvidencePanelComponent],
  providers:[...provideSalidasE2(),...provideExpedienteE1()],
  templateUrl:'./operativa-detail.html',styleUrl:'./operativa-detail.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativaDetailPage implements OnInit {
  private readonly api=inject(SalidasE2UseCase);
  private readonly e1=inject(ExpedienteE1UseCase);
  private readonly uot=inject(UotContextStore);
  private readonly route=inject(ActivatedRoute);
  private readonly toast=inject(ToastService);
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  readonly icon=faRoute;
  readonly id=Number(this.route.snapshot.paramMap.get('id'));
  readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||undefined;
  readonly uotId=this.uot.selectedId;
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly detail=signal<DetalleE2|null>(null);
  readonly catalogos=signal<CatalogosE2>({motivos:[],tiposVisita:[],bienes:[]});
  decision:'APROBADA'|'OBSERVADA'|'RECHAZADA'='APROBADA';motivoDecision='';
  nombreCorreccion='';descripcionCorreccion='';motivoCancelar='';
  motivoCorreccion=0;inicioCorreccion='';finCorreccion='';
  nuevoDestino='';nuevoBien=0;
  readonly destinosCorreccion=signal<{predioId?:number;referencia?:string}[]>([]);
  readonly bienesCorreccion=signal<{bienId:number}[]>([]);
  fechaFinRegularizada='';
  buscarPredio='';destinoVincular=0;predioVincular=0;
  readonly candidatos=signal<{predioId:number;nombre:string}[]>([]);
  destinoId=0;tipoVisitaId=0;objetivo='';
  visitaFinalizar=0;resumen='';
  observacionGeneral='';observacionInspeccion='';
  readonly observacionesBien=signal<Record<number,string>>({});
  readonly resultadoDeclarado=signal<Record<number,EstadoBienE2['resultado']>>({});
  readonly resultadoInspeccion=signal<Record<number,EstadoBienE2['resultado']>>({});
  ngOnInit():void {this.load();this.loadCatalogs();}
  load():void {
    const uot=this.uotId();if(!uot){this.error.set('Seleccione una UOT.');this.loading.set(false);return;}
    this.loading.set(true);this.error.set(null);
    this.api.ver(uot,this.id,this.convenioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:d=>{this.detail.set(d);this.nombreCorreccion=d.nombre;this.descripcionCorreccion=d.descripcion??'';
        this.motivoCorreccion=d.motivoSalidaId;
        this.inicioCorreccion=localDateInput(d.fechaInicioPrevista);
        this.finCorreccion=localDateInput(d.fechaFinPrevista);
        this.fechaFinRegularizada=localDateInput(d.fechaFinPrevista ?? d.fechaFinReal);
        this.destinosCorreccion.set(d.destinos.map(x=>({predioId:x.predioId,referencia:x.referencia})));
        this.bienesCorreccion.set(d.bienes.map(x=>({bienId:x.bienId})));
        this.observacionesBien.set(Object.fromEntries(d.bienes.map(x=>[x.solicitudRecursoId,x.observacion??''])));
        this.resultadoDeclarado.set(Object.fromEntries(d.bienes.map(b=>[b.solicitudRecursoId,
         (b.resultadoDeclarado??'CONFORME') as EstadoBienE2['resultado']])));
        this.resultadoInspeccion.set(Object.fromEntries(d.bienes.map(b=>[b.solicitudRecursoId,
         (b.resultadoValidado??b.resultadoDeclarado??'CONFORME') as EstadoBienE2['resultado']])));
      },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  loadCatalogs():void {const uot=this.uotId();if(uot)this.api.catalogos(uot,this.convenioId).subscribe({
    next:c=>this.catalogos.set(c),error:e=>this.toast.error('No se pudieron cargar los catálogos',mapOpenApiError(e).message)});}
  run(action:Observable<ResultadoE2>,message:string):void {
    if(this.saving())return;
    this.saving.set(true);
    action.pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success(message);this.load();},
      error:e=>this.toast.error('No se pudo completar la acción',mapOpenApiError(e).message),
    });
  }
  addCorrectionDestination():void {
    const reference=this.nuevoDestino.trim();
    if(!reference)return;
    this.destinosCorreccion.update(x=>[...x,{referencia:reference}]);
    this.nuevoDestino='';
  }
  addCorrectionBien():void {
    if(!this.nuevoBien || this.bienesCorreccion().some(x=>x.bienId===this.nuevoBien))return;
    this.bienesCorreccion.update(x=>[...x,{bienId:this.nuevoBien}]);this.nuevoBien=0;
  }
  removeCorrectionDestination(index:number):void {
    this.destinosCorreccion.update(x=>x.filter((_,i)=>i!==index));
  }
  removeCorrectionBien(id:number):void {
    this.bienesCorreccion.update(x=>x.filter(b=>b.bienId!==id));
  }
  corregir():void {
    const u=this.uotId();if(!u||!this.nombreCorreccion.trim()||!this.inicioCorreccion||
        !this.motivoCorreccion||!this.destinosCorreccion().length)return;
    const correccion:CorreccionE2={
      nombre:this.nombreCorreccion.trim(),descripcion:this.descripcionCorreccion.trim(),
      motivoSalidaId:this.motivoCorreccion,
      fechaInicioPrevista:new Date(this.inicioCorreccion).toISOString(),
      fechaFinPrevista:this.finCorreccion?new Date(this.finCorreccion).toISOString():undefined,
      destinos:this.destinosCorreccion(),bienes:this.bienesCorreccion(),
    };
    if(correccion.fechaFinPrevista && correccion.fechaFinPrevista<correccion.fechaInicioPrevista!){
      this.toast.error('El fin previsto no puede ser anterior al inicio.');return;
    }
    this.run(this.api.corregir(u,this.id,correccion,this.convenioId),'Solicitud reenviada');
  }
  async decidir():Promise<void> {const u=this.uotId();if(!u||this.saving())return;
    if(this.decision!=='APROBADA'&&!this.motivoDecision.trim()){
      this.toast.error('Ingrese el motivo de la decisión.');return;}
    const answer=await this.confirm.show({title:'Confirmar decisión',
      message:this.decision==='APROBADA'?'Se autorizarán la salida y los recursos solicitados.':
        'Se guardará la decisión y su motivo en el expediente.',confirmLabel:'Confirmar decisión',
      tone:this.decision==='RECHAZADA'?'warning':'primary'});
    if(!answer.confirmed||this.saving())return;
    this.run(this.api.decidir(u,this.id,this.decision,this.motivoDecision.trim()||undefined,this.convenioId),'Decisión registrada');}
  async entregar():Promise<void> {
    const u=this.uotId();if(!u||this.saving())return;
    const answer=await this.confirm.show({title:'Confirmar despacho físico',
      message:'Confirme que el almacén está entregando los bienes al técnico. Quedarán ocupados.',
      confirmLabel:'Confirmar entrega'});
    if(answer.confirmed&&!this.saving())this.run(this.api.entregar(u,this.id,this.convenioId),'Entrega registrada');
  }
  iniciar():void {const u=this.uotId();if(u)this.run(this.api.iniciar(u,this.id,this.convenioId),'Salida iniciada');}
  visitar():void {const u=this.uotId();if(!u||!this.destinoId||!this.tipoVisitaId){this.toast.error('Seleccione destino y tipo de visita.');return;}
    this.run(this.api.visitar(u,this.id,this.destinoId,this.tipoVisitaId,this.objetivo.trim()||undefined,this.convenioId),'Visita iniciada');}
  finalizarVisita():void {const u=this.uotId();if(!u||!this.visitaFinalizar||!this.resumen.trim()){
    this.toast.error('Seleccione visita e indique qué se hizo.');return;}
    this.run(this.api.finalizarVisita(u,this.id,this.visitaFinalizar,this.resumen.trim(),this.convenioId),'Visita finalizada');}
  buscarPredios():void {const u=this.uotId();if(!u||!this.buscarPredio.trim())return;
    this.e1.buscarPredios(u,this.buscarPredio.trim(),this.convenioId).subscribe({
      next:r=>this.candidatos.set(r.map(p=>({predioId:p.predioId,nombre:p.nombre}))),
      error:e=>this.toast.error('No se pudo buscar predios',mapOpenApiError(e).message),
    });
  }
  vincular():void {const u=this.uotId();if(!u||!this.destinoVincular||!this.predioVincular)return;
    this.run(this.api.vincularDestino(u,this.id,this.destinoVincular,this.predioVincular,this.convenioId),'Destino asociado al predio');}
  async cancelar():Promise<void> {
    const u=this.uotId();
    const motivo=this.motivoCancelar.trim();
    if(this.saving())return;
    if(!u||!motivo){
      this.toast.error('Ingrese un motivo para cancelar.');
      return;
    }
    const confirmation=await this.confirm.show({
      title:'Cancelar solicitud de salida',
      message:'La solicitud quedará cancelada y conservará su historial de decisiones.',
      confirmLabel:'Cancelar solicitud',
      tone:'danger',
    });
    if(!confirmation.confirmed||this.saving())return;
    this.run(this.api.cancelar(u,this.id,motivo,this.convenioId),'Solicitud cancelada');
  }
  hasPendingDestinations(detail:DetalleE2):boolean {return detail.destinos.some(x=>!x.predioId);}
  changeDeclarado(id:number,value:EstadoBienE2['resultado']):void {this.resultadoDeclarado.update(s=>({...s,[id]:value}));}
  changeObservacionBien(id:number,value:string):void {
    this.observacionesBien.update(x=>({...x,[id]:value}));
  }
  regularizarFin():void {
    const u=this.uotId();if(!u||!this.fechaFinRegularizada)return;
    const planned=new Date(this.fechaFinRegularizada);
    if(Number.isNaN(planned.getTime()))return;
    this.run(this.api.regularizarFin(u,this.id,planned.toISOString(),this.convenioId),
      'Fecha final prevista regularizada');
  }
  changeInspeccion(id:number,value:EstadoBienE2['resultado']):void {this.resultadoInspeccion.update(s=>({...s,[id]:value}));}
  retornar():void {const u=this.uotId();const d=this.detail();if(!u||!d||!this.observacionGeneral.trim()){
     this.toast.error('Escriba una observación general del retorno.');return;}
     const bienes=d.bienes.filter(x=>x.estado==='ENTREGADO').map(b=>({
       solicitudRecursoId:b.solicitudRecursoId,resultado:this.resultadoDeclarado()[b.solicitudRecursoId]??'CONFORME',
       observacion:this.observacionesBien()[b.solicitudRecursoId]?.trim()||undefined}));
     this.run(this.api.retornar(u,this.id,this.observacionGeneral.trim(),bienes,this.convenioId),'Retorno declarado');}
  async inspeccionar():Promise<void> {const u=this.uotId();const d=this.detail();if(!u||!d||this.saving())return;
     const bienes=d.bienes.filter(x=>x.estado==='ENTREGADO').map(b=>({
       solicitudRecursoId:b.solicitudRecursoId,resultado:this.resultadoInspeccion()[b.solicitudRecursoId]??'FALTANTE'}));
     const answer=await this.confirm.show({title:'Validar resultados físicos',
       message:'Solo los bienes marcados como conformes volverán a estar disponibles.',
       confirmLabel:'Registrar inspección'});
     if(answer.confirmed&&!this.saving())this.run(this.api.inspeccionar(u,this.id,bienes,
       this.observacionInspeccion.trim()||undefined,this.convenioId),'Inspección registrada');}
  hasUndeliveredGoods(detail:DetalleE2):boolean {
    return detail.bienes.some(b=>b.estado==='SOLICITADO');
  }
  hasPendingInspection(detail:DetalleE2):boolean {
    return detail.bienes.some(b=>b.estado==='ENTREGADO');
  }
  cerrar():void {const u=this.uotId();if(u)this.run(this.api.cerrar(u,this.id,this.convenioId),'Salida cerrada');}
}
```

Ruta: `src/app/features/gestion-tecnica/salidas/e2/adapter/in/ui/pages/operativa-detail/operativa-detail.html`
Contenido: completo
```html
<div class="desco-page">
  <app-page-header title="Expediente de salida" eyebrow="Etapa 2" [icon]="icon"
    subtitle="Autorización, recorridos, préstamo y validación física.">
    <div pageActions class="flex gap-2"><a class="admin-secondary-button" routerLink="/gestion-tecnica/salidas"
      [queryParams]="convenioId?{convenioId}:undefined">Volver a salidas</a>
      <button type="button" class="admin-secondary-button" (click)="load()">Actualizar</button></div>
  </app-page-header>
  @if(loading()){<app-loading-state title="Consultando salida" message="Cargando el expediente autorizado."/>}
  @else if(error()){<app-error-state [message]="error()||'No disponible'" (retry)="load()"/>}
  @else if(detail();as d){
    <section class="admin-detail-grid mt-4">
      <article class="admin-detail-card"><span>Nombre</span><strong>{{d.nombre}}</strong></article>
      <article class="admin-detail-card"><span>Estado</span><strong>{{d.estado}}</strong></article>
      <article class="admin-detail-card"><span>Inicio previsto</span><strong>{{d.fechaInicioPrevista|date:'dd/MM/yyyy HH:mm'}}</strong></article>
      <article class="admin-detail-card"><span>Fin previsto</span><strong>{{d.fechaFinPrevista?(d.fechaFinPrevista|date:'dd/MM/yyyy HH:mm'):'Pendiente'}}</strong></article>
    </section>
    @if(d.estado==='SOLICITADA'){
    <section *appPermission="'SALIDAS_CONFIRMAR'" class="admin-surface mt-4">
      <div class="admin-section-header"><div><p>Bandeja del superior</p><h2>Decidir solicitud</h2></div></div>
      <div class="e2-grid"><div class="admin-field"><label>Decisión</label>
        <select class="admin-select" [(ngModel)]="decision"><option value="APROBADA">Aprobar</option>
        <option value="OBSERVADA">Solicitar corrección</option><option value="RECHAZADA">Rechazar</option></select></div>
        @if(decision!=='APROBADA'){<div class="admin-field"><label>Motivo obligatorio</label>
         <textarea class="admin-textarea" [(ngModel)]="motivoDecision" maxlength="1200"></textarea></div>}
      </div>
      <button class="admin-primary-button mt-3" type="button" [disabled]="saving()" (click)="decidir()">Registrar decisión</button>
    </section>}
    @if(d.estado==='OBSERVADA'||d.estado==='RECHAZADA'){
      <section *appPermission="'SALIDAS_EDITAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><div><p>Solicitante</p><h2>Corregir y reenviar</h2></div></div>
        <div class="admin-field"><label>Nombre</label><input class="admin-input" [(ngModel)]="nombreCorreccion" maxlength="180"/></div>
        <div class="admin-field"><label>Propósito</label><textarea class="admin-textarea" [(ngModel)]="descripcionCorreccion" maxlength="400"></textarea></div>
        <div class="e2-grid mt-3">
          <div class="admin-field"><label>Motivo</label>
            <select class="admin-select" [(ngModel)]="motivoCorreccion">
              @for(m of catalogos().motivos;track m.id){<option [ngValue]="m.id">{{m.nombre}}</option>}
            </select></div>
          <div class="admin-field"><label>Inicio programado</label>
            <input type="datetime-local" class="admin-input" [(ngModel)]="inicioCorreccion"/></div>
          <div class="admin-field"><label>Fin previsto (opcional)</label>
            <input type="datetime-local" class="admin-input" [(ngModel)]="finCorreccion"/></div>
        </div>
        <div class="admin-section-header mt-3"><h3>Destinos</h3></div>
        @for(destino of destinosCorreccion();track $index){
          <p class="e2-line">{{destino.predioId?'Predio #'+destino.predioId:destino.referencia}}
            <button type="button" class="admin-secondary-button" (click)="removeCorrectionDestination($index)">Quitar</button>
          </p>
        }
        <div class="flex flex-wrap gap-2 mt-2"><input class="admin-input" [(ngModel)]="nuevoDestino" placeholder="Otro lugar o referencia"/>
          <button type="button" class="admin-secondary-button" (click)="addCorrectionDestination()">Añadir</button></div>
        <div class="admin-section-header mt-3"><h3>Bienes</h3></div>
        @for(b of bienesCorreccion();track b.bienId){<p class="e2-line">Bien #{{b.bienId}}
          <button type="button" class="admin-secondary-button" (click)="removeCorrectionBien(b.bienId)">Quitar</button>
        </p>}
        <div class="flex flex-wrap gap-2 mt-2">
          <select class="admin-select" [(ngModel)]="nuevoBien"><option [ngValue]="0">Añadir bien</option>
          @for(b of catalogos().bienes;track b.id){<option [ngValue]="b.id">{{b.nombre}}</option>}</select>
          <button type="button" class="admin-secondary-button" (click)="addCorrectionBien()">Añadir</button>
        </div>
        <button class="admin-primary-button mt-3" type="button"
          [disabled]="saving()||!destinosCorreccion().length" (click)="corregir()">Reenviar solicitud</button>
      </section>
    }
    @if(['SOLICITADA','OBSERVADA','RECHAZADA'].includes(d.estado)){
      <section *appPermission="'SALIDAS_RETIRAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><div><p>Solicitud</p><h2>Cancelación con motivo</h2></div></div>
        <div class="admin-field"><label>Motivo</label><input class="admin-input" [(ngModel)]="motivoCancelar" maxlength="1200"/></div>
        <button type="button" class="admin-danger-button mt-3" [disabled]="saving()" (click)="cancelar()">Cancelar solicitud</button>
      </section>
    }
    <div class="e2-grid mt-4">
      <section class="admin-surface"><div class="admin-section-header"><div><p>Plan</p><h2>Destinos</h2></div></div>
        @for(l of d.destinos;track l.destinoId){<p class="e2-line">{{l.orden}} ·
          {{l.predioId?'Predio #'+l.predioId:l.referencia}}</p>}
      </section>
      <section class="admin-surface"><div class="admin-section-header"><div><p>Logística</p><h2>Bienes solicitados</h2></div></div>
        @for(b of d.bienes;track b.solicitudRecursoId){<p class="e2-line"><strong>{{b.nombre}}</strong>
          · {{b.estado}} @if(b.resultadoValidado){· {{b.resultadoValidado}}}</p>}
        @empty{<p class="admin-empty-copy">Sin bienes físicos solicitados.</p>}
      </section>
    </div>
    @if(['APROBADA','EN_EJECUCION'].includes(d.estado) && hasPendingDestinations(d)){
      <section *appPermission="'SALIDAS_EDITAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><div><p>Destino encontrado en campo</p><h2>Vincular predio sin repetir la solicitud</h2></div></div>
        <div class="e2-grid"><div class="admin-field"><label>Destino pendiente</label>
          <select class="admin-select" [(ngModel)]="destinoVincular"><option [ngValue]="0">Seleccione</option>
            @for(l of d.destinos;track l.destinoId){@if(!l.predioId){<option [ngValue]="l.destinoId">{{l.referencia}}</option>}}
          </select></div><div class="admin-field"><label>Buscar predio</label>
          <div class="flex gap-2"><input class="admin-input" [(ngModel)]="buscarPredio"/>
             <button type="button" class="admin-secondary-button" (click)="buscarPredios()">Buscar</button></div></div>
          <div class="admin-field"><label>Predio registrado</label>
            <select class="admin-select" [(ngModel)]="predioVincular"><option [ngValue]="0">Seleccione</option>
              @for(p of candidatos();track p.predioId){<option [ngValue]="p.predioId">{{p.nombre}}</option>}
            </select></div></div>
        <button type="button" class="admin-primary-button mt-3" [disabled]="saving()" (click)="vincular()">Vincular destino</button>
        <p class="admin-empty-copy">Si aún no existe, regístrelo desde el módulo Predios.</p>
      </section>
    }
    @if(d.estado==='APROBADA'){
      <section class="admin-surface mt-4"><div class="admin-section-header"><div><p>Almacén y campo</p><h2>Entrega e inicio</h2></div></div>
        <div class="flex gap-2 flex-wrap">
        @if(hasUndeliveredGoods(d)){
          <button *appPermission="'RECURSOS_CREAR'" class="admin-secondary-button"
            type="button" [disabled]="saving()" (click)="entregar()">Confirmar entrega física</button>}
        <button *appPermission="'SALIDAS_EDITAR'" class="admin-primary-button" type="button"
          [disabled]="saving()||hasUndeliveredGoods(d)" (click)="iniciar()">Iniciar salida</button></div>
        <p class="admin-empty-copy">Se impide iniciar mientras existan bienes solicitados aún no entregados.</p>
      </section>
    }
    @if(d.estado==='EN_EJECUCION'){
      <section *appPermission="'VISITAS_EDITAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><div><p>Trabajo de campo</p><h2>Registrar visita</h2></div></div>
        <div class="e2-grid"><div class="admin-field"><label>Destino con predio</label>
          <select class="admin-select" [(ngModel)]="destinoId"><option [ngValue]="0">Seleccione</option>
            @for(l of d.destinos;track l.destinoId){@if(l.predioId){<option [ngValue]="l.destinoId">Predio #{{l.predioId}}</option>}}
          </select></div><div class="admin-field"><label>Tipo de visita</label>
          <select class="admin-select" [(ngModel)]="tipoVisitaId"><option [ngValue]="0">Seleccione</option>
            @for(t of catalogos().tiposVisita;track t.id){<option [ngValue]="t.id">{{t.nombre}}</option>}
          </select></div><div class="admin-field"><label>Objetivo (opcional)</label>
          <input class="admin-input" [(ngModel)]="objetivo" maxlength="250"/></div></div>
        <button class="admin-primary-button mt-3" type="button" [disabled]="saving()" (click)="visitar()">Iniciar visita</button>
        <p class="admin-empty-copy">Si el lugar no tenía predio, créelo desde Predios antes de iniciar una visita.</p>
      </section>
    }
    <section class="admin-surface mt-4">
      <div class="admin-section-header"><div><p>Actuaciones</p><h2>Visitas registradas</h2></div></div>
      @for(v of d.visitas;track v.visitaId){<article class="e2-line">
         <strong>Visita #{{v.visitaId}} · {{v.tipoVisita}}</strong> — {{v.estado}}
         <span> · Predio #{{v.predioId}}</span>
         @if(v.resumen){<p>{{v.resumen}}</p>}
         <a [routerLink]="['/gestion-tecnica/visitas',v.visitaId]">Ver detalle y fotos</a>
         @if(convenioId && v.predioId){<a class="admin-secondary-button" [routerLink]="['/convenios/apappss/plantas',v.predioId]"
         [queryParams]="{convenioId:convenioId,visitaId:v.visitaId}">Plantas de esta visita</a>}
      </article>}
      @empty{<app-empty-state title="Sin visitas" message="Las actuaciones aparecerán cuando se inicie una visita."/>}
      @if(d.estado==='EN_EJECUCION'){
        <div *appPermission="'VISITAS_CONFIRMAR'" class="e2-grid mt-3">
          <div class="admin-field"><label>Visita por finalizar</label><select class="admin-select" [(ngModel)]="visitaFinalizar">
            <option [ngValue]="0">Seleccione</option>
            @for(v of d.visitas;track v.visitaId){@if(v.estado==='INICIADA'){<option [ngValue]="v.visitaId">Visita #{{v.visitaId}}</option>}}
          </select></div><div class="admin-field"><label>Qué se hizo</label>
            <textarea class="admin-textarea" [(ngModel)]="resumen" maxlength="600"></textarea></div>
          <div class="flex items-end"><button class="admin-primary-button" type="button" [disabled]="saving()"
            (click)="finalizarVisita()">Finalizar visita</button></div></div>}
    </section>
    @if(d.estado==='EN_EJECUCION'){
      <section *appPermission="'SALIDAS_EDITAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><div><p>Retorno</p><h2>Una observación general para todos los bienes</h2></div></div>
        <div class="admin-field"><label>Descripción del retorno</label>
          <textarea class="admin-textarea" [(ngModel)]="observacionGeneral" maxlength="1500"></textarea></div>
        @for(b of d.bienes;track b.solicitudRecursoId){
          <div class="e2-line"><strong>{{b.nombre}}</strong><select class="admin-select e2-select"
            [ngModel]="resultadoDeclarado()[b.solicitudRecursoId]" (ngModelChange)="changeDeclarado(b.solicitudRecursoId,$event)">
            <option value="CONFORME">Conforme</option><option value="DANADO">Dañado</option><option value="FALTANTE">No devuelto</option>
          </select>
          @if(resultadoDeclarado()[b.solicitudRecursoId]!=='CONFORME'){
            <input class="admin-input" maxlength="500" placeholder="Detalle del daño o faltante (opcional)"
              [ngModel]="observacionesBien()[b.solicitudRecursoId]"
              (ngModelChange)="changeObservacionBien(b.solicitudRecursoId,$event)"/>
          }</div>}
        <button type="button" class="admin-primary-button mt-3" [disabled]="saving()" (click)="retornar()">Presentar retorno</button>
      </section>
    }
    @if(d.estado==='EN_RETORNO' && !d.fechaFinPrevista){
      <section *appPermission="'SALIDAS_EDITAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><h2>Regularizar fin previsto</h2></div>
        <p class="admin-empty-copy">Antes del cierre, complete la fecha de término prevista que quedó pendiente.</p>
        <div class="flex flex-wrap gap-2"><input type="datetime-local" class="admin-input"
             [(ngModel)]="fechaFinRegularizada" />
          <button type="button" class="admin-primary-button" [disabled]="saving()||!fechaFinRegularizada"
             (click)="regularizarFin()">Guardar fecha</button></div>
      </section>
    }
    @if(d.estado==='EN_RETORNO'){
      <section *appPermission="'SALIDAS_CONFIRMAR'" class="admin-surface mt-4">
        <div class="admin-section-header"><div><p>Inspección</p><h2>Validar bienes físicamente</h2></div></div>
        @if(d.observacionRetorno){<p class="e2-line">Declaración general: {{d.observacionRetorno}}</p>}
        @for(b of d.bienes;track b.solicitudRecursoId){@if(b.estado==='ENTREGADO'){
          <div class="e2-line"><strong>{{b.nombre}}</strong> · Declarado: {{b.resultadoDeclarado}}
            <select class="admin-select e2-select" [ngModel]="resultadoInspeccion()[b.solicitudRecursoId]"
              (ngModelChange)="changeInspeccion(b.solicitudRecursoId,$event)">
              <option value="CONFORME">Conforme</option><option value="DANADO">Dañado</option><option value="FALTANTE">Faltante</option>
            </select></div>}}
        <div class="admin-field mt-3"><label>Observación de la inspección (opcional)</label>
          <textarea class="admin-textarea" [(ngModel)]="observacionInspeccion" maxlength="1200"></textarea></div>
        <div class="flex flex-wrap gap-2 mt-3"><button type="button" class="admin-primary-button" [disabled]="saving()"
           (click)="inspeccionar()">Registrar visto bueno</button>
          <button type="button" class="admin-secondary-button"
           [disabled]="saving()||!d.fechaFinPrevista||hasPendingInspection(d)"
           (click)="cerrar()">Cerrar salida inspeccionada</button></div>
      </section>
    }
    <section class="admin-surface mt-4"><div class="admin-section-header"><div><p>Seguimiento</p><h2>Historial cronológico</h2></div></div>
      @for(h of d.historial;track h.eventoId){<article class="e2-line">
        <strong>{{h.tipo}}</strong> · {{h.fechaHora|date:'dd/MM/yyyy HH:mm'}} · Usuario #{{h.usuarioId}}
        @if(h.detalle){<p>{{h.detalle}}</p>}
      </article>}
    </section>
    <section class="mt-4"><app-evidence-panel title="Documentos y fotografías de la salida y del retorno"
       [context]="{tipo:'SALIDA',id:d.salidaId}"/></section>
  }
</div>
<app-action-confirm-dialog />
```

