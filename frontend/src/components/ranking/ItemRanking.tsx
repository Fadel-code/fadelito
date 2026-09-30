import { Info, ArrowDownRight, ArrowUpRight, ChevronRight, Minus, Trophy } from "lucide-react";
import {
  faixasDeMeses,
  type Atribuicao,
  type DadoUnidadeMes,
  type LinhaRanking,
  type Metodo,
} from "../../lib/rankingSupervisoras";
import DetalheSupervisora from "./DetalheSupervisora";
import { num, pct, plural, rotuloMes } from "./formato";

/** Mesmas colunas no cabeçalho e nas linhas — sem coluna de variação quando não há mês anterior. */
export const colunasRanking = (comDelta: boolean) =>
  comDelta
    ? "md:grid-cols-[2.25rem_minmax(10rem,1fr)_4.5rem_5.5rem_13rem_6.5rem_7rem_1rem]"
    : "md:grid-cols-[2.25rem_minmax(10rem,1fr)_4.5rem_5.5rem_13rem_7rem_1rem]";

function Posicao({ n }: { n: number }) {
  const primeira = n === 1;
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
        primeira ? "bg-sun text-ink" : n <= 3 ? "bg-primary-100 text-primary-800" : "bg-gray-100 text-gray-700"
      }`}
    >
      {primeira ? <Trophy className="h-4 w-4" aria-hidden /> : `${n}º`}
      {primeira && <span className="sr-only">1º</span>}
    </span>
  );
}

function Variacao({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-sm text-gray-600">—</span>;
  const zero = Math.abs(delta) < 0.05;
  const Icone = zero ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const cor = zero ? "text-gray-700" : delta > 0 ? "text-green-700" : "text-red-700";
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums ${cor}`}>
      <Icone className="h-4 w-4" aria-hidden />
      {delta > 0 && !zero ? "+" : ""}
      {delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.
    </span>
  );
}

/** Barra numa escala fixa (não relativa ao maior valor) com a marca da média da rede. */
function Barra({ valor, escala, rede }: { valor: number | null; escala: number; rede: number | null }) {
  const v = Math.min((valor ?? 0) / escala, 1);
  const acima = valor !== null && rede !== null && valor >= rede;
  return (
    <span className="relative mt-1.5 block h-2 w-full rounded-full bg-gray-100" aria-hidden>
      <span
        className={`absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none ${acima ? "bg-primary-500" : "bg-primary-300"}`}
        style={{ transform: `scaleX(${v})` }}
      />
      {rede !== null && (
        <span className="absolute -inset-y-1 w-0.5 rounded bg-ink/70" style={{ left: `${Math.min(rede / escala, 1) * 100}%` }} />
      )}
    </span>
  );
}

type Selo = { texto: string; tom: "saiu" | "entrou" };

/** Entrou/saiu dentro do período: explica por que duas supervisoras têm tempos de atuação diferentes. */
function selosAtuacao(l: LinhaRanking, meses: string[], mesAgora: string): Selo[] {
  if (meses.length < 2 || l.mesesAtuacao.length === 0) return [];
  const primeiro = l.mesesAtuacao[0];
  const ultimo = l.mesesAtuacao[l.mesesAtuacao.length - 1];
  const selos: Selo[] = [];
  if (primeiro > meses[0]) selos.push({ texto: `Entrou em ${rotuloMes(primeiro)}`, tom: "entrou" });
  if (ultimo < mesAgora) selos.push({ texto: `Sem carteira desde ${rotuloMes(meses[meses.indexOf(ultimo) + 1] ?? ultimo)}`, tom: "saiu" });
  return selos;
}

interface Props {
  posicao: number;
  linha: LinhaRanking;
  escala: number;
  rede: number | null;
  /** undefined = sem coluna de variação; null = sem valor do mês anterior. */
  delta: number | null | undefined;
  perdaRotulo: string;
  /** O mesmo período pelo outro cálculo — mostra o quanto a escolha muda o número. */
  outroCalculo: { rotulo: string; valor: number | null };
  /** Mês que conta como "hoje" (carteira atual). */
  mesAgora: string;
  expandida: boolean;
  onAlternar: () => void;
  nomeUnidade: (id: string) => string;
  atribuicoes: Atribuicao[];
  dados: Map<string, DadoUnidadeMes>;
  meses: string[];
  metodo: Metodo;
}

