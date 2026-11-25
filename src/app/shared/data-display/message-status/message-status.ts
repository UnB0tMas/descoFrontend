import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Etiqueta reutilizable para estados; no contiene reglas de negocio. */
@Component({
  selector:'app-message-status',standalone:true,
  template:`<span class="desco-message-status" [attr.aria-label]="label">{{label}}</span>`,
  styles:[`:host{display:inline-flex;min-width:0}
    .desco-message-status{display:inline-flex;align-items:center;max-width:100%;
      padding:.2rem .55rem;border:1px solid var(--desco-border);border-radius:.5rem;
      font:inherit;font-size:.8125rem;font-weight:550;line-height:1.35;
      overflow-wrap:anywhere;color:var(--desco-text);background:var(--desco-surface)}`],
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class MessageStatusComponent {
  @Input({required:true}) label='';
}
