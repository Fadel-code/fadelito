import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import GradeMeses from "./GradeMeses";
import Popover from "./Popover";
import { nomeMesCompleto } from "./formato";

interface Props {
  /** YYYY-MM */
  valor: string;
  min: string;
  max: string;
  onChange: (ym: string) => void;
}

const somarMes = (ym: string, n: number) => {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const nav =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

/** Mês específico: setas pra andar mês a mês e painel com ano + 12 meses pra saltar. */
export default function SeletorMes({ valor, min, max, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [ano, setAno] = useState(Number(valor.slice(0, 4)));

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={nav} onClick={() => onChange(somarMes(valor, -1))} disabled={valor <= min} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <Popover
        aberto={aberto}
        onFechar={() => setAberto(false)}
        rotulo="Escolher mês"
        gatilho={
          <button
            type="button"
            data-gatilho
            aria-haspopup="dialog"
            aria-expanded={aberto}
            onClick={() => { setAno(Number(valor.slice(0, 4))); setAberto((a) => !a); }}
            className="inline-flex h-9 min-w-[11.5rem] items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {nomeMesCompleto(valor)}
            <CalendarDays className="h-4 w-4 text-gray-500" aria-hidden />
          </button>
        }
      >
        <GradeMeses ano={ano} onAno={setAno} valor={valor} min={min} max={max} onEscolher={(ym) => { onChange(ym); setAberto(false); }} />
      </Popover>
      <button type="button" className={nav} onClick={() => onChange(somarMes(valor, 1))} disabled={valor >= max} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
