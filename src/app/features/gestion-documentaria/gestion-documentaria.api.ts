
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IdempotencyKeyService } from '../../core/http/services/idempotency-key.service';
import { ApiEnvelope, unwrapApiResponse } from '../../infrastructure/openapi/api-response-unwrapper';
import { LocalDocumentApiService } from '../../shared/files/local-document-api.service';

export interface TipoDocumentoInterno {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}
export interface ReceptorInterno { empleadoId: number; usuarioId?: number; usuario?: string; nombre: string; uotId: number; habilitado: boolean; }
export interface UotDestinataria { uotId: number; nombre: string; }
export interface DocumentoInterno {
  documentoId: number; hiloId: number; uotId: number; documentoPadreId?: number; reemplazaDocumentoId?: number; uotEmisorId: number; motivoAnulacion?: string;
  tipoDocumentoId: number; tipo: string; asunto: string; cuerpo?: string;
  emisorUsuarioId: number; emisor: string; fechaEnvio: string;
  estadoTramite: 'EN_TRAMITE'|'OBSERVADO'|'FINALIZADO'|'ANULADO'; responsableUsuarioId: number; fechaCierre?: string;
  tipoMovimiento?: string; requiereRespuesta?: boolean; fechaLimite?: string; fueraPlazo?: boolean; puedeConformar?: boolean;
  destinatarios: { usuarioId: number; usuario: string; nombre: string; uotId: number; fechaEntrega?: string; fechaVista?: string; fechaAbierto?: string; fechaAtencion?: string; estado: string }[];
  adjuntos: { archivoId: number; nombre: string; mimeType: string; tamanoBytes: number }[];
}
export interface ResumenDocumento {
  documentoId: number; hiloId: number; uotEmisorId?: number; asunto: string; tipo: string; emisor: string;
  fechaEnvio: string; noLeido: boolean; esEmisor: boolean; cantidadDestinatarios: number;
  estadoTramite: 'EN_TRAMITE'|'OBSERVADO'|'FINALIZADO'|'ANULADO'; tipoDocumentoId: number;
  destinatariosAbiertos?: number; destinatariosRecibidos?: number;
  estadoEnvio?: 'ENVIADO'|'REENVIADO'|'EN_ATENCION'|'RESPONDIDO'|'OBSERVADO'|'FINALIZADO'|'ANULADO';
  tipoMovimiento?: string; requiereRespuesta?: boolean; fechaLimite?: string; fueraPlazo?: boolean;
  resumen?: string; tieneAdjuntos?: boolean; tienePendientes?: boolean;
  primerDocumentoId?: number; asuntoInicial?: string; primerMensaje?: string;
  fechaInicio?: string; emisorInicial?: string; cantidadArchivos?: number;
}
export interface BandejaDocumentos { pagina: number; tamano: number; total: number; items: ResumenDocumento[]; }
export interface ArchivoCorrespondencia {
  archivoId: number; documentoId: number; hiloId: number; asunto: string; nombre: string;
  emisor?: string; documentoOriginalId?: number; tipoMovimiento?: string;
    mimeType: string; tamanoBytes: number; fechaEnvio: string; tipo?: string; estadoTramite: string;
}
export interface InventarioCorrespondencia {
  pagina: number; tamano: number; total: number; items: ArchivoCorrespondencia[];
}
export interface SeguimientoDocumento {
  hiloId: number; asunto: string; motivoAnulacion?: string;
  estadoTramite: 'EN_TRAMITE'|'OBSERVADO'|'FINALIZADO'|'ANULADO'; responsableUsuarioId: number; fechaCierre?: string;
  tipoMovimiento?: string; requiereRespuesta?: boolean;
  documentos: { documentoId: number; documentoPadreId?: number; asunto: string; cuerpo?: string; tipo: string;
    emisor: string; emisorUsuarioId: number; uotEmisorId: number; reemplazaDocumentoId?: number; fechaEnvio: string;
    tipoMovimiento?: string; requiereRespuesta?: boolean; fechaLimite?: string; fueraPlazo?: boolean; puedeConformar?: boolean;
    adjuntos?: { archivoId: number; nombre: string; mimeType: string; tamanoBytes: number; documentoOriginalId?: number }[];
    destinatarios: { usuarioId: number; usuario: string; uotId: number; fechaEntrega?: string; fechaVista?: string; fechaAbierto?: string; fechaAtencion?: string }[] }[];
  eventos: { eventoId: number; documentoId: number; tipo: string; detalle: string;
    usuario: string; fecha: string }[];
  participantes: { usuarioId: number; usuario: string }[];
}
export interface BorradorDocumento {
  tipoId?:number|null;asunto:string;cuerpo:string;origenUotId?:number|null;destinoUotId?:number|null;rectificando?:boolean;
  seleccionados:number[];requiereRespuesta:boolean;fechaLimite?:string;
  respondeA?:number|null;tipoMovimiento?:string;
  adjuntosGuardados?: {archivoId:number;nombre:string;mimeType:string;tamanoBytes:number}[];
  archivosCompartidos?: number[];
}
export interface EnvioDocumento {
  uotId: number; destinoUotId: number; reemplazaDocumentoId?: number; tipoDocumentoId: number; asunto: string; cuerpo: string;
  destinatarioIds: number[]; archivoIds: number[]; requiereRespuesta?: boolean;
  tipoMovimiento?: 'RESPUESTA'|'DERIVACION'|'REENVIO'|'RECTIFICACION'|'OBSERVACION'; fechaLimite?: string;
}

