'use client';

import { useState } from 'react';
import { StyleSelectorContent, type ImageStyle } from './StyleSelector';
import { UsagePanelContent } from './UsagePanel';
import { DebugPanelContent, type DebugInfo } from './DebugPanel';

type ModelChoice = 'sonnet' | 'haiku';
type LengthChoice = 'extenso' | 'corto';
type ImageResolution = 'alta' | 'media' | 'baja';

type Pestaña = 'estilo' | 'ajustes' | 'debug';
const PESTAÑAS: Pestaña[] = ['estilo', 'ajustes', 'debug'];
const ETIQUETA_PESTAÑA: Record<Pestaña, string> = { estilo: 'Estilo', ajustes: 'Ajustes', debug: 'Debug' };

// Botón único (icono de engranaje) que agrupa lo que antes eran tres
// iconos sueltos sobre la foto (estilo, consumo/ajustes, debug) — se
// consolidaron porque, a diferencia del estilo, ninguno se abre a menudo,
// así que no compensaba el ruido visual de tres botones flotando sobre la
// imagen (petición del usuario).
export default function SettingsPanel({
  style,
  onStyleChange,
  debug,
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
  style: ImageStyle;
  onStyleChange: (s: ImageStyle) => void;
  debug: DebugInfo | null;
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
  const [open, setOpen] = useState(false);
  const [pestaña, setPestaña] = useState<Pestaña>('estilo');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ajustes"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-paper/35 bg-ink/55 text-paper backdrop-blur-sm"
      >
        <svg viewBox="0 0 24 24" className="h-4.25 w-4.25" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-xl border border-line bg-paper text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-brush text-lg font-semibold">Ajustes</h2>
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
              {pestaña === 'estilo' && <StyleSelectorContent style={style} onStyleChange={onStyleChange} />}
              {pestaña === 'ajustes' && (
                <UsagePanelContent
                  apiUrl={apiUrl}
                  model={model}
                  imageModel={imageModel}
                  length={length}
                  resolution={resolution}
                  onModelChange={onModelChange}
                  onImageModelChange={onImageModelChange}
                  onLengthChange={onLengthChange}
                  onResolutionChange={onResolutionChange}
                />
              )}
              {pestaña === 'debug' && <DebugPanelContent debug={debug} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
