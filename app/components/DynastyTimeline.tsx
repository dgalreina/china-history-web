'use client';

const MIN_YEAR = -2000;
const MAX_YEAR = 2000;
const STEP = 10;

type Segment = {
  label: string;
  hanzi: string;
  start: number;
  end: number;
  color: string;
  // Mismo tono que `color` pero desplazado en luminosidad para que el
  // carácter se lea encima: más claro sobre fondos oscuros, más oscuro
  // sobre los pocos fondos ya de por sí claros (Han, Yuan, Song, Tang,
  // Reinos Combatientes) donde "más claro" se volvería ilegible.
  hanziColor: string;
  // EXPERIMENTO variante C+D: versión desaturada/terrosa de `color`, para
  // el único segmento resaltado cuando el resto de la barra va monocromo.
  colorTerroso: string;
};

// Fechas aproximadas (uso divulgativo, no académico) recortadas al rango
// -2000/2000 del slider. Las eras que el usuario no especificó (huecos
// entre dinastías) llevan un color elegido a criterio propio, distinto
// de las dinastías con color explícito.
const SEGMENTS: Segment[] = [
  { label: 'Xia', hanzi: '夏', start: -2000, end: -1600, color: '#2f5d8a', hanziColor: '#a9c9e8', colorTerroso: '#3a4a5a' },
  { label: 'Shang', hanzi: '商', start: -1600, end: -1046, color: '#1f7a6c', hanziColor: '#8fd9c4', colorTerroso: '#325041' },
  { label: 'Zhou', hanzi: '周', start: -1046, end: -475, color: '#b23a2f', hanziColor: '#f0b0a8', colorTerroso: '#78372d' },
  { label: 'Reinos Combatientes', hanzi: '战国', start: -475, end: -221, color: '#d98aa3', hanziColor: '#7a2f47', colorTerroso: '#824b5a' },
  { label: 'Qin', hanzi: '秦', start: -221, end: -206, color: '#1a1a1a', hanziColor: '#d6d6d6', colorTerroso: '#1e1914' },
  { label: 'Han', hanzi: '汉', start: -206, end: 220, color: '#f5f3ee', hanziColor: '#857e6d', colorTerroso: '#c8beb0' },
  { label: 'Tres Reinos / Jin / Sui', hanzi: '三国', start: 220, end: 618, color: '#6b4c8a', hanziColor: '#d9c4ee', colorTerroso: '#5f466e' },
  { label: 'Tang', hanzi: '唐', start: 618, end: 907, color: '#d9822b', hanziColor: '#7a4315', colorTerroso: '#a06932' },
  { label: 'Cinco Dinastías', hanzi: '五代', start: 907, end: 960, color: '#8a5a3a', hanziColor: '#e6c9ae', colorTerroso: '#6e5037' },
  { label: 'Song', hanzi: '宋', start: 960, end: 1279, color: '#8fae7c', hanziColor: '#33502a', colorTerroso: '#5a7d50' },
  { label: 'Yuan', hanzi: '元', start: 1279, end: 1368, color: '#e0b93c', hanziColor: '#7a5f1a', colorTerroso: '#b49137' },
  { label: 'Ming', hanzi: '明', start: 1368, end: 1644, color: '#1f4e79', hanziColor: '#a8c3dc', colorTerroso: '#2d4669' },
  { label: 'Qing', hanzi: '清', start: 1644, end: 1912, color: '#8c1f1f', hanziColor: '#e8a8a0', colorTerroso: '#782d2d' },
  { label: 'República', hanzi: '民国', start: 1912, end: 1949, color: '#3a8ca6', hanziColor: '#b7e0ec', colorTerroso: '#326e78' },
  { label: 'Comunismo', hanzi: '新中国', start: 1949, end: 2000, color: '#7d7a73', hanziColor: '#d4d2cc', colorTerroso: '#504b41' },
];

export function segmentAt(year: number) {
  return SEGMENTS.find((seg) => year >= seg.start && (year < seg.end || seg.end === MAX_YEAR)) ?? SEGMENTS[0];
}

// Por debajo de este ancho (en años) el carácter no cabe sin desbordar
// el segmento vecino, así que se omite y solo queda el color + tooltip.
const LABEL_MIN_SPAN = 80;

export function formatYear(year: number) {
  if (year < 0) return `${-year} a.C.`;
  return `${year} d.C.`;
}

export default function DynastyTimeline({ year, onChange }: { year: number; onChange: (year: number) => void }) {
  const percent = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const current = segmentAt(year);

  return (
    <div className="relative h-12 w-full select-none">
      <div
        className="absolute -top-8 flex -translate-x-1/2 items-center gap-1.5"
        style={{ left: `clamp(6rem, ${percent}%, calc(100% - 6rem))` }}
      >
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN_YEAR, year - STEP))}
          aria-label="Año anterior"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper shadow active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="whitespace-nowrap rounded bg-ink px-2 py-1 text-xs font-semibold text-paper shadow">
          {current.label} · {formatYear(year)}
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(MAX_YEAR, year + STEP))}
          aria-label="Año siguiente"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper shadow active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Monocroma: solo la dinastía actual se ilumina, con su propio color
          terroso; el resto queda discreto. Fondo propio semi-opaco: la
          barra vive tanto sobre el mapa (oscuro) como sobre la vista de
          texto (papel claro), y los tonos claros translúcidos de los
          segmentos inactivos solo se leen sobre un fondo oscuro — así que
          ella misma lo aporta, en vez de depender de lo que haya detrás. */}
      <div
        className="absolute inset-x-0 top-1/2 flex h-7 -translate-y-1/2 overflow-hidden rounded-sm ring-1 ring-paper/20 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(29,27,25,0.45)' }}
      >
        {SEGMENTS.map((seg) => {
          const activo = seg.label === current.label;
          return (
            <div
              key={seg.label}
              className="h-full border-r border-paper/60 last:border-r-0"
              style={{
                flexGrow: seg.end - seg.start,
                backgroundColor: activo ? seg.colorTerroso : 'rgba(233,231,226,0.12)',
                boxShadow: activo ? `0 0 12px ${seg.colorTerroso}b3` : undefined,
              }}
              title={`${seg.label} (${formatYear(seg.start)} – ${formatYear(seg.end)})`}
            />
          );
        })}
      </div>

      {SEGMENTS.filter((seg) => seg.end - seg.start >= LABEL_MIN_SPAN).map((seg) => {
        const centerPercent = ((seg.start + seg.end) / 2 - MIN_YEAR) / (MAX_YEAR - MIN_YEAR) * 100;
        const activo = seg.label === current.label;
        return (
          <div
            key={`hanzi-${seg.label}`}
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-brush font-semibold leading-none"
            style={{
              left: `${centerPercent}%`,
              color: activo ? seg.hanziColor : 'rgba(233,231,226,0.75)',
              fontSize: activo ? '15px' : '13px',
            }}
          >
            {seg.hanzi}
          </div>
        );
      })}

      <div
        className="pointer-events-none absolute top-1/2 h-9 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
        style={{ left: `${percent}%`, boxShadow: '0 0 0 1.5px rgba(29,27,25,0.6), 0 1px 3px rgba(0,0,0,0.4)' }}
      />

      <input
        type="range"
        min={MIN_YEAR}
        max={MAX_YEAR}
        step={STEP}
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Año"
        className="timeline-range absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