@Injectable({ providedIn: 'root' })
export class GestionDocumentariaApi {
  private readonly http = inject(HttpClient);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly localFiles = inject(LocalDocumentApiService);
  private readonly url = `${environment.apiBaseUrl}/api/v1/gestion-documentaria`;
  private readonly mutationHeaders = (key?: string) => new HttpHeaders({ 'X-Idempotency-Key': key ?? this.keys.create() });
  nuevaClaveIdempotencia():string{return this.keys.create();}
  private params(uotId: number) { return new HttpParams().set('uotId', uotId); }

  contexto() {
    return this.http.get<ApiEnvelope<{uotId:number}>>(`${this.url}/contexto`)
      .pipe(map(r=>unwrapApiResponse<{uotId:number}>(r)));
  }
  atender(uotId:number,documentoId:number) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/atender`,{},
      {params:this.params(uotId),headers:this.mutationHeaders()})
      .pipe(map(r=>unwrapApiResponse<void>(r)));
  }
  conforme(uotId:number,documentoId:number) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/conforme`,{},
      {params:this.params(uotId),headers:this.mutationHeaders()})
      .pipe(map(r=>unwrapApiResponse<void>(r)));
  }

  bandeja(uotId: number, bandeja: 'RECIBIDOS' | 'ENVIADOS' | 'PENDIENTES' | 'TODOS' | 'FINALIZADOS' | 'DOCUMENTOS', pagina = 1, tamano = 20, tipoFiltroId?: number, buscar?: string, estadoFiltro?: string,
    filtros?: {unidad?:string;destinatario?:string;desde?:string;hasta?:string}) {
    let params = this.params(uotId).set('bandeja', bandeja).set('pagina', pagina).set('tamano', tamano);
    if (tipoFiltroId) params = params.set('tipoFiltroId', tipoFiltroId);
    if (buscar?.trim()) params = params.set('buscar',buscar.trim());
    if (estadoFiltro) params = params.set('estadoFiltro',estadoFiltro);
    if(filtros?.unidad?.trim())params=params.set('unidad',filtros.unidad.trim());
    if(filtros?.destinatario?.trim())params=params.set('destinatario',filtros.destinatario.trim());
    if(filtros?.desde)params=params.set('desde',filtros.desde);
    if(filtros?.hasta)params=params.set('hasta',filtros.hasta);
    return this.http.get<ApiEnvelope<BandejaDocumentos>>(`${this.url}/bandeja`, { params })
      .pipe(map(r => {
        const data=unwrapApiResponse<BandejaDocumentos>(r);
        return {pagina:data?.pagina??pagina,tamano:data?.tamano??tamano,total:data?.total??0,items:data?.items??[]} as BandejaDocumentos;
      }));
  }
  archivos(uotId: number, pagina = 1, tamano = 20, buscar = '',
    filtros?:{formato?:string;desde?:string;hasta?:string}) {
    let params=this.params(uotId).set('pagina',pagina).set('tamano',tamano);
    if(buscar.trim())params=params.set('buscar',buscar.trim());
    if(filtros?.formato)params=params.set('formato',filtros.formato);
    if(filtros?.desde)params=params.set('desde',filtros.desde);
    if(filtros?.hasta)params=params.set('hasta',filtros.hasta);
    return this.http.get<ApiEnvelope<InventarioCorrespondencia>>(`${this.url}/archivos`,{ params })
      .pipe(map(r => {
        const data=unwrapApiResponse<InventarioCorrespondencia>(r);
        return {pagina:data?.pagina??pagina,tamano:data?.tamano??tamano,total:data?.total??0,
          items:data?.items??[]} as InventarioCorrespondencia;
      }));
  }
  indicadores(uotId: number) {
    return this.http.get<ApiEnvelope<{noLeidos:number;pendientes:number;finalizados:number;vencidos:number}>>(
      `${this.url}/pendientes`, { params: this.params(uotId) })
      .pipe(map(r => unwrapApiResponse<{noLeidos:number;pendientes:number;finalizados:number;vencidos:number}>(r)));
  }
  pendientes(uotId: number) {
    return this.indicadores(uotId).pipe(map(r=>r.noLeidos));
  }
  destinatarios(uotId: number, destinoUotId = uotId, documentoPadreId?: number) {
    let params=this.params(uotId).set('destinoUotId',destinoUotId);
    if (documentoPadreId) params=params.set('documentoPadreId',documentoPadreId);
    return this.http.get<ApiEnvelope<ReceptorInterno[]>>(`${this.url}/destinatarios`, { params })
      .pipe(map(r => unwrapApiResponse<ReceptorInterno[]>(r) ?? []));
  }
  unidades(uotId: number, documentoPadreId?: number) {
    let params=this.params(uotId);
    if(documentoPadreId)params=params.set('documentoPadreId',documentoPadreId);
    return this.http.get<ApiEnvelope<UotDestinataria[]>>(`${this.url}/uot-destinos`, { params })
      .pipe(map(r=>unwrapApiResponse<UotDestinataria[]>(r)??[]));
  }
  tipos(uotId: number) {
    return this.http.get<ApiEnvelope<TipoDocumentoInterno[]>>(`${this.url}/tipos`, { params: this.params(uotId) })
      .pipe(map(r => unwrapApiResponse<TipoDocumentoInterno[]>(r) ?? []));
  }
  detalle(uotId: number, documentoId: number) {
    return this.http.get<ApiEnvelope<DocumentoInterno>>(`${this.url}/${documentoId}`, { params: this.params(uotId) })
      .pipe(map(r => unwrapApiResponse<DocumentoInterno>(r)));
  }
  abrirHilo(documentoId:number,uotId?:number) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/abrir-hilo`,{},
      {params:uotId?this.params(uotId):undefined,headers:this.mutationHeaders()}).pipe(map(r=>unwrapApiResponse<void>(r)));
  }
  borrarBorrador(id:number) {
    return this.http.delete<ApiEnvelope<void>>(`${this.url}/borradores/${id}`,
      {headers:this.mutationHeaders()}).pipe(map(r=>unwrapApiResponse<void>(r)));
  }
  borradores() {
    return this.http.get<ApiEnvelope<{borradorId:number;contenido:BorradorDocumento;fechaActualizacion:string}[]>>(`${this.url}/borradores`)
      .pipe(map(r=>unwrapApiResponse<{borradorId:number;contenido:BorradorDocumento;fechaActualizacion:string}[]>(r)??[]));
  }
  guardarBorrador(contenido:BorradorDocumento,borradorId?:number) {
    return this.http.post<ApiEnvelope<{borradorId:number}>>(`${this.url}/borradores`,{borradorId,contenido},
      {headers:this.mutationHeaders()}).pipe(map(r=>unwrapApiResponse<{borradorId:number}>(r)));
  }
  recordar(documentoId:number,uotId?:number) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/recordar`,{},
      {params:uotId?this.params(uotId):undefined,headers:this.mutationHeaders()}).pipe(map(r=>unwrapApiResponse<void>(r)));
  }
  abrir(uotId: number, documentoId: number) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/abrir`, {},
      { params: this.params(uotId), headers: this.mutationHeaders() })
      .pipe(map(r => unwrapApiResponse<void>(r)));
  }
  seguimiento(uotId: number, documentoId: number) {
    return this.http.get<ApiEnvelope<SeguimientoDocumento>>(`${this.url}/${documentoId}/historial`,
      { params: this.params(uotId) }).pipe(map(r => unwrapApiResponse<SeguimientoDocumento>(r)));
  }
  enviar(payload: EnvioDocumento, respondeA?: number, claveIdempotencia?:string) {
    return this.http.post<ApiEnvelope<{ documentoId: number; hiloId: number }>>(
      respondeA ? `${this.url}/${respondeA}/responder` : this.url, payload,
      { headers: this.mutationHeaders(claveIdempotencia) })
      .pipe(map(r => unwrapApiResponse<{ documentoId: number; hiloId: number }>(r)));
  }
  anular(uotId: number, documentoId: number, motivo: string) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/anular`, {motivo},
      {params:this.params(uotId),headers:this.mutationHeaders()}).pipe(map(r=>unwrapApiResponse<void>(r)));
  }
  rectificar(documentoId: number, payload: EnvioDocumento, claveIdempotencia?:string) {
    return this.http.post<ApiEnvelope<{documentoId:number;hiloId:number}>>(`${this.url}/${documentoId}/rectificar`,payload,
      {headers:this.mutationHeaders(claveIdempotencia)}).pipe(map(r=>unwrapApiResponse<{documentoId:number;hiloId:number}>(r)));
  }
  revisar(uotId: number, documentoId: number, accion: 'OBSERVAR'|'FINALIZAR', motivo = '') {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/${documentoId}/revision`, {accion,motivo},
      {params:this.params(uotId),headers:this.mutationHeaders()}).pipe(map(r=>unwrapApiResponse<void>(r)));
  }
  subirAdjunto(uotId: number, file: File) {
    return this.localFiles.upload({uotId,file,category:'CORRESPONDENCIA',linkType:'NINGUNO'});
  }
  contenido(uotId: number, documentoId: number, archivoId: number) {
    return this.http.get(`${this.url}/${documentoId}/adjuntos/${archivoId}/contenido`,
      { params: this.params(uotId), responseType: 'blob' });
  }
  listarTipos() {
    return this.http.get<ApiEnvelope<TipoDocumentoInterno[]>>(`${this.url}/catalogo/tipos`)
      .pipe(map(r => unwrapApiResponse<TipoDocumentoInterno[]>(r) ?? []));
  }
  crearTipo(input: { codigo: string; nombre: string; descripcion: string }) {
    return this.http.post<ApiEnvelope<{id:number}>>(`${this.url}/catalogo/tipos`, input,
      { headers: this.mutationHeaders() }).pipe(map(r => unwrapApiResponse(r)));
  }
  editarTipo(id: number, input: { codigo: string; nombre: string; descripcion: string }) {
    return this.http.put<ApiEnvelope<{id:number}>>(`${this.url}/catalogo/tipos/${id}`,input,
      { headers: this.mutationHeaders() }).pipe(map(r => unwrapApiResponse(r)));
  }
  deshabilitarTipo(id: number) {
    return this.http.post<ApiEnvelope<void>>(`${this.url}/catalogo/tipos/${id}/deshabilitar`,{},
      { headers: this.mutationHeaders() }).pipe(map(r => unwrapApiResponse(r)));
  }
}
