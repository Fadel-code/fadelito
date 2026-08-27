import { REMATRICULA_META } from "../types";

interface MetaGaugeProps {
  pct: number; // 0-1
  meta?: number; // 0-1
  size?: number;
  label?: string;
}

// Anel de progresso com uma marca fixa na posição da meta — a marca é o que torna
// a meta legível de relance, não só o número no centro.
export default function MetaGauge({ pct, meta = REMATRICULA_META, size = 116, label }: MetaGaugeProps) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(pct, 1));
  const atingiu = clamped >= meta;
  const color = atingiu ? "#16a34a" : clamped >= meta * 0.7 ? "#d97706" : "#dc2626";
  const metaDeg = meta * 360;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF4FB" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
        />
      </svg>
      {/* Marcador da meta */}
      <div className="absolute inset-0" style={{ transform: `rotate(${metaDeg - 90}deg)` }}>
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-ink/50"
          style={{ width: 3, height: stroke + 4 }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {Math.round(clamped * 100)}%
        </span>
        {label && <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
