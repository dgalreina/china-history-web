'use client';

export type Result = {
  lugar: string;
  año: string;
  contexto_ambiental: string;
  hito: { existe: boolean; descripcion: string; fiabilidad: string } | null;
  imagen_url: string | null;
};

const fiabilidadColor: Record<string, string> = {
  alta: '#2e7d32',
  media: '#f9a825',
  baja: '#c62828',
};

export default function ResultCard({ result }: { result: Result | null }) {
  if (!result) return null;

  return (
    <div className="mt-2 rounded-xl border border-line bg-paper/95 p-4 text-ink shadow-lg backdrop-blur-sm">
      <h3 className="font-brush font-semibold">{result.lugar} — {result.año}</h3>
      <p className="mt-1 text-sm text-ink-soft">{result.contexto_ambiental}</p>
      {result.hito?.existe && (
        <p className="mt-1 text-sm" style={{ color: fiabilidadColor[result.hito.fiabilidad] || '#666' }}>
          🔹 {result.hito.descripcion} (fiabilidad: {result.hito.fiabilidad})
        </p>
      )}
      {result.imagen_url && (
        <img src={result.imagen_url} alt="Reconstrucción histórica" className="mt-2 max-w-full rounded-lg" />
      )}
    </div>
  );
}