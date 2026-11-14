import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {ApiEnvelopeError} from '../../../../../../../infrastructure/openapi/api-response-unwrapper';
import {E3ExpedienteE4Service} from './e3-expediente-e4.service';

describe('E3ExpedienteE4Service - materia seca',()=>{
 let service:E3ExpedienteE4Service;
 let http:HttpTestingController;
 const ambito={uotId:1,convenioId:2,predioId:3};
 beforeEach(()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  service=TestBed.inject(E3ExpedienteE4Service);
  http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>http.verify());
 it('consulta por fundo y admite un historial vacío',()=>{
  let items=-1;
  service.secaPredio(ambito).subscribe(r=>items=r.items.length);
  const req=http.expectOne(r=>r.method==='GET'&&r.url==='/api/v1/apappss/predios/3/materia-seca');
  expect(req.request.params.get('uotId')).toBe('1');
  expect(req.request.params.get('convenioId')).toBe('2');
  req.flush({exitoso:true,codigo:'E4_OK',mensaje:'OK',datos:{totalPlantasActivas:2,items:[]}});
  expect(items).toBe(0);
 });
 it('conserva el código de error devuelto en el sobre de la API',()=>{
  let error:unknown;
  service.secaPredio(ambito).subscribe({next:()=>fail('No debe entregar datos'),error:e=>error=e});
  http.expectOne(r=>r.method==='GET'&&r.url.endsWith('/predios/3/materia-seca'))
   .flush({exitoso:false,codigo:'E4_ERROR',mensaje:'Datos no disponibles',
    correlacionId:'1234',datos:null});
  expect(error instanceof ApiEnvelopeError).toBeTrue();
  expect((error as ApiEnvelopeError).code).toBe('E4_ERROR');
 });
 it('rechaza respuestas con estructura de listado incorrecta',()=>{
  let error:unknown;
  service.secaPredio(ambito).subscribe({next:()=>fail('Respuesta inválida'),error:e=>error=e});
  http.expectOne(r=>r.method==='GET'&&r.url.endsWith('/predios/3/materia-seca'))
   .flush({exitoso:true,codigo:'E4_OK',mensaje:'OK',datos:{}});
  expect(error instanceof ApiEnvelopeError).toBeTrue();
  expect((error as ApiEnvelopeError).code).toBe('E4_LISTADO_INVALIDO');
 });
});
