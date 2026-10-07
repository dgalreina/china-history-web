'use client';

import { useLanguage } from '../i18n/LanguageContext';

type ModelChoice = 'sonnet' | 'haiku';
type LengthChoice = 'extenso' | 'corto';
type ImageResolution = 'alta' | 'media' | 'baja';

// Toggles de generación (modelo de texto, modelo del prompt de imagen,
// longitud, resolución). Sin botón ni modal propios — vive dentro de la
// pestaña "Ajustes" del menú único (ver SettingsPanel.tsx).
export function UsagePanelContent({
  model,
  imageModel,
  length,
  resolution,
  onModelChange,
  onImageModelChange,
  onLengthChange,
  onResolutionChange,
  revisorOpusActivo,
  onRevisorOpusActivoChange,
}: {
  model: ModelChoice;
  imageModel: ModelChoice;
  length: LengthChoice;
  resolution: ImageResolution;
  onModelChange: (model: ModelChoice) => void;
  onImageModelChange: (model: ModelChoice) => void;
  onLengthChange: (length: LengthChoice) => void;
  onResolutionChange: (resolution: ImageResolution) => void;
  revisorOpusActivo: boolean;
  onRevisorOpusActivoChange: (activo: boolean) => void;
}) {
  const { t } = useLanguage();

  return (
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

      <div>
        <p className="mb-1 font-semibold">{t.usagePanel.revisorOpus}</p>
        <div className="flex gap-2">
          <ToggleButton etiqueta={t.usagePanel.activado} activo={revisorOpusActivo} onClick={() => onRevisorOpusActivoChange(true)} />
          <ToggleButton etiqueta={t.usagePanel.desactivado} activo={!revisorOpusActivo} onClick={() => onRevisorOpusActivoChange(false)} />
        </div>
      </div>

      <p className="text-xs text-ink-soft">{t.usagePanel.notaAplicacion}</p>
    </div>
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
