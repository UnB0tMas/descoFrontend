import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './service-unavailable.html',
  styleUrl: './service-unavailable.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceUnavailablePage {
  readonly title = 'Servicio no disponible';
  readonly message = 'No se pudo establecer comunicación con el servidor. Intenta nuevamente.';
}
