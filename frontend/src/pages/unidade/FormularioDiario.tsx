import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save } from "lucide-react";
import { useAuth } from "../../App";
import { useRegistros } from "../../hooks/useRegistros";
import { TURMAS, registroVazio } from "../../types";
import type { RegistroInput } from "../../types";
import { FERIADOS_SET } from "../../lib/feriados";
import { dateToIso } from "../../lib/utils";
import FormularioTurmas from "../../components/FormularioTurmas";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";

function inicializarLinhas(): RegistroInput[] {
  return TURMAS.map(registroVazio);
}

export default function FormularioDiario() {
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(() => {
    const paramData = params.get("data");
    if (paramData) {
      const d = new Date(paramData + "T12:00:00");
      return d;
    }
    return undefined;
  });

  const [linhas, setLinhas] = useState<RegistroInput[]>(inicializarLinhas());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [modalObsAberto, setModalObsAberto] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [obsExistente, setObsExistente] = useState("");

  const { loading, salvando, carregarPorData, salvar, carregarObservacao, salvarObservacao } = useRegistros({
    unidadeId: profile!.id,
    unidadeNome: profile!.unidade_nome ?? "",
  });

  const hoje = new Date();

  const isDesabilitado = useCallback(
    (date: Date) => {
      const dia = date.getDay();
      const isWeekend = dia === 0 || dia === 6;
      const isHoliday = FERIADOS_SET.has(dateToIso(date));
      const isOutroMes = !isSameMonth(date, hoje);
      return isWeekend || isHoliday || isOutroMes;
    },
    [hoje]
  );

  useEffect(() => {
    if (!dataSelecionada) return;
    const iso = dateToIso(dataSelecionada);
    carregarPorData(iso).then(setLinhas);
    carregarObservacao(iso).then((obs) => {
      setObsExistente(obs);
      setObservacao(obs);
    });
  }, [dataSelecionada, carregarPorData, carregarObservacao]);

  function handleSalvar() {
    if (!dataSelecionada) return;
    setObservacao(obsExistente);
    setModalObsAberto(true);
  }

  async function handleConfirmarSalvar() {
    if (!dataSelecionada || !observacao.trim()) return;
    const iso = dateToIso(dataSelecionada);
    const ok = await salvar(iso, linhas);
    if (ok) {
      await salvarObservacao(iso, observacao.trim());
      setObsExistente(observacao.trim());
    }
    setModalObsAberto(false);
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Formulário Diário</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.unidade_nome} — preencha os dados de visitas e matrículas do dia
        </p>
      </div>

      {/* Seletor de data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Selecione a data</h2>
        <div className="flex items-start gap-6">
          <div className="relative">
            <button
              onClick={() => setMostrarCalendario((v) => !v)}
              className="flex items-center gap-2 h-9 px-4 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              {dataSelecionada
                ? format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })
                : "Selecione um dia útil"}
            </button>

            {mostrarCalendario && (
              <div className="absolute top-11 left-0 z-30 bg-white rounded-xl shadow-xl border border-gray-200">
                <Calendar
                  mode="single"
                  selected={dataSelecionada}
                  onSelect={(d) => {
                    setDataSelecionada(d);
                    setMostrarCalendario(false);
                  }}
                  disabled={isDesabilitado}
                  locale={ptBR}
                  defaultMonth={startOfMonth(hoje)}
                  fromMonth={startOfMonth(hoje)}
                  toMonth={endOfMonth(hoje)}
                />
                <div className="px-4 pb-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
                  Apenas dias úteis do mês atual habilitados
                </div>
              </div>
            )}
          </div>

          {dataSelecionada && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-900">
                {format(dataSelecionada, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      {dataSelecionada ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Dados do dia — {format(dataSelecionada, "dd/MM/yyyy")}
            </h2>
            {loading && (
              <span className="text-xs text-gray-400">Carregando...</span>
            )}
          </div>

          <FormularioTurmas linhas={linhas} onChange={setLinhas} />

          {obsExistente && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">Observação do dia:</span> {obsExistente}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSalvar} disabled={salvando} size="lg">
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Selecione uma data para começar o preenchimento</p>
        </div>
      )}

      {/* Modal de observação */}
      <Dialog open={modalObsAberto} onOpenChange={setModalObsAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Observação do dia</DialogTitle>
            <DialogDescription>
              Obrigatório — informe o nome e telefone de cada visita para registro no CRM.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <textarea
              className="w-full rounded-md border border-gray-300 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Insira o nome e telefone da visita"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              autoFocus
            />
            {observacao.trim() === "" && (
              <p className="mt-1 text-xs text-red-500">
                Preencha o nome e telefone da visita para salvar.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalObsAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarSalvar}
              disabled={salvando || observacao.trim() === ""}
            >
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Confirmar e salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
