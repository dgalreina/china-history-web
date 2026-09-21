// Genera public/data/chgis-settlements.geojson a partir de los datos de CHGIS
// ya descargados y procesados en el repo hermano china-history-api (ver
// china-history-api/data/chgis/README.md) — mismos puntos que usa el Nodo A'
// para resolver el nombre histórico real de un lugar. Uso:
//   npm run export:chgis-geojson
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dirDatosApi = path.join(__dirname, '..', '..', 'china-history-api', 'data', 'chgis');
const salida = path.join(__dirname, '..', 'public', 'data', 'chgis-settlements.geojson');

async function cargarNivel(nombreArchivo, level) {
  const registros = JSON.parse(await readFile(path.join(dirDatosApi, nombreArchivo), 'utf-8'));
  return registros
    .filter((r) => typeof r.lng === 'number' && typeof r.lat === 'number')
    .map((r) => ({
      type: 'Feature',
      properties: { name: r.nameCh, py: r.namePy, level, y0: r.begYear, y1: r.endYear },
      geometry: { type: 'Point', coordinates: [Math.round(r.lng * 1000) / 1000, Math.round(r.lat * 1000) / 1000] },
    }));
}

const features = [...(await cargarNivel('county-points.json', 'county')), ...(await cargarNivel('prefecture-points.json', 'prefecture'))];

const geojson = { type: 'FeatureCollection', features };

await mkdir(path.dirname(salida), { recursive: true });
await writeFile(salida, JSON.stringify(geojson));

console.log(`${features.length} asentamientos exportados a ${salida}`);
