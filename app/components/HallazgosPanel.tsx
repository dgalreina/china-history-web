'use client';

import { useEffect, useState } from 'react';
import { Bloque, Campo } from './DebugPanel';

// En local usa el backend de tu máquina; en producción, NEXT_PUBLIC_API_URL
// (mismo one-liner que page.tsx:16 — no hay un módulo compartido en el
// proyecto para una sola constante).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Critica = {
  _id: string;
  imagenUrl: string;
  placeKey: string;
  year: number;
  hallazgos: string[];
};

// Pestaña "Hallazgos" del panel de Ajustes — herramienta de desarrollador,
// fija en español (igual que Debug, ver SettingsPanel.tsx). Solo lectura:
// lo que ha ido viendo RevisorOpus al revisar imágenes recién generadas
// (ver criticarImagen en el backend), sin las acciones de la pestaña
// "Sugerencias" — separadas para no mezclar "esto es lo que vi" con "esto
// es lo que habría que cambiar".
export function HallazgosPanelContent() {
  const [criticas, setCriticas] = useState<Critica[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (criticas !== null) return;
    fetch(`${API_URL}/historical-agent/criticas`)
      .then((res) => res.json())
      .then(setCriticas)
      .catch(() => setError('No se han podido cargar los hallazgos.'));
  }, [criticas]);

  if (error) return <p className="text-ink-soft">{error}</p>;
  if (!criticas) return <p className="text-ink-soft">Cargando…</p>;
  const conHallazgos = criticas.filter((c) => c.hallazgos.length > 0);
  if (conHallazgos.length === 0) return <p className="text-ink-soft">Sin hallazgos todavía — RevisorOpus solo escribe aquí cuando ve algo.</p>;

  return (
    <div>
      {conHallazgos.map((critica) => (
        <HallazgoTarjeta key={critica._id} critica={critica} />
      ))}
    </div>
  );
}

function HallazgoTarjeta({ critica }: { critica: Critica }) {
  const [ampliada, setAmpliada] = useState(false);

  return (
    <Bloque titulo={`${critica.placeKey} · año ${critica.year}`}>
      <button type="button" onClick={() => setAmpliada((v) => !v)} className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={critica.imagenUrl}
          alt="Imagen revisada"
          className={ampliada ? 'w-full max-h-[60vh] rounded-lg object-contain' : 'h-24 rounded-lg object-cover'}
        />
      </button>
      <Campo
        etiqueta="Hallazgos"
        valor={
          <ul className="list-disc space-y-1 pl-4">
            {critica.hallazgos.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        }
      />
    </Bloque>
  );
}
