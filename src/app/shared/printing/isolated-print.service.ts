import { Injectable } from '@angular/core';

/** Imprime únicamente el elemento solicitado, sin navegación, modales ni barras de la aplicación. */
@Injectable({ providedIn: 'root' })
export class IsolatedPrintService {
  printElement(source: HTMLElement, pageWidthMm = 80): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.title = 'Impresión de comprobante';
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:80mm;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(frame);

    const output = frame.contentDocument;
    if (!output || !frame.contentWindow) {
      frame.remove();
      return;
    }
    output.open();
    output.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante</title></head><body></body></html>');
    output.close();
    output.body.style.cssText = 'margin:0;padding:0;background:#fff;color:#000';

    const copy = source.cloneNode(true) as HTMLElement;
    const originals = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
    const copies = [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))];
    originals.forEach((node, index) => {
      const computed = getComputedStyle(node);
      const target = copies[index];
      if (!target) return;
      // Copiar la apariencia efectiva evita depender de las reglas @media print de Angular.
      for (let i = 0; i < computed.length; i++) {
        const property = computed.item(i);
        if (!property.startsWith('--')) target.style.setProperty(property, computed.getPropertyValue(property));
      }
    });
    copy.style.width = `${pageWidthMm}mm`;
    copy.style.maxWidth = `${pageWidthMm}mm`;
    copy.style.boxSizing = 'border-box';
    copy.style.height = 'auto';
    copy.style.minHeight = '0';
    copy.style.margin = '0';
    copy.style.padding = '3mm 4mm 4mm';
    copy.style.boxShadow = 'none';
    copy.style.border = '0';
    copy.style.borderRadius = '0';
    copy.style.overflow = 'visible';
    output.body.appendChild(copy);

    const pageStyle = output.createElement('style');
    pageStyle.textContent = 'html,body{margin:0;padding:0}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}';
    output.head.appendChild(pageStyle);

    let removed = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      if (fallback) clearTimeout(fallback);
      frame.contentWindow?.removeEventListener('afterprint', onPrinted);
      window.removeEventListener('afterprint', onPrinted);
      frame.remove();
    };
    const onPrinted = () => setTimeout(cleanup, 300);
    frame.contentWindow.addEventListener('afterprint', onPrinted);
    window.addEventListener('afterprint', onPrinted);
    fallback = setTimeout(cleanup, 90_000);

    void (async () => {
      const images = Array.from(output.images);
      await Promise.all(images.map(image => image.decode().catch(() => undefined)));
      await output.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (removed || !frame.contentWindow) return;
      // Página térmica con la altura del ticket para evitar hojas A4 y cortes vacíos.
      const pixels = Math.max(copy.scrollHeight, Math.ceil(copy.getBoundingClientRect().height));
      const heightMm = Math.max(55, Math.min(1100, Math.ceil(pixels * 25.4 / 96) + 5));
      pageStyle.textContent += `@page{size:${pageWidthMm}mm ${heightMm}mm;margin:0}`;
      frame.contentWindow.focus();
      frame.contentWindow.print();
    })().catch(cleanup);
  }
}
