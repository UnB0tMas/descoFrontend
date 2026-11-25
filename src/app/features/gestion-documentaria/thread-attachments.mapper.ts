import { ThreadAttachment } from '../../shared/files/thread-attachments/thread-attachments';
import { SeguimientoDocumento } from './gestion-documentaria.api';

/** Mantiene el orden de envío del hilo; un reenvío es una nueva aparición del archivo. */
export function archivosDeHilo(hilo: SeguimientoDocumento): ThreadAttachment[] {
  return hilo.documentos.flatMap(mensaje => (mensaje.adjuntos ?? []).map(archivo => ({
    archivoId: archivo.archivoId,
    documentoId: mensaje.documentoId,
    nombre: archivo.nombre,
    mimeType: archivo.mimeType,
    tamanoBytes: archivo.tamanoBytes,
    fechaEnvio: mensaje.fechaEnvio,
    emisor: mensaje.emisor,
    documentoOriginalId: archivo.documentoOriginalId,
  })));
}
