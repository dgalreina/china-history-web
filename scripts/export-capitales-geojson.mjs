// Genera public/data/capitales.geojson a partir de los recintos curados a
// mano en el repo hermano china-history-api (ver
// china-history-api/data/capitales/README.md) — polígonos reales (recinto
// palaciego, etc.), a diferencia de los hitos (puntos con tolerancia de
// ±25 años), estos usan su rango de vigencia real, sin tolerancia añadida.
//
// Por cada recinto se exportan DOS features: el polígono real (tipo
// "recinto") y un punto en su centroide (tipo "punto") — el polígono es
// invisible con el mapa alejado (un recinto de unos cientos de metros no se
// ve a la escala de toda China), así que el punto es lo que avisa de que
// ahí hay un palacio antes de acercarse — ver MapView.tsx.
// Uso:
//   npm run export:capitales-geojson
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rutaCapitales = path.join(__dirname, '..', '..', 'china-history-api', 'data', 'capitales', 'capitales.json');
const salida = path.join(__dirname, '..', 'public', 'data', 'capitales.geojson');

const capitales = JSON.parse(await readFile(rutaCapitales, 'utf-8'));

// Centroide simple (media de los vértices del anillo exterior) — de sobra
// para un recinto compacto como este, no hace falta el centroide real del
// área (turf) para poner un punto orientativo.
function centroide(geometry) {
  const anillos = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0]);
  const puntos = anillos.flat();
  const [sumaLng, sumaLat] = puntos.reduce(([lng, lat], [pLng, pLat]) => [lng + pLng, lat + pLat], [0, 0]);
  return [Math.round((sumaLng / puntos.length) * 1000) / 1000, Math.round((sumaLat / puntos.length) * 1000) / 1000];
}

// "tipo" aquí es el ROL de la feature en el mapa (recinto/punto, ver
// MapView.tsx); "categoria" es el tipo de sitio en sí (palacio/templo,
// ver china-history-api data/capitales/README.md) — dos cosas distintas
// que comparten nombre corto por poco, cuidado al tocar esto.
const features = capitales.flatMap((c) => [
  {
    type: 'Feature',
    properties: { tipo: 'recinto', categoria: c.tipo, nombre: c.nombre, lugar: c.lugar, y0: c.y0, y1: c.y1 },
    geometry: c.geometry,
  },
  {
    type: 'Feature',
    properties: { tipo: 'punto', categoria: c.tipo, nombre: c.nombre, lugar: c.lugar, y0: c.y0, y1: c.y1 },
    geometry: { type: 'Point', coordinates: centroide(c.geometry) },
  },
]);

const geojson = { type: 'FeatureCollection', features };

await mkdir(path.dirname(salida), { recursive: true });
await writeFile(salida, JSON.stringify(geojson));

console.log(`${capitales.length} recinto(s) exportado(s) (${features.length} features) a ${salida}`);
