import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { Titularidad } from '../../../../../domain/titularidad.model';
@Component({ selector: 'app-titularidad-panel', standalone: true, imports: [DecimalPipe, FaIconComponent], templateUrl: './titularidad-panel.html', styleUrl: './titularidad-panel.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class TitularidadPanelComponent {
    @Input()
    titulares: readonly Titularidad[] = [];
    readonly icon = faUserGroup;
    fullName(t: Titularidad) { return [t.nombres, t.apellidoPaterno, t.apellidoMaterno].filter(Boolean).join(' '); }
}
