'use client';

import { useState } from 'react';

type Fiabilidad = 'alta' | 'media' | 'baja';
type Hito = { existe: boolean; descripcion?: string; fiabilidad?: Fiabilidad } | null;
type DebugTavilyBusqueda = { etiqueta: string; query: string; ms?: number; error?: string; resultados?: string[] };

type ChgisResolucion = {
  namePy: string;
  nameCh: string;
  nameFt: string;
  level: 'county' | 'prefecture';
  typePy: string;
  typeCh: string;
  begYear: number;
  endYear: number;
  distanceKm: number;
};

export type DebugInfo = {
  lugar?: { lat: number; lng: number; placeName: string; placeSearchName: string; chgis?: ChgisResolucion | null };
  // true mientras Tavily está pausado en el backend (TAVILY_ENABLED=false):
  // ninguna sección de Tavily se ha ejecutado y las de Claude han escrito
  // sin grounding externo (ver `disabled`/`sinTavily` en cada sección).
  tavilyPausado?: boolean;
  tavilyContexto?: { cache: boolean; ms?: number; busquedas?: DebugTavilyBusqueda[]; disabled?: boolean };
  tavilyHito?: { cache: boolean; ms?: number; query?: string; resultado?: string | null; error?: string };
  // Hito ya extraído del libro (ver scripts/extract-hitos.mjs) encontrado
  // cerca del punto pulsado — se muestra directo, sin investigar (no hay
  // tavilyHito ni claudeHito en ese caso). Gana sobre tavilyHito cuando
  // existe.
  hitoConocido?: { encontrado: boolean; distanciaKm?: number };
  // RAG sobre el libro para anclar la parte de arquitectura/urbanismo del
  // prompt de imagen — corre sin Tavily, haya o no hito (ver
  // construirPromptImagen). CLOTHING sigue siendo conocimiento de Claude,
  // el libro no cubre bien vestimenta.
  arquitecturaRag?: { cache: boolean; ms?: number; query?: string; resultado?: string | null; error?: string };
  // Igual que arquitecturaRag, pero para la situación general del texto
  // narrativo (ver sintetizarTextoUsuario) — cubre épocas que el libro
  // documenta en términos arqueológicos más que de hitos puntuales
  // (p. ej. Xia/Shang).
  contextoRag?: { cache: boolean; ms?: number; query?: string; resultado?: string | null; error?: string };
  // Recinto real (Ciudad Prohibida, etc.) en el que cae el punto, cuando no
  // hay hito — ver buscarCapital. Solo se rellena en ese caso.
  capital?: { nombre: string; lugar: string; tipo: 'palacio' | 'templo' } | null;
  claudeTexto?: {
    cache: boolean;
    ms?: number;
    modelo?: string;
    systemPrompt?: string;
    userPrompt?: string;
    respuesta?: string;
    sinTavily?: boolean;
    conHito?: boolean;
    conContextoRag?: boolean;
  };
  claudePromptImagen?: {
    cache: boolean;
    ms?: number;
    modelo?: string;
    systemPrompt?: string;
    userPrompt?: string;
    respuesta?: string | null;
    sinTavily?: boolean;
    conHito?: boolean;
    conArquitecturaRag?: boolean;
  };
  claudeHito?: { cache: boolean; ms?: number; modelo?: string; systemPrompt?: string; userPrompt?: string; respuesta?: Hito };
  openaiImagen?: { cache: boolean; ms?: number; modelo?: string; tamaño?: string; estilo?: string; prompt?: string; resultado?: string; error?: string };
  totalMs?: number;
};

const PESTAÑAS = ['lugar', 'tavily', 'claude', 'openai'] as const;
type Pestaña = (typeof PESTAÑAS)[number];
// El id de la pestaña se deja como "tavily" (evita tocar el resto del
// componente), pero ahora también aloja el bloque de hito cuando viene del
// RAG sobre el libro (ver ragHito) — de ahí la etiqueta más genérica.
const ETIQUETA_PESTAÑA: Record<Pestaña, string> = { lugar: 'Lugar', tavily: 'Búsqueda', claude: 'Claude', openai: 'OpenAI' };

