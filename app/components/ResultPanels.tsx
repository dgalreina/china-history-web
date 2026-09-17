'use client';

import { formatYear, segmentAt } from './DynastyTimeline';

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

const fiabilidadColor: Record<string, string> = {
  alta: '#2e7d32',
  media: '#f9a825',
  baja: '#c62828',
};

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
        <p className="text-sm font-semibold tracking-wide opacity-90">Everywhere everytime</p>
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

  return (
    <div className="relative h-full w-full overflow-hidden bg-paper-dark">
      {result.imagen_url ? (
        <img src={result.imagen_url} alt={`Reconstrucción de ${result.lugar}, ${result.año}`} className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center text-sm text-stone ${fase === 'listo' ? '' : 'animate-pulse'}`}>
          {fase === 'listo' ? 'Sin imagen' : 'Generando imagen...'}
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
// deja el hueco con `paddingBottom`) y se difumina al llegar a ella.
export function TextoPanel({ result, fase }: { result: Result; fase: Fase }) {
  return (
    <div className="relative h-full w-full bg-paper">
      <div
        className={`sin-scrollbar h-full overflow-y-auto px-4 pb-32 pt-4 text-sm leading-relaxed text-ink-soft ${
          fase === 'cargando' ? 'opacity-50' : ''
        }`}
      >
        <p className="whitespace-pre-line pr-28">
          {result.contexto_ambiental}
          {fase === 'escribiendo' && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-seal align-middle" aria-hidden />
          )}
        </p>
        {result.hito?.existe && (
          <p
            className="mt-4 rounded-r-lg bg-paper-dark px-3 py-2.5 text-[13px]"
            style={{ borderLeft: `3px solid ${fiabilidadColor[result.hito.fiabilidad] ?? '#666'}` }}
          >
            <span className="font-semibold">Hito · fiabilidad {result.hito.fiabilidad}</span> — {result.hito.descripcion}
          </p>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent via-paper/90 to-paper" />
    </div>
  );
}
