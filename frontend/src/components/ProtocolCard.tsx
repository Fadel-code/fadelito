import type { Protocolo } from "../types";

const AREA_BADGE: Record<Protocolo["area"], string> = {
  "Pedagógico": "bg-blue-100 text-blue-700",
  "Administrativo": "bg-red-100 text-red-700",
  "Em comum": "bg-yellow-100 text-yellow-700",
};

interface ProtocolCardProps {
  protocolo: Protocolo;
  onClick: () => void;
}

export default function ProtocolCard({ protocolo, onClick }: ProtocolCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all flex flex-col gap-2 w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {protocolo.categoria}
        </span>
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${AREA_BADGE[protocolo.area]}`}>
          {protocolo.area}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 leading-snug">{protocolo.titulo}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{protocolo.resumo}</p>
      <span className={`text-xs font-medium ${protocolo.status === "validado" ? "text-green-600" : "text-amber-600"}`}>
        {protocolo.status === "validado" ? "● Disponível" : "● Em revisão"}
      </span>
    </button>
  );
}
