import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faClipboardCheck, faEye } from '@fortawesome/free-solid-svg-icons';
import { ModalShellComponent } from '../modal-shell/modal-shell';
import { AppButtonComponent } from '../../actions/app-button/app-button';
import { StatusBadgeComponent, StatusBadgeTone } from '../../data-display/status-badge/status-badge';

export interface DecisionOption {
  value: string;
  label: string;
  requiresReason?: boolean;
  help?: string;
  danger?: boolean;
}
export interface DecisionSubmission { decision: string; reason: string; }

/** Presentación reutilizable; el consumidor define opciones, permisos y persistencia. */
@Component({
  selector: 'app-decision-modal', standalone: true,
  imports: [FormsModule, RouterLink, FaIconComponent, ModalShellComponent, AppButtonComponent, StatusBadgeComponent],
  templateUrl: './decision-modal.html', styleUrl: './decision-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecisionModalComponent {
  @ViewChild(ModalShellComponent, {static: true}) private shell!: ModalShellComponent;
  private readonly cdr = inject(ChangeDetectorRef);
  @Input() title = 'Decidir solicitud';
  @Input() eyebrow = '';
  @Input() icon: IconDefinition = faClipboardCheck;
  @Input() statusLabel = '';
  @Input() statusTone: StatusBadgeTone = 'neutral';
  @Input() options: readonly DecisionOption[] = [];
  @Input() busy = false;
  @Input() error: string | null = null;
  @Input() note = '';
  @Input() detailRoute: (string | number)[] | null = null;
  @Input() detailParams: Record<string, string | number | null> = {};
  @Input() detailLabel = 'Consultar ficha';
  @Output() readonly submitted = new EventEmitter<DecisionSubmission>();
  @Output() readonly changed = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();
  readonly viewIcon = faEye;
  decision: string | null = null;
  reason = '';
  get selected(): DecisionOption | undefined { return this.options.find(option => option.value === this.decision); }
  get valid(): boolean {
    const option = this.selected;
    return !this.busy && !!option && (!option.requiresReason || !!this.reason.trim()) && this.reason.length <= 1200;
  }
  open(): void {
    this.decision = null;
    this.reason = '';
    this.cdr.markForCheck();
    this.shell.open();
  }
  close(force = false): void { this.shell.close(force); }
  select(value: string | null): void {
    this.decision = value;
    this.reason = '';
    this.changed.emit();
  }
  confirm(): void {
    const option = this.selected;
    if (!option || !this.valid) return;
    this.submitted.emit({decision: option.value, reason: option.requiresReason ? this.reason.trim() : ''});
  }
}
