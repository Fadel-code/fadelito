import { useMemo, useState } from "react";
import { FileSpreadsheet, RefreshCw, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConsolidado } from "../../hooks/useConsolidado";
import { MESES, TURMAS } from "../../types";
import { detalhePorUnidade, resumoPorTurma, somarTurmas } from "../../lib/turmas";
import TabelaTurmas from "../../components/TabelaTurmas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";

const ANO = new Date().getFullYear();
const TODAS = "todas";

export default function RelatorioTurmas() {
  const mesCorrido = new Date().getMonth() + 1;
  const [mes, setMes] = useState(mesCorrido);
  const [unidade, setUnidade] = useState<string>(TODAS);
  const [detalhar, setDetalhar] = useState(false);

  const { dados, linhasTurma, loading, recarregar } = useConsolidado(ANO, mes);

  const escopo = useMemo(
    () => (unidade === TODAS ? linhasTurma : linhasTurma.filter((l) => l.unidade === unidade)),
    [linhasTurma, unidade]
  );
  const resumo = useMemo(() => resumoPorTurma(escopo), [escopo]);
  const total = useMemo(() => somarTurmas(escopo, "—", "Total"), [escopo]);
  const detalhe = useMemo(() => detalhePorUnidade(escopo), [escopo]);

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
              {dados.map((u) => (
                <SelectItem key={u.unidade_id} value={u.unidade_nome}>
                  {u.unidade_nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={recarregar} title="Atualizar" aria-label="Atualizar">
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
            <TabelaTurmas linhas={resumo} total={total} />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {comUnidade ? "Detalhe por unidade e turma" : `Turmas com movimento — ${unidade}`}
              </h2>
              {comUnidade && detalhe.length > 0 && (
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
              <TabelaTurmas linhas={detalhe} comUnidade={comUnidade} rolavel />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
