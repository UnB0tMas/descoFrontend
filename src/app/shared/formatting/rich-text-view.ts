import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { richTextToHtml } from './simple-rich-text';

/** Visualización segura del mismo formato usado por el editor. Angular sanitiza innerHTML. */
@Component({
  selector: 'app-rich-text-view',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="desco-rich-view" [innerHTML]="html"></div>`,
  styles: [`
    .desco-rich-view { overflow-wrap: anywhere; line-height: 1.6; }
    .desco-rich-view p { margin: 0; white-space: pre-wrap; }
    .desco-rich-view ul { margin: .3rem 0; padding-left: 1.4rem; list-style: disc; }
    .desco-rich-view li { margin: .1rem 0; }
  `],
})
export class RichTextViewComponent {
  html = '';
  @Input() set value(value: string | null | undefined) {
    this.html = richTextToHtml(value);
  }
}
