import { RecursoOpcionE2 } from './salida-operativa.model';

export interface DisponibilidadRecursoE2 {
  valido: boolean;
  trasladoComercial: boolean;
  mensaje: string;
}

export function claveRecursoE2(opcion: Pick<RecursoOpcionE2, 'id' | 'tipo'>): string {
  return `${opcion.tipo}:${opcion.id}`;
}

/** Verificación informativa: la reserva definitiva se valida al aprobar en SQL. */
export function verificarDisponibilidadE2(opcion: RecursoOpcionE2,
  cantidad: number): DisponibilidadRecursoE2 {
  const consumible = opcion.tipo === 'CONSUMIBLE';
  if (!Number.isFinite(cantidad) || cantidad <= 0 || (!consumible && cantidad !== 1)) {
    return {valido:false, trasladoComercial:false, mensaje:'Indica una cantidad válida.'};
  }
  const tecnico = Math.max(0, opcion.disponibleTecnico ?? opcion.disponible ?? 0);
  const comercial = consumible ? Math.max(0, opcion.disponibleComercial ?? 0) : 0;
  const disponible = consumible ? tecnico + comercial : Math.max(0, opcion.disponible ?? tecnico);
  if (!Number.isFinite(disponible) || disponible <= 0) {
    return {valido:false, trasladoComercial:false, mensaje:'Sin existencias disponibles.'};
  }
  if (cantidad - disponible > 0.000001) {
    return {valido:false, trasladoComercial:false, mensaje:'La cantidad supera lo disponible.'};
  }
  return {valido:true, trasladoComercial:consumible && cantidad > tecnico,
    mensaje:'Disponible para la salida.'};
}
