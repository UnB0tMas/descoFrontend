
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBold, faItalic, faListUl } from '@fortawesome/free-solid-svg-icons';
import { richEditorToText, richTextToHtml } from '../../formatting/simple-rich-text';

/** Editor reutilizable. Muestra formato real y guarda solo texto con marcas simples. */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [FaIconComponent],
  styleUrl: './rich-text-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rich-compose">
      <div class="rich-compose__toolbar" role="toolbar" aria-label="Formato del mensaje">
        <button type="button" title="Negrita (Ctrl+B)" aria-label="Negrita" [disabled]="disabled"
          (pointerdown)="preserveSelection($event)" (click)="format('bold')">
          <fa-icon [icon]="boldIcon" />
        </button>
        <button type="button" title="Cursiva (Ctrl+I)" aria-label="Cursiva" [disabled]="disabled"
          (pointerdown)="preserveSelection($event)" (click)="format('italic')">
          <fa-icon [icon]="italicIcon" />
        </button>
        <span class="rich-compose__separator" aria-hidden="true"></span>
        <button type="button" title="Lista con viñetas" aria-label="Lista con viñetas" [disabled]="disabled"
          (pointerdown)="preserveSelection($event)" (click)="format('insertUnorderedList')">
          <fa-icon [icon]="listIcon" />
        </button>
      </div>
      <div #area class="rich-compose__area" role="textbox" aria-multiline="true"
        [attr.aria-label]="ariaLabel" [attr.data-placeholder]="placeholder"
        [attr.contenteditable]="disabled ? 'false' : 'true'" [attr.aria-disabled]="disabled"
        (input)="onInput()" (paste)="pastePlain($event)"
        (keyup)="captureSelection()" (mouseup)="captureSelection()"></div>
    </div>`,
})
export class RichTextEditorComponent {
  readonly boldIcon = faBold;
  readonly italicIcon = faItalic;
  readonly listIcon = faListUl;
  private area?: ElementRef<HTMLDivElement>;
  private currentValue = '';
  private lastSelection: Range | null = null;
  @ViewChild('area') set editor(value: ElementRef<HTMLDivElement> | undefined) {
    this.area = value;
    this.syncFromValue();
  }
  @Input() set value(next: string | null | undefined) {
    const normalized = next ?? '';
    if (normalized === this.currentValue) return;
    this.currentValue = normalized;
    this.syncFromValue();
  }
  @Input() disabled = false;
  @Input() maxLength = 3000;
  @Input() placeholder = 'Escribe tu mensaje…';
  @Input() ariaLabel = 'Mensaje';
  @Output() readonly valueChange = new EventEmitter<string>();

  private syncFromValue(): void {
    if (!this.area) return;
    this.area.nativeElement.innerHTML = this.currentValue ? richTextToHtml(this.currentValue) : '';
    this.lastSelection = null;
  }

  preserveSelection(event: PointerEvent): void { event.preventDefault(); }

  /** Guarda el cursor para recuperar la selección cuando el usuario pulsa la barra. */
  captureSelection(): void {
    const area = this.area?.nativeElement;
    const selection = document.getSelection();
    if (!area || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (area.contains(range.startContainer) && area.contains(range.endContainer)) {
      this.lastSelection = range.cloneRange();
    }
  }

  private restoreSelection(): Range {
    const area = this.area!.nativeElement;
    const selection = document.getSelection();
    const active = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const inside = (range: Range | null): range is Range => !!range
      && area.contains(range.startContainer) && area.contains(range.endContainer);
    const range = inside(active) ? active : inside(this.lastSelection) ? this.lastSelection : document.createRange();
    if (!inside(active) && !inside(this.lastSelection)) {
      range.selectNodeContents(area);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range;
  }

  private blockAt(node: Node, offset: number): Node | null {
    const area = this.area!.nativeElement;
    let current: Node | null = node;
    if (current === area) {
      const items = area.childNodes;
      current = items.length ? items[Math.max(0, Math.min(offset - 1, items.length - 1))] : null;
    }
    while (current && current.parentNode !== area) current = current.parentNode;
    return current?.parentNode === area ? current : null;
  }

  private moveCaretTo(node: Node): void {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.lastSelection = range.cloneRange();
  }

  /** Cambia párrafos por una lista real, sin depender de execCommand (puede ignorar el clic). */
  private toggleBullets(): void {
    const area = this.area!.nativeElement;
    const range = this.restoreSelection();
    const start = this.blockAt(range.startContainer, range.startOffset);
    const end = this.blockAt(range.endContainer, range.endOffset);
    const blocks: Node[] = [];
    if (start) {
      let current: Node | null = start;
      while (current) {
        blocks.push(current);
        if (current === end || blocks.length >= area.childNodes.length) break;
        current = current.nextSibling;
      }
    }

    const existing = blocks.find(node => node.nodeType === Node.ELEMENT_NODE
      && (node as Element).tagName === 'UL') as HTMLUListElement | undefined;
    if (existing) {
      const paragraphs: HTMLParagraphElement[] = [];
      for (const item of Array.from(existing.children)) {
        if (item.tagName !== 'LI') continue;
        const paragraph = document.createElement('p');
        while (item.firstChild) paragraph.appendChild(item.firstChild);
        if (!paragraph.hasChildNodes()) paragraph.appendChild(document.createElement('br'));
        paragraphs.push(paragraph);
      }
      existing.replaceWith(...paragraphs);
      this.moveCaretTo(paragraphs[0] ?? area);
      return;
    }

    const list = document.createElement('ul');
    for (const block of blocks) {
      const item = document.createElement('li');
      if (block.nodeType === Node.ELEMENT_NODE
        && (block as Element).tagName.match(/^(P|DIV)$/)) {
        while (block.firstChild) item.appendChild(block.firstChild);
      } else if (block.nodeType === Node.TEXT_NODE) {
        item.textContent = block.textContent;
      } else if (block.nodeType === Node.ELEMENT_NODE && (block as Element).tagName === 'BR') {
        item.appendChild(document.createElement('br'));
      } else {
        while (block.firstChild) item.appendChild(block.firstChild);
      }
      if (!item.hasChildNodes()) item.appendChild(document.createElement('br'));
      list.appendChild(item);
    }
    if (!list.hasChildNodes()) {
      const item = document.createElement('li');
      item.appendChild(document.createElement('br'));
      list.appendChild(item);
      area.appendChild(list);
    } else {
      area.insertBefore(list, blocks[0]);
      blocks.forEach(node => node.parentNode?.removeChild(node));
    }
    this.moveCaretTo(list.lastElementChild ?? list);
  }

  format(command: 'bold' | 'italic' | 'insertUnorderedList'): void {
    if (this.disabled || !this.area) return;
    this.area.nativeElement.focus();
    this.restoreSelection();
    if (command === 'insertUnorderedList') {
      const before = richEditorToText(this.area.nativeElement);
      this.toggleBullets();
      let after = richEditorToText(this.area.nativeElement);
      // Al pulsar sin selección algunos navegadores restauran el mismo contenido.
      // En tal caso inserta una viñeta en el texto serializado y vuelve a pintar la lista.
      if (after === before && !before.startsWith('- ')) {
        const lines = before.split('\n');
        const last = lines.pop() ?? '';
        after = [...lines, `- ${last}`].join('\n');
        this.currentValue = after;
        this.syncFromValue();
        const list = this.area.nativeElement.querySelector('ul:last-of-type li:last-child');
        if (list) this.moveCaretTo(list);
      }
      this.area.nativeElement.focus();
    } else {
      document.execCommand(command, false);
    }
    this.onInput();
  }

  pastePlain(event: ClipboardEvent): void {
    if (this.disabled) return;
    event.preventDefault();
    const plain = event.clipboardData?.getData('text/plain') ?? '';
    if (!plain) return;
    const remaining = this.maxLength - this.currentValue.length;
    if (remaining <= 0) return;
    const allowed = plain.slice(0, remaining);
    document.execCommand('insertText', false, allowed);
    this.onInput();
  }

  onInput(): void {
    if (!this.area || this.disabled) return;
    const next = richEditorToText(this.area.nativeElement);
    if (next.length > this.maxLength) {
      this.syncFromValue();
      return;
    }
    this.currentValue = next;
    this.valueChange.emit(next);
    this.captureSelection();
  }
}

