'use client';

import { useState } from 'react';
import { StyleSelectorContent, type ImageStyle } from './StyleSelector';
import { UsagePanelContent } from './UsagePanel';
import { DebugPanelContent, type DebugInfo } from './DebugPanel';
import { HallazgosPanelContent } from './HallazgosPanel';
import { SugerenciasPanelContent } from './SugerenciasPanel';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/dictionary';

type ModelChoice = 'sonnet' | 'haiku';
type LengthChoice = 'extenso' | 'corto';
type ImageResolution = 'alta' | 'media' | 'baja';

type Pestaña = 'estilo' | 'ajustes' | 'debug' | 'idioma' | 'hallazgos' | 'sugerencias';
const PESTAÑAS: Pestaña[] = ['estilo', 'ajustes', 'idioma', 'debug', 'hallazgos', 'sugerencias'];

// Botón único (icono de engranaje) que agrupa lo que antes eran tres
// iconos sueltos sobre la foto (estilo, consumo/ajustes, debug) — se
// consolidaron porque, a diferencia del estilo, ninguno se abre a menudo,
// así que no compensaba el ruido visual de tres botones flotando sobre la
// imagen (petición del usuario).
export default function SettingsPanel({
  style,
  onStyleChange,
  debug,
  model,
  imageModel,
  length,
  resolution,
  onModelChange,
  onImageModelChange,
  onLengthChange,
  onResolutionChange,
  haySugerenciasNuevas,
  onAbrirSugerencias,
}: {
  style: ImageStyle;
  onStyleChange: (s: ImageStyle) => void;
  debug: DebugInfo | null;
  model: ModelChoice;
  imageModel: ModelChoice;
  length: LengthChoice;
  resolution: ImageResolution;
  onModelChange: (model: ModelChoice) => void;
  onImageModelChange: (model: ModelChoice) => void;
  onLengthChange: (length: LengthChoice) => void;
  onResolutionChange: (resolution: ImageResolution) => void;
  // Punto rojo sobre el icono cuando RevisorOpus ha dejado sugerencias
  // nuevas sin revisar — se limpia al abrir la pestaña "Sugerencias" (ver
  // más abajo), no solo al abrir el panel entero.
  haySugerenciasNuevas?: boolean;
  onAbrirSugerencias?: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pestaña, setPestaña] = useState<Pestaña>('estilo');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.settingsPanel.ajustes}
        className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-full border border-paper/35 bg-ink/55 text-paper backdrop-blur-sm"
      >
        <svg viewBox="0 0 24 24" className="h-4.25 w-4.25" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
        {haySugerenciasNuevas && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-paper bg-seal" aria-hidden />
        )}
      </button>

      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-lg flex-col rounded-xl border border-line bg-paper text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-brush text-lg font-semibold">{t.settingsPanel.ajustes}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t.settingsPanel.cerrar} className="text-ink-soft">
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1 px-5 pt-3">
              {PESTAÑAS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPestaña(p);
                    if (p === 'sugerencias' || p === 'hallazgos') onAbrirSugerencias?.();
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    pestaña === p ? 'bg-ink text-paper' : 'bg-paper-dark text-ink-soft'
                  }`}
                >
                  {t.settingsPanel.pestañas[p]}
                </button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-5 text-sm">
              {pestaña === 'estilo' && <StyleSelectorContent style={style} onStyleChange={onStyleChange} />}
              {pestaña === 'ajustes' && (
                <UsagePanelContent
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
              {pestaña === 'idioma' && <IdiomaSelectorContent />}
              {pestaña === 'debug' && <DebugPanelContent debug={debug} />}
              {pestaña === 'hallazgos' && <HallazgosPanelContent />}
              {pestaña === 'sugerencias' && <SugerenciasPanelContent />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const IDIOMAS: Lang[] = ['es', 'en', 'zh'];

function IdiomaSelectorContent() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="space-y-1">
      {IDIOMAS.map((valor) => (
        <button
          key={valor}
          type="button"
          onClick={() => setLang(valor)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
            lang === valor ? 'bg-ink font-semibold text-paper' : 'text-ink-soft'
          }`}
        >
          {valor === 'es' ? t.idiomaSelector.español : valor === 'en' ? t.idiomaSelector.ingles : t.idiomaSelector.chino}
        </button>
      ))}
    </div>
  );
}
