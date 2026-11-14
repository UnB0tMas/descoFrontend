// DESCO - Correctivo real NG8113: modifica SOLO GpIncidenciasPanel.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.resolve(__dirname, '..');
const archivo = path.join(frontend, 'src', 'app', 'features', 'gestion-tecnica', 'gestion-productiva', 'gp-incidencias-panel.ts');

function quitarUnico(nombre, elementos) {
  const partes = elementos.split(',');
  const indices = partes.map((parte, i) => parte.trim() === nombre ? i : -1).filter(i => i !== -1);
  if (indices.length !== 1) {
    throw new Error(`Se esperaba una sola entrada ${nombre}; encontradas ${indices.length}. No se aplicaron cambios.`);
  }
  partes.splice(indices[0], 1);
  return partes.join(',');
}

function ejecutar() {
  if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) {
    throw new Error(`No existe el archivo real: ${archivo}`);
  }
  const bytes = fs.readFileSync(archivo);
  const codigoOriginal = bytes.toString('utf8');
  if (!Buffer.from(codigoOriginal, 'utf8').equals(bytes)) {
    throw new Error('El archivo no es UTF-8. No se modifico nada.');
  }

  const patron = /(@Component\s*\(\s*\{[\s\S]*?\bimports\s*:\s*\[)([^\]]*)(\])/g;
  const coincidencias = [...codigoOriginal.matchAll(patron)];
  if (coincidencias.length !== 1) {
    throw new Error(`Se esperaba un unico @Component.imports; encontrados ${coincidencias.length}. Sin cambios.`);
  }
  const match = coincidencias[0];
  const lista = match[2];
  const count = lista.split(',').filter(x => x.trim() === 'DatePipe').length;
  if (count === 0) {
    console.log('OK: DatePipe ya no esta en @Component.imports. Sin modificaciones.');
    return;
  }
  if (count !== 1) {
    throw new Error(`DatePipe figura ${count} veces en @Component.imports. Sin cambios.`);
  }

  const inicio = match.index + match[1].length;
  let nuevo = codigoOriginal.slice(0, inicio) + quitarUnico('DatePipe', lista) + codigoOriginal.slice(inicio + lista.length);

  // Si el simbolo no se usa fuera de @angular/common, quitar tambien su import TypeScript.
  const patronImport = /\bimport\s*\{([^{}]*)\}\s*from\s*(['"])@angular\/common\2\s*;?/g;
  const sinImportCommon = nuevo.replace(patronImport, '');
  if (!/\bDatePipe\b/.test(sinImportCommon)) {
    nuevo = nuevo.replace(patronImport, (declaracion, nombres) => {
      const partes = nombres.split(',');
      const indices = partes.map((parte, i) => parte.trim() === 'DatePipe' ? i : -1).filter(i => i !== -1);
      if (!indices.length) return declaracion;
      if (indices.length !== 1) throw new Error('Import DatePipe duplicado. Sin cambios.');
      partes.splice(indices[0], 1);
      if (!partes.some(x => x.trim())) return '';
      return declaracion.replace(nombres, partes.join(','));
    });
  }

  const comprobacion = [...nuevo.matchAll(patron)];
  if (comprobacion.length !== 1 || comprobacion[0][2].split(',').some(x => x.trim() === 'DatePipe')) {
    throw new Error('Verificacion final fallida. No se guardo ningun cambio.');
  }
  if (nuevo === codigoOriginal) throw new Error('El cambio no se aplico en memoria.');

  const dir = path.join(frontend, '.desco_backups', 'ng8113');
  fs.mkdirSync(dir, { recursive: true });
  const carpetaBackup = fs.mkdtempSync(path.join(dir, 'original_'));
  const backup = path.join(carpetaBackup, 'gp-incidencias-panel.ts');
  fs.copyFileSync(archivo, backup, fs.constants.COPYFILE_EXCL);
  const temporal = `${archivo}.ng8113.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporal, nuevo, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporal, archivo);
  } finally {
    if (fs.existsSync(temporal)) fs.unlinkSync(temporal);
  }
  const grabado = fs.readFileSync(archivo, 'utf8');
  const valido = [...grabado.matchAll(patron)];
  if (valido.length !== 1 || valido[0][2].split(',').some(x => x.trim() === 'DatePipe')) {
    throw new Error(`Archivo escrito, pero no supero la verificacion. Restaurar respaldo: ${backup}`);
  }
  console.log('CORREGIDO: NG8113 eliminado del componente real.');
  console.log(`Archivo modificado: ${archivo}`);
  console.log(`Respaldo: ${backup}`);
}

try { ejecutar(); } catch (e) { console.error(`ERROR NG8113: ${e.message}`); process.exitCode = 1; }
