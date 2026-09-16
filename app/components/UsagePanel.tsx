'use client';

import { useState } from 'react';

type Usage = {
  mapLoads: number;
  geocodeCalls: number;
  tavilySearches: number;
  anthropicInputTokens: number;
  anthropicOutputTokens: number;
  anthropicRequests: number;
  limites: { mapLoads: number; geocodeCalls: number; tavilySearches: number };
};

export default function UsagePanel({ apiUrl }: { apiUrl: string }) {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/usage`);
      setUsage(await res.json());
    } catch {
      setError('No se ha podido consultar el consumo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Ver consumo de APIs"
        className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper shadow"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 15l4-6 3 3 5-8" />
        </svg>
      </button>

      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-line bg-paper p-5 text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-brush text-lg font-semibold">Consumo</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-ink-soft">
                ✕
              </button>
            </div>

            {loading && <p className="mt-3 text-sm text-ink-soft">Cargando...</p>}
            {error && <p className="mt-3 text-sm text-ink-soft">{error}</p>}

            {usage && !loading && (
              <div className="mt-4 space-y-3 text-sm">
                <Fila etiqueta="Cargas de mapa (Mapbox)" valor={usage.mapLoads} limite={usage.limites.mapLoads} />
                <Fila etiqueta="Geocodificación (Mapbox)" valor={usage.geocodeCalls} limite={usage.limites.geocodeCalls} />
                <Fila etiqueta="Búsquedas (Tavily)" valor={usage.tavilySearches} limite={usage.limites.tavilySearches} />

                <div className="rounded-lg border border-line p-3">
                  <p className="font-semibold">Anthropic (Claude)</p>
                  <p className="mt-1 text-ink-soft">{usage.anthropicRequests.toLocaleString('es')} llamadas</p>
                  <p className="text-ink-soft">{usage.anthropicInputTokens.toLocaleString('es')} tokens de entrada</p>
                  <p className="text-ink-soft">{usage.anthropicOutputTokens.toLocaleString('es')} tokens de salida</p>
                </div>

                <p className="text-xs text-ink-soft">
                  Contador propio desde que existe la app (no la facturación oficial de cada proveedor).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Fila({ etiqueta, valor, limite }: { etiqueta: string; valor: number; limite: number }) {
  const pct = Math.min(100, (valor / limite) * 100);
  return (
    <div>
      <div className="flex justify-between">
        <span>{etiqueta}</span>
        <span className="text-ink-soft">
          {valor.toLocaleString('es')} / {limite.toLocaleString('es')}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-seal" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
