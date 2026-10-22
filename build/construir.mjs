/* Compila los marcadores y la página de instalación.
   Uso:  node build/construir.mjs      (desde la raíz del repositorio) */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => join(raiz, ...p);

const escapar = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* El marcador va en la URL de un favorito: solo hay que escapar el %,
   porque el navegador lo interpreta como escape de porcentaje. */
const aMarcador = js => 'javascript:' + js.replace(/%/g, '%25');

async function compilar(fuente, salidaMin, salidaTxt) {
  const codigo = readFileSync(r(fuente), 'utf8');
  const { code, error } = await minify(codigo, {
    compress: true,
    mangle: true,
    format: { ascii_only: true },
  });
  if (error) throw error;
  const min = code.trim();
  writeFileSync(r(salidaMin), min);
  const marcador = aMarcador(min);
  writeFileSync(r(salidaTxt), marcador);
  console.log(salidaTxt.padEnd(34), marcador.length.toLocaleString('es-SV'), 'caracteres');
  return min;
}

const panel = await compilar('src/n1-atajos.js', 'dist/n1-atajos.min.js', 'dist/atajos-n1.marcador.txt');
await compilar('src/cita-sdp.js', 'dist/cita-sdp.min.js', 'dist/cita-sdp.marcador.txt');

/* La página de instalación lleva el marcador dos veces: en el href del botón que se
   arrastra (codificado) y en el cuadro de texto para copiarlo a mano (tal cual). */
const plantilla = readFileSync(r('build/instalar.tpl.html'), 'utf8');
const html = plantilla
  .replace('__BOOKMARKLET__', () => 'javascript:' + encodeURIComponent(panel))
  .replace('__RAW__', () => escapar(aMarcador(panel)));
writeFileSync(r('instalar.html'), html);
console.log('instalar.html'.padEnd(34), 'listo');
