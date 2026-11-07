import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, finalize } from 'rxjs';
import { SubirDocumentoEvidenciaUseCase } from './subir-documento-evidencia.use-case';
import { EVIDENCE_STORAGE_GATEWAY } from '../port/out/evidence-storage.gateway';
import { DOCUMENTOS_EVIDENCIAS_GATEWAY } from '../port/out/documentos-evidencias.gateway';
import { LocalDocumentApiService } from '../../../../shared/files/local-document-api.service';
import { UotContextStore } from '../../../uot/state/uot-context.store';

describe('SubirDocumentoEvidenciaUseCase',()=>{
 const runtime=globalThis as typeof globalThis & {__DESCO_CONFIG__?:unknown};
 let old:unknown;
 beforeEach(()=>{old=runtime.__DESCO_CONFIG__;});
 afterEach(()=>{runtime.__DESCO_CONFIG__=old;});
 const input=()=>({file:new File(['prueba'],'prueba.png',{type:'image/png'}),tipoEvidencia:'FOTOGRAFIA',categoria:'FOTOGRAFIA' as const,contexto:{tipo:'VISITA' as const,id:7}});
 it('registra una sola evidencia local con UOT y contexto cuando no hay Cloudinary',()=>{
  runtime.__DESCO_CONFIG__={};
  const local=jasmine.createSpyObj('local',['upload']);local.upload.and.returnValue(of({archivoId:12}));
  const cloud=jasmine.createSpyObj('cloud',['upload']);
  TestBed.configureTestingModule({providers:[provideZonelessChangeDetection(),SubirDocumentoEvidenciaUseCase,{provide:LocalDocumentApiService,useValue:local},{provide:UotContextStore,useValue:{selectedId:()=>2}},{provide:EVIDENCE_STORAGE_GATEWAY,useValue:cloud},{provide:DOCUMENTOS_EVIDENCIAS_GATEWAY,useValue:{}}]});
  let id=0;TestBed.inject(SubirDocumentoEvidenciaUseCase).execute(input()).subscribe(x=>id=x.archivoId);
  expect(id).toBe(12);expect(cloud.upload).not.toHaveBeenCalled();
  expect(local.upload).toHaveBeenCalledOnceWith(jasmine.objectContaining({uotId:2,linkType:'VISITA',linkId:7}));
 });
 it('convierte errores síncronos del almacenamiento en errores observables y libera el formulario',()=>{
  runtime.__DESCO_CONFIG__={cloudinary:{cloudName:'test',uploadPreset:'test'}};
  const cloud={upload:()=>{throw new Error('No disponible');}};
  TestBed.configureTestingModule({providers:[provideZonelessChangeDetection(),SubirDocumentoEvidenciaUseCase,{provide:LocalDocumentApiService,useValue:{}},{provide:UotContextStore,useValue:{selectedId:()=>2}},{provide:EVIDENCE_STORAGE_GATEWAY,useValue:cloud},{provide:DOCUMENTOS_EVIDENCIAS_GATEWAY,useValue:{}}]});
  let released=false,error='';
  TestBed.inject(SubirDocumentoEvidenciaUseCase).execute(input()).pipe(finalize(()=>released=true)).subscribe({error:e=>error=e.message});
  expect(error).toBe('No disponible');expect(released).toBeTrue();
 });
});
