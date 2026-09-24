'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatYear } from './DynastyTimeline';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/dictionary';

type HitoFeature = {
  properties: {
    titulo: string;
    lugar: string;
    year: number;
    y0: number;
    y1: number;
    titulo_en?: string;
    lugar_en?: string;
    titulo_zh?: string;
    lugar_zh?: string;
  };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

// Recintos reales (Ciudad Prohibida, templos, mansiones nobiliarias — ver
// china-history-api/data/capitales/capitales.json), solo la feature
// "punto" de cada uno (el centroide, o su propio punto si no tienen
// polígono — ver export-capitales-geojson.mjs), no el polígono en sí. Sin
// traducción propia (el dataset es pequeño y siempre en español, a
// diferencia de los ~1000 hitos) — el nombre/lugar salen igual en los 3
// idiomas.
type CapitalFeature = {
  properties: { tipo: 'recinto' | 'punto'; categoria: 'palacio' | 'templo' | 'mansion'; nombre: string; lugar: string; y0: number; y1: number };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

// Traducción en batch (ver china-history-api/scripts/translate-hitos.mjs) —
// un hito sin traducir (o si falló esa entrada) cae a los campos en
// español, igual que hace el backend con hitos_conocidos.
function tituloLugar(props: HitoFeature['properties'], lang: Lang): { titulo: string; lugar: string } {
  if (lang === 'en') return { titulo: props.titulo_en ?? props.titulo, lugar: props.lugar_en ?? props.lugar };
  if (lang === 'zh') return { titulo: props.titulo_zh ?? props.titulo, lugar: props.lugar_zh ?? props.lugar };
  return { titulo: props.titulo, lugar: props.lugar };
}

// Botón (lupa) + pantalla completa para saltar directo a cualquiera de los
// ~1000 hitos conocidos (los mismos puntos dorados del mapa, ver
// scripts/export-hitos-geojson.mjs) buscando por texto o año, sin tener
// que encontrarlo a ojo — mismo mecanismo que "hitos futuros/cercanos" en
// TextoPanel (onSaltarAHito). No es un popup: ocupa toda la mitad mapa/
// texto igual que TextoPanel, para no dar sensación de ventana flotante
// (y de paso evita líos de recorte en móvil que sí tenía como popup). El
// botón cambia de lupa a "cerrar" mientras está abierto.
export function BuscadorHitosBoton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? t.buscadorHitos.cerrarBusqueda : t.buscadorHitos.buscarUnHito}
      aria-expanded={open}
      className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-line bg-paper/80 text-ink-soft shadow-sm backdrop-blur-sm"
    >
      {open ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      )}
    </button>
  );
}

