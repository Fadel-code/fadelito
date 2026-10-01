import { useMemo, useState } from "react";
import { CalendarDays, Info, ChevronRight, RefreshCw, Settings2, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ROTULO, CARD_DESTAQUE } from "../../components/ui/estilos";
import Segmentado from "../../components/ui/segmentado";
import SeletorDatas from "../../components/ranking/SeletorDatas";
import ConfiguracaoRanking from "../../components/ranking/ConfiguracaoRanking";
import SeletorMes from "../../components/ranking/SeletorMes";
import ItemRanking, { colunasRanking } from "../../components/ranking/ItemRanking";
import { pct } from "../../components/ranking/formato";
import { useRankingSupervisoras } from "../../hooks/useRankingSupervisoras";
import {
  MESES,
  calcularRanking,
  porPessoa,
  calcularRede,
  faixasDeMeses,
  conferirCarteira,
  mesAnterior,
  mesesDoIntervalo,
  ultimoDiaDoMes,
  GRUPO,
  type Linha,
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

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={ROTULO}>{rotulo}</label>
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
  // Detalhe da supervisora (mês a mês) usa a carteira já agrupada por pessoa, igual ao ranking.
  const atribuicoesPessoa = useMemo(() => porPessoa(ativas, atribuicoes).atribuicoes, [ativas, atribuicoes]);
  const outroMetodo: Metodo = metodo === "ponderado" ? "simples" : "ponderado";
  const aproveitamentoOutro = useMemo(
    () => new Map(calcularRanking({ supervisoras: ativas, atribuicoes, dados, meses, metodo: outroMetodo, mesAgora }).map((l) => [l.supervisora.id, l.aproveitamento])),
    [ativas, atribuicoes, dados, meses, outroMetodo, mesAgora]
  );
  const rede = useMemo(() => calcularRede(dados, meses, metodo), [dados, meses, metodo]);
  const redeOutro = useMemo(() => calcularRede(dados, meses, outroMetodo), [dados, meses, outroMetodo]);
  // Cada opção de cálculo mostra a média da rede que ela daria: a troca deixa de ser às cegas.
  const metodosComValor = METODOS.map((m) => {
    const v = (m.valor === metodo ? rede : redeOutro).aproveitamento;
    return { ...m, extra: loading || v === null ? undefined : pct(v) };
  });
  const anos = Array.from({ length: anoAtual - ANO_INICIAL + 1 }, (_, i) => ANO_INICIAL + i);

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
    const grupos = new Map<string, { tipo: "sem" | "duas"; linha: Linha; primeiro: string; ultimo: string; nomes: string[] }>();
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
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ranking de Supervisoras</h1>
          <p className="mt-1 text-sm text-gray-600">Quem transforma mais visitas em matrículas e quanto cada carteira perde de alunos.</p>
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
          <section aria-label="Filtros" className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                <div>
                  <span className={ROTULO}>Período</span>
                  <Segmentado rotulo="Tipo de período" valor={modo} opcoes={MODOS} onChange={(m) => { setModo(m); setAberta(null); }} />
                </div>
                {modo === "ano" && (anos.length > 1 ? (
                  <Campo id="rk-ano" rotulo="Ano">
                    <select id="rk-ano" className={CAMPO} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                      {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Campo>
                ) : (
                  // ponytail: um ano só não vira select de uma opção; volta sozinho quando houver 2027.
                  <div>
                    <span className={ROTULO}>Ano</span>
                    <p className="flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold tabular-nums text-gray-900">
                      <CalendarDays className="h-4 w-4 text-gray-500" aria-hidden />
                      {ano}
                    </p>
                  </div>
                ))}
                {modo === "mes" && (
                  <div>
                    <span className={ROTULO}>Mês</span>
                    <SeletorMes valor={mesSel} min={`${ANO_INICIAL}-01`} max={mesCorrente} onChange={setMesSel} />
                  </div>
                )}
                {modo === "datas" && (
                  <SeletorDatas de={de} ate={ate} min={`${ANO_INICIAL}-01-01`} onChange={(d, a) => { setDe(d); setAte(a); }} />
                )}
              </div>
              <div>
                <span className={ROTULO}>Cálculo do aproveitamento</span>
                <Segmentado rotulo="Cálculo do aproveitamento" valor={metodo} opcoes={metodosComValor} onChange={setMetodo} />
              </div>
            </div>
            <details className="group mt-4 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
              <summary className="flex cursor-pointer list-none items-start gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-700 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
                <span>
                  {metodo === "ponderado" ? (
                    <><strong className="font-semibold text-gray-900">Ponderado:</strong> soma as matrículas, soma as visitas e divide. Unidade com mais visitas pesa mais.</>
                  ) : (
                    <><strong className="font-semibold text-gray-900">Média simples:</strong> média da % de cada unidade, como na planilha. Toda unidade pesa igual.</>
                  )}{" "}
                  <span className="font-medium text-primary-700 group-hover:underline">
                    <span className="group-open:hidden">Ver a diferença com um exemplo</span>
                    <span className="hidden group-open:inline">Fechar exemplo</span>
                  </span>
                </span>
              </summary>
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <p className="mb-3 text-gray-700">
                  Uma supervisora com duas unidades: a <strong className="font-semibold">A</strong> teve 4 visitas e 2 matrículas (50%); a <strong className="font-semibold">B</strong> teve 60 visitas e 6 matrículas (10%). Clique num cálculo para usá-lo.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { valor: "ponderado" as Metodo, titulo: "Ponderado", conta: "(2 + 6) ÷ (4 + 60) = 8 ÷ 64", resultado: "12,5%", leitura: "A B fez quase todas as visitas, então o resultado fica perto dela. Bom para comparar carteiras de tamanhos diferentes." },
                    { valor: "simples" as Metodo, titulo: "Média simples", conta: "(50% + 10%) ÷ 2", resultado: "30%", leitura: "A e B valem igual, mesmo com B fazendo 15 vezes mais visitas. É o cálculo da planilha." },
                  ].map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      aria-pressed={metodo === c.valor}
                      onClick={() => setMetodo(c.valor)}
                      className={`rounded-lg border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${metodo === c.valor ? "border-primary-300 ring-1 ring-primary-200" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-900">
                        {c.titulo}
                        {metodo === c.valor
                          ? <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">em uso</span>
                          : <span className="text-xs font-medium text-primary-700">Usar este</span>}
                      </span>
                      <span className="mt-1 block tabular-nums text-gray-700">{c.conta} = <strong className="text-base font-bold text-gray-900">{c.resultado}</strong></span>
                      <span className="mt-2 block text-gray-600">{c.leitura}</span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </section>


          {planilhaIgnorada.length > 0 && (
            <p role="status" className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
              <span>Em {planilhaIgnorada.map(rotuloMes).join(", ")} você escolheu só parte do mês. A planilha tem apenas o total do mês, então esse mês usa só o Formulário Diário dos dias escolhidos.</span>
            </p>
          )}

          {avisosCarteira.length > 0 && (
            <div role="status" className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
                <div className="space-y-1">
                  {avisosCarteira.map((g) => {
                    const quando = g.primeiro === g.ultimo ? `em ${rotuloMes(g.primeiro)}` : `de ${rotuloMes(g.primeiro)} a ${rotuloMes(g.ultimo)}`;
                    const varias = g.nomes.length > 1;
                    return (
                      <p key={`${g.tipo}${g.linha}${g.primeiro}${g.ultimo}`}>
                        {g.tipo === "sem"
                          ? `${g.nomes.join(", ")} ${varias ? "estão" : "está"} sem supervisora do ${GRUPO[g.linha]} ${quando} e ${varias ? "ficam" : "fica"} fora do ranking.`
                          : `${g.nomes.join(", ")} ${varias ? "têm" : "tem"} duas supervisoras do ${GRUPO[g.linha]} ${quando} e ${varias ? "contam" : "conta"} duas vezes.`}
                      </p>
                    );
                  })}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setMesConfig(avisosCarteira[0].primeiro); setAba("config"); }} className="flex-shrink-0 self-start text-gray-700 sm:self-center">Ajustar carteira</Button>
            </div>
          )}

          {!loading && linhas.length > 0 && mesesSemBase.length > 0 && (
            <div role="status" className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
                <span>
                  Ainda falta informar os alunos ativos de{" "}
                  {mesesSemBase.slice(0, 3).map((m) => `${rotuloMes(m.mes)} (${m.n} ${m.n === 1 ? "unidade" : "unidades"})`).join(", ")}
                  {mesesSemBase.length > 3 ? ` e mais ${mesesSemBase.length - 3} ${mesesSemBase.length - 3 === 1 ? "mês" : "meses"}` : ""}.
                  {" "}A perda só conta as unidades que já têm esse número. O aproveitamento não muda.
                </span>
              </p>
              <Button variant="ghost" size="sm" onClick={irParaAlunosAtivos} className="flex-shrink-0 self-start text-gray-700 sm:self-center">Informar alunos ativos</Button>
            </div>
          )}

          <section aria-labelledby="rk-titulo" className={CARD_DESTAQUE}>
            <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 id="rk-titulo" className="text-xl font-bold tracking-tight text-gray-900">Ranking</h2>
                <p className="mt-1 text-sm text-gray-700">
                  {rotuloPeriodo}
                  {!loading && <> · {linhas.length} {linhas.length === 1 ? "supervisora" : "supervisoras"}</>}
                </p>
                {meses.length > 1 && (
                  <p className="mt-1 max-w-prose text-xs text-gray-600">
                    Cada uma conta só as unidades e os meses em que esteve com ela. Abra a linha para ver quais.
                  </p>
                )}
              </div>
              {/* Números da rede no período: o contexto contra o qual cada linha é lida. */}
              <dl className="grid grid-cols-3 gap-x-4 sm:gap-x-10 lg:flex-shrink-0 lg:text-right">
                {[
                  { rotulo: "Visitas", valor: num(rede.visitas) },
                  { rotulo: "Matrículas", valor: num(rede.matriculas) },
                  { rotulo: "Média da rede", valor: pct(rede.aproveitamento), destaque: true },
                ].map((k) => (
                  <div key={k.rotulo} className="min-w-0">
                    <dt className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-gray-600 lg:justify-end">
                      {k.destaque && <span className="inline-block h-3 w-0.5 rounded bg-ink/70" aria-hidden />}
                      {k.rotulo}
                    </dt>
                    <dd className={`mt-0.5 tabular-nums tracking-tight text-gray-900 text-xl sm:text-2xl ${k.destaque ? "font-bold" : "font-semibold"}`}>
                      {loading ? "—" : k.valor}
                    </dd>
                  </div>
                ))}
              </dl>
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
                      atribuicoes={atribuicoesPessoa}
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
