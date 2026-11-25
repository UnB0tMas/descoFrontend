import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faClock, faRotate } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { AppButtonComponent } from '../../../../../../../shared/actions/app-button/app-button';
import { RecordCardComponent } from '../../../../../../../shared/data-display/record-card/record-card';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../../../../../shared/data-display/status-badge/status-badge';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { HorarioComercialApiService, ComercialMiHorario, ComercialTurno } from '../../../../../shared/horario-comercial-api.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

interface TramoDia {
  turno: ComercialTurno;
  offset: number;
  ancho: number;
}

interface JornadaDia {
  numero: number;
  nombre: string;
  inicio: string;
  fin: string;
  personalizado: boolean;
  turnos: TramoDia[];
  minutos: number;
  porcentaje: number;
  estado: string;
  tono: StatusBadgeTone;
}

@Component({
  selector: 'app-mi-horario',
  standalone: true,
  imports: [CommonModule, FaIconComponent, AppButtonComponent, RecordCardComponent,
    StatusBadgeComponent, PageHeaderComponent],
  templateUrl: './mi-horario-page.html',
  styleUrl: './mi-horario-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiHorarioPage {
  readonly icon = faCalendarDays;
  readonly clockIcon = faClock;
  readonly refreshIcon = faRotate;
  readonly uot = inject(UotContextStore);
  private readonly api = inject(HorarioComercialApiService);
  readonly datos = signal<ComercialMiHorario | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dias = computed<JornadaDia[]>(() => {
    const datos = this.datos();
    if (!datos || datos.empleadoId === null) return [];
    return DAYS.map((nombre, index) => {
      const numero = index + 1;
      const atencion = datos.diasAtencion?.find(item => item.diaSemana === numero);
      const inicio = atencion?.horaInicio ?? datos.atencion.horaInicio;
      const fin = atencion?.horaFin ?? datos.atencion.horaFin;
      const apertura = this.aMinutos(inicio);
      const cierre = this.aMinutos(fin);
      const duracion = Math.max(0, cierre - apertura);
      const turnos = (datos.turnos ?? [])
        .filter(turno => turno.diaSemana === numero)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      const tramos = turnos.map(turno => {
        const desde = Math.max(apertura, this.aMinutos(turno.horaInicio));
        const hasta = Math.min(cierre, this.aMinutos(turno.horaFin));
        return {
          turno,
          offset: duracion ? 100 * (desde - apertura) / duracion : 0,
          ancho: duracion ? 100 * Math.max(0, hasta - desde) / duracion : 0,
        };
      });
      // Unir intervalos para no contar dos veces horarios solapados.
      let minutos = 0;
      let finalAnterior = apertura;
      for (const tramo of tramos) {
        const desde = Math.max(apertura, this.aMinutos(tramo.turno.horaInicio));
        const hasta = Math.min(cierre, this.aMinutos(tramo.turno.horaFin));
        minutos += Math.max(0, hasta - Math.max(desde, finalAnterior));
        finalAnterior = Math.max(finalAnterior, hasta);
      }
      const porcentaje = duracion ? Math.min(100, Math.round(minutos * 100 / duracion)) : 0;
      return {
        numero, nombre, inicio, fin, personalizado: !!atencion?.personalizado,
        turnos: tramos, minutos, porcentaje,
        estado: !turnos.length ? 'Sin asignación' : porcentaje === 100 ? 'Jornada completa' : 'Jornada parcial',
        tono: !turnos.length ? 'neutral' : porcentaje === 100 ? 'success' : 'info',
      };
    });
  });
  readonly diasAsignados = computed(() => this.dias().filter(dia => dia.turnos.length > 0).length);
  readonly minutosSemanales = computed(() => this.dias().reduce((total, dia) => total + dia.minutos, 0));
  readonly horasSemanales = computed(() => {
    const total = this.minutosSemanales();
    const horas = Math.floor(total / 60);
    const minutos = total % 60;
    return minutos ? `${horas} h ${String(minutos).padStart(2, '0')} min` : `${horas} h`;
  });

  private last = 0;
  constructor() {
    effect(() => {
      const id = this.uot.isGeneral() ? 0 : this.uot.selectedId() ?? 0;
      untracked(() => {
        if (id === this.last) return;
        this.last = id;
        this.datos.set(null);
        if (id) this.reload();
      });
    });
  }

  private aMinutos(value: string): number {
    const [h, m] = value.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  reload(): void {
    const id = this.uot.isGeneral() ? 0 : this.uot.selectedId() ?? 0;
    if (!id || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.mio(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: value => {
        if (id === (this.uot.isGeneral() ? 0 : this.uot.selectedId() ?? 0)) this.datos.set(value ?? null);
      },
      error: error => this.error.set(mapOpenApiError(error).message),
    });
  }
}