export function BuscadorHitosPanel({
  open,
  onClose,
  year,
  onSaltarAHito,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  onSaltarAHito: (lat: number, lng: number, año: number) => void;
}) {
  const { lang, t } = useLanguage();
  const [hitos, setHitos] = useState<HitoFeature[] | null>(null);
  const [capitales, setCapitales] = useState<CapitalFeature[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  // Derivado de `hitos`/`capitales` en vez de un estado propio: mientras no
  // llegan (null) y el panel está abierto, se está cargando — evita el
  // setState síncrono al inicio del efecto de abajo.
  const cargando = open && (hitos === null || capitales === null);

  // Se carga la primera vez que se abre, no en cada montaje de la página
  // — son ~1000 hitos, no hace falta pedirlos si nunca se usa el buscador.
  useEffect(() => {
    if (!open) return;
    if (!hitos) {
      fetch('/data/hitos.geojson')
        .then((res) => res.json())
        .then((geojson) => setHitos(geojson.features))
        .catch(() => setHitos([]));
    }
    if (!capitales) {
      fetch('/data/capitales.geojson')
        .then((res) => res.json())
        .then((geojson) => setCapitales(geojson.features.filter((f: CapitalFeature) => f.properties.tipo === 'punto')))
        .catch(() => setCapitales([]));
    }
  }, [open, hitos, capitales]);

  // Sin nada escrito: los hitos del año elegido en el slider (los mismos
  // que aparecen como punto en el mapa ahí mismo, y0/y1 ya traen la misma
  // tolerancia de ±25 años) + los recintos (palacio/templo/mansión)
  // vigentes ese año exacto (sin tolerancia, igual que en el mapa). Si se
  // escribe un año, lo mismo pero para ESE año. Si se escribe texto, busca
  // por nombre/lugar en TODOS los años — ya no importa el año elegido, se
  // está buscando algo concreto.
  const hitosFiltrados = useMemo(() => {
    if (!hitos) return [];
    const q = busqueda.trim();
    const añoBuscado = q && /^-?\d+$/.test(q) ? Number(q) : q ? null : year;
    const lista =
      añoBuscado !== null
        ? hitos.filter((h) => h.properties.y0 <= añoBuscado && añoBuscado <= h.properties.y1)
        : hitos.filter((h) => {
            const { titulo, lugar } = tituloLugar(h.properties, lang);
            return `${titulo} ${lugar}`.toLowerCase().includes(q.toLowerCase());
          });
    return [...lista].sort((a, b) => a.properties.year - b.properties.year);
  }, [hitos, busqueda, year, lang]);

  const capitalesFiltrados = useMemo(() => {
    if (!capitales) return [];
    const q = busqueda.trim();
    const añoBuscado = q && /^-?\d+$/.test(q) ? Number(q) : q ? null : year;
    const lista =
      añoBuscado !== null
        ? capitales.filter((c) => c.properties.y0 <= añoBuscado && añoBuscado <= c.properties.y1)
        : capitales.filter((c) => `${c.properties.nombre} ${c.properties.lugar}`.toLowerCase().includes(q.toLowerCase()));
    return [...lista].sort((a, b) => a.properties.y0 - b.properties.y0);
  }, [capitales, busqueda, year]);

  if (!open) return null;

  const elegirHito = (h: HitoFeature) => {
    const [lng, lat] = h.geometry.coordinates;
    onSaltarAHito(lat, lng, h.properties.year);
    onClose();
  };

  // Los recintos no tienen un año único (viven y0-y1): salta al año que ya
  // está eligiendo el usuario si cae dentro de su vigencia, si no al
  // primer año en que existió.
  const elegirCapital = (c: CapitalFeature) => {
    const [lng, lat] = c.geometry.coordinates;
    const añoDestino = Math.min(Math.max(year, c.properties.y0), c.properties.y1);
    onSaltarAHito(lat, lng, añoDestino);
    onClose();
  };

  const CATEGORIA_LABEL: Record<CapitalFeature['properties']['categoria'], string> = {
    palacio: t.buscadorHitos.categoriaPalacio,
    templo: t.buscadorHitos.categoriaTemplo,
    mansion: t.buscadorHitos.categoriaMansion,
  };

  return (
    <div className="absolute inset-0 z-3 bg-paper">
      <div className="sin-scrollbar h-full overflow-y-auto px-4 pb-32 pt-12 text-sm">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t.buscadorHitos.placeholder}
          className="mb-3 w-full rounded-full border border-line bg-paper-dark px-3.5 py-1.5 text-ink outline-none placeholder:text-stone"
        />

        {cargando && <p className="py-4 text-center text-ink-soft">{t.buscadorHitos.cargandoHitos}</p>}
        {!cargando && hitosFiltrados.length === 0 && capitalesFiltrados.length === 0 && (
          <p className="py-4 text-center text-ink-soft">{t.buscadorHitos.sinResultados}</p>
        )}
        {/* Recintos (palacio/templo/mansión) primero, en caja rojiza para
            distinguirlos de los hitos — mismo mecanismo de filtro por
            año/texto, pero sin traducción propia (dataset pequeño, siempre
            en español). Luego los hitos, con el mismo recuadro que
            "hitos futuros/cercanos" en TextoPanel (FilaHitoRelacionado) —
            para que se note que son pulsables, no texto suelto. */}
        <div className="flex flex-col gap-1.5">
          {capitalesFiltrados.map((c, i) => (
            <button
              key={`capital-${i}`}
              type="button"
              onClick={() => elegirCapital(c)}
              className="w-full rounded-lg border border-seal/25 bg-seal/10 px-3 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-seal/20"
            >
              <span className="font-semibold text-ink">
                {formatYear(c.properties.y0, lang)}–{formatYear(c.properties.y1, lang)}
              </span>
              {' · '}
              <span className="text-seal">{CATEGORIA_LABEL[c.properties.categoria]}</span>
              {' · '}
              {c.properties.lugar}: {c.properties.nombre}
            </button>
          ))}
          {hitosFiltrados.map((h, i) => {
            const { titulo, lugar } = tituloLugar(h.properties, lang);
            return (
              <button
                key={`hito-${i}`}
                type="button"
                onClick={() => elegirHito(h)}
                className="w-full rounded-lg bg-paper-dark px-3 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-line/50"
              >
                <span className="font-semibold text-ink">{formatYear(h.properties.year, lang)}</span>
                {' · '}
                {lugar}: {titulo}
              </button>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent via-paper/90 to-paper" />
    </div>
  );
}
