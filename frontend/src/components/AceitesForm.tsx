import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ThumbsUp, Save, Trash2 } from "lucide-react";
import { TURMAS, aceiteVazio } from "../types";
import type { RematriculaAceiteDia, RematriculaAceiteInput } from "../types";
import { dateToIso } from "../lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

interface Props {
  unidadeId: string;
  linhas: RematriculaAceiteDia[];
  loading: boolean;
  salvando: boolean;
  removendo: boolean;
  salvar: (unidadeId: string, dataIso: string, linhasPorTurma: RematriculaAceiteInput[]) => Promise<boolean>;
  remover: (unidadeId: string, dataIso: string) => Promise<boolean>;
}

// Preenchimento manual de aceites por dia e por turma — mesmo padrão do
// Formulário Diário de visitas (calendário + uma linha editável por turma).
// Usado tanto pela unidade (seus próprios dados) quanto pelo marketing/
// supervisão (por unidade escolhida).
export default function AceitesForm({ unidadeId, linhas, loading, salvando, removendo, salvar, remover }: Props) {
  const doUnidade = useMemo(() => linhas.filter((l) => l.unidade_id === unidadeId), [linhas, unidadeId]);

  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [modalRemocaoAberto, setModalRemocaoAberto] = useState(false);
  const dataIso = dateToIso(dataSelecionada);

  const salvoPorTurma = useMemo(() => {
    const doDia = doUnidade.filter((l) => l.data === dataIso);
    const mapa = new Map<string, number>();
    for (const l of doDia) mapa.set(l.turma, l.quantidade);
    return mapa;
  }, [doUnidade, dataIso]);

  const [linhasDia, setLinhasDia] = useState<RematriculaAceiteInput[]>(() => TURMAS.map(aceiteVazio));

  useEffect(() => {
    setLinhasDia(TURMAS.map((turma) => ({ turma, quantidade: salvoPorTurma.get(turma) ?? 0 })));
  }, [salvoPorTurma]);

  useEffect(() => {
    if (!mostrarCalendario) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMostrarCalendario(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mostrarCalendario]);

  function handleChange(turma: string, valor: string) {
    const num = Math.max(0, parseInt(valor) || 0);
    setLinhasDia((prev) => prev.map((l) => (l.turma === turma ? { ...l, quantidade: num } : l)));
  }

  const alterado = linhasDia.some((l) => l.quantidade !== (salvoPorTurma.get(l.turma) ?? 0));
  const totalDia = linhasDia.reduce((soma, l) => soma + l.quantidade, 0);
  const temPreenchimento = Array.from(salvoPorTurma.values()).some((v) => v > 0);

  async function handleSalvar() {
    if (!unidadeId) return;
    await salvar(unidadeId, dataIso, linhasDia);
  }

  async function handleRemover() {
    if (!unidadeId) return;
    const ok = await remover(unidadeId, dataIso);
    if (ok) setModalRemocaoAberto(false);
  }

  const recentes = useMemo(() => {
    const porDia = new Map<string, number>();
    for (const l of doUnidade) porDia.set(l.data, (porDia.get(l.data) ?? 0) + l.quantidade);
    return Array.from(porDia.entries())
      .filter(([, quantidade]) => quantidade > 0)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10);
  }, [doUnidade]);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Selecione o dia</h2>
        <div className="relative mb-4">
          <button
            type="button"
            aria-expanded={mostrarCalendario}
            aria-haspopup="dialog"
            onClick={() => setMostrarCalendario((v) => !v)}
            className="flex items-center gap-2 h-9 px-4 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            {format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })}
          </button>

          {mostrarCalendario && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMostrarCalendario(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="Selecionar data"
                className="absolute top-11 left-0 z-30 bg-white rounded-xl shadow-xl border border-gray-200"
              >
                <Calendar
                  mode="single"
                  selected={dataSelecionada}
                  onSelect={(d) => {
                    if (!d) return;
                    setDataSelecionada(d);
                    setMostrarCalendario(false);
                  }}
                  disabled={(date) => date > new Date()}
                  locale={ptBR}
                  defaultMonth={startOfMonth(dataSelecionada)}
                  toMonth={new Date()}
                />
              </div>
            </>
          )}
        </div>

        <h3 className="text-sm font-medium text-gray-700 mb-1.5">
          Aceites em {format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })}, por turma
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-500 text-white">
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Turma</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Aceites</th>
              </tr>
            </thead>
            <tbody>
              {linhasDia.map((l, i) => (
                <tr key={l.turma} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap border-r border-gray-100">
                    {l.turma}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      value={l.quantidade}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(l.turma, e.target.value)}
                      disabled={loading || !unidadeId}
                      className="input-numero"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Total do dia: <span className="font-semibold text-cyan-700">{totalDia}</span>
          </p>
          <div className="flex items-center gap-2">
            {temPreenchimento && (
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setModalRemocaoAberto(true)}
                disabled={salvando || removendo}
              >
                <Trash2 className="h-4 w-4" />
                Remover preenchimento
              </Button>
            )}
            <Button onClick={handleSalvar} disabled={!unidadeId || !alterado || salvando || loading} size="lg">
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Registre assim que uma família confirmar verbalmente a rematrícula, mesmo antes de assinar o contrato.
        </p>
      </div>

      <Dialog open={modalRemocaoAberto} onOpenChange={setModalRemocaoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover preenchimento</DialogTitle>
            <DialogDescription>
              Todos os aceites de {format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })} serão removidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRemocaoAberto(false)} disabled={removendo}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemover} disabled={removendo}>
              <Trash2 className="h-4 w-4" />
              {removendo ? "Removendo..." : "Sim, remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {recentes.length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimos registros</h2>
          <ul className="divide-y divide-gray-100">
            {recentes.map(([data, quantidade]) => (
              <li key={data} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-600">
                  {format(new Date(data + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-700">
                  <ThumbsUp className="h-3.5 w-3.5 text-cyan-400" />
                  {quantidade}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
