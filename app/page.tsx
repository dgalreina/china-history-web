'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import DynastyTimeline, { segmentAt } from './components/DynastyTimeline';
import { ImagenPanel, PortadaPanel, TextoPanel, type Fase, type Result } from './components/ResultPanels';
import UsagePanel from './components/UsagePanel';
import StyleSelector, { type ImageStyle } from './components/StyleSelector';

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

function mockResult(year: number, placeName: string | null): Result {
  const dynasty = segmentAt(year);
  return {
    lugar: placeName ?? 'Zona sin ciudad cercana',
    año: String(year),
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
  // El slider va de -2000 a 2000: el año 0 lo deja en el centro de la barra.
  const [year, setYear] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Qué ocupa la mitad inferior una vez hay resultado. Al llegar el lugar de
  // una consulta nueva se pasa a "texto" para leerlo según se escribe; el
  // mapa sigue montado debajo, solo queda tapado.
  const [vista, setVista] = useState<'mapa' | 'texto'>('mapa');

  // Preferencia del usuario para el modelo/longitud de la síntesis — se
  // manda al backend en cada consulta. No hace falta persistirla entre
  // sesiones (localStorage), es una elección de "voy a probar esto ahora".
  const [model, setModel] = useState<ModelChoice>('sonnet');
  const [length, setLength] = useState<LengthChoice>('corto');
  const [style, setStyle] = useState<ImageStyle>('fotorrealista');

  // Para la tarjeta simulada guardamos solo el lugar del último clic: el
  // año/dinastía se recalculan en cada render a partir de `year`, así la
  // tarjeta cambia sola al arrastrar el slider sin esperar a otro clic.
  const [pickedPlace, setPickedPlace] = useState<string | null>(null);
  const [hasPicked, setHasPicked] = useState(false);

  // Fase de la consulta en curso: "cargando" hasta que llega el lugar,
  // "escribiendo" mientras llega el texto, "ilustrando" hasta la imagen.
  const [fase, setFase] = useState<Fase>('listo');

  // Guardamos las coordenadas del último clic en el mapa para relanzar
  // búsqueda automáticamente cuando se mueve el slider de tiempo (ref) y
  // para centrar el mapa en ese punto cuando cambia de tamaño (estado).
  const lastClickCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // year/model/length en refs para que `consultar` sea estable (no cambie de
  // identidad en cada render) y aun así lea siempre los valores actuales.
  const yearRef = useRef(year);
  const modelRef = useRef(model);
  const lengthRef = useRef(length);
  const styleRef = useRef(style);
  useEffect(() => {
    yearRef.current = year;
    modelRef.current = model;
    lengthRef.current = length;
    styleRef.current = style;
  }, [year, model, length, style]);

  const liveMockResult = useMemo(
    () => (hasPicked ? mockResult(year, pickedPlace) : null),
    [hasPicked, year, pickedPlace],
  );
  const displayResult = BACKEND_ENABLED ? result : liveMockResult;

  // La consulta llega por Server-Sent Events: "lugar" nada más geocodificar,
  // "texto" token a token mientras Claude escribe, "contexto" con el texto
  // definitivo, "hito", "imagen" (base64, la más lenta) y "done". El
  // resultado anterior se deja en pantalla (atenuado) hasta que llega el
  // lugar nuevo, para que el layout no salte a mapa completo y vuelva.
  const consultar = useCallback((lat: number, lng: number) => {
    eventSourceRef.current?.close();
    setNotice(null);
    setFase('cargando');

    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      year: String(yearRef.current),
      model: modelRef.current,
      length: lengthRef.current,
      style: styleRef.current,
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
      setFase('escribiendo');
      setVista('texto');
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
      setFase('listo');
      setNotice(mensaje);
    });
    es.onerror = () => {
      if (terminado) return;
      cerrar();
      setFase('listo');
      setNotice('No se ha podido conectar con el backend.');
    };
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    lastClickCoordsRef.current = { lat, lng };
    setFocus({ lat, lng });
    if (!BACKEND_ENABLED) {
      setNotice(null);
      setHasPicked(false);
      setFase('cargando');
      const placeName = await reverseGeocode(lat, lng);
      setPickedPlace(placeName);
      setHasPicked(true);
      setFase('listo');
      setVista('texto');
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

  const hayResultado = displayResult !== null;
  // El estilo vive como acceso directo en la esquina superior de la foto
  // (se cambia a menudo); las métricas, que se consultan poco, bajan a la
  // esquina inferior.
  const styleSelector = <StyleSelector style={style} onStyleChange={setStyle} />;
  const usagePanel = (
    <UsagePanel apiUrl={API_URL} model={model} length={length} onModelChange={setModel} onLengthChange={setLength} />
  );

  // Dos mitades (arriba/abajo en móvil, izquierda/derecha en pantallas
  // anchas): la imagen — la portada hasta que hay resultado — y el mapa o
  // el texto, con la barra de tiempo siempre visible.
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper">
      <div className="absolute inset-x-0 top-0 h-1/2 md:inset-y-0 md:h-full md:w-1/2">
        {hayResultado ? (
          <ImagenPanel result={displayResult} fase={fase}>
            <div className="absolute right-4 top-4">{styleSelector}</div>
            <div className="absolute bottom-4 right-4">{usagePanel}</div>
          </ImagenPanel>
        ) : (
          <PortadaPanel>
            <div className="absolute right-4 top-4">{styleSelector}</div>
            <div className="absolute bottom-4 right-4">{usagePanel}</div>
          </PortadaPanel>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/2 md:inset-y-0 md:left-1/2 md:h-full md:w-1/2">
        <MapView onClick={handleMapClick} apiUrl={API_URL} focus={focus} />

        {hayResultado && vista === 'texto' && (
          // z-3: por encima de los controles de Mapbox (logo/atribución, z-2)
          // que viven dentro del contenedor del mapa.
          <div className="absolute inset-0 z-3">
            <TextoPanel result={displayResult} fase={fase} />
          </div>
        )}

        {hayResultado && (
          <div className="absolute right-3 top-3 z-10 flex rounded-full border border-line bg-paper/95 p-0.75 shadow">
            {(['mapa', 'texto'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`h-7.5 rounded-full px-3.5 text-xs font-bold ${
                  vista === v ? 'bg-ink text-paper' : 'text-ink-soft'
                }`}
              >
                {v === 'mapa' ? 'Mapa' : 'Texto'}
              </button>
            ))}
          </div>
        )}

        {(fase === 'cargando' || notice) && (
          <div className="pointer-events-none absolute inset-x-4 top-14 z-10 flex justify-center">
            <p className="rounded-full border border-line bg-paper/95 px-4 py-2 text-xs text-ink-soft shadow backdrop-blur-sm">
              {notice ?? 'Cargando...'}
            </p>
          </div>
        )}

        <div className="pointer-events-auto absolute inset-x-6 bottom-5 z-10 sm:inset-x-10">
          <DynastyTimeline year={year} onChange={setYear} />
        </div>
      </div>
    </main>
  );
}
