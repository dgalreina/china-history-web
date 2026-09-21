'use client';

import { useEffect, useRef } from 'react';
import { formatYear, segmentAt } from './DynastyTimeline';
import VasijaSpinner from './VasijaSpinner';

export type Result = {
  lugar: string;
  año: string;
  contexto_ambiental: string;
  hito: { existe: boolean; descripcion: string; fiabilidad: string } | null;
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-16 top-5 flex flex-col items-center gap-1 text-center text-paper drop-shadow-md">
        <h1 className="font-brush text-2xl font-bold leading-tight">China History</h1>
      </div>
      {children}
    </div>
  );
}

// Mitad de la imagen: a sangre, con lugar y año encima. `children` es lo
// que la página quiera colocar sobre la foto (el botón de consumo).
export function ImagenPanel({ result, fase, children }: { result: Result; fase: Fase; children?: React.ReactNode }) {
  const year = Number(result.año);
  const dinastia = Number.isFinite(year) ? segmentAt(year).label : null;

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

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <img
        key={imagenDeFondo}
        src={imagenDeFondo}
        alt={esPortada ? '' : `Reconstrucción de ${result.lugar}, ${result.año}`}
        className={`h-full w-full object-cover transition-[filter] duration-500 ${esPortada ? 'object-[50%_80%]' : 'panoramica'} ${generandoImagen ? 'blur-[3px] brightness-75' : ''}`}
      />

      {generandoImagen && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/35">
          <VasijaSpinner className="h-14 w-14 text-paper" />
          <span className="sr-only">Generando imagen…</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-ink/70 to-transparent" />
      <div className={`absolute left-4 top-4 flex flex-col gap-1 text-paper drop-shadow-md ${fase === 'cargando' ? 'opacity-60' : ''}`}>
        <h2 className="font-brush text-2xl font-bold leading-tight">{result.lugar}</h2>
        <p className="text-sm font-semibold tracking-wide opacity-90">
          {Number.isFinite(year) ? formatYear(year) : result.año}
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
export function TextoPanel({ result, fase }: { result: Result; fase: Fase }) {
  return (
    <div className="relative h-full w-full bg-paper">
      <div
        className={`sin-scrollbar h-full overflow-y-auto px-4 pb-32 pt-12 text-sm leading-relaxed text-ink-soft ${
          fase === 'cargando' ? 'opacity-50' : ''
        }`}
      >
        {result.hito?.existe && (
          <p className="mb-4 rounded-r-lg border-l-3 border-seal bg-paper-dark px-3 py-2.5 text-[13px]">
            <span className="font-semibold">Hito</span> — {result.hito.descripcion}
          </p>
        )}
        <p className="whitespace-pre-line">
          {result.contexto_ambiental}
          {fase === 'escribiendo' && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-seal align-middle" aria-hidden />
          )}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent via-paper/90 to-paper" />
    </div>
  );
}
