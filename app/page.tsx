'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import DynastyTimeline, { formatYear, segmentAt } from './components/DynastyTimeline';
import ResultCard, { type Fase, type Result } from './components/ResultCard';
import UsagePanel from './components/UsagePanel';

// En local usa el backend de tu máquina; en producción, configura
// NEXT_PUBLIC_API_URL en las variables de entorno de DigitalOcean con la
// URL pública de china-history-api.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// El backend ya hace algo real (Tavily + Claude), así que lo llamamos de
// verdad. El modo simulado (mockResult más abajo) se queda por si hace
// falta seguir puliendo el frontend sin gastar peticiones reales.
const BACKEND_ENABLED = true;

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
    const features: { text?: string; context?: { id: string; text?: string }[] }[] = data?.features ?? [];
    // Algunas "locality" chinas le llegan a Mapbox sin traducir del todo
    // (p. ej. "district de Mudan", "xian de Xingye" = "condado de Xingye").
    // Si pasa, mejor caer a la siguiente feature (la "place" que la engloba)
    // que enseñar ese texto a medio traducir.
    const clean = features.find((f) => f.text && !/\b(district|xian)\b/i.test(f.text));
    const feature = clean ?? features[0];
    if (!feature?.text) return null;

    // Nombres como "Yulin" existen en varias provincias a la vez — sin la
    // provincia, el nombre solo puede referirse al sitio equivocado.
    const region = feature.context?.find((c) => c.id.startsWith('region.'))?.text;
    return region ? `${feature.text}, ${region}` : feature.text;
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

type ModelChoice = 'sonnet' | 'haiku';
type LengthChoice = 'extenso' | 'corto';

export default function Home() {
  const [year, setYear] = useState(1900);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Preferencia del usuario para el modelo/longitud de la síntesis — se
  // manda al backend en cada consulta. No hace falta persistirla entre
  // sesiones (localStorage), es una elección de "voy a probar esto ahora".
  const [model, setModel] = useState<ModelChoice>('sonnet');
  const [length, setLength] = useState<LengthChoice>('corto');

  // Para la tarjeta simulada guardamos solo el lugar del último clic: el
  // año/dinastía se recalculan en cada render a partir de `year`, así la
  // tarjeta cambia sola al arrastrar el slider sin esperar a otro clic.
  const [pickedPlace, setPickedPlace] = useState<string | null>(null);
  const [hasPicked, setHasPicked] = useState(false);

  // Fase de la consulta en curso, para que la tarjeta muestre "escribiendo"
  // (cursor al final del texto) o "generando imagen" mientras llegan datos.
  const [fase, setFase] = useState<Fase>('listo');

  // Guardamos las coordenadas del último clic en el mapa para relanzar
  // búsqueda automáticamente cuando se mueve el slider de tiempo.
  const lastClickCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // year/model/length en refs para que `consultar` sea estable (no cambie de
  // identidad en cada render) y aun así lea siempre los valores actuales.
  const yearRef = useRef(year);
  const modelRef = useRef(model);
  const lengthRef = useRef(length);
  yearRef.current = year;
  modelRef.current = model;
  lengthRef.current = length;

  const liveMockResult = useMemo(
    () => (hasPicked ? mockResult(year, pickedPlace) : null),
    [hasPicked, year, pickedPlace],
  );
  const displayResult = BACKEND_ENABLED ? result : liveMockResult;

  // La consulta llega por Server-Sent Events: "lugar" nada más geocodificar,
  // "texto" token a token mientras Claude escribe, "contexto" con el texto
  // definitivo, "hito", "imagen" (base64, la más lenta) y "done".
  const consultar = useCallback((lat: number, lng: number) => {
    eventSourceRef.current?.close();
    setNotice(null);
    setResult(null);
    setLoading(true);

    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      year: String(yearRef.current),
      model: modelRef.current,
      length: lengthRef.current,
    });
    const es = new EventSource(`${API_URL}/historical-agent/stream?${params}`);
    eventSourceRef.current = es;
    let terminado = false;
    const cerrar = () => {
      terminado = true;
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
    };
    const leer = <T,>(e: MessageEvent): T => JSON.parse(e.data) as T;

    es.addEventListener('lugar', (e) => {
      const { lugar, año } = leer<{ lugar: string; año: string }>(e);
      setResult({ lugar, año, contexto_ambiental: '', hito: null, imagen_url: null });
      setLoading(false);
      setFase('escribiendo');
    });
    es.addEventListener('texto', (e) => {
      const { delta } = leer<{ delta: string }>(e);
      setResult((r) => (r ? { ...r, contexto_ambiental: r.contexto_ambiental + delta } : r));
    });
    es.addEventListener('contexto', (e) => {
      const { texto } = leer<{ texto: string }>(e);
      setResult((r) => (r ? { ...r, contexto_ambiental: texto } : r));
      setFase('ilustrando');
    });
    es.addEventListener('hito', (e) => {
      const { hito } = leer<{ hito: Result['hito'] }>(e);
      setResult((r) => (r ? { ...r, hito } : r));
    });
    es.addEventListener('imagen', (e) => {
      const { url } = leer<{ url: string | null }>(e);
      setResult((r) => (r ? { ...r, imagen_url: url } : r));
    });
    es.addEventListener('done', () => {
      cerrar();
      setFase('listo');
    });
    es.addEventListener('fallo', (e) => {
      const { mensaje } = leer<{ mensaje: string }>(e);
      cerrar();
      setLoading(false);
      setFase('listo');
      setNotice(mensaje);
    });
    es.onerror = () => {
      if (terminado) return;
      cerrar();
      setLoading(false);
      setFase('listo');
      setNotice('No se ha podido conectar con el backend.');
    };
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    lastClickCoordsRef.current = { lat, lng };
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
    consultar(lat, lng);
  }, [consultar]);

  // Al mover el slider con un punto ya elegido se repite la consulta para el
  // nuevo año — pero no en cada paso del arrastre (cada consulta son varias
  // búsquedas web y una imagen), sino cuando el año lleva un momento quieto.
  useEffect(() => {
    if (!BACKEND_ENABLED || !lastClickCoordsRef.current) return;
    const { lat, lng } = lastClickCoordsRef.current;
    const timer = setTimeout(() => consultar(lat, lng), 600);
    return () => clearTimeout(timer);
  }, [year, consultar]);

  useEffect(() => () => eventSourceRef.current?.close(), []);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView onClick={handleMapClick} apiUrl={API_URL} />

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
            {!loading && !notice && <ResultCard result={displayResult} fase={fase} />}
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-6 bottom-16 sm:inset-x-10">
        <DynastyTimeline year={year} onChange={setYear} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <UsagePanel apiUrl={API_URL} model={model} length={length} onModelChange={setModel} onLengthChange={setLength} />
      </div>
    </main>
  );
}