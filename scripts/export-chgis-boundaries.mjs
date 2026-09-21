// Genera public/data/chgis-boundaries.geojson a partir del shapefile crudo
// de CHGIS v6 "Time Series Prefecture Polygons" (Harvard Dataverse, DOI
// 10.7910/DVN/I0Q7SM, archivo v6_time_pref_pgn_utf_wgs84.zip) — mismo
// proyecto y convención de campos que los puntos de asentamientos
// (china-history-api/data/chgis/README.md), pero con fronteras en vez de
// posiciones. Cobertura real: 1350-1911 casi completa, huecos entre
// 221 a.C. y 1350 (documentado por CHGIS, no es un bug de este script).
//
// El shapefile crudo (~100MB descomprimido) NO se comitea — hay que
// descargarlo a mano una vez en china-history-api/data/chgis-polygons-raw/
// (gitignored) antes de correr este script:
//   1. https://dataverse.harvard.edu/api/access/datafile/2966510
//      (= v6_time_pref_pgn_utf_wgs84.zip del dataset doi:10.7910/DVN/I0Q7SM)
//   2. Descomprimir ahí mismo (misma carpeta, junto al .shp/.dbf/etc.)
//
// mapshaper hace en un solo paso: shapefile → GeoJSON, simplifica la
// geometría (los polígonos originales traen 500+ vértices cada uno — con
// 3830 features sin simplificar el archivo pesa decenas de MB) y recorta
// las propiedades a lo mínimo que hace falta en el mapa.
//
// Uso: npm run export:chgis-boundaries
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shpPath = path.join(__dirname, '..', '..', 'china-history-api', 'data', 'chgis-polygons-raw', 'v6_time_pref_pgn_utf_wgs84.shp');
const salida = path.join(__dirname, '..', 'public', 'data', 'chgis-boundaries.geojson');

if (!existsSync(shpPath)) {
  console.error(`No se encuentra el shapefile crudo en ${shpPath}.\nDescárgalo primero (ver el comentario al principio de este script).`);
  process.exit(1);
}

execFileSync(
  'npx',
  [
    'mapshaper',
    '-i', shpPath, 'encoding=utf8',
    '-simplify', '5%', 'keep-shapes',
    '-filter-fields', 'NAME_CH,NAME_PY,BEG_YR,END_YR',
    '-rename-fields', 'name=NAME_CH,py=NAME_PY,y0=BEG_YR,y1=END_YR',
    '-o', 'format=geojson', 'precision=0.001', salida,
  ],
  { stdio: 'inherit', shell: true },
);

console.log(`Fronteras exportadas a ${salida}`);
