import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faIdCard, faLeaf, faPhone, faUser } from '@fortawesome/free-solid-svg-icons';
import { Productor } from '../../../../../domain/productor.model';
@Component({
    selector: 'app-productor-summary',
    standalone: true,
    imports: [FaIconComponent],
    templateUrl: './productor-summary.html',
    styleUrl: './productor-summary.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductorSummaryComponent {
    readonly productor = input.required<Productor>();
    readonly compact = input(false);
    readonly userIcon = faUser;
    readonly idIcon = faIdCard;
    readonly phoneIcon = faPhone;
    readonly leafIcon = faLeaf;
    fullName(): string {
        const value = this.productor();
        return [value.nombres, value.apellidoPaterno, value.apellidoMaterno].filter(Boolean).join(' ');
    }
}
