import { ChevronLeft, ChevronRight } from "lucide-react";
import { MESES } from "../../lib/rankingSupervisoras";

interface Props {
  ano: number;
  onAno: (ano: number) => void;
  /** Mês selecionado (YYYY-MM). */
  valor?: string;
  /** Limites (YYYY-MM) inclusivos. */
  min: string;
  max: string;
  onEscolher: (ym: string) => void;
}

const botaoNav =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

/** Troca de ano + 12 meses: substitui o painel de mês/ano do seletor nativo do navegador. */
export default function GradeMeses({ ano, onAno, valor, min, max, onEscolher }: Props) {
  const anoMin = Number(min.slice(0, 4));
  const anoMax = Number(max.slice(0, 4));
  const hoje = new Date();
  const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  return (
    <div className="w-[17.5rem]">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className={botaoNav} onClick={() => onAno(ano - 1)} disabled={ano <= anoMin} aria-label="Ano anterior">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold tabular-nums text-gray-900" aria-live="polite">{ano}</span>
        <button type="button" className={botaoNav} onClick={() => onAno(ano + 1)} disabled={ano >= anoMax} aria-label="Próximo ano">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MESES.map((nome, i) => {
          const ym = `${ano}-${String(i + 1).padStart(2, "0")}`;
          const fora = ym < min || ym > max;
          const selecionado = ym === valor;
          return (
            <button
              key={ym}
              type="button"
              disabled={fora}
              aria-pressed={selecionado}
              onClick={() => onEscolher(ym)}
              className={`h-11 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:text-gray-400 ${
                selecionado
                  ? "bg-primary-500 text-white"
                  : ym === mesHoje
                    ? "bg-gray-100 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-primary-50"
                    : "text-gray-800 hover:bg-primary-50 disabled:hover:bg-transparent"
              }`}
            >
              {nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}
