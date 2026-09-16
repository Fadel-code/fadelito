import { ThumbsUp } from "lucide-react";
import { useAuth } from "../../App";
import { useRematriculaAceites } from "../../hooks/useRematriculaAceites";
import AceitesForm from "../../components/AceitesForm";

export default function RematriculaAceites() {
  const { profile } = useAuth();
  const { linhas, total, loading, salvando, removendo, salvar, remover } = useRematriculaAceites();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aceites</h1>
          <p className="text-gray-500 text-sm mt-1">
            {profile?.unidade_nome} — registre por dia quantas famílias aceitaram verbalmente a rematrícula.
          </p>
        </div>
        <div className="card px-5 py-3 flex-shrink-0 flex items-center gap-3">
          <span className="flex-shrink-0 h-9 w-9 rounded-lg bg-cyan-50 text-cyan-500 flex items-center justify-center">
            <ThumbsUp className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total de aceites</p>
            <p className="text-2xl font-bold text-cyan-600 mt-0.5">{total}</p>
          </div>
        </div>
      </div>

      <AceitesForm
        unidadeId={profile?.id ?? ""}
        linhas={linhas}
        loading={loading}
        salvando={salvando}
        removendo={removendo}
        salvar={salvar}
        remover={remover}
      />
    </div>
  );
}
