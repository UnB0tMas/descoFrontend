/** Formato de texto seguro y limitado: negrita, cursiva y viñetas. Almacenamiento en texto. */
const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function inlineHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
}

/** Nunca interpreta HTML de entrada: todo texto se escapa antes de aplicar el formato permitido. */
export function richTextToHtml(value: string | null | undefined): string {
  const lines = (value ?? '').replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let list: string[] = [];
  const closeList = (): void => {
    if (list.length) { output.push(`<ul>${list.join('')}</ul>`); list = []; }
  };
  for (const line of lines) {
    const match = /^\s*- (.*)$/.exec(line);
    if (match) {
      list.push(`<li>${inlineHtml(match[1]) || '<br>'}</li>`);
    } else {
      closeList();
      output.push(line ? `<p>${inlineHtml(line)}</p>` : '<p><br></p>');
    }
  }
  closeList();
  return output.join('');
}

/** Extrae exclusivamente texto y etiquetas de formato admitidas del editor. */
export function richEditorToText(root: HTMLElement): string {
  const children = (node: Node): string => Array.from(node.childNodes).map(visit).join('');
  const visit = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\u00a0/g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const name = (node as Element).tagName.toUpperCase();
    if (name === 'BR') return '\n';
    if (name === 'UL') return Array.from(node.childNodes)
      .filter(child => child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === 'LI')
      .map(item => `- ${children(item).trim()}`).join('\n') + '\n';
    if (name === 'OL') return children(node);
    if (name === 'B' || name === 'STRONG') {
      const inner = children(node); return inner ? `**${inner}**` : '';
    }
    if (name === 'I' || name === 'EM') {
      const inner = children(node); return inner ? `_${inner}_` : '';
    }
    const inner = children(node);
    if (name === 'P' || name === 'DIV' || name === 'LI') return `${inner}\n`;
    return inner;
  };
  // Conserva el espacio final de "- " para que una viñeta vacía siga siendo una lista.
  return children(root).replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '').replace(/\n+$/, '');
}

export function richTextExcerpt(value: string): string {
  return value.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/_([^_]+)_/g, '$1')
    .replace(/(^|\n)\s*- /g, '$1• ').replace(/\s+/g, ' ').trim();
}