function formatMs(ms?: number): string | null {
  if (ms === undefined) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

// Botón + modal con pestañas: qué se ha mandado y qué ha devuelto (y cuánto
// ha tardado) cada paso del pipeline para la consulta actualmente en
// pantalla. No se persiste en ningún sitio — viaja con la respuesta de esa
// consulta y desaparece al pedir otra, es un sustituto de mirar los logs
// de DO.
// Sin botón ni modal propios — vive dentro de la pestaña "Debug" del menú
// de ajustes único (ver SettingsPanel.tsx), que ya pone el modal y el
// cierre. Antes tenía su propio icono flotante sobre la foto; se
// consolidó junto con estilo/consumo en un solo botón porque casi no se
// abre (petición del usuario).
export function DebugPanelContent({ debug }: { debug: DebugInfo | null }) {
  const [pestaña, setPestaña] = useState<Pestaña>('lugar');

  if (!debug) return <p className="text-ink-soft">Sin datos todavía — haz una consulta primero.</p>;

  return (
    <>
      <div className="flex items-baseline gap-2">
        {debug.totalMs !== undefined && <span className="text-xs font-semibold text-seal">{formatMs(debug.totalMs)} total</span>}
      </div>

      {debug.tavilyPausado && (
        <p className="mt-3 rounded-lg bg-seal/10 px-3 py-2 text-[11px] font-semibold text-seal">
          Tavily desactivado — texto e imagen generados solo con el conocimiento de Claude; el hito solo aparece si hay un punto ya conocido cerca.
        </p>
      )}

      <div className="flex gap-1 pt-3">
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

      <div className="mt-3 text-sm">
        {pestaña === 'lugar' && <PestañaLugar debug={debug} />}
        {pestaña === 'tavily' && <PestañaTavily debug={debug} />}
        {pestaña === 'claude' && <PestañaClaude debug={debug} />}
        {pestaña === 'openai' && <PestañaOpenai debug={debug} />}
      </div>
    </>
  );
}

function Bloque({ titulo, cache, ms, nota, children }: { titulo: string; cache?: boolean; ms?: number; nota?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-line p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold">{titulo}</p>
          {nota && <span className="rounded-full bg-paper-dark px-2 py-0.5 text-[11px] text-ink-soft">{nota}</span>}
        </div>
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
  const c = l.chgis;
  return (
    <>
      <Bloque titulo="Geocodificación (Mapbox)">
        <Campo etiqueta="Coordenadas pulsadas" valor={`${l.lat}, ${l.lng}`} />
        <Campo etiqueta="Nombre (español)" valor={l.placeName} />
      </Bloque>
      <Bloque titulo="Nodo A' — CHGIS">
        {c ? (
          <>
            <Campo etiqueta="Asentamiento" valor={`${c.nameCh} (${c.namePy}) — ${c.nameFt}`} />
            <Campo etiqueta="Nivel" valor={c.level === 'county' ? 'Condado' : 'Prefectura'} />
            <Campo etiqueta="Tipo" valor={c.typeCh ? `${c.typeCh} (${c.typePy})` : undefined} />
            <Campo etiqueta="Vigente" valor={`${c.begYear} – ${c.endYear}`} />
            <Campo etiqueta="Distancia al punto pulsado" valor={`${c.distanceKm} km`} />
          </>
        ) : (
          <p className="text-ink-soft">Sin cobertura CHGIS aquí (fuera de 221 a.C.–1911 d.C., o sin asentamiento documentado cerca). Se usa el nombre moderno de Mapbox.</p>
        )}
      </Bloque>
      <Bloque titulo="Nombre de búsqueda (Tavily)">
        <Campo etiqueta="Nombre chino usado" valor={l.placeSearchName} />
        <Campo etiqueta="Origen" valor={c ? 'CHGIS (histórico)' : 'Mapbox (moderno)'} />
      </Bloque>
    </>
  );
}

function PestañaTavily({ debug }: { debug: DebugInfo }) {
  const ctx = debug.tavilyContexto;
  const conocido = debug.hitoConocido;
  const tavilyHito = debug.tavilyHito;
  return (
    <>
      <Bloque titulo="Contexto (5 búsquedas)" cache={ctx?.cache} ms={ctx?.ms}>
        {ctx?.disabled ? (
          <p className="text-ink-soft">Tavily desactivado — no se ha llamado.</p>
        ) : (
          ctx?.busquedas?.map((b, i) => (
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
          ))
        )}
      </Bloque>
      <Bloque titulo="Hito histórico">
        {conocido?.encontrado ? (
          <p className="text-ink-soft">
            Punto ya extraído del libro, a {conocido.distanciaKm} km del clic — se muestra directo, sin investigar de nuevo.
          </p>
        ) : tavilyHito ? (
          <>
            <Campo etiqueta="Query enviada (Tavily)" valor={tavilyHito.query} />
            {tavilyHito.error ? (
              <Campo etiqueta="Error" valor={tavilyHito.error} />
            ) : (
              <Campo etiqueta="Resultado" valor={tavilyHito.resultado ?? '(sin resultados)'} />
            )}
          </>
        ) : (
          <p className="text-ink-soft">Sin punto conocido cerca — no se ha investigado nada.</p>
        )}
      </Bloque>
      {debug.arquitecturaRag && (
        <Bloque titulo="Arquitectura/urbanismo (RAG sobre el libro)" ms={debug.arquitecturaRag.ms}>
          <Campo etiqueta="Query enviada" valor={debug.arquitecturaRag.query} />
          {debug.arquitecturaRag.error ? (
            <Campo etiqueta="Error" valor={debug.arquitecturaRag.error} />
          ) : (
            <Campo etiqueta="Fragmentos encontrados" valor={debug.arquitecturaRag.resultado ?? '(sin resultados)'} />
          )}
        </Bloque>
      )}
      {debug.contextoRag && (
        <Bloque titulo="Situación general (RAG sobre el libro)" ms={debug.contextoRag.ms}>
          <Campo etiqueta="Query enviada" valor={debug.contextoRag.query} />
          {debug.contextoRag.error ? (
            <Campo etiqueta="Error" valor={debug.contextoRag.error} />
          ) : (
            <Campo etiqueta="Fragmentos encontrados" valor={debug.contextoRag.resultado ?? '(sin resultados)'} />
          )}
        </Bloque>
      )}
      {debug.capital && (
        <Bloque titulo="Recinto (dentro de capital conocida)">
          <p className="text-ink-soft">
            El punto cae dentro de <span className="font-semibold text-ink">{debug.capital.nombre}</span> ({debug.capital.lugar},{' '}
            {debug.capital.tipo}) — el texto y la imagen se centran en{' '}
            {debug.capital.tipo === 'palacio' ? 'la vida de palacio, con interior' : 'la vida ritual del templo'}.
          </p>
        </Bloque>
      )}
    </>
  );
}

function BloqueClaude({
  titulo,
  info,
}: {
  titulo: string;
  info?: {
    cache: boolean;
    ms?: number;
    modelo?: string;
    systemPrompt?: string;
    userPrompt?: string;
    respuesta?: unknown;
    sinTavily?: boolean;
    conHito?: boolean;
    conArquitecturaRag?: boolean;
    conContextoRag?: boolean;
  };
}) {
  const respuesta = info?.respuesta;
  const respuestaTexto = typeof respuesta === 'string' ? respuesta : respuesta != null ? JSON.stringify(respuesta, null, 2) : undefined;
  // conHito, conArquitecturaRag y conContextoRag pueden coincidir (el hito
  // ancla el evento, cada RAG ancla su parte) — se muestran todas las que
  // apliquen.
  const sinRag = !info?.conHito && !info?.conArquitecturaRag && !info?.conContextoRag;
  const notas = [
    info?.conHito && 'ilustra el hito',
    info?.conArquitecturaRag && 'arquitectura del libro',
    info?.conContextoRag && 'contexto del libro',
    sinRag && info?.sinTavily && 'sin búsqueda web',
  ].filter(Boolean) as string[];
  const nota = notas.length ? notas.join(' + ') : undefined;
  return (
    <Bloque titulo={titulo} cache={info?.cache} ms={info?.ms} nota={nota}>
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
      {debug.hitoConocido?.encontrado ? (
        <Bloque titulo="Evaluación del hito">
          <p className="text-ink-soft">No hace falta — el hito ya viene de un punto conocido (ver pestaña Búsqueda).</p>
        </Bloque>
      ) : (
        <BloqueClaude titulo="Evaluación del hito" info={debug.claudeHito} />
      )}
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
