'use client';

import { useEffect, useRef } from 'react';
import { formatYear, segmentAt } from './DynastyTimeline';
import VasijaSpinner from './VasijaSpinner';
import { useLanguage } from '../i18n/LanguageContext';

export type HitoRelacionado = { id: string; lugar: string; año: number; titulo: string; lat: number; lng: number };

export type Result = {
  lugar: string;
  año: string;
  contexto_ambiental: string;
  hito: { existe: boolean; descripcion: string; fiabilidad: string } | null;
  // Otros hitos ya conocidos para seguir el hilo de la historia — solo
  // presente cuando hito.existe (ver buscarHitosRelacionados en el backend).
  hitos_relacionados: { futuros: HitoRelacionado[]; cercanos: HitoRelacionado[] } | null;
  imagen_url: string | null;
};

// cargando: consulta lanzada, aún sin lugar; escribiendo: el texto está
// llegando token a token; ilustrando: texto completo, esperando la imagen;
// listo: no hay nada en curso.
export type Fase = 'cargando' | 'escribiendo' | 'ilustrando' | 'listo';

// Mitad de la imagen mientras no hay resultado: la vasija de la portada
// (misma imagen que el icono de la app) con el título encima.
export function PortadaPanel({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      {/* La imagen es vertical (2:3) y el panel casi cuadrado: con el recorte
          centrado se cortan los pies de la vasija; al 80 % sale entera con
          algo de suelo debajo y las asas aún dentro. */}
      <img src="/portada.jpg" alt="" className="h-full w-full object-cover object-[50%_80%]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-ink/70 to-transparent md:h-56" />
      <div className="pointer-events-none absolute inset-x-16 top-5 flex flex-col items-center gap-1 text-center text-paper drop-shadow-md md:top-36">
        <h1 className="font-brush text-2xl font-bold leading-tight md:text-5xl">China History</h1>
      </div>
      {children}
    </div>
  );
}

