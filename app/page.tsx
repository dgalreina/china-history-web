'use client';
import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import DynastyTimeline, { formatYear, segmentAt } from './components/DynastyTimeline';
import ResultCard, { type Result } from './components/ResultCard';

const API_URL = 'http://localhost:4000';

// El backend aún no está desplegado (para no pagar por algo que todavía no
// hace nada real). Mientras tanto no lo llamamos: se simula una respuesta
// con el año y la dinastía reales del slider, para poder pulir el frontend
// como si viniera del backend.
const BACKEND_ENABLED = false;

// Geocodificación inversa de Mapbox (mismo token del mapa, no es nuestro
// backend) solo para poner un nombre de lugar real en la tarjeta simulada
// mientras no tenemos CHGIS para resolver el asentamiento histórico.
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&language=es&access_token=${token}`,
    );
    const data = await res.json();
    return data?.features?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

function mockResult(year: number, placeName: string | null) {
  const dynasty = segmentAt(year);
  return {
    lugar: placeName ?? 'Zona sin ciudad cercana',
    año: formatYear(year),
    contexto_ambiental: `Texto de ejemplo: así se describiría la vida cotidiana de esta zona durante la dinastía ${dynasty.label} (${dynasty.hanzi}).`,
    hito: {
      existe: true,
      descripcion: `Hito de ejemplo asociado a la dinastía ${dynasty.label}`,
      fiabilidad: 'media',
    },
    imagen_url: null,
  };
}

export default function Home() {
  const [year, setYear] = useState(1900);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!BACKEND_ENABLED) {
      setNotice(null);
      setResult(null);
      setLoading(true);
      const placeName = await reverseGeocode(lat, lng);
      setResult(mockResult(year, placeName));
      setLoading(false);
      return;
    }

    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/historical-agent/query?lat=${lat}&lng=${lng}&year=${year}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Error al consultar el backend:', err);
      setNotice('No se ha podido conectar con el backend.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView onClick={handleMapClick} />

      {!loading && !result && !notice && (
        <h1 className="pointer-events-none absolute left-4 top-4 font-brush text-lg font-semibold tracking-wide text-paper drop-shadow-md sm:left-6 sm:top-6">
          China History
        </h1>
      )}

      {(loading || result || notice) && (
        <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center sm:inset-x-6 sm:top-6">
          <div className="pointer-events-auto w-full max-w-md">
            {loading && (
              <p className="rounded-xl border border-line bg-paper/95 p-4 text-sm text-ink-soft shadow-lg backdrop-blur-sm">
                Cargando...
              </p>
            )}
            {!loading && notice && (
              <p className="rounded-xl border border-line bg-paper/95 p-4 text-sm text-ink-soft shadow-lg backdrop-blur-sm">
                {notice}
              </p>
            )}
            {!loading && !notice && <ResultCard result={result} />}
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-6 bottom-16 sm:inset-x-10">
        <DynastyTimeline year={year} onChange={setYear} />
      </div>
    </main>
  );
}