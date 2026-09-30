import { X } from "lucide-react";
import {
  MESES,
  faixasDeMeses,
  serieMeses,
  type Atribuicao,
  type DadoUnidadeMes,
  type LinhaRanking,
  type Metodo,
} from "../../lib/rankingSupervisoras";
import { num, pct, plural } from "./formato";

/** Um quadrinho por mês do período: cheio = unidade na carteira dela naquele mês. */
function FaixaMeses({ meses, ativos }: { meses: string[]; ativos: string[] }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {meses.map((m) => (
        <span key={m} title={`${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`} className={`h-3 w-2.5 rounded-sm ${ativos.includes(m) ? "bg-primary-500" : "bg-gray-200"}`} />
      ))}
    </span>
  );
}

interface Props {
  linha: LinhaRanking;
  outroCalculo: { rotulo: string; valor: number | null };
  nomeUnidade: (id: string) => string;
  atribuicoes: Atribuicao[];
  dados: Map<string, DadoUnidadeMes>;
  meses: string[];
  metodo: Metodo;
  onFechar?: () => void;
  /** Dentro da linha do ranking: sem cartão nem cabeçalho. */
  embutido?: boolean;
  id?: string;
}

export default function DetalheSupervisora({ linha: l, outroCalculo, nomeUnidade, atribuicoes, dados, meses, metodo, onFechar, embutido, id }: Props) {
  const variosMeses = meses.length > 1;
  const atuais = l.detalhe.filter((d) => d.atual);
  const sairam = l.detalhe.filter((d) => !d.atual);
  const faixa = faixasDeMeses(l.mesesAtuacao);

  return (
    <section
      id={id}
      aria-label={`Detalhe de ${l.supervisora.nome}`}
      className={embutido ? "space-y-6 border-t border-primary-100 bg-primary-50/30 px-4 py-5 sm:px-5 md:pl-[4.25rem]" : "card space-y-6 p-5"}
    >
      {!embutido && (
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{l.supervisora.nome}</h2>
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X className="h-4 w-4" aria-hidden />
            Fechar
          </button>
        </div>
      )}
      <div className="space-y-2 text-sm text-gray-800">
        <p>
          {variosMeses ? <>Em <strong className="font-semibold">{faixa}</strong>, </> : null}
          {l.supervisora.nome} acompanhou <strong className="font-semibold">{plural(l.detalhe.length, "unidade", "unidades")}</strong>
          {sairam.length > 0 && variosMeses ? ` (${sairam.length} ${sairam.length === 1 ? "saiu" : "saíram"} da carteira no caminho)` : ""}. Aproveitamento nesse tempo:{" "}
          <strong className="font-semibold tabular-nums text-gray-900">{pct(l.aproveitamento)}</strong>{" "}
          <span className="tabular-nums text-gray-700">({num(l.matriculas)} matrículas em {num(l.visitas)} visitas)</span>.
        </p>
        {variosMeses && (
          <p className="text-gray-700">
            Cada unidade só conta nos meses em que estava com {l.supervisora.nome}. Os meses em que esteve com outra supervisora vão para ela.
          </p>
        )}
        {l.aproveitamento !== null && outroCalculo.valor !== null && Math.abs(outroCalculo.valor - l.aproveitamento) >= 0.0005 && (
          <p className="text-gray-700">
            Pela <strong className="font-semibold">{outroCalculo.rotulo.toLowerCase()}</strong> seria{" "}
            <strong className="font-semibold tabular-nums text-gray-900">{pct(outroCalculo.valor)}</strong> (
            {outroCalculo.valor > l.aproveitamento ? "+" : "−"}
            {(Math.abs(outroCalculo.valor - l.aproveitamento) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.).
          </p>
        )}
      </div>

      {variosMeses && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Mês a mês</h3>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {serieMeses({ supervisora: l.supervisora, atribuicoes, dados, meses, metodo }).map(({ mes, valor, unidades }) => (
              <li
                key={mes}
                className={`rounded-md border px-2 py-1.5 text-center ${unidades === 0 ? "border-dashed border-gray-300" : "border-gray-200 bg-white"}`}
              >
                <span className="block text-xs font-medium text-gray-700">{MESES[Number(mes.slice(5, 7)) - 1]}</span>
                {unidades === 0 ? (
                  <span className="block text-xs text-gray-600">sem carteira</span>
                ) : (
                  <>
                    <span className="block text-sm font-semibold tabular-nums text-gray-900">{pct(valor)}</span>
                    <span className="block text-xs tabular-nums text-gray-600">{unidades} unid.</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Unidades e tempo com {l.supervisora.nome}</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-700">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Unidade</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">{variosMeses ? "Com ela" : "Situação"}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Visitas</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Matrículas</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Aproveitamento</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Perda</th>
              </tr>
            </thead>
            {[
              { titulo: null as string | null, lista: atuais },
              { titulo: `Saíram da carteira de ${l.supervisora.nome}`, lista: sairam },
            ]
              .filter((g) => g.lista.length)
              .map((g) => (
                <tbody key={g.titulo ?? "atuais"} className="tabular-nums">
                  {g.titulo && atuais.length > 0 && (
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <th scope="rowgroup" colSpan={6} className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700">
                        {g.titulo}
                      </th>
                    </tr>
                  )}
                  {g.lista.map((d) => (
                    <tr key={d.unidadeId} className="border-t border-gray-100">
                      <th scope="row" className="px-3 py-2 text-left font-medium text-gray-900">{nomeUnidade(d.unidadeId)}</th>
                      <td className="px-3 py-2 text-gray-800">
                        {variosMeses ? (
                          <span className="flex items-center gap-2.5">
                            <FaixaMeses meses={meses} ativos={d.meses} />
                            <span className="whitespace-nowrap">
                              {faixasDeMeses(d.meses)}
                              <span className="text-gray-600"> · {plural(d.meses.length, "mês", "meses")}</span>
                            </span>
                          </span>
                        ) : d.atual ? (
                          "Na carteira"
                        ) : (
                          "Saiu"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">{num(d.visitas)}</td>
                      <td className="px-3 py-2 text-right text-gray-800">{num(d.matriculas)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {pct(d.aproveitamento)}
                        {(d.aproveitamento ?? 0) > 1 && <span className="ml-0.5 text-amber-700" title="Mais matrículas que visitas">*</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">{pct(d.perda)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
          </table>
        </div>
        {variosMeses && (
          <p className="mt-2 text-xs text-gray-700">Visitas, matrículas e aproveitamento de cada unidade contam só os meses com {l.supervisora.nome}.</p>
        )}
        {l.detalhe.some((d) => (d.aproveitamento ?? 0) > 1) && (
          <p className="mt-1 text-xs text-amber-800">
            * Acima de 100%: a unidade registrou mais matrículas que visitas (matrícula sem visita lançada, ou dado da planilha a conferir).
          </p>
        )}
      </section>
    </section>
  );
}
