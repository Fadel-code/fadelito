import { useState, useEffect, useMemo } from "react";
import { RefreshCw, ThumbsUp } from "lucide-react";
import { useAuth } from "../../App";
import { useRematriculaAceites } from "../../hooks/useRematriculaAceites";
import { supabase } from "../../lib/supabase";
import StatTile from "../../components/StatTile";
import AceitesForm from "../../components/AceitesForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

interface UnidadeOpcao {
  id: string;
  unidade_nome: string | null;
}

export default function RematriculaAceitesMarketing() {
  const { profile } = useAuth();
  const { linhas, porUnidade, total, loading, salvando, salvar } = useRematriculaAceites();

  const ordenados = useMemo(
    () => [...porUnidade].sort((a, b) => b.quantidade - a.quantidade),
    [porUnidade]
  );

  // ponytail: liberado só pra supervisão por enquanto, pra validar o fluxo antes
  // de abrir pro marketing também. Trocar pra incluir "marketing" quando confirmado.
  const podePreencher = profile?.role === "supervisao";
  const [unidades, setUnidades] = useState<UnidadeOpcao[]>([]);
  const [unidadeId, setUnidadeId] = useState("");

  useEffect(() => {
    if (!podePreencher) return;
    supabase
      .from("profiles")
      .select("id, unidade_nome")
      .eq("role", "unidade")
      .eq("ativo", true)
      .order("unidade_nome")
      .then(({ data }) => setUnidades(data ?? []));
  }, [podePreencher]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Aceites</h1>
        <p className="text-gray-500 text-sm mt-1">Contagem manual de aceites verbais de rematrícula, por unidade</p>
      </div>

      <div className="card p-6 mb-6 max-w-xs">
        <StatTile icon={ThumbsUp} label="Total na rede" value={total} color="cyan" />
      </div>

      {podePreencher && (
        <div className="mb-6">
          <div className="max-w-xs mb-4">
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">
              Preencher pela unidade
            </label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.unidade_nome ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {unidadeId && (
            <AceitesForm unidadeId={unidadeId} linhas={linhas} loading={loading} salvando={salvando} salvar={salvar} />
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando...
          </div>
        ) : ordenados.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400">
            Nenhuma unidade registrou aceites ainda.
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-500 text-white">
                <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                <th className="px-4 py-3 text-center font-semibold">Aceites</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((u, i) => (
                <tr key={u.unidade_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.unidade_nome}</td>
                  <td className="px-4 py-3 text-center font-semibold text-cyan-700">{u.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
