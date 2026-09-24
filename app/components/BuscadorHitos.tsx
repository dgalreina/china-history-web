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
  const [busqueda, setBusqueda] = useState('');
  // Derivado de `hitos` en vez de un estado propio: mientras no llega
  // (null) y el panel está abierto, se está cargando — evita el
  // setState síncrono al inicio del efecto de abajo.
  const cargando = open && hitos === null;

  // Se carga la primera vez que se abre, no en cada montaje de la página
  // — son ~1000 hitos, no hace falta pedirlos si nunca se usa el buscador.
  useEffect(() => {
    if (!open || hitos) return;
    fetch('/data/hitos.geojson')
      .then((res) => res.json())
      .then((geojson) => setHitos(geojson.features))
      .catch(() => setHitos([]));
  }, [open, hitos]);

  // Sin nada escrito: los hitos del año elegido en el slider (los mismos
  // que aparecen como punto en el mapa ahí mismo, y0/y1 ya traen la misma
  // tolerancia de ±25 años). Si se escribe un año, los hitos de ESE año
  // (mismo criterio y0/y1). Si se escribe texto, busca por nombre/lugar
  // en TODOS los años — ya no importa el año elegido, se está buscando
  // algo concreto.
  const filtrados = useMemo(() => {
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

  if (!open) return null;

  const elegir = (h: HitoFeature) => {
    const [lng, lat] = h.geometry.coordinates;
    onSaltarAHito(lat, lng, h.properties.year);
    onClose();
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
        {!cargando && filtrados.length === 0 && <p className="py-4 text-center text-ink-soft">{t.buscadorHitos.sinResultados}</p>}
        {/* Mismo recuadro que "hitos futuros/cercanos" en TextoPanel
            (FilaHitoRelacionado) — para que se note que son pulsables, no
            texto suelto. */}
        <div className="flex flex-col gap-1.5">
          {filtrados.map((h, i) => {
            const { titulo, lugar } = tituloLugar(h.properties, lang);
            return (
              <button
                key={i}
                type="button"
                onClick={() => elegir(h)}
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
