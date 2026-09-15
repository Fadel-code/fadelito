import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, RefreshCw, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { MESES, TURMAS } from "../../types";
import type { LinhaTurmaExport } from "../../lib/exportExcel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";

const ANO = new Date().getFullYear();
const TODAS = "todas";

const CAMPOS = [
  "visitas",
  "visitas_curso_ferias",
  "matriculas",
  "matriculas_curso_ferias",
  "desligamentos",
  "transferencias",
  "religamentos",
] as const;

function zerada(unidade: string, turma: string): LinhaTurmaExport {
  return {
    unidade,
    turma,
    visitas: 0,
    visitas_curso_ferias: 0,
    matriculas: 0,
    matriculas_curso_ferias: 0,
    desligamentos: 0,
    transferencias: 0,
    religamentos: 0,
  };
}

function somar(linhas: LinhaTurmaExport[], unidade: string, turma: string): LinhaTurmaExport {
  const acc = zerada(unidade, turma);
  for (const l of linhas) for (const c of CAMPOS) acc[c] += l[c];
  return acc;
}

function temDados(l: LinhaTurmaExport): boolean {
  return CAMPOS.some((c) => l[c] > 0);
}

function aproveitamento(vt: number, mt: number): string {
  return vt > 0 ? `${((mt / vt) * 100).toFixed(1)}%` : "—";
}

function Celulas({ l }: { l: LinhaTurmaExport }) {
  const vt = l.visitas + l.visitas_curso_ferias;
  const mt = l.matriculas + l.matriculas_curso_ferias;
  return (
    <>
      <td className="px-3 py-2 text-center text-gray-700">{l.visitas}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.visitas_curso_ferias}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">{vt}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.matriculas}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.matriculas_curso_ferias}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">{mt}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
        {aproveitamento(vt, mt)}
      </td>
      <td className="px-3 py-2 text-center text-gray-700">{l.desligamentos}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
        {mt - l.desligamentos}
      </td>
      <td className="px-3 py-2 text-center text-gray-700">{l.transferencias}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.religamentos}</td>
    </>
  );
}

function Cabecalho({ primeira }: { primeira: string[] }) {
  return (
    <thead>
      <tr className="bg-primary-500 text-white">
        {primeira.map((c) => (
          <th key={c} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">
            {c}
          </th>
        ))}
        <th className="px-3 py-2.5 text-center font-semibold">Visitas</th>
        <th className="px-3 py-2.5 text-center font-semibold">Vis. CF</th>
        <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">Vis. Totais</th>
        <th className="px-3 py-2.5 text-center font-semibold">Matrículas</th>
        <th className="px-3 py-2.5 text-center font-semibold">Mat. CF</th>
        <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">Mat. Totais</th>
        <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">% Aprov.</th>
        <th className="px-3 py-2.5 text-center font-semibold">Desligam.</th>
        <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">Saldo</th>
        <th className="px-3 py-2.5 text-center font-semibold">Transfer.</th>
        <th className="px-3 py-2.5 text-center font-semibold">Religam.</th>
      </tr>
    </thead>
  );
}