// Mitad de la imagen: a sangre, con lugar y año encima. `children` es lo
// que la página quiera colocar sobre la foto (el botón de consumo).
export function ImagenPanel({ result, fase, children }: { result: Result; fase: Fase; children?: React.ReactNode }) {
  const { lang, t } = useLanguage();
  const year = Number(result.año);
  const dinastia = Number.isFinite(year) ? t.dinastias[segmentAt(year).label] : null;

  // Al cambiar de lugar/año la imagen nueva tarda; en vez de dejar un hueco
  // vacío de golpe, se conserva la última imagen vista de fondo (atenuada
  // bajo el velo) hasta que llega la siguiente — el salto brusco era pasar
  // de "imagen" a "nada", no de "nada" a "imagen nueva". En la primerísima
  // consulta de la sesión no hay ninguna imagen anterior: se usa la propia
  // portada como fondo en su lugar, para no dejar un panel negro vacío.
  const ultimaImagenRef = useRef<string | null>(null);
  useEffect(() => {
    if (result.imagen_url) ultimaImagenRef.current = result.imagen_url;
  }, [result.imagen_url]);
  const imagenDeFondo = result.imagen_url ?? ultimaImagenRef.current ?? '/portada.jpg';
  const esPortada = imagenDeFondo === '/portada.jpg';
  const generandoImagen = fase !== 'listo' && !result.imagen_url;

  // La imagen generada es panorámica (≈2,8:1) y el panel casi cuadrado: con
  // object-fit: cover ocupa toda la altura y sobra anchura, que antes se
  // recorría sola vía una animación CSS de object-position (ver
  // globals.css, ya retirada). Ahora el mismo paneo lento ida-vuelta lo
  // lleva este rAF, para poder PAUSARLO mientras el dedo arrastra la
  // imagen — con la animación CSS corriendo, un estilo inline no podía
  // ganarle (las animaciones CSS tienen prioridad sobre el estilo en
  // línea), así que no había forma limpia de combinar las dos.
  const imgRef = useRef<HTMLImageElement>(null);
  const posRef = useRef(0); // 0-100, % en object-position X
  const direccionRef = useRef<1 | -1>(1);
  const arrastreRef = useRef<{ x: number; pos: number } | null>(null);
  const DURACION_PANORAMICA_MS = 80000; // mismo ritmo que la animación CSS anterior (80s por tramo)

  useEffect(() => {
    if (esPortada) return;
    posRef.current = 0;
    direccionRef.current = 1;
    arrastreRef.current = null;
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (sinMovimiento) {
      if (imgRef.current) imgRef.current.style.objectPosition = '50% 50%';
      return;
    }
    let ultimoFrame = performance.now();
    let raf = requestAnimationFrame(function tick(ahora) {
      const dt = ahora - ultimoFrame;
      ultimoFrame = ahora;
      if (!arrastreRef.current) {
        const avance = (dt / DURACION_PANORAMICA_MS) * 100 * direccionRef.current;
        let nueva = posRef.current + avance;
        if (nueva >= 100) {
          nueva = 100;
          direccionRef.current = -1;
        } else if (nueva <= 0) {
          nueva = 0;
          direccionRef.current = 1;
        }
        posRef.current = nueva;
        if (imgRef.current) imgRef.current.style.objectPosition = `${nueva}% 50%`;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [imagenDeFondo, esPortada]);

  // Arrastre táctil: mueve con el dedo, igual de sensible que el ancho
  // real de la imagen (arrastrar hasta el borde del panel recorre todo el
  // rango 0-100%). Al soltar, el paneo automático sigue solo desde donde
  // quedó, en la misma dirección que llevaba — sin saltos ni reinicios.
  const manejarTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    if (esPortada) return;
    arrastreRef.current = { x: e.touches[0].clientX, pos: posRef.current };
  };
  const manejarTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (!arrastreRef.current || !imgRef.current) return;
    const dx = e.touches[0].clientX - arrastreRef.current.x;
    const ancho = imgRef.current.clientWidth || 1;
    // arrastrar el dedo hacia la izquierda revela lo que queda a la
    // derecha de la imagen, como al pasar una foto panorámica con el dedo.
    const delta = (-dx / ancho) * 100;
    const nueva = Math.min(100, Math.max(0, arrastreRef.current.pos + delta));
    posRef.current = nueva;
    imgRef.current.style.objectPosition = `${nueva}% 50%`;
  };
  const manejarTouchEnd = () => {
    arrastreRef.current = null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <img
        key={imagenDeFondo}
        ref={imgRef}
        src={imagenDeFondo}
        alt={esPortada ? '' : t.resultPanels.reconstruccionAlt(result.lugar, result.año)}
        onTouchStart={manejarTouchStart}
        onTouchMove={manejarTouchMove}
        onTouchEnd={manejarTouchEnd}
        onTouchCancel={manejarTouchEnd}
        className={`h-full w-full object-cover transition-[filter] duration-500 ${esPortada ? 'object-[50%_80%] touch-auto' : 'touch-none'} ${generandoImagen ? 'blur-[3px] brightness-75' : ''}`}
      />

      {generandoImagen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/35">
          <VasijaSpinner className="h-14 w-14 text-paper" />
          <p aria-hidden className="texto-brillo text-sm font-semibold tracking-wide">
            {t.resultPanels.estadoCarga[fase]}
          </p>
          <span className="sr-only">{t.resultPanels.generandoImagenSr}</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-ink/70 to-transparent" />
      <div className={`absolute left-4 top-4 flex flex-col gap-1 text-paper drop-shadow-md ${fase === 'cargando' ? 'opacity-60' : ''}`}>
        <h2 className="font-brush text-2xl font-bold leading-tight">{result.lugar}</h2>
        <p className="text-sm font-semibold tracking-wide opacity-90">
          {Number.isFinite(year) ? formatYear(year, lang) : result.año}
          {dinastia ? ` · ${dinastia}` : ''}
        </p>
      </div>

      {children}
    </div>
  );
}

// Mitad del texto: hace scroll por debajo de la barra de tiempo (la página
// deja el hueco con `paddingBottom`) y se difumina al llegar a ella. El
// conmutador Mapa/Texto flota arriba (ver page.tsx) — el hueco se deja con
// `pt`, no con un padding lateral asimétrico, así el texto queda centrado
// con el mismo margen a los dos lados.
// Fila clicable para un hito relacionado — lugar/año/título, salta ahí al
// pulsar (ver onSaltarAHito en page.tsx: mueve mapa + slider + relanza la
// consulta).
function FilaHitoRelacionado({ hito, onClick }: { hito: HitoRelacionado; onClick: () => void }) {
  const { lang } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg bg-paper-dark px-3 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-line/50"
    >
      <span className="font-semibold text-ink">{formatYear(hito.año, lang)}</span> · {hito.titulo}
    </button>
  );
}

export function TextoPanel({
  result,
  fase,
  onSaltarAHito,
}: {
  result: Result;
  fase: Fase;
  onSaltarAHito: (lat: number, lng: number, año: number, hitoId?: string) => void;
}) {
  const { t } = useLanguage();
  const relacionados = result.hitos_relacionados;
  // Solo una vez terminado de escribir el texto (ilustrando/listo) — antes
  // se sentían fuera de lugar apareciendo a mitad de la animación.
  const textoTerminado = fase === 'ilustrando' || fase === 'listo';
  const hayRelacionados = textoTerminado && !!relacionados && (relacionados.futuros.length > 0 || relacionados.cercanos.length > 0);

  return (
    <div className="relative h-full w-full bg-paper">
      <div
        className={`sin-scrollbar h-full overflow-y-auto px-4 pb-32 pt-12 text-sm leading-relaxed text-ink-soft ${
          fase === 'cargando' ? 'opacity-50' : ''
        }`}
      >
        {result.hito?.existe && (
          <p className="mb-4 rounded-r-lg border-l-3 border-seal bg-paper-dark px-3 py-2.5 text-[13px]">
            <span className="font-semibold">{t.resultPanels.hito}</span> — {result.hito.descripcion}
          </p>
        )}
        <p className="whitespace-pre-line">
          {result.contexto_ambiental}
          {fase === 'escribiendo' && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-seal align-middle" aria-hidden />
          )}
        </p>

        {hayRelacionados && (
          <div className="mt-6 border-t border-line pt-4">
            {relacionados.futuros.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone">{t.resultPanels.sigueLaHistoria}</p>
                <div className="flex flex-col gap-1.5">
                  {relacionados.futuros.map((h, i) => (
                    <FilaHitoRelacionado key={i} hito={h} onClick={() => onSaltarAHito(h.lat, h.lng, h.año, h.id)} />
                  ))}
                </div>
              </div>
            )}
            {relacionados.cercanos.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone">{t.resultPanels.cercaDeAqui}</p>
                <div className="flex flex-col gap-1.5">
                  {relacionados.cercanos.map((h, i) => (
                    <FilaHitoRelacionado key={i} hito={h} onClick={() => onSaltarAHito(h.lat, h.lng, h.año, h.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent via-paper/90 to-paper" />
    </div>
  );
}
