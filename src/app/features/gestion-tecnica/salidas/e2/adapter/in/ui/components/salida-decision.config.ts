import { DecisionOption } from '../../../../../../../../shared/feedback/decision-modal/decision-modal';
import { StatusBadgeTone } from '../../../../../../../../shared/data-display/status-badge/status-badge';

export type DecisionSalida = 'APROBADA' | 'OBSERVADA' | 'RECHAZADA';
const RECHAZAR: DecisionOption = {value: 'RECHAZADA', label: 'Rechazar definitivamente', requiresReason: true,
  danger: true, help: 'La solicitud se cerrará y se conservará su historial.'};
const OPCIONES: readonly DecisionOption[] = [
  {value: 'APROBADA', label: 'Aprobar', help: 'Se autorizarán la salida y los recursos solicitados.'},
  {value: 'OBSERVADA', label: 'Observar', requiresReason: true, help: 'El solicitante deberá responder en un plazo de 24 horas.'},
  RECHAZAR,
];
const OPCIONES_CONVENIO: readonly DecisionOption[] = OPCIONES.map(option => option.value === 'OBSERVADA' ? {...option, help: 'Se registrará la observación en el expediente.'} : option);
const SOLO_RECHAZO: readonly DecisionOption[] = [RECHAZAR];
const SIN_OPCIONES: readonly DecisionOption[] = [];
export function opcionesSalida(estado: string | undefined, permitido: boolean, permiteRechazarObservada = true): readonly DecisionOption[] {
  if (!permitido) return SIN_OPCIONES;
  if (estado === 'SOLICITADA') return permiteRechazarObservada ? OPCIONES : OPCIONES_CONVENIO;
  if (estado === 'OBSERVADA' && permiteRechazarObservada) return SOLO_RECHAZO;
  return SIN_OPCIONES;
}
export function esDecisionSalida(value: string): value is DecisionSalida {
  return value === 'APROBADA' || value === 'OBSERVADA' || value === 'RECHAZADA';
}
export function estadoSalidaTexto(estado: string): string {
  const etiquetas: Record<string, string> = {BORRADOR: 'Borrador', SOLICITADA: 'Pendiente de aprobación',
    OBSERVADA: 'Observada', RECHAZADA: 'Rechazada', APROBADA: 'Aprobada', EN_EJECUCION: 'En ejecución',
    EN_RETORNO: 'En retorno', CERRADA: 'Cerrada', CANCELADA: 'Cancelada'};
  return etiquetas[estado] ?? 'Sin estado disponible';
}
export function estadoSalidaTono(estado: string): StatusBadgeTone {
  if (estado === 'OBSERVADA') return 'warning';
  if (estado === 'RECHAZADA' || estado === 'CANCELADA') return 'danger';
  if (estado === 'APROBADA' || estado === 'CERRADA') return 'success';
  if (estado === 'BORRADOR') return 'neutral';
  return 'info';
}
