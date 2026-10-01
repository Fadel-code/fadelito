import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Table2,
  GraduationCap,
  TrendingUp,
  UserMinus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConsolidado } from "../../hooks/useConsolidado";
import type { ConsolidadoUnidade } from "../../types";
import { MESES } from "../../types";
import TabelaConsolidada from "../../components/TabelaConsolidada";
import TabelaTurmas from "../../components/TabelaTurmas";
import { detalhePorUnidade, resumoPorTurma, somarTurmas } from "../../lib/turmas";
import ModalEdicaoUnidade from "../../components/ModalEdicaoUnidade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import Segmentado from "../../components/ui/segmentado";
import SeletorMes from "../../components/ranking/SeletorMes";
import KpiCard, { KpiGrid } from "../../components/KpiCard";
import MenuExportar from "../../components/ui/menu-exportar";
import { ROTULO, CARD_DESTAQUE } from "../../components/ui/estilos";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { FERIADOS_SET } from "../../lib/feriados";
import { atualizarOuRecarregar } from "../../lib/versao";

const ANO = new Date().getFullYear();
const TODOS_OS_DIAS = "todos";
const TODAS_AS_UNIDADES = "todas";

export default function Dashboard() {
  const mesCorrido = new Date().getMonth() + 1;
  const hojeIso = dateToIso(new Date());
  const [mes, setMes] = useState(mesCorrido);
  const [dia, setDia] = useState(TODOS_OS_DIAS);
  const [visao, setVisao] = useState<"unidades" | "turmas">("unidades");
  const [unidadeTurma, setUnidadeTurma] = useState(TODAS_AS_UNIDADES);
  const [modalAberto, setModalAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<ConsolidadoUnidade | null>(null);

  const diaFiltro = dia === TODOS_OS_DIAS ? undefined : dia;
  const navigate = useNavigate();
  const { dados, linhasTurma, loading, recarregar } = useConsolidado(ANO, mes, diaFiltro);

  // Mesmo recorte (mês/dia/unidade) quebrado por turma — alimenta a visão "Por turma"
  // e as abas de turma do Excel, sem segunda consulta nem segunda exportação.
  const redeInteira = unidadeTurma === TODAS_AS_UNIDADES;
  const escopoTurmas = useMemo(
    () => (redeInteira ? linhasTurma : linhasTurma.filter((l) => l.unidade === unidadeTurma)),
    [linhasTurma, redeInteira, unidadeTurma]
  );
  const turmasDetalhe = useMemo(() => detalhePorUnidade(escopoTurmas), [escopoTurmas]);
  const turmasResumo = useMemo(() => resumoPorTurma(escopoTurmas), [escopoTurmas]);
  const turmasTotal = useMemo(() => somarTurmas(escopoTurmas, "—", "Total"), [escopoTurmas]);

  // Dias úteis do mês selecionado, do mais recente para o mais antigo, limitado a hoje
  const diasUteis = diasUteisDoMes(ANO, mes, FERIADOS_SET)
    .filter((d) => dateToIso(d) <= hojeIso)
    .reverse();

  function handleChangeMes(v: string) {
    setMes(Number(v));
    setDia(TODOS_OS_DIAS);
  }

  function handleEditar(u: ConsolidadoUnidade) {
    setUnidadeEditando(u);
    setModalAberto(true);
  }

  function handleFecharModal() {
    setModalAberto(false);
    setUnidadeEditando(null);
    recarregar();
  }

  const preencheramNoDia = dados.filter((d) => d.preencheu_hoje).length;
  const totalUnidades = dados.length;
  const filtrouDia = dia !== TODOS_OS_DIAS;
  const labelStatus = filtrouDia ? "no dia" : mes === mesCorrido ? "hoje" : "no mês";

  const visitasTotaisRede = dados.reduce((a, d) => a + d.visitas_totais, 0);
  const matriculasTotaisRede = dados.reduce((a, d) => a + d.matriculas_totais, 0);
  const conversaoTotal =
    visitasTotaisRede > 0 ? `${((matriculasTotaisRede / visitasTotaisRede) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—";
  const desligamentosTotal = dados.reduce((a, d) => a + d.desligamentos, 0);

  const faltando = totalUnidades - preencheramNoDia;
  const pad = (n: number) => String(n).padStart(2, "0");

  async function exportar(tipo: "excel" | "csv" | "pdf") {
    if (tipo === "pdf") {
      const { exportarPdf } = await import("../../lib/exportPdf");
      return exportarPdf(dados, mes, ANO);
    }
    const { exportarExcel, exportarTurmasCsv } = await import("../../lib/exportExcel");
    if (tipo === "excel") exportarExcel(dados, mes, ANO, turmasDetalhe);
    else exportarTurmasCsv(turmasDetalhe, redeInteira ? "Rede" : unidadeTurma, mes, ANO, redeInteira);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Consolidado</h1>
          <p className="mt-1 text-sm text-gray-600">Visão geral da rede, atualizada em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => atualizarOuRecarregar(recarregar)} title="Atualizar" aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Button>
          <MenuExportar
            opcoes={[
              { chave: "excel", Icone: FileSpreadsheet, titulo: "Excel", descricao: "Planilha com abas por turma", onSelecionar: () => exportar("excel") },
              { chave: "csv", Icone: Table2, titulo: "Google Sheets (CSV)", descricao: "Por unidade e turma, importa direto", onSelecionar: () => exportar("csv") },
              { chave: "pdf", Icone: FileText, titulo: "PDF", descricao: "Resumo para imprimir ou enviar", onSelecionar: () => exportar("pdf") },
            ]}
          />
          <Button onClick={() => navigate("/marketing/desfechos")} className="gap-2">
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Desfechos de Matrículas
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <section aria-label="Filtros" className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
              <div>
                <span className={ROTULO}>Mês</span>
                <SeletorMes
                  valor={`${ANO}-${pad(mes)}`}
                  min={`${ANO}-01`}
                  max={`${ANO}-${pad(mesCorrido)}`}
                  onChange={(ym) => handleChangeMes(String(Number(ym.slice(5, 7))))}
                />
              </div>
              <div>
                <span id="dash-dia" className={ROTULO}>Dia</span>
                <Select value={dia} onValueChange={setDia}>
                  <SelectTrigger className="w-48" aria-labelledby="dash-dia">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS_OS_DIAS}>Todos os dias</SelectItem>
                    {diasUteis.map((d) => {
                      const iso = dateToIso(d);
                      return (
                        <SelectItem key={iso} value={iso}>
                          {format(d, "EEE, dd/MM", { locale: ptBR })}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
              {visao === "turmas" && (
                <div>
                  <span id="dash-unidade" className={ROTULO}>Unidade</span>
                  <Select value={unidadeTurma} onValueChange={setUnidadeTurma}>
                    <SelectTrigger className="w-52" aria-labelledby="dash-unidade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS_AS_UNIDADES}>Todas as unidades</SelectItem>
                      {dados.map((u) => (
                        <SelectItem key={u.unidade_id} value={u.unidade_nome}>
                          {u.unidade_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <span className={ROTULO}>Ver resultados</span>
                <Segmentado
                  rotulo="Ver resultados"
                  valor={visao}
                  opcoes={[{ valor: "unidades", rotulo: "Por unidade" }, { valor: "turmas", rotulo: "Por turma" }]}
                  onChange={setVisao}
                />
              </div>
            </div>
          </div>
        </section>

        <KpiGrid rotulo="Indicadores" colunas={5}>
          <KpiCard
            rotulo={`Preenchidas ${labelStatus}`} valor={preencheramNoDia} Icone={CheckCircle2} tom="green" carregando={loading}
            sub={`de ${totalUnidades} unidades`} progresso={totalUnidades ? preencheramNoDia / totalUnidades : 0}
          />
          <KpiCard
            rotulo={`Faltando ${labelStatus}`} valor={faltando} Icone={AlertCircle} tom={faltando > 0 ? "red" : "green"} carregando={loading}
            sub={faltando > 0 ? "unidades sem formulário" : "todas preencheram"} alerta={faltando > 0}
          />
          <KpiCard rotulo="Total matrículas" valor={matriculasTotaisRede.toLocaleString("pt-BR")} Icone={GraduationCap} tom="primary" carregando={loading} sub={`${visitasTotaisRede.toLocaleString("pt-BR")} visitas`} />
          <KpiCard rotulo="Conversão total" valor={conversaoTotal} Icone={TrendingUp} tom="primary" carregando={loading} sub="matrículas ÷ visitas" />
          <KpiCard rotulo="Desligamentos" valor={desligamentosTotal} Icone={UserMinus} tom={desligamentosTotal > 0 ? "red" : "primary"} carregando={loading} sub={`em ${MESES[mes - 1].toLowerCase()}`} />
        </KpiGrid>

      <section aria-labelledby="dash-titulo" className={`${CARD_DESTAQUE} p-0`}>
        <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 id="dash-titulo" className="text-xl font-bold tracking-tight text-gray-900">
              {visao === "unidades" ? "Resultados por unidade" : "Resultados por turma"}
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              {MESES[mes - 1]} de {ANO}
              {filtrouDia && ` · ${format(new Date(dia + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR })}`}
              {visao === "turmas" && ` · ${redeInteira ? "toda a rede" : unidadeTurma}`}
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-600">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
            Carregando dados...
          </div>
        ) : dados.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-gray-600">
            Nenhum dado para {MESES[mes - 1]} {ANO}
            {filtrouDia && ` — ${format(new Date(dia + "T12:00:00"), "dd/MM", { locale: ptBR })}`}
          </div>
        ) : visao === "turmas" ? (
          <>
            <TabelaTurmas linhas={turmasResumo} total={turmasTotal} />
            <p className="mt-3 text-sm text-gray-600">
              As exportações seguem este filtro e trazem também o detalhe unidade × turma
              {redeInteira ? "" : ` de ${unidadeTurma}`}. Para ver esse detalhe na tela,{" "}
              <button
                onClick={() => navigate("/marketing/turmas")}
                className="text-primary-600 font-medium hover:underline"
              >
                abra o Relatório por Turma
              </button>
              .
            </p>
          </>
        ) : (
          <TabelaConsolidada
            dados={dados}
            mostrarStatus
            onEditar={handleEditar}
          />
        )}
        </div>
      </section>
      </div>

      <ModalEdicaoUnidade
        open={modalAberto}
        onClose={handleFecharModal}
        unidade={unidadeEditando}
        ano={ANO}
        mes={mes}
      />
    </div>
  );
}
