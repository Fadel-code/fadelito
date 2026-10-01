import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Users, CheckCircle2, XCircle, Clock, MessageCircle, AlertTriangle, ThumbsUp, FileSpreadsheet, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../App";
import { useRematricula } from "../../hooks/useRematricula";
import { useRematriculaPreview } from "../../hooks/useRematriculaPreview";
import { calcularKpisRematricula, REMATRICULA_META, REMATRICULA_FORA_DA_META } from "../../types";
import type { RematriculaAluno } from "../../types";
import MetaGauge from "../../components/MetaGauge";
import RematriculaPainel from "../../components/RematriculaPainel";
import StatTile from "../../components/StatTile";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { atualizarOuRecarregar } from "../../lib/versao";

interface LinhaUnidade {
  unidade_id: string;
  unidade_nome: string;
  total: number;
  rematriculados: number;
  negociando: number;
  naoRematriculados: number;
  pendentes: number;
  inadimplentes: number;
  aguardandoContrato: number;
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
      negociando: kpis.negociando,
      naoRematriculados: kpis.naoRematriculados,
      pendentes: kpis.pendentes,
      inadimplentes: kpis.inadimplentes,
      aguardandoContrato: kpis.aguardandoContrato,
      pct: kpis.pct,
    };
  });
}

