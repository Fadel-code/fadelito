import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, RefreshCw, Settings2, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import SeletorDatas from "../../components/ranking/SeletorDatas";
import ConfiguracaoRanking from "../../components/ranking/ConfiguracaoRanking";
import SeletorMes from "../../components/ranking/SeletorMes";
import ItemRanking, { colunasRanking } from "../../components/ranking/ItemRanking";
import { pct } from "../../components/ranking/formato";
import { useRankingSupervisoras } from "../../hooks/useRankingSupervisoras";
import {
  MESES,
  calcularRanking,
  calcularRede,
  faixasDeMeses,
  conferirCarteira,
  mesAnterior,
  mesesDoIntervalo,
  ultimoDiaDoMes,
  type Metodo,
} from "../../lib/rankingSupervisoras";
import { anoMesAtual, dateToIso, formatarData } from "../../lib/utils";

const ANO_INICIAL = 2026;

type Modo = "ano" | "mes" | "datas";
type Aba = "ranking" | "config";

const MODOS: { valor: Modo; rotulo: string; curto: string }[] = [
  { valor: "ano", rotulo: "Ano inteiro", curto: "Ano" },
  { valor: "mes", rotulo: "Mês específico", curto: "Mês" },
  { valor: "datas", rotulo: "Datas personalizadas", curto: "Datas" },
];
const METODOS: { valor: Metodo; rotulo: string; curto?: string }[] = [
  { valor: "ponderado", rotulo: "Ponderado" },
  { valor: "simples", rotulo: "Média simples", curto: "Simples" },
];

const rotuloMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
const CAMPO = "h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const num = (x: number) => x.toLocaleString("pt-BR");

function Segmentado<T extends string>({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string; curto?: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex max-w-full rounded-lg bg-gray-100 p-0.5 text-sm">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={`h-8 rounded-md px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            valor === o.valor ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {o.curto ? (
            <>
              <span className="sm:hidden">{o.curto}</span>
              <span className="hidden sm:inline">{o.rotulo}</span>
            </>
          ) : (
            o.rotulo
          )}
        </button>
      ))}
    </div>
  );
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">{rotulo}</label>
      {children}
    </div>
  );
}

function Esqueleto() {
  return (
    <ul className="divide-y divide-gray-100" aria-busy="true" aria-label="Carregando ranking">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-4 px-5 py-4 motion-reduce:animate-none">
          <span className="h-9 w-9 rounded-full bg-gray-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-4 w-32 rounded bg-gray-100" />
            <span className="block h-3 w-56 max-w-full rounded bg-gray-100" />
          </span>
          <span className="hidden h-6 w-60 rounded bg-gray-100 md:block" />
        </li>
      ))}
    </ul>
  );
}

