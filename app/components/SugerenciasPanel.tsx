'use client';

import { useEffect, useState } from 'react';
import { Bloque } from './DebugPanel';

// En local usa el backend de tu máquina; en producción, NEXT_PUBLIC_API_URL
// (mismo one-liner que page.tsx:16 — no hay un módulo compartido en el
// proyecto para una sola constante).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Estado = 'pendiente' | 'aplicada' | 'descartada';

type Sugerencia = {
  _id: string;
  objetivo: 'promptHistoriadorClaude' | 'promptGeneradorImagen';
  texto: string;
  estado: Estado;
};

type Critica = {
  _id: string;
  imagenUrl: string;
  placeKey: string;
  year: number;
  sugerencias: Sugerencia[];
};

const ETIQUETA_OBJETIVO: Record<Sugerencia['objetivo'], string> = {
  promptHistoriadorClaude: 'Prompt del historiador (Claude)',
  promptGeneradorImagen: 'Prompt del generador de imagen (OpenAI)',
};

const ETIQUETA_ESTADO: Record<Estado, string> = { pendiente: 'Pendiente', aplicada: 'Aplicada', descartada: 'Descartada' };
const COLOR_ESTADO: Record<Estado, string> = {
  pendiente: 'bg-paper-dark text-ink-soft',
  aplicada: 'bg-seal/15 text-seal',
  descartada: 'bg-paper-dark text-stone line-through',
};

// Pestaña "Sugerencias" del panel de Ajustes — herramienta de desarrollador,
// fija en español (igual que Debug, ver SettingsPanel.tsx). A diferencia de
// "Hallazgos" (lo que RevisorOpus ha ido viendo, solo lectura), aquí se
// decide qué hacer con cada propuesta de cambio de prompt: marcarla como
// aplicada o descartada (anotación propia, NUNCA toca el prompt real — eso
// se sigue haciendo a mano en el código, como toda la sesión) o borrarla.
export function SugerenciasPanelContent() {
  const [criticas, setCriticas] = useState<Critica[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (criticas !== null) return;
    fetch(`${API_URL}/historical-agent/criticas`)
      .then((res) => res.json())
      .then(setCriticas)
      .catch(() => setError('No se han podido cargar las sugerencias.'));
  }, [criticas]);

  if (error) return <p className="text-ink-soft">{error}</p>;
  if (!criticas) return <p className="text-ink-soft">Cargando…</p>;
  const conSugerencias = criticas.filter((c) => c.sugerencias.length > 0);
  if (conSugerencias.length === 0) return <p className="text-ink-soft">Sin sugerencias todavía — RevisorOpus solo escribe aquí cuando encuentra algo.</p>;

  const cambiarEstado = async (criticaId: string, sugerenciaId: string, estado: Estado) => {
    setCriticas((cs) =>
      (cs ?? []).map((c) =>
        c._id === criticaId ? { ...c, sugerencias: c.sugerencias.map((s) => (s._id === sugerenciaId ? { ...s, estado } : s)) } : c,
      ),
    );
    await fetch(`${API_URL}/historical-agent/criticas/${criticaId}/sugerencias/${sugerenciaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
  };

  const borrar = async (criticaId: string, sugerenciaId: string) => {
    await fetch(`${API_URL}/historical-agent/criticas/${criticaId}/sugerencias/${sugerenciaId}`, { method: 'DELETE' });
    setCriticas((cs) =>
      (cs ?? []).map((c) => (c._id === criticaId ? { ...c, sugerencias: c.sugerencias.filter((s) => s._id !== sugerenciaId) } : c)),
    );
  };

  const editarTexto = (criticaId: string, sugerenciaId: string, texto: string) => {
    setCriticas((cs) =>
      (cs ?? []).map((c) =>
        c._id === criticaId ? { ...c, sugerencias: c.sugerencias.map((s) => (s._id === sugerenciaId ? { ...s, texto } : s)) } : c,
      ),
    );
  };

  const guardarTexto = async (criticaId: string, sugerencia: Sugerencia) => {
    await fetch(`${API_URL}/historical-agent/criticas/${criticaId}/sugerencias/${sugerencia._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: sugerencia.texto }),
    });
  };

  return (
    <div>
      {conSugerencias.map((critica) => (
        <Bloque key={critica._id} titulo={`${critica.placeKey} · año ${critica.year}`}>
          <div className="space-y-3">
            {critica.sugerencias.map((s) => (
              <div key={s._id} className="rounded-lg border border-line p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-paper-dark px-2 py-0.5 text-[11px] text-ink-soft">{ETIQUETA_OBJETIVO[s.objetivo]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_ESTADO[s.estado]}`}>{ETIQUETA_ESTADO[s.estado]}</span>
                </div>
                <textarea
                  value={s.texto}
                  onChange={(e) => editarTexto(critica._id, s._id, e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-lg border border-line bg-paper-dark p-2 text-xs"
                />
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => guardarTexto(critica._id, s)}
                    className="rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-paper"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarEstado(critica._id, s._id, 'aplicada')}
                    className="rounded-full bg-seal px-3 py-1 text-[11px] font-semibold text-paper"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarEstado(critica._id, s._id, 'descartada')}
                    className="rounded-full bg-paper-dark px-3 py-1 text-[11px] font-semibold text-ink-soft"
                  >
                    No aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(critica._id, s._id)}
                    className="rounded-full bg-paper-dark px-3 py-1 text-[11px] font-semibold text-stone"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Bloque>
      ))}
    </div>
  );
}
