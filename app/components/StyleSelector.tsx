'use client';

import { useState } from 'react';

export type ImageStyle = 'fotorrealista' | 'ilustracion' | 'shanshui' | 'epoca';

const OPCIONES: { valor: ImageStyle; etiqueta: string }[] = [
  { valor: 'fotorrealista', etiqueta: 'Fotorrealista' },
  { valor: 'ilustracion', etiqueta: 'Ilustración realista' },
  { valor: 'shanshui', etiqueta: 'Pintura tradicional (shanshui)' },
  { valor: 'epoca', etiqueta: 'Estilo de su dinastía' },
];

// Botón + menú desplegable para elegir el estilo visual de la próxima
// imagen. Vive en la esquina de la foto (acceso directo, no enterrado en
// el panel de ajustes) porque es algo que se cambia a menudo, a diferencia
// del modelo/longitud del texto.
export default function StyleSelector({ style, onStyleChange }: { style: ImageStyle; onStyleChange: (s: ImageStyle) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Elegir estilo de imagen"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/35 bg-ink/55 text-paper backdrop-blur-sm"
      >
        <svg viewBox="0 0 24 24" className="h-4.25 w-4.25" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 6.5 17.5c.9-.78.5-2.24-.62-2.5a2 2 0 0 1-1.38-2.9c.3-.6.93-.96 1.6-.96H19a3 3 0 0 0 3-3c0-4.42-4.48-8-10-8Z" />
          <circle cx="7.5" cy="10.5" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="15.2" cy="7.3" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-line bg-paper p-1.5 text-ink shadow-xl">
            {OPCIONES.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => {
                  onStyleChange(o.valor);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  style === o.valor ? 'bg-ink font-semibold text-paper' : 'text-ink-soft'
                }`}
              >
                {o.etiqueta}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