export default function RankingSupervisoras() {
  const { ano: anoAtual, mes: mesAtual } = anoMesAtual();
  const mesCorrente = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;
  const [aba, setAba] = useState<Aba>("ranking");
  const [modo, setModo] = useState<Modo>("ano");
  const [ano, setAno] = useState(anoAtual);
  const [mesSel, setMesSel] = useState(mesCorrente);
  const [de, setDe] = useState(`${mesCorrente}-01`);
  const [ate, setAte] = useState(dateToIso(new Date()));
  const [metodo, setMetodo] = useState<Metodo>("ponderado");
  const [aberta, setAberta] = useState<string | null>(null);
  const [mesConfig, setMesConfig] = useState<string | null>(null);

  const datasOk = modo !== "datas" || (!!de && !!ate && de <= ate);
  const { inicio, fim } = useMemo(() => {
    // Ano corrente vai só até o mês atual: mês futuro não tem resultado (um registro com data adiantada não entra).
    if (modo === "ano") return { inicio: `${ano}-01-01`, fim: ano === anoAtual ? ultimoDiaDoMes(`${mesCorrente}-01`) : `${ano}-12-31` };
    if (modo === "datas" && datasOk) return { inicio: de, fim: ate };
    // Datas inválidas: segue carregando o mês escolhido até corrigirem.
    return { inicio: `${mesSel}-01`, fim: ultimoDiaDoMes(`${mesSel}-01`) };
  }, [modo, ano, anoAtual, mesCorrente, mesSel, de, ate, datasOk]);

  const ranking = useRankingSupervisoras(inicio, fim);
  const { supervisoras, atribuicoes, unidades, dados, loading, carregar, planilhaIgnorada } = ranking;
  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";

  const meses = useMemo(() => mesesDoIntervalo(inicio, fim), [inicio, fim]);
  const ativas = useMemo(() => supervisoras.filter((s) => s.ativo), [supervisoras]);
  // "Unidades agora": a carteira do mês atual (ou do último mês do período, se já passou).
  const mesAgora = useMemo(() => [...meses].reverse().find((m) => m <= `${mesCorrente}-01`) ?? meses[0], [meses, mesCorrente]);
  const linhas = useMemo(
    () => calcularRanking({ supervisoras: ativas, atribuicoes, dados, meses, metodo, mesAgora }),
    [ativas, atribuicoes, dados, meses, metodo, mesAgora]
  );
  const outroMetodo: Metodo = metodo === "ponderado" ? "simples" : "ponderado";
  const aproveitamentoOutro = useMemo(
    () => new Map(calcularRanking({ supervisoras: ativas, atribuicoes, dados, meses, metodo: outroMetodo, mesAgora }).map((l) => [l.supervisora.id, l.aproveitamento])),
    [ativas, atribuicoes, dados, meses, outroMetodo, mesAgora]
  );
  const rede = useMemo(() => calcularRede(dados, meses, metodo), [dados, meses, metodo]);

  // Variação contra o mês anterior só faz sentido quando se olha um mês específico.
  const anterior = useMemo(() => {
    if (modo !== "mes" || !datasOk) return null;
    const lista = calcularRanking({ supervisoras: ativas, atribuicoes, dados, meses: [mesAnterior(`${mesSel}-01`)], metodo });
    return new Map(lista.map((l) => [l.supervisora.id, l.aproveitamento]));
  }, [modo, datasOk, ativas, atribuicoes, dados, mesSel, metodo]);

  // Escala fixa (múltiplos de 10%), pra barra não exagerar diferença pequena.
  const escala = Math.max(0.6, Math.ceil(Math.max(rede.aproveitamento ?? 0, ...linhas.map((l) => l.aproveitamento ?? 0)) * 10) / 10);

  // Meses do período em que faltam alunos ativos — a perda depende disso.
  const mesesSemBase = useMemo(() => {
    const todas = [...dados.values()];
    return meses
      .map((mes) => ({ mes, n: todas.filter((d) => d.mes === mes && !((d.alunosBase ?? 0) > 0)).length }))
      .filter((m) => m.n > 0);
  }, [dados, meses]);

  // Unidades que ficam de fora do ranking (sem supervisora da linha) ou contam em dobro.
  const avisosCarteira = useMemo(() => {
    if (loading || atribuicoes.length === 0) return [];
    const grupos = new Map<string, { tipo: "sem" | "duas"; linha: string; primeiro: string; ultimo: string; nomes: string[] }>();
    for (const p of conferirCarteira({ supervisoras, atribuicoes, dados, meses })) {
      const chave = `${p.tipo}|${p.linha}|${p.primeiroMes}|${p.ultimoMes}`;
      const g = grupos.get(chave) ?? { tipo: p.tipo, linha: p.linha, primeiro: p.primeiroMes, ultimo: p.ultimoMes, nomes: [] };
      g.nomes.push(nomeUnidade(p.unidadeId));
      grupos.set(chave, g);
    }
    return [...grupos.values()].map((g) => ({ ...g, nomes: g.nomes.sort((a, b) => a.localeCompare(b, "pt-BR")) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, supervisoras, atribuicoes, dados, meses, unidades]);

  const semAtribuicao = !loading && atribuicoes.length === 0;
  const fimMes = `${fim.slice(0, 7)}-01`;
  const mesRefConfig = mesConfig ?? (fimMes > `${mesCorrente}-01` ? `${mesCorrente}-01` : fimMes);
  const rotuloPeriodo = modo === "ano" ? `${faixasDeMeses(meses)} de ${ano}` : modo === "mes" ? rotuloMes(`${mesSel}-01`) : `${formatarData(inicio)} a ${formatarData(fim)}`;
  const perdaRotulo = meses.length === 1 ? "Perda" : "Perda acum.";
  const comDelta = anterior !== null;

  function irParaAlunosAtivos() {
    setMesConfig(mesesSemBase[0]?.mes ?? null);
    setAba("config");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ranking de Supervisoras</h1>
          <p className="mt-1 text-sm text-gray-600">Quem converte mais visitas em matrículas, e quanto cada carteira perde de alunos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Seções do ranking" className="inline-flex rounded-lg bg-gray-100 p-0.5 text-sm">
            {([["ranking", "Ranking", Users], ["config", "Configuração", Settings2]] as const).map(([valor, rotulo, Icone]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={aba === valor}
                onClick={() => { setAba(valor); if (valor === "ranking") setMesConfig(null); }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  aba === valor ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icone className="h-4 w-4" aria-hidden />
                {rotulo}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={carregar} title="Atualizar dados" aria-label="Atualizar dados">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Button>
        </div>
      </div>

      {aba === "config" ? (
        <ConfiguracaoRanking key={`${inicio}|${fim}|${mesConfig}`} ranking={ranking} mesInicial={mesRefConfig} />
      ) : (
        <div className="space-y-4">
          <section aria-label="Filtros" className="card p-4">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <span className="mb-1 block text-xs font-medium text-gray-600">Período</span>
                <Segmentado rotulo="Tipo de período" valor={modo} opcoes={MODOS} onChange={(m) => { setModo(m); setAberta(null); }} />
              </div>
              {modo === "ano" && (
                <Campo id="rk-ano" rotulo="Ano">
                  <select id="rk-ano" className={CAMPO} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                    {Array.from({ length: anoAtual - ANO_INICIAL + 1 }, (_, i) => ANO_INICIAL + i).map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Campo>
              )}
              {modo === "mes" && (
                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-600">Mês</span>
                  <SeletorMes valor={mesSel} min={`${ANO_INICIAL}-01`} max={mesCorrente} onChange={setMesSel} />
                </div>
              )}
              <div>
                <span className="mb-1 block text-xs font-medium text-gray-600">Cálculo do aproveitamento</span>
                <Segmentado rotulo="Cálculo do aproveitamento" valor={metodo} opcoes={METODOS} onChange={setMetodo} />
              </div>
            </div>
            {modo === "datas" && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <SeletorDatas de={de} ate={ate} min={`${ANO_INICIAL}-01-01`} onChange={(d, a) => { setDe(d); setAte(a); }} />
              </div>
            )}
            <div className="mt-3 max-w-3xl text-xs leading-relaxed text-gray-600">
              <p>
                {metodo === "ponderado" ? (
                  <><strong className="font-semibold text-gray-900">Ponderado:</strong> soma todas as matrículas e todas as visitas das unidades da supervisora e divide (matrículas ÷ visitas). Unidade com mais visitas pesa mais.</>
                ) : (
                  <><strong className="font-semibold text-gray-900">Média simples:</strong> calcula a % de cada unidade e tira a média, como na planilha. Toda unidade pesa igual, tenha 5 ou 100 visitas.</>
                )}
              </p>
              <details className="group mt-2">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden />
                  Ver a diferença com um exemplo
                </summary>
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <p className="mb-3 text-gray-700">
                    Uma supervisora com duas unidades: a <strong className="font-semibold">A</strong> teve 4 visitas e 2 matrículas (50%); a <strong className="font-semibold">B</strong> teve 60 visitas e 6 matrículas (10%).
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { valor: "ponderado" as Metodo, titulo: "Ponderado", conta: "(2 + 6) ÷ (4 + 60) = 8 ÷ 64", resultado: "12,5%", leitura: "A unidade B fez quase todas as visitas, então o resultado fica perto dela. Mostra o desempenho real do volume atendido. Use para comparar supervisoras com carteiras de tamanhos diferentes." },
                      { valor: "simples" as Metodo, titulo: "Média simples", conta: "(50% + 10%) ÷ 2", resultado: "30%", leitura: "A e B valem o mesmo, mesmo com B fazendo 15 vezes mais visitas. É o cálculo da planilha: use quando precisar bater com ela." },
                    ].map((c) => (
                      <div key={c.valor} className={`rounded-lg border bg-white p-3 ${metodo === c.valor ? "border-primary-300 ring-1 ring-primary-200" : "border-gray-200"}`}>
                        <p className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-900">
                          {c.titulo}
                          {metodo === c.valor && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">em uso</span>}
                        </p>
                        <p className="mt-1 tabular-nums text-gray-700">{c.conta} = <strong className="text-base font-bold text-gray-900">{c.resultado}</strong></p>
                        <p className="mt-2 text-gray-600">{c.leitura}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </section>

          {planilhaIgnorada.length > 0 && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Em {planilhaIgnorada.map(rotuloMes).join(", ")} o período corta o mês no meio. A planilha só tem o total do mês, então valem apenas os registros do Formulário Diário dos dias escolhidos.
            </p>
          )}

          {avisosCarteira.length > 0 && (
            <div role="status" className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                <div className="space-y-1">
                  {avisosCarteira.map((g) => {
                    const quando = g.primeiro === g.ultimo ? rotuloMes(g.primeiro) : `${rotuloMes(g.primeiro)} a ${rotuloMes(g.ultimo)}`;
                    return (
                      <p key={`${g.tipo}${g.linha}${g.primeiro}${g.ultimo}`}>
                        <strong className="font-semibold">
                          {g.tipo === "sem" ? `Sem supervisora na linha ${g.linha}` : `Duas supervisoras na linha ${g.linha}`} ({quando}):
                        </strong>{" "}
                        {g.nomes.join(", ")}. {g.tipo === "sem" ? "Não entram no ranking." : "Contadas em dobro."}
                      </p>
                    );
                  })}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setMesConfig(avisosCarteira[0].primeiro); setAba("config"); }} className="flex-shrink-0 bg-white">Ajustar carteira</Button>
            </div>
          )}

          {!loading && linhas.length > 0 && mesesSemBase.length > 0 && (
            <div role="status" className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                <span>
                  <strong className="font-semibold">Perda incompleta.</strong> Faltam os alunos ativos de{" "}
                  {mesesSemBase.slice(0, 3).map((m) => `${rotuloMes(m.mes)} (${m.n} ${m.n === 1 ? "unidade" : "unidades"})`).join(", ")}
                  {mesesSemBase.length > 3 ? ` e mais ${mesesSemBase.length - 3} ${mesesSemBase.length - 3 === 1 ? "mês" : "meses"}` : ""}. O aproveitamento não é afetado.
                </span>
              </p>
              <Button variant="outline" size="sm" onClick={irParaAlunosAtivos} className="flex-shrink-0 bg-white">Preencher alunos ativos</Button>
            </div>
          )}

          <section aria-label="Ranking" className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-gray-100 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {rotuloPeriodo}
                  {!loading && <span className="ml-2 font-normal text-gray-700">· {linhas.length} {linhas.length === 1 ? "supervisora" : "supervisoras"}</span>}
                </h2>
                {meses.length > 1 && (
                  <p className="mt-0.5 text-xs text-gray-700">
                    Cada supervisora é medida só nos meses e nas unidades que estavam com ela. Abra uma linha para ver quais.
                  </p>
                )}
              </div>
              {!loading && rede.aproveitamento !== null && (
                <p className="flex items-center gap-2 text-xs text-gray-700 tabular-nums">
                  <span className="inline-block h-3 w-0.5 rounded bg-ink/70" aria-hidden />
                  <span>
                    Média da rede <strong className="font-semibold text-gray-900">{pct(rede.aproveitamento)}</strong> · {num(rede.visitas)} visitas · {num(rede.matriculas)} matrículas
                  </span>
                </p>
              )}
            </div>

            {loading ? (
              <Esqueleto />
            ) : linhas.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <p className="max-w-md text-sm text-gray-700">
                  {semAtribuicao
                    ? "Nenhuma unidade está na carteira de uma supervisora ainda. Monte as carteiras para o ranking aparecer."
                    : "Não há visitas nem matrículas das unidades das supervisoras neste período. Tente outro mês ou outras datas."}
                </p>
                {semAtribuicao && <Button size="sm" onClick={() => setAba("config")}>Montar carteiras</Button>}
              </div>
            ) : (
              <>
                <div className={`hidden items-center gap-x-4 border-b border-gray-100 bg-gray-50 px-5 py-2 text-xs font-semibold text-gray-700 md:grid ${colunasRanking(comDelta)}`} aria-hidden>
                  <span />
                  <span>Supervisora</span>
                  <span className="text-right">Visitas</span>
                  <span className="text-right">Matrículas</span>
                  <span>Aproveitamento</span>
                  {comDelta && <span className="text-center">vs. mês anterior</span>}
                  <span className="text-center">{perdaRotulo}</span>
                  <span />
                </div>
                <ul className="divide-y divide-gray-100">
                  {linhas.map((l, i) => (
                    <ItemRanking
                      key={l.supervisora.id}
                      posicao={i + 1}
                      linha={l}
                      escala={escala}
                      rede={rede.aproveitamento}
                      delta={
                        anterior
                          ? l.aproveitamento !== null && anterior.get(l.supervisora.id) != null
                            ? (l.aproveitamento - (anterior.get(l.supervisora.id) as number)) * 100
                            : null
                          : undefined
                      }
                      perdaRotulo={perdaRotulo}
                      outroCalculo={{ rotulo: METODOS.find((m) => m.valor === outroMetodo)!.rotulo, valor: aproveitamentoOutro.get(l.supervisora.id) ?? null }}
                      mesAgora={mesAgora}
                      expandida={aberta === l.supervisora.id}
                      onAlternar={() => setAberta(aberta === l.supervisora.id ? null : l.supervisora.id)}
                      nomeUnidade={nomeUnidade}
                      atribuicoes={atribuicoes}
                      dados={dados}
                      meses={meses}
                      metodo={metodo}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
