'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/dictionary';

type Usage = {
  mapLoads: number;
  geocodeCalls: number;
  anthropicInputTokens: number;
  anthropicOutputTokens: number;
  anthropicRequests: number;
  openaiInputTokens: number;
  openaiOutputTokens: number;
  openaiImages: number;
  limites: { mapLoads: number; geocodeCalls: number };
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

function costeAproxEur(inputTokens: number, outputTokens: number, lang: Lang): string {
  const eur = ((inputTokens + outputTokens) / 1_000_000) * APROX_USD_POR_MILLON_TOKENS_OPENAI * APROX_USD_A_EUR;
  return eur.toLocaleString(lang, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
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
  const { lang, t } = useLanguage();
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
        if (!cancelado) setError(t.usagePanel.errorConsumo);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [apiUrl, t]);

  return (
    <>
      <div className="space-y-3 text-sm">
        <div>
          <p className="mb-1 font-semibold">{t.usagePanel.modeloTexto}</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta={t.usagePanel.sonnet} activo={model === 'sonnet'} onClick={() => onModelChange('sonnet')} />
            <ToggleButton etiqueta={t.usagePanel.haiku} activo={model === 'haiku'} onClick={() => onModelChange('haiku')} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">{t.usagePanel.modeloPromptImagen}</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta={t.usagePanel.sonnet} activo={imageModel === 'sonnet'} onClick={() => onImageModelChange('sonnet')} />
            <ToggleButton etiqueta={t.usagePanel.haiku} activo={imageModel === 'haiku'} onClick={() => onImageModelChange('haiku')} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">{t.usagePanel.longitudTexto}</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta={t.usagePanel.corto} activo={length === 'corto'} onClick={() => onLengthChange('corto')} />
            <ToggleButton etiqueta={t.usagePanel.extenso} activo={length === 'extenso'} onClick={() => onLengthChange('extenso')} />
          </div>
        </div>

        <div>
          <p className="mb-1 font-semibold">{t.usagePanel.resolucionImagen}</p>
          <div className="flex gap-2">
            <ToggleButton etiqueta={t.usagePanel.alta} activo={resolution === 'alta'} onClick={() => onResolutionChange('alta')} />
            <ToggleButton etiqueta={t.usagePanel.media} activo={resolution === 'media'} onClick={() => onResolutionChange('media')} />
            <ToggleButton etiqueta={t.usagePanel.baja} activo={resolution === 'baja'} onClick={() => onResolutionChange('baja')} />
          </div>
        </div>

        <p className="text-xs text-ink-soft">{t.usagePanel.notaAplicacion}</p>
      </div>

      <hr className="my-4 border-line" />

      {loading && <p className="text-sm text-ink-soft">{t.usagePanel.cargandoConsumo}</p>}
      {error && <p className="text-sm text-ink-soft">{error}</p>}

      {usage && !loading && (
        <div className="space-y-3 text-sm">
          <Fila etiqueta={t.usagePanel.cargasDeMapa} valor={usage.mapLoads} limite={usage.limites.mapLoads} lang={lang} />
          <Fila etiqueta={t.usagePanel.geocodificacion} valor={usage.geocodeCalls} limite={usage.limites.geocodeCalls} lang={lang} />

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold">{t.usagePanel.anthropicTitulo}</p>
            <p className="mt-1 text-ink-soft">{usage.anthropicRequests.toLocaleString(lang)} {t.usagePanel.llamadas}</p>
            <p className="text-ink-soft">{usage.anthropicInputTokens.toLocaleString(lang)} {t.usagePanel.tokensEntrada}</p>
            <p className="text-ink-soft">{usage.anthropicOutputTokens.toLocaleString(lang)} {t.usagePanel.tokensSalida}</p>
          </div>

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold">{t.usagePanel.openaiTitulo}</p>
            <p className="mt-1 text-ink-soft">{usage.openaiImages.toLocaleString(lang)} {t.usagePanel.imagenesGeneradas}</p>
            <p className="text-ink-soft">{usage.openaiInputTokens.toLocaleString(lang)} {t.usagePanel.tokensEntrada}</p>
            <p className="text-ink-soft">{usage.openaiOutputTokens.toLocaleString(lang)} {t.usagePanel.tokensSalida}</p>
            <p className="mt-1 font-semibold text-seal">
              {t.usagePanel.costeAprox(costeAproxEur(usage.openaiInputTokens, usage.openaiOutputTokens, lang))}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{t.usagePanel.notaEstimacion}</p>
          </div>

          <p className="text-xs text-ink-soft">{t.usagePanel.notaContador}</p>
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

function Fila({ etiqueta, valor, limite, lang }: { etiqueta: string; valor: number; limite: number; lang: Lang }) {
  const pct = Math.min(100, (valor / limite) * 100);
  return (
    <div>
      <div className="flex justify-between">
        <span>{etiqueta}</span>
        <span className="text-ink-soft">
          {valor.toLocaleString(lang)} / {limite.toLocaleString(lang)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-seal" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
