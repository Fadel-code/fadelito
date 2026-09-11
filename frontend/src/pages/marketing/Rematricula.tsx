import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Users, CheckCircle2, XCircle, Clock, Eye, MessageCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../../App";
import { useRematricula } from "../../hooks/useRematricula";
import { useRematriculaPreview } from "../../hooks/useRematriculaPreview";
import { calcularKpisRematricula, REMATRICULA_META } from "../../types";
import type { RematriculaAluno } from "../../types";
import MetaGauge from "../../components/MetaGauge";
import RematriculaPainel from "../../components/RematriculaPainel";
import StatTile from "../../components/StatTile";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

interface LinhaUnidade {
  unidade_id: string;
  unidade_nome: string;
  total: number;
  rematriculados: number;
  naoRematriculados: number;
  pendentes: number;
  pct: number;
}

function agruparPorUnidade(alunos: RematriculaAluno[]): LinhaUnidade[] {
  const grupos = new Map<string, RematriculaAluno[]>();
  for (const a of alunos) {
    const lista = grupos.get(a.unidade_id) ?? [];
    lista.push(a);
    grupos.set(a.unidade_id, lista);
  }
  return Array.from(grupos.entries()).map(([unidade_id, lista]) => {
    const kpis = calcularKpisRematricula(lista);
    return {
      unidade_id,
      unidade_nome: lista[0].profiles?.unidade_nome ?? "—",
      total: kpis.total,
      rematriculados: kpis.rematriculados,
      naoRematriculados: kpis.naoRematriculados,
      pendentes: kpis.pendentes,
      pct: kpis.pct,
    };
  });
}

export default function RematriculaMarketing() {
  const { profile } = useAuth();
  const { alunos, loading, carregar, remover: removerReal } = useRematricula();
  // ponytail: semeia com dados reais da 1ª unidade cadastrada pra supervisão testar
  // a tela de verdade antes de liberar pra unidades. Adicionar/atualizar/histórico
  // ficam locais (a policy de update já bloqueia escrita de quem não é a própria
  // unidade); remover é sobrescrito abaixo pra apagar de verdade no Supabase.
  const preview = useRematriculaPreview(alunos.length ? alunos : undefined);

  async function remover(id: string) {
    const ok = await removerReal(id);
    if (ok) await preview.remover(id);
    return ok;
  }

  const kpisRede = calcularKpisRematricula(alunos);
  const porUnidade = agruparPorUnidade(alunos).sort((a, b) => a.pct - b.pct);

  const unidadesPreview = useMemo(
    () => [...porUnidade].sort((a, b) => a.unidade_nome.localeCompare(b.unidade_nome, "pt-BR")),
    [porUnidade]
  );
  const [previewUnidadeId, setPreviewUnidadeId] = useState("");
  useEffect(() => {
    if (!previewUnidadeId && unidadesPreview.length) {
      setPreviewUnidadeId(unidadesPreview[0].unidade_id);
    }
  }, [unidadesPreview, previewUnidadeId]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rematrícula 2027</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhamento da rematrícula em toda a rede</p>
        </div>
        <Button variant="outline" size="icon" onClick={carregar} title="Atualizar" aria-label="Atualizar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Hero: meta da rede + indicadores */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6 mb-6">
        <MetaGauge pct={kpisRede.pct} label="Meta 90%" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 flex-1 w-full">
          <StatTile icon={Users} label="A rematricular" value={kpisRede.total} />
          <StatTile icon={CheckCircle2} label="Rematriculados" value={kpisRede.rematriculados} color="green" />
          <StatTile icon={MessageCircle} label="Em conversa" value={kpisRede.negociando} color="blue" />
          <StatTile icon={XCircle} label="Não rematriculados" value={kpisRede.naoRematriculados} color="red" />
          <StatTile icon={Clock} label="Pendentes" value={kpisRede.pendentes} color="amber" />
          <StatTile icon={AlertTriangle} label="Inadimplentes" value={kpisRede.inadimplentes} color="orange" />
        </div>
      </div>

      {/* Ranking por unidade */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando...
          </div>
        ) : porUnidade.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400">
            Nenhuma unidade cadastrou alunos ainda — os dados aparecem aqui assim que as unidades começarem a preencher.
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-500 text-white">
                <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                <th className="px-4 py-3 text-center font-semibold">A rematricular</th>
                <th className="px-4 py-3 text-center font-semibold">Rematriculados</th>
                <th className="px-4 py-3 text-center font-semibold">Não rematriculados</th>
                <th className="px-4 py-3 text-center font-semibold">Pendentes</th>
                <th className="px-4 py-3 text-center font-semibold">% Rematrícula</th>
              </tr>
            </thead>
            <tbody>
              {porUnidade.map((u, i) => {
                const atingiu = u.pct >= REMATRICULA_META;
                return (
                  <tr
                    key={u.unidade_id}
                    className={`border-l-4 ${atingiu ? "border-l-green-400" : "border-l-red-400"} ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{u.unidade_nome}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{u.total}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-700">{u.rematriculados}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">{u.naoRematriculados}</td>
                    <td className="px-4 py-3 text-center text-amber-600">{u.pendentes}</td>
                    <td className={`px-4 py-3 text-center font-bold ${atingiu ? "text-green-600" : "text-amber-600"}`}>
                      {(u.pct * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Prévia — a tela que a unidade vai ver, semeada com dados reais só pra a
          supervisão testar antes de liberar pra unidades. Adicionar/atualizar/histórico
          continuam locais (não gravam); remover agora apaga de verdade no Supabase. */}
      {profile?.role === "supervisao" && (
        <div className="mt-10 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4 text-primary-600" />
            <p className="text-xs font-bold text-primary-700 uppercase tracking-wide">Prévia — tela da unidade</p>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Como as unidades vão acompanhar a própria rematrícula quando o recurso for liberado a elas.
            Dados reais abaixo, só pra teste — edições feitas aqui não são salvas.
          </p>
          {unidadesPreview.length > 0 && (
            <div className="mb-5 max-w-xs">
              <Select value={previewUnidadeId} onValueChange={setPreviewUnidadeId}>
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>
                  {unidadesPreview.map((u) => (
                    <SelectItem key={u.unidade_id} value={u.unidade_id}>{u.unidade_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <RematriculaPainel unidadeId={previewUnidadeId || "previa"} {...preview} remover={remover} />
        </div>
      )}
    </div>
  );
}
