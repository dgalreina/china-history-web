'use client';

export type ImageStyle = 'fotorrealista' | 'ilustracion' | 'shanshui' | 'epoca';

const OPCIONES: { valor: ImageStyle; etiqueta: string }[] = [
  { valor: 'fotorrealista', etiqueta: 'Fotorrealista' },
  { valor: 'ilustracion', etiqueta: 'Ilustración realista' },
  { valor: 'shanshui', etiqueta: 'Pintura tradicional (shanshui)' },
  { valor: 'epoca', etiqueta: 'Estilo de su dinastía' },
];

// Lista de opciones para elegir el estilo visual de la próxima imagen. Sin
// botón/menú propio — vive dentro de la pestaña "Estilo" del menú único de
// ajustes (ver SettingsPanel.tsx). Antes tenía su propio icono de acceso
// directo sobre la foto (se cambia a menudo); se consolidó con
// debug/consumo en un solo botón a petición del usuario.
export function StyleSelectorContent({ style, onStyleChange }: { style: ImageStyle; onStyleChange: (s: ImageStyle) => void }) {
  return (
    <div className="space-y-1">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onStyleChange(o.valor)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
            style === o.valor ? 'bg-ink font-semibold text-paper' : 'text-ink-soft'
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