export default function RelatorioTurmas() {
  const mesCorrido = new Date().getMonth() + 1;
  const [mes, setMes] = useState(mesCorrido);
  const [unidade, setUnidade] = useState<string>(TODAS);
  const [linhas, setLinhas] = useState<LinhaTurmaExport[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhar, setDetalhar] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const padMes = String(mes).padStart(2, "0");
      const inicio = `${ANO}-${padMes}-01`;
      const ultimoDia = new Date(ANO, mes, 0).getDate();
      const fim = `${ANO}-${padMes}-${String(ultimoDia).padStart(2, "0")}`;

      const { data: perfis, error: errUn } = await supabase
        .from("profiles")
        .select("id, unidade_nome")
        .eq("role", "unidade")
        .eq("ativo", true)
        .order("unidade_nome");
      if (errUn) throw errUn;

      const nomePorId = new Map<string, string>(
        (perfis ?? []).map((p: { id: string; unidade_nome: string | null }) => [p.id, p.unidade_nome ?? "—"])
      );

      // Paginação: o servidor limita a 1000 linhas por requisição.
      const PAGE = 1000;
      let from = 0;
      const agregado = new Map<string, LinhaTurmaExport>();

      while (true) {
        const { data: batch, error } = await supabase
          .from("registros")
          .select(`unidade_id, turma, ${CAMPOS.join(", ")}`)
          .gte("data", inicio)
          .lte("data", fim)
          .range(from, from + PAGE - 1);
        if (error) throw error;

        for (const r of batch ?? []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reg = r as any;
          const nome = nomePorId.get(reg.unidade_id);
          if (!nome) continue; // unidade inativa/desligada — fora do relatório
          const chave = `${nome}||${reg.turma}`;
          const linha = agregado.get(chave) ?? zerada(nome, reg.turma);
          for (const c of CAMPOS) linha[c] += reg[c] ?? 0;
          agregado.set(chave, linha);
        }

        if (!batch || batch.length < PAGE) break;
        from += PAGE;
      }

      setUnidades([...nomePorId.values()].sort((a, b) => a.localeCompare(b, "pt-BR")));
      setLinhas([...agregado.values()]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar o relatório por turma.");
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const escopo = useMemo(
    () => (unidade === TODAS ? linhas : linhas.filter((l) => l.unidade === unidade)),
    [linhas, unidade]
  );

  // Resumo consolidado do escopo: uma linha por turma, na ordem pedagógica.
  const resumo = useMemo(
    () => TURMAS.map((t) => somar(escopo.filter((l) => l.turma === t), "—", t)),
    [escopo]
  );
  const total = useMemo(() => somar(escopo, "—", "Total"), [escopo]);

  // Detalhe unidade × turma, ordenado por unidade e pela ordem das turmas.
  const detalhe = useMemo(() => {
    const ordemTurma = new Map(TURMAS.map((t, i) => [String(t), i]));
    return escopo
      .filter(temDados)
      .sort(
        (a, b) =>
          a.unidade.localeCompare(b.unidade, "pt-BR") ||
          (ordemTurma.get(a.turma) ?? 99) - (ordemTurma.get(b.turma) ?? 99)
      );
  }, [escopo]);

  const comUnidade = unidade === TODAS;
  const escopoLabel = comUnidade ? "Rede" : unidade;

  async function exportar(formato: "xlsx" | "csv") {
    if (detalhe.length === 0) {
      toast.error("Nada para exportar neste período.");
      return;
    }
    const lib = await import("../../lib/exportExcel");
    if (formato === "xlsx") {
      lib.exportarTurmasExcel(detalhe, [...TURMAS], escopoLabel, mes, ANO, comUnidade);
    } else {
      lib.exportarTurmasCsv(detalhe, escopoLabel, mes, ANO, comUnidade);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório por Turma</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visitas, matrículas e desligamentos de cada turma — {escopoLabel}, {MESES[mes - 1]} {ANO}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => (
                <SelectItem key={nome} value={String(i + 1)}>
                  {nome} {ANO}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as unidades</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={carregar} title="Atualizar" aria-label="Atualizar">
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

      {loading ? (
        <div className="card p-6 flex items-center justify-center h-48 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Carregando dados...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              Consolidado por turma {comUnidade ? "— toda a rede" : `— ${unidade}`}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <Cabecalho primeira={["Turma"]} />
                <tbody>
                  {resumo.map((l, i) => (
                    <tr
                      key={l.turma}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-primary-50 transition-colors`}
                    >
                      <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{l.turma}</td>
                      <Celulas l={l} />
                    </tr>
                  ))}
                  <tr className="bg-primary-50 border-t-2 border-primary-200 font-bold text-primary-700">
                    <td className="px-4 py-2">Total</td>
                    <Celulas l={total} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {comUnidade ? "Detalhe por unidade e turma" : `Turmas com movimento — ${unidade}`}
              </h2>
              {comUnidade && (
                <Button variant="outline" size="sm" onClick={() => setDetalhar((v) => !v)}>
                  {detalhar ? "Ocultar" : `Mostrar (${detalhe.length} linhas)`}
                </Button>
              )}
            </div>

            {detalhe.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-gray-400">
                Nenhum registro em {MESES[mes - 1]} {ANO}
              </div>
            ) : comUnidade && !detalhar ? (
              <p className="text-sm text-gray-500">
                {detalhe.length} combinações de unidade e turma com movimento no mês. A exportação
                inclui todas elas.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[70vh]">
                <table className="w-full text-sm border-collapse">
                  <Cabecalho primeira={comUnidade ? ["Unidade", "Turma"] : ["Turma"]} />
                  <tbody>
                    {detalhe.map((l, i) => (
                      <tr
                        key={`${l.unidade}-${l.turma}`}
                        className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-primary-50 transition-colors`}
                      >
                        {comUnidade && (
                          <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                            {l.unidade}
                          </td>
                        )}
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{l.turma}</td>
                        <Celulas l={l} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
