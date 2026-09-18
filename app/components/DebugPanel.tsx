'use client';

import { useState } from 'react';

type Fiabilidad = 'alta' | 'media' | 'baja';
type Hito = { existe: boolean; descripcion?: string; fiabilidad?: Fiabilidad } | null;
type DebugTavilyBusqueda = { etiqueta: string; query: string; ms?: number; error?: string; resultados?: string[] };

export type DebugInfo = {
  lugar?: { lat: number; lng: number; placeName: string; placeSearchName: string };
  tavilyContexto?: { cache: boolean; ms?: number; busquedas?: DebugTavilyBusqueda[] };
  tavilyHito?: { cache: boolean; ms?: number; query?: string; resultado?: string | null; error?: string };
  claudeTexto?: { cache: boolean; ms?: number; modelo?: string; systemPrompt?: string; userPrompt?: string; respuesta?: string };
  claudePromptImagen?: { cache: boolean; ms?: number; modelo?: string; systemPrompt?: string; userPrompt?: string; respuesta?: string | null };
  claudeHito?: { cache: boolean; ms?: number; modelo?: string; systemPrompt?: string; userPrompt?: string; respuesta?: Hito };
  openaiImagen?: { cache: boolean; ms?: number; modelo?: string; tamaño?: string; estilo?: string; prompt?: string; resultado?: string; error?: string };
  totalMs?: number;
};

const PESTAÑAS = ['lugar', 'tavily', 'claude', 'openai'] as const;
type Pestaña = (typeof PESTAÑAS)[number];
const ETIQUETA_PESTAÑA: Record<Pestaña, string> = { lugar: 'Lugar', tavily: 'Tavily', claude: 'Claude', openai: 'OpenAI' };

