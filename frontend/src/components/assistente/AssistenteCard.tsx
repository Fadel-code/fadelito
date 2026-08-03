import type { Protocolo } from "../../types";

interface AssistenteCardProps {
  protocolo: Protocolo;
  onClick: () => void;
}

export default function AssistenteCard({ protocolo, onClick }: AssistenteCardProps) {
  const disponivel = protocolo.status === "validado";
  const chipClass =
    protocolo.area === "Administrativo" ? "af-area-chip admin" : protocolo.area === "Em comum" ? "af-area-chip common" : "af-area-chip";

  return (
    <button onClick={onClick} className="af-card">
      <div className="flex items-center justify-between gap-2">
        <span className="af-card-category">{protocolo.categoria}</span>
        <span className={chipClass}>{protocolo.area}</span>
      </div>
      <h3>{protocolo.titulo}</h3>
      <p>{protocolo.resumo}</p>
      <span className={`af-status ${disponivel ? "ok" : "warn"}`}>{disponivel ? "Disponível" : "Em revisão"}</span>
    </button>
  );
}
