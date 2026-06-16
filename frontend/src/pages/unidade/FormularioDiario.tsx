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

  const { loading, salvando, carregarPorData, salvar } = useRegistros({
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
  }, [dataSelecionada, carregarPorData]);

  async function handleSalvar() {
    if (!dataSelecionada) return;
    const iso = dateToIso(dataSelecionada);
    await salvar(iso, linhas);
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
    </div>
  );
}
