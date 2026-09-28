'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import DynastyTimeline, { segmentAt } from './components/DynastyTimeline';
import { ImagenPanel, PortadaPanel, TextoPanel, type Fase, type Result } from './components/ResultPanels';
import SettingsPanel from './components/SettingsPanel';
import { BuscadorHitosBoton, BuscadorHitosPanel } from './components/BuscadorHitos';
import { type ImageStyle } from './components/StyleSelector';
import { type DebugInfo } from './components/DebugPanel';
import { useLanguage } from './i18n/LanguageContext';
import type { Lang } from './i18n/dictionary';

// En local usa el backend de tu máquina; en producción, configura
// NEXT_PUBLIC_API_URL en las variables de entorno de DigitalOcean con la
// URL pública de china-history-api.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// El backend ya hace algo real (Claude), así que lo llamamos de verdad. El
// modo simulado (mockResult más abajo) se queda por si hace falta seguir
// puliendo el frontend sin gastar peticiones reales.
const BACKEND_ENABLED = true;

// Geocodificación inversa de Mapbox (mismo token del mapa, no es nuestro
// backend) solo para poner un nombre de lugar real en la tarjeta simulada
// mientras no tenemos CHGIS para resolver el asentamiento histórico.
async function reverseGeocode(lat: number, lng: number, lang: Lang): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    // "locality" antes que "place": localidades más pequeñas (p. ej. Xiong'an)
    // deben ganar a la ciudad/prefectura grande que las engloba (p. ej. Baoding).
    const mapboxLang = lang === 'zh' ? 'zh-Hans' : lang;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=locality,place&language=${mapboxLang}&access_token=${token}`,
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
    hitos_relacionados: null,
    imagen_url: null,
  };
}

type ModelChoice = 'sonnet' | 'haiku';
type LengthChoice = 'extenso' | 'corto';
type ImageResolution = 'alta' | 'media' | 'baja';

export default function Home() {
  const { lang, t } = useLanguage();
  // El slider va de -2000 a 2000: el año 0 lo deja en el centro de la barra.
  const [year, setYear] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Qué se ha mandado/devuelto en cada paso del pipeline de la consulta
  // actual (ver DebugPanel.tsx). No se persiste: se pierde al pedir otra.
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  // Qué ocupa la mitad inferior una vez hay resultado. Al llegar el lugar de
  // una consulta nueva se pasa a "texto" para leerlo según se escribe; el
  // mapa sigue montado debajo, solo queda tapado.
  const [vista, setVista] = useState<'mapa' | 'texto'>('mapa');
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  // Preferencia del usuario para el modelo/longitud de la síntesis — se
  // manda al backend en cada consulta. No hace falta persistirla entre
  // sesiones (localStorage), es una elección de "voy a probar esto ahora".
  const [model, setModel] = useState<ModelChoice>('sonnet');
  const [imageModel, setImageModel] = useState<ModelChoice>('haiku');
  const [length, setLength] = useState<LengthChoice>('corto');
  const [style, setStyle] = useState<ImageStyle>('fotorrealista');
  const [resolution, setResolution] = useState<ImageResolution>('alta');

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
  const imageModelRef = useRef(imageModel);
  const lengthRef = useRef(length);
  const styleRef = useRef(style);
  const resolutionRef = useRef(resolution);
  const langRef = useRef(lang);
  useEffect(() => {
    yearRef.current = year;
    modelRef.current = model;
    imageModelRef.current = imageModel;
    lengthRef.current = length;
    styleRef.current = style;
    resolutionRef.current = resolution;
    langRef.current = lang;
  }, [year, model, imageModel, length, style, resolution, lang]);

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
    setDebug(null);

    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      year: String(yearRef.current),
      model: modelRef.current,
      imageModel: imageModelRef.current,
      length: lengthRef.current,
      style: styleRef.current,
      resolution: resolutionRef.current,
      lang: langRef.current,
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
      setResult({ lugar, año, contexto_ambiental: '', hito: null, hitos_relacionados: null, imagen_url: null });
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
    es.addEventListener('hitosRelacionados', (e) => {
      const { hitosRelacionados } = leer<{ hitosRelacionados: Result['hitos_relacionados'] }>(e);
      setResult((r) => (r ? { ...r, hitos_relacionados: hitosRelacionados } : r));
    });
    es.addEventListener('imagen', (e) => {
      const { url } = leer<{ url: string | null }>(e);
      setResult((r) => (r ? { ...r, imagen_url: url } : r));
    });
    es.addEventListener('debug', (e) => {
      setDebug(leer<DebugInfo>(e));
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
      setNotice(t.page.errorConexion);
    };
  }, [t]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    lastClickCoordsRef.current = { lat, lng };
    setFocus({ lat, lng });
    if (!BACKEND_ENABLED) {
      setNotice(null);
      setHasPicked(false);
      setFase('cargando');
      const placeName = await reverseGeocode(lat, lng, lang);
      setPickedPlace(placeName);
      setHasPicked(true);
      setFase('listo');
      setVista('texto');
      return;
    }
    consultar(lat, lng);
  }, [consultar, lang]);

  // Saltar directo a un hito relacionado (ver TextoPanel): mueve año y
  // lugar y relanza la consulta, como si el usuario hubiera pulsado ahí con
  // el slider ya en ese año. yearRef se actualiza ya mismo (no esperar al
  // efecto que lo sincroniza con `year`) para que consultar() lea el año
  // nuevo desde la primerísima llamada.
  const saltarAHito = useCallback((lat: number, lng: number, año: number) => {
    yearRef.current = año;
    setYear(año);
    lastClickCoordsRef.current = { lat, lng };
    setFocus({ lat, lng });
    consultar(lat, lng);
  }, [consultar]);

  // Al mover el slider con un punto ya elegido se repite la consulta para el
  // nuevo año — pero no en cada paso del arrastre (cada consulta son varias
  // búsquedas web y una imagen), sino cuando el año lleva un momento quieto.
  // lastClickCoordsRef se lee DENTRO del timeout, no al programarlo: si
  // saltarAHito cambia el año y justo después el usuario pulsa otro punto
  // del mapa antes de que pasen los 600ms, este timer disparaba con las
  // coordenadas viejas (capturadas al programarse) y pisaba la consulta
  // nueva con la anterior — leyendo el ref al disparar, siempre usa el
  // último punto real, sea cual sea.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    const timer = setTimeout(() => {
      if (lastClickCoordsRef.current) consultar(lastClickCoordsRef.current.lat, lastClickCoordsRef.current.lng);
    }, 600);
    return () => clearTimeout(timer);
  }, [year, lang, consultar]);

  useEffect(() => () => eventSourceRef.current?.close(), []);

  const hayResultado = displayResult !== null;
  // Un único botón de ajustes (engranaje) agrupa estilo/consumo/debug —
  // antes eran tres iconos sueltos sobre la foto; se consolidaron porque
  // ninguno se abre a menudo (petición del usuario).
  const settingsPanel = (
    <SettingsPanel
      style={style}
      onStyleChange={setStyle}
      debug={debug}
      model={model}
      imageModel={imageModel}
      length={length}
      resolution={resolution}
      onModelChange={setModel}
      onImageModelChange={setImageModel}
      onLengthChange={setLength}
      onResolutionChange={setResolution}
    />
  );

  // Dos mitades (arriba/abajo en móvil, izquierda/derecha en pantallas
  // anchas): la imagen — la portada hasta que hay resultado — y el mapa o
  // el texto, con la barra de tiempo siempre visible.
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper">
      <div className="absolute inset-x-0 top-0 h-1/2 md:inset-y-0 md:h-full md:w-1/2">
        {hayResultado ? (
          <ImagenPanel result={displayResult} fase={fase}>
            <div className="absolute right-4 top-4">{settingsPanel}</div>
          </ImagenPanel>
        ) : (
          <PortadaPanel>
            <div className="absolute right-4 top-4">{settingsPanel}</div>
          </PortadaPanel>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/2 md:inset-y-0 md:left-1/2 md:h-full md:w-1/2">
        <MapView onClick={handleMapClick} focus={focus} year={year} />

        {hayResultado && vista === 'texto' && (
          // z-3: por encima de los controles de Mapbox (logo/atribución, z-2)
          // que viven dentro del contenedor del mapa.
          <div className="absolute inset-0 z-3">
            <TextoPanel result={displayResult} fase={fase} onSaltarAHito={saltarAHito} />
          </div>
        )}

        {/* La lupa vale desde el principio (antes de cualquier clic, para
            saltar directo a un hito sin tener que encontrarlo a ojo); el
            conmutador Mapa/Texto solo tiene sentido una vez hay resultado
            que alternar. */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {hayResultado && (
            <div className="flex rounded-full border border-line bg-paper/80 p-0.5 shadow-sm backdrop-blur-sm">
              {(['mapa', 'texto'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setVista(v);
                    setBuscadorAbierto(false);
                  }}
                  className={`h-5.5 rounded-full px-2.5 text-[10px] font-bold ${
                    vista === v && !buscadorAbierto ? 'bg-ink text-paper' : 'text-ink-soft'
                  }`}
                >
                  {v === 'mapa' ? t.page.mapa : t.page.texto}
                </button>
              ))}
            </div>
          )}
          <BuscadorHitosBoton open={buscadorAbierto} onToggle={() => setBuscadorAbierto((v) => !v)} />
        </div>

        <BuscadorHitosPanel open={buscadorAbierto} onClose={() => setBuscadorAbierto(false)} year={year} onSaltarAHito={saltarAHito} />

        {(fase === 'cargando' || notice) && (
          <div className="pointer-events-none absolute inset-x-4 top-14 z-10 flex justify-center">
            <p className="rounded-full border border-line bg-paper/95 px-4 py-2 text-xs text-ink-soft shadow backdrop-blur-sm">
              {notice ?? t.page.cargando}
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
