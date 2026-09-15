'use client';
import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import DynastyTimeline from './components/DynastyTimeline';
import ResultCard from './components/ResultCard';

const API_URL = 'http://localhost:4000';

export default function Home() {
  const [year, setYear] = useState(1900);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/historical-agent/query?lat=${lat}&lng=${lng}&year=${year}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Error al consultar el backend:', err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView onClick={handleMapClick} />

      {!loading && !result && (
        <h1 className="pointer-events-none absolute left-4 top-4 font-brush text-lg font-semibold tracking-wide text-paper drop-shadow-md sm:left-6 sm:top-6">
          China History
        </h1>
      )}

      {(loading || result) && (
        <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center sm:inset-x-6 sm:top-6">
          <div className="pointer-events-auto w-full max-w-md">
            {loading && (
              <p className="rounded-xl border border-line bg-paper/95 p-4 text-sm text-ink-soft shadow-lg backdrop-blur-sm">
                Cargando...
              </p>
            )}
            {!loading && <ResultCard result={result} />}
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-6 bottom-16 sm:inset-x-10">
        <DynastyTimeline year={year} onChange={setYear} />
      </div>
    </main>
  );
}