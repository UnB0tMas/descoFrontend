import { inject, Injectable } from '@angular/core';
import { GpIncidenciaAltaRequest, GpIncidenciaEditarRequest, GpTratamientoAplicarRequest, GpIncidenciaCerrarRequest } from '../../../infrastructure/openapi/generated/api/gestionProductivaGeneral.service';
import { map } from 'rxjs';
import { GestionProductivaGeneralService } from '../../../infrastructure/openapi/generated/api/gestionProductivaGeneral.service';
import { GpParcelaAltaRequest } from '../../../infrastructure/openapi/generated/model/gpParcelaAltaRequest';
import { GpParcelaEditarRequest } from '../../../infrastructure/openapi/generated/model/gpParcelaEditarRequest';
import { GpActividadAltaRequest } from '../../../infrastructure/openapi/generated/model/gpActividadAltaRequest';
import { GpActividadEditarRequest } from '../../../infrastructure/openapi/generated/model/gpActividadEditarRequest';
import { GpCensoAltaRequest } from '../../../infrastructure/openapi/generated/model/gpCensoAltaRequest';
import { GpEventoAltaRequest } from '../../../infrastructure/openapi/generated/model/gpEventoAltaRequest';
import { GpCatalogoRazaRequest } from '../../../infrastructure/openapi/generated/model/gpCatalogoRazaRequest';
import { GpCatalogoCultivoRequest } from '../../../infrastructure/openapi/generated/model/gpCatalogoCultivoRequest';
import { GpCatalogoEspecieRequest } from '../../../infrastructure/openapi/generated/model/gpCatalogoEspecieRequest';
import { GpCatalogoProblemaRequest } from '../../../infrastructure/openapi/generated/model/gpCatalogoProblemaRequest';
import { GpCatalogoTratamientoRequest } from '../../../infrastructure/openapi/generated/model/gpCatalogoTratamientoRequest';
@Injectable({providedIn:'root'})
export class GpGeneralFacade {
  private readonly api=inject(GestionProductivaGeneralService);
  parcelas(uot:number,predio:number){return this.api.gpParcelasListar(uot,predio).pipe(map(r=>r.datos??[]));}
  crearParcela(u:number,q:GpParcelaAltaRequest,key:string=crypto.randomUUID()){return this.api.gpParcelaCrear(u,q,key).pipe(map(r=>r.datos.id));}
  editarParcela(u:number,id:number,q:GpParcelaEditarRequest,key:string=crypto.randomUUID()){return this.api.gpParcelaEditar(u,id,q,key).pipe(map(r=>r.datos.id));}
  catalogos(uot:number){return this.api.gpCatalogosListar(uot).pipe(map(r=>r.datos??[]));}
  actividades(uot:number,parcela:number){return this.api.gpActividadesListar(uot,parcela).pipe(map(r=>r.datos??[]));}
  revisiones(uot:number,id:number){return this.api.gpActividadRevisionesListar(uot,id).pipe(map(r=>r.datos??[]));}
  censos(uot:number,id:number){return this.api.gpCensosListar(uot,id).pipe(map(r=>r.datos??[]));}
  eventos(uot:number,id:number){return this.api.gpEventosListar(uot,id).pipe(map(r=>r.datos??[]));}
  crearActividad(u:number,q:GpActividadAltaRequest){return this.api.gpActividadCrear(u,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  editarActividad(u:number,id:number,q:GpActividadEditarRequest){return this.api.gpActividadEditar(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  crearCenso(u:number,id:number,q:GpCensoAltaRequest){return this.api.gpCensoCrear(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  crearEvento(u:number,id:number,q:GpEventoAltaRequest){return this.api.gpEventoCrear(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  subirFoto(u:number,evento:number,archivo:File){return this.api.gpFotoSubir(u,evento,archivo).pipe(map(r=>r.datos.id));}
  verFoto(u:number,foto:number){return this.api.gpFotoVer(u,foto);}
  incidencias(u:number,id:number){return this.api.gpIncidenciasListar(u,id).pipe(map(r=>r.datos??[]));}
  tratamientosIncidencias(u:number,id:number){return this.api.gpIncidenciasTratamientosListar(u,id).pipe(map(r=>r.datos??[]));}
  registrarIncidencia(u:number,id:number,q:GpIncidenciaAltaRequest){return this.api.gpIncidenciaCrear(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  editarIncidencia(u:number,id:number,q:GpIncidenciaEditarRequest){return this.api.gpIncidenciaEditar(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  retirarIncidencia(u:number,id:number,motivo:string){return this.api.gpIncidenciaRetirar(u,id,{motivo},crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  revisionesIncidencia(u:number,id:number){return this.api.gpIncidenciaRevisionesListar(u,id).pipe(map(r=>r.datos??[]));}
  aplicarTratamiento(u:number,id:number,q:GpTratamientoAplicarRequest){return this.api.gpIncidenciaTratamientoCrear(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  finalizarTratamiento(u:number,id:number,descripcion:string){return this.api.gpIncidenciaTratamientoFinalizar(u,id,{descripcion},crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  cerrarIncidencia(u:number,id:number,q:GpIncidenciaCerrarRequest){return this.api.gpIncidenciaCerrar(u,id,q,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  finalizarActividad(u:number,id:number,motivo:string){return this.api.gpActividadFinalizar(u,id,motivo,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  eliminarActividad(u:number,id:number,motivo:string){return this.api.gpActividadEliminar(u,id,motivo,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  eliminarParcela(u:number,id:number,motivo:string){return this.api.gpParcelaEliminar(u,id,motivo,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  eliminarPredio(u:number,id:number,motivo:string){return this.api.gpPredioEliminar(u,id,motivo,crypto.randomUUID()).pipe(map(r=>r.datos.id));}
  crearCultivo(u:number,q:GpCatalogoCultivoRequest & {descripcion?:string|null}){return this.api.gpCatalogoCultivoCrear(u,q).pipe(map(r=>r.datos.id));}
  crearEspecie(u:number,q:GpCatalogoEspecieRequest & {descripcion?:string|null}){return this.api.gpCatalogoEspecieCrear(u,q).pipe(map(r=>r.datos.id));}
  crearVariedad(u:number,q:{cultivoId:number;codigo:string;nombre:string;descripcion?:string|null}){return this.api.gpCatalogoVariedadCrear(u,q).pipe(map(r=>r.datos.id));}
  actualizarCatalogo(u:number,tipo:string,id:number,q:{codigo?:string|null;nombre?:string|null;padreId?:number|null;descripcion?:string|null;estado:boolean}){
    return this.api.gpCatalogoActualizar(u,tipo,id,q).pipe(map(r=>r.datos.id));
  }
  crearRaza(u:number,q:GpCatalogoRazaRequest){return this.api.gpCatalogoRazaCrear(u,q).pipe(map(r=>r.datos.id));}
  crearProblema(u:number,q:GpCatalogoProblemaRequest){return this.api.gpCatalogoProblemaCrear(u,q).pipe(map(r=>r.datos.id));}
  crearTratamiento(u:number,q:GpCatalogoTratamientoRequest){return this.api.gpCatalogoTratamientoCrear(u,q).pipe(map(r=>r.datos.id));}
}
