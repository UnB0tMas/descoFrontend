import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject } from '@angular/core';

/** Selector genérico, sin dependencias del módulo que proporciona las personas. */
export interface RecipientOption {
  id: number;
  label: string;
  detail?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-recipient-picker',
  standalone: true,
  template: `
    <div class="recipient-picker" [class.recipient-picker--disabled]="disabled" role="group" [attr.aria-label]="label">
      <span class="recipient-picker__label">{{ label }}</span>
      <div class="recipient-picker__entry">
        @for (item of selectedOptions; track item.id) {
          <span class="recipient-picker__chip" [title]="item.label">
            <span>{{ item.label }}</span>
            <button type="button" [disabled]="disabled" [attr.aria-label]="'Quitar ' + item.label"
              (click)="remove.emit(item.id)">×</button>
          </span>
        }
        @if (showSearchInput) {
          <input #searchInput type="search" role="combobox" autocomplete="off" aria-autocomplete="list"
            [attr.aria-expanded]="expanded" [attr.aria-label]="placeholder"
            [placeholder]="selected.length ? 'Buscar destinatario' : placeholder"
            [value]="query" [disabled]="disabled || busy || selected.length >= maxItems"
            (focus)="expanded = true" (input)="onSearch($any($event.target).value)"
            (keydown)="onKeydown($event)" />
        } @else if (selected.length < maxItems) {
          <button class="recipient-picker__add" type="button" title="Añadir destinatario"
            aria-label="Añadir destinatario" [disabled]="disabled || busy" (click)="startAdding()">+</button>
        }
      </div>
      @if (expanded && !disabled && !busy && selected.length < maxItems) {
        <div class="recipient-picker__menu" role="listbox" [attr.aria-label]="label">
          @for (item of matches; track item.id; let i = $index) {
            <button type="button" role="option" class="recipient-picker__option"
              [class.recipient-picker__option--active]="i === activeIndex"
              [attr.aria-selected]="i === activeIndex" [disabled]="item.disabled"
              (pointerdown)="$event.preventDefault()" (click)="select(item)">
              <span>{{ item.label }}</span>
              @if (item.detail) { <small>{{ item.detail }}</small> }
            </button>
          } @empty {
            <p class="recipient-picker__empty">Sin resultados</p>
          }
        </div>
      }
      @if (busy) { <span class="recipient-picker__status">Buscando destinatarios…</span> }
    </div>`,
  styleUrl: './recipient-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipientPickerComponent {
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef);
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  @Input() label = 'Para';
  @Input() placeholder = 'Buscar por nombre o usuario';
  @Input() options: RecipientOption[] = [];
  @Input() selected: number[] = [];
  @Input() maxItems = 50;
  @Input() maxSuggestions = 100;
  /** Oculta la búsqueda tras cada selección; el botón + permite añadir el siguiente. */
  @Input() collapseInputAfterAdd = false;
  @Input() disabled = false;
  @Input() busy = false;
  @Output() readonly add = new EventEmitter<number>();
  @Output() readonly remove = new EventEmitter<number>();

  query = '';
  expanded = false;
  activeIndex = 0;
  private adding = false;

  get showSearchInput(): boolean {
    return !this.collapseInputAfterAdd || this.selected.length === 0 || this.adding;
  }

  startAdding(): void {
    if (this.disabled || this.busy || this.selected.length >= this.maxItems) return;
    this.adding = true;
    this.expanded = true;
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }

  get selectedOptions(): RecipientOption[] {
    return this.selected.map(id => this.options.find(option => option.id === id) ?? { id, label: 'Destinatario' });
  }

  get matches(): RecipientOption[] {
    const normalize = (value: string): string => value.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const search = normalize(this.query.trim());
    return this.options.filter(option => !this.selected.includes(option.id)
      && (!search || normalize(`${option.label} ${option.detail ?? ''}`).includes(search))).slice(0, this.maxSuggestions);
  }

  onSearch(value: string): void {
    this.query = value;
    this.expanded = true;
    this.activeIndex = 0;
  }

  select(item: RecipientOption): void {
    if (item.disabled || this.disabled || this.busy || this.selected.includes(item.id)
      || this.selected.length >= this.maxItems) return;
    this.add.emit(item.id);
    this.query = '';
    this.activeIndex = 0;
    this.expanded = false;
    if (this.collapseInputAfterAdd) this.adding = false;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.expanded = false;
      if (this.collapseInputAfterAdd && this.selected.length > 0) {
        this.query = '';
        this.adding = false;
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.expanded = true;
      const length = this.matches.length;
      if (length) this.activeIndex = (this.activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + length) % length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.expanded) { this.expanded = true; return; }
      const current = this.matches[this.activeIndex];
      if (current && !current.disabled) this.select(current);
    } else if (event.key === 'Backspace' && !this.query && this.selected.length) {
      this.remove.emit(this.selected[this.selected.length - 1]);
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onOutsideClick(event: PointerEvent): void {
    if (!this.root.nativeElement.contains(event.target as Node)) {
      this.expanded = false;
      if (this.collapseInputAfterAdd && this.selected.length && !this.query.trim()) this.adding = false;
    }
  }
}
