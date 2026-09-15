'use client';
import { useState, useCallback, useMemo } from 'react';
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
    // "locality" antes que "place": localidades más pequeñas (p. ej. Xiong'an)
    // deben ganar a la ciudad/prefectura grande que las engloba (p. ej. Baoding).
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=locality,place&language=es&access_token=${token}`,
    );
    const data = await res.json();
    const features: { text?: string }[] = data?.features ?? [];
    // Algunas "locality" chinas le llegan a Mapbox sin traducir del todo
    // (p. ej. "district de Mudan": tradujo la plantilla pero no la palabra
    // "district"). Si pasa, mejor caer a la siguiente feature (la "place"
    // que la engloba) que enseñar ese texto a medio traducir.
    const clean = features.find((f) => f.text && !/\bdistrict\b/i.test(f.text));
    return (clean ?? features[0])?.text ?? null;
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

  // Para la tarjeta simulada guardamos solo el lugar del último clic: el
  // año/dinastía se recalculan en cada render a partir de `year`, así la
  // tarjeta cambia sola al arrastrar el slider sin esperar a otro clic.
  const [pickedPlace, setPickedPlace] = useState<string | null>(null);
  const [hasPicked, setHasPicked] = useState(false);

  const liveMockResult = useMemo(
    () => (hasPicked ? mockResult(year, pickedPlace) : null),
    [hasPicked, year, pickedPlace],
  );
  const displayResult = BACKEND_ENABLED ? result : liveMockResult;

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!BACKEND_ENABLED) {
      setNotice(null);
      setHasPicked(false);
      setLoading(true);
      const placeName = await reverseGeocode(lat, lng);
      setPickedPlace(placeName);
      setHasPicked(true);
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

      {!loading && !displayResult && !notice && (
        <h1 className="pointer-events-none absolute left-4 top-4 font-brush text-lg font-semibold tracking-wide text-paper drop-shadow-md sm:left-6 sm:top-6">
          China History
        </h1>
      )}

      {(loading || displayResult || notice) && (
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
            {!loading && !notice && <ResultCard result={displayResult} />}
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-6 bottom-16 sm:inset-x-10">
        <DynastyTimeline year={year} onChange={setYear} />
      </div>
    </main>
  );
}