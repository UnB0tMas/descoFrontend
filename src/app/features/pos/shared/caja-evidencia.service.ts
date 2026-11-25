import { Injectable, inject } from '@angular/core';
import { forkJoin, map, of } from 'rxjs';
import { LocalDocumentApiService } from '../../../shared/files/local-document-api.service';

@Injectable({providedIn:'root'})
export class CajaEvidenciaService {
  private readonly local=inject(LocalDocumentApiService);
  cargar(uotId:number,files:File[]) {
    if(!files.length)return of([] as number[]);
    if(files.length>5||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size<=0||f.size>8388608))
      throw new Error('Selecciona hasta cinco imágenes JPG, PNG o WebP de hasta 8 MB.');
    return forkJoin(files.map(file=>this.local.upload({uotId,file,category:'OTRO',
      linkType:'NINGUNO',evidence:{tipo:'CAJA',origen:'CARGA'}}))).pipe(map(items=>items.map(item=>{
        if(!item?.archivoId)throw new Error('No se pudo guardar una imagen.');
        return item.archivoId;
      })));
  }
}
