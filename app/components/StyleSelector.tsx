'use client';

import { useLanguage } from '../i18n/LanguageContext';

export type ImageStyle = 'fotorrealista' | 'ilustracion' | 'shanshui' | 'epoca';

const VALORES: ImageStyle[] = ['fotorrealista', 'ilustracion', 'shanshui', 'epoca'];

// Lista de opciones para elegir el estilo visual de la próxima imagen. Sin
// botón/menú propio — vive dentro de la pestaña "Estilo" del menú único de
// ajustes (ver SettingsPanel.tsx). Antes tenía su propio icono de acceso
// directo sobre la foto (se cambia a menudo); se consolidó con
// debug/consumo en un solo botón a petición del usuario.
export function StyleSelectorContent({ style, onStyleChange }: { style: ImageStyle; onStyleChange: (s: ImageStyle) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-1">
      {VALORES.map((valor) => (
        <button
          key={valor}
          type="button"
          onClick={() => onStyleChange(valor)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
            style === valor ? 'bg-ink font-semibold text-paper' : 'text-ink-soft'
          }`}
        >
          {t.styleSelector[valor]}
        </button>
      ))}
    </div>
  );
}
