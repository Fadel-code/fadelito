import { useMemo, useState } from "react";
import { FileSpreadsheet, RefreshCw, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConsolidado } from "../../hooks/useConsolidado";
import { MESES, TURMAS } from "../../types";
import { detalhePorUnidade, resumoPorTurma, somarTurmas } from "../../lib/turmas";
import TabelaTurmas from "../../components/TabelaTurmas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import SeletorMes from "../../components/ranking/SeletorMes";
import MenuExportar from "../../components/ui/menu-exportar";
import { ROTULO, CARD_DESTAQUE } from "../../components/ui/estilos";
import { atualizarOuRecarregar } from "../../lib/versao";

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

  const mesCorrente = new Date().getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório por Turma</h1>
          <p className="mt-1 text-sm text-gray-600">Visitas, matrículas e desligamentos de cada turma.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => atualizarOuRecarregar(recarregar)} title="Atualizar" aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Button>
          <MenuExportar
            opcoes={[
              { chave: "xlsx", Icone: FileSpreadsheet, titulo: "Excel", descricao: "Planilha com o detalhe por turma", onSelecionar: () => exportar("xlsx") },
              { chave: "csv", Icone: Table2, titulo: "Google Sheets (CSV)", descricao: "Importa direto no Sheets e no Excel", onSelecionar: () => exportar("csv") },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <section aria-label="Filtros" className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
            <div>
              <span className={ROTULO}>Mês</span>
              <SeletorMes
                valor={`${ANO}-${pad(mes)}`}
                min={`${ANO}-01`}
                max={`${ANO}-${pad(mesCorrente)}`}
                onChange={(ym) => setMes(Number(ym.slice(5, 7)))}
              />
            </div>
            <div>
              <span id="rt-unidade" className={ROTULO}>Unidade</span>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger className="w-52" aria-labelledby="rt-unidade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as unidades</SelectItem>
                  {dados.map((u) => <SelectItem key={u.unidade_id} value={u.unidade_nome}>{u.unidade_nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="card flex h-48 items-center justify-center text-gray-600">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
            Carregando dados…
          </div>
        ) : (
          <>
            <section aria-labelledby="rt-titulo" className={CARD_DESTAQUE}>
              <div className="border-b border-gray-100 px-4 py-5 sm:px-6">
                <h2 id="rt-titulo" className="text-xl font-bold tracking-tight text-gray-900">Consolidado por turma</h2>
                <p className="mt-1 text-sm text-gray-700">{escopoLabel} · {MESES[mes - 1]} de {ANO}</p>
              </div>
              <div className="p-4 sm:p-6">
                <TabelaTurmas linhas={resumo} total={total} />
              </div>
            </section>

            <section aria-labelledby="rt-detalhe" className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 id="rt-detalhe" className="text-base font-semibold text-gray-900">
                    {comUnidade ? "Detalhe por unidade e turma" : `Turmas com movimento — ${unidade}`}
                  </h2>
                  {comUnidade && detalhe.length > 0 && !detalhar && (
                    <p className="mt-0.5 text-sm text-gray-600">
                      {detalhe.length} combinações com movimento no mês. A exportação inclui todas elas.
                    </p>
                  )}
                </div>
                {comUnidade && detalhe.length > 0 && (
                  <Button variant="outline" size="sm" aria-expanded={detalhar} onClick={() => setDetalhar((v) => !v)}>
                    {detalhar ? "Ocultar detalhe" : `Mostrar ${detalhe.length} linhas`}
                  </Button>
                )}
              </div>
              {detalhe.length === 0 ? (
                <div className="flex h-24 items-center justify-center border-t border-gray-100 text-sm text-gray-600">
                  Nenhum registro em {MESES[mes - 1]} de {ANO}.
                </div>
              ) : (!comUnidade || detalhar) && (
                <div className="border-t border-gray-100 p-4 sm:p-6">
                  <TabelaTurmas linhas={detalhe} comUnidade={comUnidade} rolavel />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
