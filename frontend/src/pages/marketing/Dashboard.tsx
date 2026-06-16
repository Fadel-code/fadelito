import { useState } from "react";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { useConsolidado } from "../../hooks/useConsolidado";
import type { ConsolidadoUnidade } from "../../types";
import { MESES } from "../../types";
import { exportarExcel } from "../../lib/exportExcel";
import { exportarPdf } from "../../lib/exportPdf";
import TabelaConsolidada from "../../components/TabelaConsolidada";
import ModalEdicaoUnidade from "../../components/ModalEdicaoUnidade";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";

const ANO = 2026;

export default function Dashboard() {
  const mesCorrido = new Date().getMonth() + 1;
  const [mes, setMes] = useState(mesCorrido);
  const [modalAberto, setModalAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<ConsolidadoUnidade | null>(null);

  const { dados, loading, recarregar } = useConsolidado(ANO, mes);

  function handleEditar(u: ConsolidadoUnidade) {
    setUnidadeEditando(u);
    setModalAberto(true);
  }

  function handleFecharModal() {
    setModalAberto(false);
    setUnidadeEditando(null);
    recarregar();
  }

  const preencheramHoje = dados.filter((d) => d.preencheu_hoje).length;
  const totalUnidades = dados.length;

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
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => {
                const num = i + 1;
                const futuro = num > mesCorrido;
                return (
                  <SelectItem key={num} value={String(num)} disabled={futuro}>
                    {nome} {ANO}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={recarregar} title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="outline"
            onClick={() => exportarExcel(dados, mes, ANO)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>

          <Button
            variant="outline"
            onClick={() => exportarPdf(dados, mes, ANO)}
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
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Preenchidas hoje</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{preencheramHoje}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Faltando hoje</p>
          <p className="text-3xl font-bold text-red-500 mt-1">
            {totalUnidades - preencheramHoje}
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
          </div>
        ) : (
          <TabelaConsolidada
            dados={dados}
            mostrarStatus={mes === mesCorrido}
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
