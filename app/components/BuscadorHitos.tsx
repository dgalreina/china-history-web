'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatYear } from './DynastyTimeline';

type HitoFeature = {
  properties: { titulo: string; lugar: string; year: number };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

// Botón (lupa) + panel para saltar directo a cualquiera de los ~1000
// hitos conocidos (los mismos puntos dorados del mapa, ver
// scripts/export-hitos-geojson.mjs) buscando por texto, sin tener que
// encontrarlo a ojo — mismo mecanismo que "hitos futuros/cercanos" en
// TextoPanel (onSaltarAHito). Van separados (no como un único componente
// con su propio desplegable) porque el botón vive en la fila pequeña
// junto al conmutador Mapa/Texto, mientras que el panel necesita anclarse
// a todo el contenedor mapa/texto — si viviera dentro de esa fila (que es
// `position: absolute`), el panel se recortaría a su tamaño en vez de
// ocupar la parte de abajo del panel grande.
export function BuscadorHitosBoton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Buscar un hito"
      aria-expanded={open}
      className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-line bg-paper/80 text-ink-soft shadow-sm backdrop-blur-sm"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    </button>
  );
}

export function BuscadorHitosPanel({
  open,
  onClose,
  onSaltarAHito,
}: {
  open: boolean;
  onClose: () => void;
  onSaltarAHito: (lat: number, lng: number, año: number) => void;
}) {
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

  const filtrados = useMemo(() => {
    if (!hitos) return [];
    const lista = [...hitos].sort((a, b) => a.properties.year - b.properties.year);
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((h) => `${h.properties.titulo} ${h.properties.lugar}`.toLowerCase().includes(q));
  }, [hitos, busqueda]);

  if (!open) return null;

  const elegir = (h: HitoFeature) => {
    const [lng, lat] = h.geometry.coordinates;
    onSaltarAHito(lat, lng, h.properties.year);
    onClose();
  };

  return (
    <>
      <div className="absolute inset-0 z-20 bg-ink/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[70%] flex-col rounded-t-2xl border-t border-line bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
          <h2 className="font-brush text-base font-semibold text-ink">Buscar hito</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-soft">
            ✕
          </button>
        </div>

        <div className="px-4 pb-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o lugar..."
            autoFocus
            className="w-full rounded-full border border-line bg-paper-dark px-3.5 py-1.5 text-sm text-ink outline-none placeholder:text-stone"
          />
        </div>

        <div className="sin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {cargando && <p className="py-4 text-center text-sm text-ink-soft">Cargando hitos...</p>}
          {!cargando && filtrados.length === 0 && <p className="py-4 text-center text-sm text-ink-soft">Sin resultados.</p>}
          {filtrados.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => elegir(h)}
              className="block w-full rounded-lg px-2 py-2 text-left text-sm text-ink-soft hover:bg-paper-dark"
            >
              <span className="font-semibold text-ink">{formatYear(h.properties.year)}</span>
              {' · '}
              {h.properties.lugar}: {h.properties.titulo}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
