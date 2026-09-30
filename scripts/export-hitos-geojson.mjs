// Genera public/data/hitos.geojson a partir de los hitos extraídos del
// libro en el repo hermano china-history-api (ver
// china-history-api/scripts/extract-hitos.mjs) — puntos que el mapa muestra
// de antemano, antes de que el usuario haga clic (ver MapView.tsx). Uso:
//   npm run export:hitos-geojson
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rutaHitos = path.join(__dirname, '..', '..', 'china-history-api', 'data', 'hitos', 'hitos.json');
const salida = path.join(__dirname, '..', 'public', 'data', 'hitos.geojson');

// Tolerancia de año para que un hito siga apareciendo en el mapa aunque el
// slider no esté en el año exacto — mismo mecanismo de filtro (y0/y1) que ya
// usan las capas de CHGIS en MapView.tsx.
const TOLERANCIA_AÑOS = 25;

const hitos = JSON.parse(await readFile(rutaHitos, 'utf-8'));

const features = hitos.map((h) => ({
  type: 'Feature',
  properties: {
    // Id estable por contenido (ver china-history-api/scripts/extract-hitos.mjs)
    // — permite pedir exactamente este hito al backend (?hitoId=) al
    // pulsarlo, sin depender de coordenadas/año que pueden empatar con
    // otro hito casi en el mismo punto (ver BuscadorHitos.tsx, MapView.tsx).
    id: h.id,
    titulo: h.titulo,
    lugar: h.lugar,
    descripcion: h.descripcion,
    // Traducciones en batch (ver china-history-api/scripts/translate-hitos.mjs)
    // — un hito sin traducir cae a los campos en español de arriba (ver
    // BuscadorHitos.tsx).
    titulo_en: h.titulo_en,
    lugar_en: h.lugar_en,
    titulo_zh: h.titulo_zh,
    lugar_zh: h.lugar_zh,
    year: h.año,
    y0: h.año - TOLERANCIA_AÑOS,
    y1: h.año + TOLERANCIA_AÑOS,
  },
  geometry: { type: 'Point', coordinates: [Math.round(h.lng * 1000) / 1000, Math.round(h.lat * 1000) / 1000] },
}));

const geojson = { type: 'FeatureCollection', features };

await mkdir(path.dirname(salida), { recursive: true });
await writeFile(salida, JSON.stringify(geojson));

console.log(`${features.length} hitos exportados a ${salida}`);