export default function ItemRanking({ posicao, linha: l, escala, rede, delta, perdaRotulo, outroCalculo, mesAgora, expandida, onAlternar, nomeUnidade, atribuicoes, dados, meses, metodo }: Props) {
  const idDetalhe = `detalhe-${l.supervisora.id}`;
  const variosMeses = meses.length > 1;
  const selos = selosAtuacao(l, meses, mesAgora);
  const atuais = l.detalhe.filter((d) => d.atual).length;
  const saiu = l.detalhe.length - atuais;

  const resumo = variosMeses
    ? `${faixasDeMeses(l.mesesAtuacao)} · ${plural(l.detalhe.length, "unidade", "unidades")}${saiu && atuais ? ` (${atuais} ${atuais === 1 ? "atual" : "atuais"})` : ""}`
    : plural(l.detalhe.length, "unidade", "unidades");

  return (
    <li>
      <button
        type="button"
        aria-expanded={expandida}
        aria-controls={idDetalhe}
        onClick={onAlternar}
        className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-x-3 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-primary-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:px-5 md:gap-x-4 ${colunasRanking(delta !== undefined)} ${expandida ? "bg-primary-50/40" : ""}`}
      >
        <Posicao n={posicao} />
        <span className="block min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-base font-semibold text-gray-900">{l.supervisora.nome}</span>
            {selos.map((s) => (
              <span key={s.texto} className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.tom === "saiu" ? "bg-gray-200 text-gray-800" : "bg-primary-100 text-primary-800"}`}>
                {s.texto}
              </span>
            ))}
          </span>
          <span className="mt-0.5 block text-sm text-gray-700 tabular-nums">
            {resumo}
            <span className="md:hidden"> · {num(l.visitas)} visitas · {num(l.matriculas)} matrículas</span>
          </span>
        </span>
        <ChevronRight
          className={`col-start-3 row-start-1 h-4 w-4 text-gray-500 transition-transform duration-200 motion-reduce:transition-none md:order-last md:col-auto md:row-auto ${expandida ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="col-span-3 grid grid-cols-2 items-end gap-3 md:contents">
          <span className="hidden text-right text-sm text-gray-800 tabular-nums md:block">{num(l.visitas)}</span>
          <span className="hidden text-right text-sm text-gray-800 tabular-nums md:block">{num(l.matriculas)}</span>
          <span className="col-span-2 block md:col-span-1">
            <span className="block text-xs font-medium text-gray-600 md:hidden">Aproveitamento</span>
            <span className="block text-xl font-bold leading-none text-gray-900 tabular-nums">{pct(l.aproveitamento)}</span>
            <Barra valor={l.aproveitamento} escala={escala} rede={rede} />
          </span>
          {delta !== undefined && (
            <span className="block md:text-center">
              <span className="block text-xs font-medium text-gray-600 md:hidden">vs. mês anterior</span>
              <Variacao delta={delta} />
            </span>
          )}
          <span className="block md:text-center">
            <span className="block text-xs font-medium text-gray-600 md:hidden">{perdaRotulo}</span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-800 tabular-nums">
              {pct(l.perda)}
              {l.unidadesSemBase > 0 && (
                <>
                  <Info className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                  <span className="sr-only">{l.unidadesSemBase} {l.unidadesSemBase === 1 ? "unidade ainda não tem" : "unidades ainda não têm"} alunos ativos informados</span>
                </>
              )}
            </span>
          </span>
        </span>
      </button>

      {expandida && (
        <DetalheSupervisora
          embutido
          id={idDetalhe}
          linha={l}
          outroCalculo={outroCalculo}
          nomeUnidade={nomeUnidade}
          atribuicoes={atribuicoes}
          dados={dados}
          meses={meses}
          metodo={metodo}
        />
      )}
    </li>
  );
}