function BarraPct({ pct, atingiu }: { pct: number; atingiu: boolean }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${atingiu ? "bg-green-500" : "bg-amber-400"}`}
        style={{ width: `${Math.min(pct, 1) * 100}%` }}
      />
    </div>
  );
}

function Numero({ label, valor, cor = "text-gray-800" }: { label: string; valor: number; cor?: string }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className={`font-semibold tabular-nums ${cor}`}>{valor}</dd>
    </div>
  );
}

const CHAVE_UNIDADE = "rematricula.previewUnidadeId";

export default function RematriculaMarketing() {
  const { profile } = useAuth();
  const { alunos, loading, carregar, adicionar, remover: removerReal, atualizar: atualizarReal } = useRematricula();
  // ponytail: a prévia espelha os dados reais pra supervisão testar a tela de verdade.
  // Atualizar/histórico ficam locais (a policy de update já bloqueia escrita de quem
  // não é a própria unidade); adicionar e remover gravam de verdade no Supabase.
  const preview = useRematriculaPreview(alunos);

  async function remover(id: string) {
    const ok = await removerReal(id);
    if (ok) await preview.remover(id);
    return ok;
  }

  // Grava de verdade no Supabase — a policy/trigger de rematricula_alunos garante
  // que só o campo inadimplente é aplicado quando quem chama é supervisão; os
  // demais campos continuam existindo só na prévia local.
  async function atualizar(
    id: string,
    contratoAssinado: boolean,
    motivo: string,
    quemContatou: string,
    observacao: string,
    negociando: boolean,
    inadimplente: boolean,
    aceite: boolean
  ) {
    const ok = await atualizarReal(id, contratoAssinado, motivo, quemContatou, observacao, negociando, inadimplente, aceite);
    if (ok) await preview.atualizar(id, contratoAssinado, motivo, quemContatou, observacao, negociando, inadimplente, aceite);
    return ok;
  }

  // TEMP: lista da Vila Leopoldina subiu tardiamente e a unidade só vai começar a
  // contabilizar depois do período — excluída do painel de marketing (meta da rede e
  // ranking) pra não derrubar a média geral. Reverter quando a unidade sinalizar.
  const alunosRede = alunos.filter((a) => a.profiles?.unidade_nome !== "Vila Leopoldina");

  // Fora da meta geral (mas seguem no ranking): unidades que não entram no cálculo da rede.
  const kpisRede = calcularKpisRematricula(
    alunosRede.filter((a) => !REMATRICULA_FORA_DA_META.includes(a.profiles?.unidade_nome ?? ""))
  );
  const porUnidade = agruparPorUnidade(alunosRede).sort((a, b) => a.pct - b.pct);

  async function exportar(formato: "xlsx" | "csv") {
    if (porUnidade.length === 0) {
      toast.error("Nada para exportar ainda.");
      return;
    }
    const lib = await import("../../lib/exportExcel");
    if (formato === "xlsx") {
      lib.exportarRematriculaExcel(porUnidade, kpisRede);
    } else {
      lib.exportarRematriculaCsv(porUnidade, kpisRede);
    }
  }

  // Relatório por aluno (supervisão): usa todos os alunos, inclusive unidades fora da
  // meta/ranking — é o espelho do que cada unidade vê no painel dela.
  const TODAS = "todas";
  const unidadesRelatorio = useMemo(
    () => agruparPorUnidade(alunos).sort((a, b) => a.unidade_nome.localeCompare(b.unidade_nome, "pt-BR")),
    [alunos]
  );
  const [relatorioUnidadeId, setRelatorioUnidadeId] = useState(TODAS);

  async function exportarAlunos(formato: "xlsx" | "csv") {
    const todas = relatorioUnidadeId === TODAS;
    const selecionados = todas ? alunos : alunos.filter((a) => a.unidade_id === relatorioUnidadeId);
    if (selecionados.length === 0) {
      toast.error("Nada para exportar ainda.");
      return;
    }
    const escopo = todas
      ? "Todas as unidades"
      : unidadesRelatorio.find((u) => u.unidade_id === relatorioUnidadeId)?.unidade_nome ?? "Unidade";
    const lib = await import("../../lib/exportExcel");
    if (formato === "xlsx") lib.exportarAlunosRematriculaExcel(selecionados, escopo, todas);
    else lib.exportarAlunosRematriculaCsv(selecionados, escopo);
  }

  const unidadesPreview = useMemo(
    () => [...porUnidade].sort((a, b) => a.unidade_nome.localeCompare(b.unidade_nome, "pt-BR")),
    [porUnidade]
  );
  // sessionStorage: a unidade escolhida sobrevive à troca de tela (a página desmonta).
  const [previewUnidadeId, setPreviewUnidadeIdState] = useState(() => sessionStorage.getItem(CHAVE_UNIDADE) ?? "");
  function setPreviewUnidadeId(id: string) {
    setPreviewUnidadeIdState(id);
    sessionStorage.setItem(CHAVE_UNIDADE, id);
  }
  useEffect(() => {
    if (unidadesPreview.length && !unidadesPreview.some((u) => u.unidade_id === previewUnidadeId)) {
      setPreviewUnidadeIdState(unidadesPreview[0].unidade_id);
    }
  }, [unidadesPreview, previewUnidadeId]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rematrícula 2027</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhamento da rematrícula em toda a rede</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => atualizarOuRecarregar(carregar)} title="Atualizar" aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="outline" onClick={() => exportar("xlsx")} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>

          <Button
            variant="outline"
            onClick={() => exportar("csv")}
            className="gap-2"
            title="CSV UTF-8 — importa direto no Google Sheets e no Excel"
          >
            <Table2 className="h-4 w-4" />
            Exportar Sheets (CSV)
          </Button>
        </div>
      </div>

      {/* Hero: meta da rede + indicadores */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6 mb-6">
        <MetaGauge pct={kpisRede.pct} label="Meta 90%" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 flex-1 w-full">
          <StatTile icon={Users} label="A rematricular" value={kpisRede.total} />
          <StatTile icon={CheckCircle2} label="Rematriculados" value={kpisRede.rematriculados} color="green" />
          <StatTile icon={MessageCircle} label="Em conversa" value={kpisRede.negociando} color="blue" />
          <StatTile icon={XCircle} label="Não rematriculados" value={kpisRede.naoRematriculados} color="red" />
          <StatTile icon={Clock} label="Pendentes" value={kpisRede.pendentes} color="amber" />
          <StatTile icon={AlertTriangle} label="Inadimplentes" value={kpisRede.inadimplentes} color="orange" />
          <StatTile icon={ThumbsUp} label="Aguardando contrato assinado" value={kpisRede.aguardandoContrato} color="cyan" />
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
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ranking por unidade <span className="normal-case font-normal">— da menor para a maior %</span></p>
              <p className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Meta atingida (90%)</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />Abaixo da meta</span>
              </p>
            </div>

            {/* Celular: um cartão por unidade — tabela de 9 colunas não cabe. */}
            <ul className="md:hidden">
              {porUnidade.map((u) => {
                const atingiu = u.pct >= REMATRICULA_META;
                return (
                  <li key={u.unidade_id} className={`border-l-4 border-b border-b-gray-100 px-4 py-3 ${atingiu ? "border-l-green-400" : "border-l-red-400"}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium text-gray-800">
                        {u.unidade_nome}
                      </p>
                      <p className={`font-bold tabular-nums ${atingiu ? "text-green-600" : "text-amber-600"}`}>
                        {(u.pct * 100).toFixed(1)}%
                      </p>
                    </div>
                    <BarraPct pct={u.pct} atingiu={atingiu} />
                    <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                      <Numero label="A rematricular" valor={u.total} />
                      <Numero label="Rematriculados" valor={u.rematriculados} cor="text-green-700" />
                      <Numero label="Em conversa" valor={u.negociando} cor="text-blue-600" />
                      <Numero label="Aguard. contrato" valor={u.aguardandoContrato} cor="text-cyan-600" />
                      <Numero label="Não rematric." valor={u.naoRematriculados} cor="text-red-600" />
                      <Numero label="Pendentes" valor={u.pendentes} cor="text-amber-600" />
                    </dl>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm border-collapse tabular-nums">
                <thead>
                  <tr className="bg-primary-500 text-white text-xs">
                    <th className="px-3 py-3 text-left font-semibold">Unidade</th>
                    <th className="px-3 py-3 text-right font-semibold">A rematricular</th>
                    <th className="px-3 py-3 text-right font-semibold">Rematriculados</th>
                    <th className="px-3 py-3 text-right font-semibold">Em conversa</th>
                    <th className="px-3 py-3 text-right font-semibold">Aguard. contrato</th>
                    <th className="px-3 py-3 text-right font-semibold">Não rematric.</th>
                    <th className="px-3 py-3 text-right font-semibold">Pendentes</th>
                    <th className="px-3 py-3 text-left font-semibold w-44">% Rematrícula</th>
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
                        } hover:bg-primary-50/50`}
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{u.unidade_nome}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{u.total}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-green-700">{u.rematriculados}</td>
                        <td className="px-3 py-2.5 text-right text-blue-600">{u.negociando}</td>
                        <td className="px-3 py-2.5 text-right text-cyan-600">{u.aguardandoContrato}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-red-600">{u.naoRematriculados}</td>
                        <td className="px-3 py-2.5 text-right text-amber-600">{u.pendentes}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-12 text-right font-bold ${atingiu ? "text-green-600" : "text-amber-600"}`}>
                              {(u.pct * 100).toFixed(1)}%
                            </span>
                            <div className="flex-1"><BarraPct pct={u.pct} atingiu={atingiu} /></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {profile?.role === "supervisao" && unidadesRelatorio.length > 0 && (
        <div className="card mt-6 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Relatório de alunos</p>
          <p className="text-sm text-gray-500 mb-4">
            Turma, status, opções marcadas, quem fez contato, observações e histórico de cada aluno.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-64">
              <Select value={relatorioUnidadeId} onValueChange={setRelatorioUnidadeId}>
                <SelectTrigger aria-label="Unidade do relatório"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as unidades</SelectItem>
                  {unidadesRelatorio.map((u) => (
                    <SelectItem key={u.unidade_id} value={u.unidade_id}>{u.unidade_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => exportarAlunos("xlsx")} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => exportarAlunos("csv")}
              className="gap-2"
              title="CSV UTF-8 — importa direto no Google Sheets e no Excel"
            >
              <Table2 className="h-4 w-4" />
              Exportar Sheets (CSV)
            </Button>
          </div>
        </div>
      )}

      {/* Prévia — a tela que a unidade vê, com dados reais. Atualizar/histórico continuam
          locais (não gravam); adicionar e remover gravam de verdade no Supabase. */}
      {(profile?.role === "supervisao" || profile?.role === "marketing") && (
        <div className="mt-10 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-5">
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
          <RematriculaPainel
            unidadeId={previewUnidadeId || "previa"}
            {...preview}
            adicionar={adicionar}
            remover={remover}
            atualizar={atualizar}
            permiteRemover
            permiteAdicionar
            permiteMarcarInadimplente={profile?.role === "supervisao"}
          />
        </div>
      )}
    </div>
  );
}
