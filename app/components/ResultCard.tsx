'use client';

import { useState } from 'react';

export type Result = {
  lugar: string;
  año: string;
  contexto_ambiental: string;
  hito: { existe: boolean; descripcion: string; fiabilidad: string } | null;
  imagen_url: string | null;
};

// escribiendo: el texto está llegando token a token; ilustrando: texto
// completo, esperando la imagen; listo: no hay nada en curso.
export type Fase = 'escribiendo' | 'ilustrando' | 'listo';

const fiabilidadColor: Record<string, string> = {
  alta: '#2e7d32',
  media: '#f9a825',
  baja: '#c62828',
};

export default function ResultCard({ result, fase = 'listo' }: { result: Result | null; fase?: Fase }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-line bg-paper/95 text-ink shadow-lg backdrop-blur-sm transition-[max-height] duration-300 ${
        expanded ? 'max-h-[calc(100dvh-13rem)]' : 'max-h-[50vh]'
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 p-4 pb-0">
        <h3 className="font-brush font-semibold">
          {result.lugar} — {result.año}
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-soft"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Zona de foto: tamaño fijo, nunca hace scroll. */}
      <div className="shrink-0 px-4 pt-2">
        {result.imagen_url ? (
          <img
            src={result.imagen_url}
            alt="Reconstrucción histórica"
            className="max-h-48 w-full rounded-lg object-cover"
          />
        ) : (
          <div
            className={`flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-line text-xs text-stone ${
              fase !== 'listo' ? 'animate-pulse' : ''
            }`}
          >
            {fase === 'listo' ? 'Sin imagen' : 'Generando imagen...'}
          </div>
        )}
      </div>

      {/* Zona de texto: la única con scroll propio, crece con "expanded". */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2">
        <p className="whitespace-pre-line text-sm text-ink-soft">
          {result.contexto_ambiental}
          {fase === 'escribiendo' && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-seal align-middle" aria-hidden />
          )}
        </p>
        {result.hito?.existe && (
          <p className="mt-1 text-sm" style={{ color: fiabilidadColor[result.hito.fiabilidad] || '#666' }}>
            🔹 {result.hito.descripcion} (fiabilidad: {result.hito.fiabilidad})
          </p>
        )}
      </div>
    </div>
  );
}