function formatMs(ms?: number): string | null {
  if (ms === undefined) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

// Botón + modal con pestañas: qué se ha mandado y qué ha devuelto (y cuánto
// ha tardado) cada paso del pipeline para la consulta actualmente en
// pantalla. No se persiste en ningún sitio — viaja con la respuesta de esa
// consulta y desaparece al pedir otra, es un sustituto de mirar los logs
// de DO.
export default function DebugPanel({ debug }: { debug: DebugInfo | null }) {
  const [open, setOpen] = useState(false);
  const [pestaña, setPestaña] = useState<Pestaña>('lugar');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!debug}
        aria-label="Ver debug de esta consulta"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-paper/35 bg-ink/55 text-paper backdrop-blur-sm disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="h-4.25 w-4.25" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 9h.01M15 9h.01M9 15c.83.67 1.87 1 3 1s2.17-.33 3-1" />
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8 4V2M16 4V2" />
        </svg>
      </button>

      {open && debug && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-xl border border-line bg-paper text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-baseline gap-2">
                <h2 className="font-brush text-lg font-semibold">Debug</h2>
                {debug.totalMs !== undefined && (
                  <span className="text-xs font-semibold text-seal">{formatMs(debug.totalMs)} total</span>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-ink-soft">
                ✕
              </button>
            </div>

            <div className="flex gap-1 px-5 pt-3">
              {PESTAÑAS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPestaña(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    pestaña === p ? 'bg-ink text-paper' : 'bg-paper-dark text-ink-soft'
                  }`}
                >
                  {ETIQUETA_PESTAÑA[p]}
                </button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-5 text-sm">
              {pestaña === 'lugar' && <PestañaLugar debug={debug} />}
              {pestaña === 'tavily' && <PestañaTavily debug={debug} />}
              {pestaña === 'claude' && <PestañaClaude debug={debug} />}
              {pestaña === 'openai' && <PestañaOpenai debug={debug} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bloque({ titulo, cache, ms, children }: { titulo: string; cache?: boolean; ms?: number; children?: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-line p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-semibold">{titulo}</p>
        {cache ? (
          <span className="rounded-full bg-paper-dark px-2 py-0.5 text-[11px] text-ink-soft">obtenido de caché</span>
        ) : (
          formatMs(ms) && <span className="whitespace-nowrap rounded-full bg-seal/15 px-2 py-0.5 text-[11px] font-semibold text-seal">{formatMs(ms)}</span>
        )}
      </div>
      {!cache && children}
    </div>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  if (valor === undefined || valor === null || valor === '') return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone">{etiqueta}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-ink-soft">{valor}</p>
    </div>
  );
}

function PestañaLugar({ debug }: { debug: DebugInfo }) {
  const l = debug.lugar;
  if (!l) return <p className="text-ink-soft">Sin datos.</p>;
  return (
    <Bloque titulo="Geocodificación (Mapbox)">
      <Campo etiqueta="Coordenadas pulsadas" valor={`${l.lat}, ${l.lng}`} />
      <Campo etiqueta="Nombre (español)" valor={l.placeName} />
      <Campo etiqueta="Nombre de búsqueda (chino)" valor={l.placeSearchName} />
    </Bloque>
  );
}

function PestañaTavily({ debug }: { debug: DebugInfo }) {
  const ctx = debug.tavilyContexto;
  const hito = debug.tavilyHito;
  return (
    <>
      <Bloque titulo="Contexto (5 búsquedas)" cache={ctx?.cache} ms={ctx?.ms}>
        {ctx?.busquedas?.map((b, i) => (
          <div key={i} className={i > 0 ? 'mt-3 border-t border-line pt-3' : ''}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">{b.etiqueta}</p>
              {formatMs(b.ms) && <span className="whitespace-nowrap text-[11px] text-stone">{formatMs(b.ms)}</span>}
            </div>
            <Campo etiqueta="Query enviada" valor={b.query} />
            {b.error ? (
              <Campo etiqueta="Error" valor={b.error} />
            ) : (
              <Campo etiqueta={`Resultados (${b.resultados?.length ?? 0})`} valor={b.resultados?.join('\n\n---\n\n')} />
            )}
          </div>
        ))}
      </Bloque>
      <Bloque titulo="Hito histórico" cache={hito?.cache} ms={hito?.ms}>
        <Campo etiqueta="Query enviada" valor={hito?.query} />
        {hito?.error ? (
          <Campo etiqueta="Error" valor={hito.error} />
        ) : (
          <Campo etiqueta="Resultado" valor={hito?.resultado ?? '(sin resultados)'} />
        )}
      </Bloque>
    </>
  );
}

function BloqueClaude({
  titulo,
  info,
}: {
  titulo: string;
  info?: { cache: boolean; ms?: number; modelo?: string; systemPrompt?: string; userPrompt?: string; respuesta?: unknown };
}) {
  const respuesta = info?.respuesta;
  const respuestaTexto = typeof respuesta === 'string' ? respuesta : respuesta != null ? JSON.stringify(respuesta, null, 2) : undefined;
  return (
    <Bloque titulo={titulo} cache={info?.cache} ms={info?.ms}>
      <Campo etiqueta="Modelo" valor={info?.modelo} />
      <Campo etiqueta="Prompt de sistema" valor={info?.systemPrompt} />
      <Campo etiqueta="Prompt de usuario" valor={info?.userPrompt} />
      <Campo etiqueta="Respuesta" valor={respuestaTexto} />
    </Bloque>
  );
}

function PestañaClaude({ debug }: { debug: DebugInfo }) {
  return (
    <>
      <BloqueClaude titulo="Texto para el usuario" info={debug.claudeTexto} />
      <BloqueClaude titulo="Prompt de imagen" info={debug.claudePromptImagen} />
      <BloqueClaude titulo="Evaluación del hito" info={debug.claudeHito} />
    </>
  );
}

function PestañaOpenai({ debug }: { debug: DebugInfo }) {
  const o = debug.openaiImagen;
  return (
    <Bloque titulo="Generación de imagen" cache={o?.cache} ms={o?.ms}>
      <Campo etiqueta="Modelo" valor={o?.modelo} />
      <Campo etiqueta="Tamaño" valor={o?.tamaño} />
      <Campo etiqueta="Estilo" valor={o?.estilo} />
      <Campo etiqueta="Prompt enviado" valor={o?.prompt} />
      {o?.error ? <Campo etiqueta="Error" valor={o.error} /> : <Campo etiqueta="Resultado" valor={o?.resultado} />}
    </Bloque>
  );
}
