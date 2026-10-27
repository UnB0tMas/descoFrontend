import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..', '..');

const configPath = resolve(
  projectRoot,
  'tools',
  'openapi',
  'openapi-generator-config.json',
);

const outputPath = resolve(
  projectRoot,
  'src',
  'app',
  'infrastructure',
  'openapi',
  'generated',
);

const cliPath = resolve(
  projectRoot,
  'node_modules',
  '@openapitools',
  'openapi-generator-cli',
  'main.js',
);

if (!existsSync(cliPath)) {
  throw new Error(
    [
      'No se encontró @openapitools/openapi-generator-cli.',
      '',
      'Ejecuta primero:',
      'npm install',
    ].join('\n'),
  );
}

if (existsSync(outputPath)) {
  rmSync(outputPath, {
    recursive: true,
    force: true,
  });
}

console.log('==============================================');
console.log(' DESCO - GENERACIÓN CLIENTE OPENAPI');
console.log('==============================================');
console.log(`Configuración : ${configPath}`);
console.log(`Salida        : ${outputPath}`);
console.log('');

try {
  execFileSync(
    process.execPath,
    [
      cliPath,
      'generate',
      '--config',
      configPath,
    ],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      windowsHide: false,
    },
  );
} catch (error) {
  console.error('');
  console.error('No se pudo generar el cliente OpenAPI.');

  if (error instanceof Error) {
    console.error(error.message);
  }

  process.exit(1);
}

if (!existsSync(outputPath)) {
  throw new Error(
    `OpenAPI Generator terminó, pero no se creó la carpeta esperada: ${outputPath}`,
  );
}

/*
 * Compatibilidad OpenAPI Generator:
 * Springdoc puede describir ApiResponse<Void> / ApiResponse<?> con un esquema
 * JSON null. Algunas versiones de typescript-angular generan imports a
 * "./null" pero omiten el archivo correspondiente. Se materializa el alias
 * únicamente cuando el generador no lo creó por sí mismo.
 */
const modelPath = resolve(outputPath, 'model');
const nullModelPath = resolve(modelPath, 'null.ts');

if (!existsSync(modelPath)) {
  mkdirSync(modelPath, { recursive: true });
}

if (!existsSync(nullModelPath)) {
  writeFileSync(
    nullModelPath,
    [
      '/**',
      ' * Compatibilidad para esquemas OpenAPI cuyo valor es JSON null.',
      ' * Archivo materializado automáticamente por tools/openapi/generate-api.mjs.',
      ' */',
      'export type Null = null;',
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`Compatibilidad Null: ${nullModelPath}`);
}

console.log('');
console.log('==============================================');
console.log(' OPENAPI GENERADO CORRECTAMENTE');
console.log('==============================================');
console.log(outputPath);
