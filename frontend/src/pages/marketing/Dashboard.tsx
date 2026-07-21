import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileSpreadsheet, FileText, RefreshCw, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConsolidado } from "../../hooks/useConsolidado";
import type { ConsolidadoUnidade } from "../../types";
import { MESES } from "../../types";
import TabelaConsolidada from "../../components/TabelaConsolidada";
import ModalEdicaoUnidade from "../../components/ModalEdicaoUnidade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { FERIADOS_SET } from "../../lib/feriados";

const ANO = new Date().getFullYear();
const TODOS_OS_DIAS = "todos";

export default function Dashboard() {
  const mesCorrido = new Date().getMonth() + 1;
  const hojeIso = dateToIso(new Date());
  const [mes, setMes] = useState(mesCorrido);
  const [dia, setDia] = useState(TODOS_OS_DIAS);
  const [modalAberto, setModalAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<ConsolidadoUnidade | null>(null);

  const diaFiltro = dia === TODOS_OS_DIAS ? undefined : dia;
  const navigate = useNavigate();
  const { dados, loading, recarregar } = useConsolidado(ANO, mes, diaFiltro);

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Consolidado</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visão geral da rede — atualização em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de mês */}
          <Select value={String(mes)} onValueChange={handleChangeMes}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => {
                const num = i + 1;
                return (
                  <SelectItem key={num} value={String(num)}>
                    {nome} {ANO}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Seletor de dia */}
          <Select value={dia} onValueChange={setDia}>
            <SelectTrigger className="w-52">
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

          <Button variant="outline" size="icon" onClick={recarregar} title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={() => navigate("/marketing/desfechos")}
            className="gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Desfechos de Matrículas
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              const { exportarExcel } = await import("../../lib/exportExcel");
              exportarExcel(dados, mes, ANO);
            }}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              const { exportarPdf } = await import("../../lib/exportPdf");
              exportarPdf(dados, mes, ANO);
            }}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Unidades na rede</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalUnidades}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Preenchidas {labelStatus}
          </p>
          <p className="text-3xl font-bold text-green-600 mt-1">{preencheramNoDia}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Faltando {labelStatus}
          </p>
          <p className="text-3xl font-bold text-red-500 mt-1">
            {totalUnidades - preencheramNoDia}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total matrículas</p>
          <p className="text-3xl font-bold text-primary-500 mt-1">
            {dados.reduce((a, d) => a + d.matriculas_totais, 0)}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando dados...
          </div>
        ) : dados.length === 0 ? (
          <div className="text-center h-32 flex items-center justify-center text-gray-400">
            Nenhum dado para {MESES[mes - 1]} {ANO}
            {filtrouDia && ` — ${format(new Date(dia + "T12:00:00"), "dd/MM", { locale: ptBR })}`}
          </div>
        ) : (
          <TabelaConsolidada
            dados={dados}
            mostrarStatus
            onEditar={handleEditar}
          />
        )}
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
