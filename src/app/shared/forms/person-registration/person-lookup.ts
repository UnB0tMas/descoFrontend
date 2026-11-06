import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

export interface PersonDocumentOption { value: string; label: string; }

@Component({
  selector: 'app-person-lookup', standalone: true,
  templateUrl: './person-lookup.html', styleUrl: './person-lookup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonLookupComponent {
  @ViewChild('numberInput') private numberInput?: ElementRef<HTMLInputElement>;
  @Input() compact = false;
  @Input() showManualAction = true;
  @Input() idPrefix = 'person';
  @Input() documentTypes: readonly PersonDocumentOption[] = [];
  @Input() documentType = 'DNI';
  @Input() documentNumber = '';
  @Input() maxLength = 8;
  @Input() inputMode: 'numeric' | 'text' = 'numeric';
  @Input() canSearch = false;
  @Input() searching = false;
  @Input() disabled = false;
  @Input() message: string | null = null;
  @Output() readonly documentTypeChange = new EventEmitter<string>();
  @Output() readonly documentNumberChange = new EventEmitter<string>();
  @Output() readonly searchRequested = new EventEmitter<void>();
  @Output() readonly manualRequested = new EventEmitter<void>();
  focusDocument(): void { this.numberInput?.nativeElement.focus(); }
}
