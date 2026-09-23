'use client';

import { useEffect, useState } from 'react';

type Usage = {
  mapLoads: number;
  geocodeCalls: number;
  tavilySearches: number;
  anthropicInputTokens: number;
  anthropicOutputTokens: number;
  anthropicRequests: number;
  openaiInputTokens: number;
  openaiOutputTokens: number;
  openaiImages: number;
  limites: { mapLoads: number; geocodeCalls: number; tavilySearches: number };
};

type ModelChoice = 'sonnet' | 'haiku';
type LengthChoice = 'extenso' | 'corto';
type ImageResolution = 'alta' | 'media' | 'baja';

// gpt-image-2.5-flare no publica precio por token desglosado (input/output)
// como sí hace dall-e-*. Esta tarifa es una aproximación gruesa: gasto total
// entre tokens totales que el propio usuario vio en su cuenta de OpenAI
// (2,12 $ / 9.182 tokens, 2026-09-17) — mezcla llamadas de distintos tamaños
// de imagen y no diferencia entrada de salida, así que solo sirve para
// hacerse una idea, no como coste exacto.
const APROX_USD_POR_MILLON_TOKENS_OPENAI = 231;
const APROX_USD_A_EUR = 0.92;

function costeAproxEur(inputTokens: number, outputTokens: number): string {
  const eur = ((inputTokens + outputTokens) / 1_000_000) * APROX_USD_POR_MILLON_TOKENS_OPENAI * APROX_USD_A_EUR;
  return eur.toLocaleString('es', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

// Sin botón ni modal propios — vive dentro de la pestaña "Ajustes" del
// menú único (ver SettingsPanel.tsx). Pide el consumo al montarse, o sea
// cada vez que se entra a esta pestaña (mismo comportamiento que antes,
// que pedía consumo fresco cada vez que se abría su propio panel).
export function UsagePanelContent({
  apiUrl,
  model,
  imageModel,
  length,
  resolution,
  onModelChange,
  onImageModelChange,
  onLengthChange,
  onResolutionChange,
}: {
  apiUrl: string;
  model: ModelChoice;
  imageModel: ModelChoice;
  length: LengthChoice;
  resolution: ImageResolution;
  onModelChange: (model: ModelChoice) => void;
  onImageModelChange: (model: ModelChoice) => void;
  onLengthChange: (length: LengthChoice) => void;
  onResolutionChange: (resolution: ImageResolution) => void;
}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`${apiUrl}/usage`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelado) setUsage(data);
      })
      .catch(() => {
        if (!cancelado) setError('No se ha podido consultar el consumo.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [apiUrl]);

  return (
    <>
      <div className="space-y-3 text-sm">
        <div>
          <p className="mb-1 font-semibold">Modelo (texto)</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta="Sonnet" activo={model === 'sonnet'} onClick={() => onModelChange('sonnet')} />
            <ToggleButton etiqueta="Haiku" activo={model === 'haiku'} onClick={() => onModelChange('haiku')} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">Modelo (prompt de imagen)</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta="Sonnet" activo={imageModel === 'sonnet'} onClick={() => onImageModelChange('sonnet')} />
            <ToggleButton etiqueta="Haiku" activo={imageModel === 'haiku'} onClick={() => onImageModelChange('haiku')} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">Longitud del texto</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta="Corto" activo={length === 'corto'} onClick={() => onLengthChange('corto')} />
            <ToggleButton etiqueta="Extenso" activo={length === 'extenso'} onClick={() => onLengthChange('extenso')} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">Resolución de imagen</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta="Alta" activo={resolution === 'alta'} onClick={() => onResolutionChange('alta')} />
            <ToggleButton etiqueta="Media" activo={resolution === 'media'} onClick={() => onResolutionChange('media')} />
            <ToggleButton etiqueta="Baja" activo={resolution === 'baja'} onClick={() => onResolutionChange('baja')} />
          </div>
        </div>

        <p className="text-xs text-ink-soft">
          Se aplica al próximo clic en el mapa. El modelo de imagen solo redacta el prompt visual en
          inglés (no se muestra) — no tiene por qué coincidir con el del texto. La resolución cambia el
          peso de la imagen (es de sobra con la más baja para móvil), pero no acelera la generación con
          este modelo — mira el panel de debug para comprobarlo.
        </p>
      </div>

      <hr className="my-4 border-line" />

      {loading && <p className="text-sm text-ink-soft">Cargando consumo...</p>}
      {error && <p className="text-sm text-ink-soft">{error}</p>}

      {usage && !loading && (
        <div className="space-y-3 text-sm">
          <Fila etiqueta="Cargas de mapa (Mapbox)" valor={usage.mapLoads} limite={usage.limites.mapLoads} />
          <Fila etiqueta="Geocodificación (Mapbox)" valor={usage.geocodeCalls} limite={usage.limites.geocodeCalls} />
          <Fila etiqueta="Búsquedas (Tavily)" valor={usage.tavilySearches} limite={usage.limites.tavilySearches} />

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold">Anthropic (Claude)</p>
            <p className="mt-1 text-ink-soft">{usage.anthropicRequests.toLocaleString('es')} llamadas</p>
            <p className="text-ink-soft">{usage.anthropicInputTokens.toLocaleString('es')} tokens de entrada</p>
            <p className="text-ink-soft">{usage.anthropicOutputTokens.toLocaleString('es')} tokens de salida</p>
          </div>

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold">OpenAI (imágenes)</p>
            <p className="mt-1 text-ink-soft">{usage.openaiImages.toLocaleString('es')} imágenes generadas</p>
            <p className="text-ink-soft">{usage.openaiInputTokens.toLocaleString('es')} tokens de entrada</p>
            <p className="text-ink-soft">{usage.openaiOutputTokens.toLocaleString('es')} tokens de salida</p>
            <p className="mt-1 font-semibold text-seal">
              ≈ {costeAproxEur(usage.openaiInputTokens, usage.openaiOutputTokens)} aprox.
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Estimación muy aproximada (no hay precio oficial por token publicado) — compara con el gasto
              real en <span className="whitespace-nowrap">platform.openai.com/usage</span>.
            </p>
          </div>

          <p className="text-xs text-ink-soft">
            Contador propio desde que existe la app (no la facturación oficial de cada proveedor).
          </p>
        </div>
      )}
    </>
  );
}

function ToggleButton({ etiqueta, activo, onClick }: { etiqueta: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        activo ? 'border-seal bg-seal text-paper' : 'border-line bg-transparent text-ink-soft'
      }`}
    >
      {etiqueta}
    </button>
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
