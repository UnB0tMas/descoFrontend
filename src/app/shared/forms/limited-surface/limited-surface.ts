/** Normaliza una superficie decimal y corrige el valor visible al escribir o pegar. */
export function superficieLimitada(
  event: Event,
  maximo: number | null,
  valorVacio: number | null = null,
  decimales = 2,
): number | null {
  const input = event.target as HTMLInputElement | null;
  if (!input) return valorVacio;

  const original = input.value.trim();
  if (original === '') {
    input.value = '';
    return valorVacio;
  }

  if (/[eE]/.test(original)) {
    input.value = '';
    return valorVacio;
  }
  const negativo = original.startsWith('-');
  let texto = original.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const punto = texto.indexOf('.');
  if (punto >= 0) {
    texto = texto.slice(0, punto + 1) + texto.slice(punto + 1).replace(/\./g, '').slice(0, decimales);
  }
  texto = texto.replace(/^0+(?=\d)/, '');
  if (texto.startsWith('.')) texto = `0${texto}`;
  if (texto === '' || texto === '.') {
    input.value = '';
    return valorVacio;
  }

  const numero = Number(texto);
  const limite = maximo !== null && Number.isFinite(maximo)
    ? Math.max(0, maximo)
    : 999999999999.99;
  const permitido = negativo ? 0 : Number.isFinite(numero)
    ? Math.min(Math.max(0, numero), limite)
    : limite;
  const valor = Math.round(permitido * 100) / 100;
  input.value = negativo || numero > limite || !Number.isFinite(numero)
    ? String(valor)
    : texto;
  return valor;
}
