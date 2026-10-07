// Genera public/data/yacimientos.geojson a partir de china-history-api/data/
// yacimientos/yacimientos.json — marcadores sin recinto real (estado/
// entierro/fundicion/residencial, ver Yacimiento en historical-agent.
// service.ts), paralelo a export-capitales-geojson.mjs pero sin polígonos:
// todos son Point. Sin tolerancia de año añadida, igual que capitales.
// Uso:
//   npm run export:yacimientos-geojson
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rutaYacimientos = path.join(__dirname, '..', '..', 'china-history-api', 'data', 'yacimientos', 'yacimientos.json');
const salida = path.join(__dirname, '..', 'public', 'data', 'yacimientos.geojson');

const yacimientos = JSON.parse(await readFile(rutaYacimientos, 'utf-8'));

// Nombre corto para la etiqueta de texto en el mapa (ver MapView.tsx, capa
// yacimientos-punto) — solo 'estado' lleva prefijo largo ("Estado de
// Qin"/"State of Qin"/"秦国"+sufijo genérico); entierro/fundicion/
// residencial ya tienen el nombre del yacimiento tal cual.
function etiquetaCorta(nombre, categoria, idioma) {
  if (categoria !== 'estado') return nombre;
  if (idioma === 'zh') return nombre.replace(/国$/, '');
  return nombre
    .replace(/^(Estado de|State of)\s+/i, '')
    .replace(/\s*\(dominio real\)\s*/i, '')
    .trim();
}

const features = yacimientos.map((y) => ({
  type: 'Feature',
  properties: {
    categoria: y.tipo,
    nombre: y.nombre,
    lugar: y.lugar,
    y0: y.y0,
    y1: y.y1,
    etiqueta: etiquetaCorta(y.nombre, y.tipo, 'es'),
    etiqueta_en: etiquetaCorta(y.nombre_en, y.tipo, 'en'),
    etiqueta_zh: etiquetaCorta(y.nombre_zh, y.tipo, 'zh'),
  },
  geometry: y.geometry,
}));

const geojson = { type: 'FeatureCollection', features };

await mkdir(path.dirname(salida), { recursive: true });
await writeFile(salida, JSON.stringify(geojson));

console.log(`${yacimientos.length} yacimiento(s) exportado(s) a ${salida}`);
