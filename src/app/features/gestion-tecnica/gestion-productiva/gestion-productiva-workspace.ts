import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Contenedor de lectura. Los listados y cada modal tienen permisos propios. */
@Component({
  selector: 'app-gestion-productiva-workspace',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './gestion-productiva-workspace.html',
  styleUrl: './gestion-productiva-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaWorkspace {}
