import { useId, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { dateToIso, formatarData } from "../../lib/utils";
import GradeMeses from "./GradeMeses";
import Popover from "./Popover";
import { nomeMesCompleto } from "./formato";

interface Props {
  de: string;
  ate: string;
  /** Menor data selecionável (YYYY-MM-DD). */
  min: string;
  onChange: (de: string, ate: string) => void;
}

const paraData = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};
const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function atalhos(hoje: Date) {
  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return [
    { rotulo: "Últimos 7 dias", de: dateToIso(somarDias(hoje, -6)), ate: dateToIso(hoje) },
    { rotulo: "Últimos 30 dias", de: dateToIso(somarDias(hoje, -29)), ate: dateToIso(hoje) },
    { rotulo: "Este mês", de: dateToIso(primeiroDoMes), ate: dateToIso(hoje) },
    {
      rotulo: "Mês passado",
      de: dateToIso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
      ate: dateToIso(somarDias(primeiroDoMes, -1)),
    },
    { rotulo: "Ano até hoje", de: `${hoje.getFullYear()}-01-01`, ate: dateToIso(hoje) },
  ];
}

const nav =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

export default function SeletorDatas({ de, ate, min, onChange }: Props) {
  const idGatilho = useId();
  const hoje = new Date();
  const max = dateToIso(hoje);
  const completo = !!de && !!ate;
  const dias = completo ? Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86_400_000) + 1 : 0;

  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(() => paraData(ate || max));
  const [vista, setVista] = useState<"dias" | "meses">("dias");
  const [inicio, setInicio] = useState<Date | null>(null); // 1º clique, esperando o 2º
  const [sobre, setSobre] = useState<Date | null>(null);

  function abrir() {
    setMes(paraData(ate || max));
    setVista("dias");
    setInicio(null);
    setSobre(null);
    setAberto((a) => !a);
  }
  function fechar() {
    setAberto(false);
    setInicio(null);
  }
  function aplicar(novoDe: string, novoAte: string) {
    onChange(novoDe, novoAte);
    fechar();
  }
  function clicarDia(dia: Date) {
    if (!inicio) {
      setInicio(dia);
      return;
    }
    const [a, b] = dia < inicio ? [dia, inicio] : [inicio, dia];
    aplicar(dateToIso(a), dateToIso(b));
  }

  // Prévia: com o 1º clique feito, o intervalo acompanha o mouse.
  const selecionado = inicio
    ? { from: inicio, to: sobre && sobre >= inicio ? sobre : inicio }
    : completo
      ? { from: paraData(de), to: paraData(ate) }
      : undefined;

  const lista = atalhos(hoje).filter((a) => a.de >= min);
  const ativoIdx = lista.findIndex((a) => a.de === de && a.ate === ate);
  const mesMin = min.slice(0, 7);
  const mesMax = max.slice(0, 7);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div>
        <label htmlFor={idGatilho} className="mb-1 block text-xs font-medium text-gray-600">Intervalo</label>
        <Popover
          aberto={aberto}
          onFechar={fechar}
          rotulo="Escolher intervalo de datas"
          gatilho={
            <button
              id={idGatilho}
              type="button"
              data-gatilho
              aria-haspopup="dialog"
              aria-expanded={aberto}
              onClick={abrir}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <CalendarRange className="h-4 w-4 text-gray-500" aria-hidden />
              <span className="font-medium">{de ? formatarData(de) : "Data inicial"}</span>
              <ArrowRight className="h-4 w-4 text-gray-500" aria-hidden />
              <span className="font-medium">{ate ? formatarData(ate) : "Data final"}</span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} aria-hidden />
            </button>
          }
        >
          <div className="w-[17.5rem]">
            <div role="group" aria-label="Atalhos de período" className="mb-3 flex flex-wrap gap-1.5">
              {lista.map((a, i) => (
                <button
                  key={a.rotulo}
                  type="button"
                  aria-pressed={i === ativoIdx}
                  onClick={() => aplicar(a.de, a.ate)}
                  className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    i === ativoIdx
                      ? "border-primary-300 bg-primary-50 text-primary-800"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {a.rotulo}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  className={nav}
                  onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
                  disabled={vista === "meses" || ym(mes) <= mesMin}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-expanded={vista === "meses"}
                  onClick={() => setVista((v) => (v === "dias" ? "meses" : "dias"))}
                  title="Escolher mês e ano"
                  className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {nomeMesCompleto(ym(mes))}
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform motion-reduce:transition-none ${vista === "meses" ? "rotate-180" : ""}`} aria-hidden />
                </button>
                <button
                  type="button"
                  className={nav}
                  onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
                  disabled={vista === "meses" || ym(mes) >= mesMax}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {vista === "meses" ? (
                <GradeMeses
                  ano={mes.getFullYear()}
                  onAno={(a) => setMes(new Date(a, mes.getMonth(), 1))}
                  valor={ym(mes)}
                  min={mesMin}
                  max={mesMax}
                  onEscolher={(v) => { setMes(new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, 1)); setVista("dias"); }}
                />
              ) : (
                <div onMouseLeave={() => setSobre(null)}>
                  <DayPicker
                    mode="range"
                    locale={ptBR}
                    month={mes}
                    onMonthChange={setMes}
                    selected={selecionado}
                    onDayClick={clicarDia}
                    onDayMouseEnter={(d) => setSobre(d)}
                    disabled={[{ before: paraData(min) }, { after: hoje }]}
                    showOutsideDays
                    fixedWeeks
                    components={{ Caption: () => null }}
                    classNames={{
                      months: "block",
                      month: "space-y-1",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "h-8 w-10 text-center text-xs font-medium text-gray-600",
                      row: "mt-0.5 flex w-full",
                      cell: "relative h-10 w-10 p-0 text-center text-sm",
                      day: "h-10 w-10 rounded-md p-0 text-sm font-normal text-gray-900 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed",
                      day_today: "font-bold text-primary-700 underline underline-offset-4",
                      day_outside: "text-gray-400",
                      day_disabled: "cursor-not-allowed text-gray-400 opacity-50 hover:bg-transparent",
                      day_range_start: "!rounded-md !bg-primary-500 !text-white hover:!bg-primary-600",
                      day_range_end: "!rounded-md !bg-primary-500 !text-white hover:!bg-primary-600",
                      day_range_middle: "!rounded-none !bg-primary-100 !text-primary-900 hover:!bg-primary-200",
                      day_selected: "",
                    }}
                  />
                </div>
              )}
            </div>

            <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-700" aria-live="polite">
              {inicio
                ? `Início em ${formatarData(dateToIso(inicio))}. Clique na data final.`
                : "Clique na data inicial e depois na final."}
            </p>
          </div>
        </Popover>
      </div>

      <p className="flex items-center gap-1.5 self-end pb-2 text-sm text-gray-700 tabular-nums" aria-live="polite">
        {completo ? (
          <>
            <strong className="font-semibold text-gray-900">{dias} {dias === 1 ? "dia" : "dias"}</strong>
            <span className="text-gray-600">selecionados</span>
          </>
        ) : (
          <span className="font-medium text-red-700">Escolha as duas datas</span>
        )}
      </p>
    </div>
  );
}
