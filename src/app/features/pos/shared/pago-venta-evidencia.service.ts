import { Injectable, inject } from '@angular/core';
import { map, of } from 'rxjs';
import { LocalDocumentApiService } from '../../../shared/files/local-document-api.service';

@Injectable({providedIn:'root'})
export class PagoVentaEvidenciaService {
  private readonly local = inject(LocalDocumentApiService);
  cargar(uotId: number, archivo?: File) {
    if (!archivo) return of(undefined as number | undefined);
    if (!['image/jpeg','image/png','image/webp'].includes(archivo.type)
        || archivo.size <= 0 || archivo.size > 8388608) {
      throw new Error('La fotografía debe ser JPG, PNG o WebP y pesar como máximo 8 MB.');
    }
    return this.local.upload({uotId,file:archivo,category:'OTRO',linkType:'NINGUNO',
      evidence:{tipo:'PAGO_VENTA',origen:'CARGA'}}).pipe(map(result => {
      if (!result?.archivoId) throw new Error('No se pudo guardar la fotografía del pago.');
      return result.archivoId;
    }));
  }
}
