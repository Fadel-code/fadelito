import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { pct, num } from "../../components/ranking/formato";
import "./metricas.css";

const ANO = 2026;
// Metas da rede (iguais em todas as planilhas). A meta de visitas é por unidade: metricas_anuais.
const META_CONVERSAO = 0.35;
const META_PERDA = 0.1;
const META_TREINAMENTO = 0.85;
const META_EQUIPE = 0.15; // teto de rotatividade
const META_SALDO = 0.1;
// O formulário diário só tem registros a partir de junho/2026. Antes disso, visitas, matrículas e
// desligamentos vêm das planilhas das supervisoras (metricas_mensais).
const MES_INICIO_FORMULARIO = 6;

// Visitas e matrículas têm meta anual: o ideal de hoje é a parte da meta que o ano já "gastou".
const fracaoDoAno = (() => {
  const hoje = new Date();
  if (hoje.getFullYear() !== ANO) return hoje.getFullYear() > ANO ? 1 : 0;
  const inicio = new Date(ANO, 0, 1).getTime();
  return (hoje.getTime() - inicio) / (new Date(ANO + 1, 0, 1).getTime() - inicio);
})();
const pctAno = Math.round(fracaoDoAno * 100);
// Linhas visíveis antes de "ver todas": mantém a página curta.
const LINHAS_INICIAIS = 10;
const pctInt = (x: number) => `${Math.round(x * 100)}%`;

interface Mensal { unidade_id: string; ano: number; mes: number; alunos: number | null; treinamento_pct: number | null; equipe_pct: number | null; visitas: number | null; matriculas: number | null; desligamentos: number | null }
interface Anual { unidade_id: string; meta_visitas: number | null; perdas_rematricula: number | null; saidas_pre: number | null }
interface Consolidado { unidade_id: string; unidade_nome: string; mes: string; visitas_totais: number; matriculas_totais: number; desligamentos: number }

interface Linha {
  unidade_id: string;
  unidade: string;
  visitas: number;
  metaVisitas: number | null;
  matriculas: number;
  conversao: number | null;
  desligamentos: number;
  perda: number | null;
  treinamento: number | null;
  equipe: number | null;
  alunos: number | null;
  alunosAnoAnterior: number | null;
  saldo: number;
  saldoPct: number | null;
  /** Média de alunos no ano: base de perda e saldo. */
  base: number | null;
}

const media = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const div = (a: number, b: number | null) => (b ? a / b : null);

function montarLinhas(unidades: { id: string; unidade_nome: string }[], cons: Consolidado[], mensais: Mensal[], anuais: Anual[]): Linha[] {
  // Só entra quem tem planilha importada: as unidades fechadas (Brooklin, Klabin, Perdizes, Real Parque) ficam de fora.
  return unidades.flatMap((u) => {
    const a = anuais.find((x) => x.unidade_id === u.id);
    if (!a) return [];
    const c = cons.filter((x) => x.unidade_id === u.id);
    const m = mensais.filter((x) => x.unidade_id === u.id);
    const doAno = m.filter((x) => x.ano === ANO).sort((x, y) => x.mes - y.mes);
    const formulario = c.filter((x) => Number(x.mes.slice(5, 7)) >= MES_INICIO_FORMULARIO);
    const planilha = doAno.filter((x) => x.mes < MES_INICIO_FORMULARIO);
    const somaPlanilha = (f: (x: Mensal) => number | null) => planilha.reduce((s, x) => s + (f(x) ?? 0), 0);
    const visitas = formulario.reduce((s, x) => s + x.visitas_totais, 0) + somaPlanilha((x) => x.visitas);
    const matriculas = formulario.reduce((s, x) => s + x.matriculas_totais, 0) + somaPlanilha((x) => x.matriculas);
    const desligamentos = formulario.reduce((s, x) => s + x.desligamentos, 0) + somaPlanilha((x) => x.desligamentos);
    // Base dos percentuais: tamanho médio da escola no ano (janeiro exagera a perda de quem cresce).
    const base = media(doAno.map((x) => x.alunos));
    const ultimo = [...doAno].reverse().find((x) => x.alunos !== null) ?? null;
    const saldo = matriculas - desligamentos - (a.perdas_rematricula ?? 0) - (a.saidas_pre ?? 0);
    return [{
      unidade_id: u.id,
      unidade: u.unidade_nome,
      visitas,
      metaVisitas: a.meta_visitas,
      matriculas,
      conversao: div(matriculas, visitas),
      desligamentos,
      perda: div(desligamentos, base),
      treinamento: media(doAno.map((x) => x.treinamento_pct)),
      equipe: media(doAno.map((x) => x.equipe_pct)),
      alunos: ultimo?.alunos ?? null,
      alunosAnoAnterior: ultimo ? m.find((x) => x.ano === ANO - 1 && x.mes === ultimo.mes)?.alunos ?? null : null,
      saldo,
      saldoPct: div(saldo, base),
      base,
    }];
  });
}

type Estado = "ok" | "perto" | "longe" | null;
/** Verde no ideal, amarelo a até 20% dele, vermelho além disso; null sem dado. */
function estadoDe(v: number | null, ideal: number | null, menorMelhor = false): Estado {
  if (v === null || ideal === null) return null;
  if (menorMelhor) return v <= ideal ? "ok" : v <= ideal * 1.2 ? "perto" : "longe";
  return v >= ideal ? "ok" : v >= ideal * 0.8 ? "perto" : "longe";
}
const TEXTO = { ok: "no ideal", perto: "perto do ideal", longe: "longe do ideal" };

// Só o que está fora do ideal ganha cor; "no ideal" fica em tinta normal para o olho ir direto aos problemas.
const CELULA: Record<NonNullable<Estado>, string> = { ok: "", perto: "mt-cell--perto", longe: "mt-cell--longe" };
const classeCelula = (e: Estado) => (e === null ? "mt-cell--nulo" : CELULA[e]);

/** Trilho = meta do ano, preenchimento = feito, risco = onde a meta deveria estar hoje. */
function Barra({ feito, alvo }: { feito: number; alvo: number }) {
  return (
    <span className="mt-bar relative block h-1 w-full overflow-hidden rounded-full" aria-hidden>
      <span className="mt-bar-fill block h-full" style={{ transform: `scaleX(${Math.min(feito / alvo, 1)})` }} />
      <span className="mt-bar-tick absolute inset-y-0 w-0.5" style={{ left: `calc(${fracaoDoAno * 100}% - 1px)` }} />
    </span>
  );
}

/** Grupo do resumo: mesmo título e traço dos grupos da tabela, para os dois lerem como uma coisa só. */
function Grupo({ titulo, colunas, children }: { titulo: string; colunas: 2 | 3; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="mt-group-label pb-2 text-sm font-semibold">{titulo}</h2>
      <dl className={`mt-4 grid gap-x-6 gap-y-4 ${colunas === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>{children}</dl>
    </div>
  );
}

/** A meta fica ao lado do número, menor e em cinza: dá para comparar sem competir com o valor atual. */
function Figura({ rotulo, valor, meta, estado, children }: { rotulo: string; valor: string; meta?: string; estado: Estado; children?: ReactNode }) {
  return (
    <div className="mt-stat flex min-w-0 flex-col gap-1.5">
      <dt className="text-sm">{rotulo}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className={`mt-figure text-2xl font-bold tracking-tight ${estado ? `mt-figure--${estado}` : ""}`}>{valor}</span>
        {estado && <span className="sr-only"> ({TEXTO[estado]})</span>}
        {meta && <span className="mt-meta text-xs">{meta}</span>}
      </dd>
      {children}
    </div>
  );
}

function Cabecalho({ titulo, ideal, grupo, dica }: { titulo: string; ideal: string; grupo?: boolean; dica?: string }) {
  return (
    <th scope="col" title={dica} className={`px-3 pb-3 pt-3 text-right align-bottom ${grupo ? "mt-gap" : ""}`}>
      <span className="mt-col-title block whitespace-nowrap font-semibold">{titulo}</span>
      <span className="block whitespace-nowrap font-normal">{ideal}</span>
    </th>
  );
}

function Celula({ valor, sub, dica, estado, grupo }: { valor: string; sub?: string; dica?: string; estado: Estado; grupo?: boolean }) {
  return (
    <td title={dica} className={`mt-cell px-3 py-3 text-right ${classeCelula(estado)} ${grupo ? "mt-gap" : ""}`}>
      <span className="font-medium">{valor}</span>
      {estado && <span className="sr-only"> ({TEXTO[estado]})</span>}
      {sub && <span className="mt-sub ml-2 whitespace-nowrap text-xs">{sub}</span>}
    </td>
  );
}

/** Visitas e matrículas: o número, a barra da meta do ano e a linha do ano atravessando a coluna. */
function CelulaMeta({ feito, alvo, estado, grupo }: { feito: number; alvo: number | null; estado: Estado; grupo?: boolean }) {
  return (
    <td title={alvo ? `${pctInt(feito / alvo)} da meta do ano; o ideal de hoje é ${num(Math.round(alvo * fracaoDoAno))}` : "sem meta"}
      className={`mt-cell px-3 py-3 text-right ${classeCelula(estado)} ${grupo ? "mt-gap" : ""}`}>
      <span className="font-medium">{num(feito)}</span>
      {estado && <span className="sr-only"> ({TEXTO[estado]})</span>}
      {alvo !== null && <span className="mt-meta ml-1 text-xs">/ {num(alvo)}</span>}
    </td>
  );
}

const diferenca = (d: number) => (d === 0 ? "=" : `${d > 0 ? "+" : "−"}${num(Math.abs(d))}`);

function LinhaUnidade({ l }: { l: Linha }) {
  const meta = l.metaVisitas;
  const metaMatriculas = meta === null ? null : Math.round(meta * META_CONVERSAO);
  const dAlunos = l.alunos === null || l.alunosAnoAnterior === null ? null : l.alunos - l.alunosAnoAnterior;
  return (
    <tr>
      <th scope="row" className="mt-unit sticky left-0 z-[1] whitespace-nowrap px-3 py-3 text-left font-medium">{l.unidade}</th>
      <CelulaMeta grupo feito={l.visitas} alvo={meta} estado={estadoDe(l.visitas, meta === null ? null : meta * fracaoDoAno)} />
      <CelulaMeta feito={l.matriculas} alvo={metaMatriculas} estado={estadoDe(l.matriculas, metaMatriculas === null ? null : metaMatriculas * fracaoDoAno)} />
      <Celula valor={pct(l.conversao)} dica={`${num(l.matriculas)} matrículas em ${num(l.visitas)} visitas`} estado={estadoDe(l.conversao, META_CONVERSAO)} />
      <Celula grupo valor={l.alunos === null ? "—" : num(l.alunos)} sub={dAlunos === null ? undefined : diferenca(dAlunos)}
        dica={dAlunos === null || l.alunos === null ? undefined : `${num(l.alunos)} alunos hoje; no mesmo mês de ${ANO - 1} eram ${num(l.alunosAnoAnterior ?? 0)}`}
        estado={dAlunos === null ? null : dAlunos >= 0 ? "ok" : "longe"} />
      <Celula valor={pct(l.perda)} dica={`${num(l.desligamentos)} ${l.desligamentos === 1 ? "desligamento" : "desligamentos"} no ano`} estado={estadoDe(l.perda, META_PERDA, true)} />
      <Celula valor={pct(l.saldoPct)} dica={`${l.saldo >= 0 ? "+" : ""}${num(l.saldo)} alunos no ano`} estado={estadoDe(l.saldoPct, META_SALDO)} />
      <Celula grupo valor={pct(l.treinamento)} estado={estadoDe(l.treinamento, META_TREINAMENTO)} />
      <Celula valor={pct(l.equipe)} estado={estadoDe(l.equipe, META_EQUIPE, true)} />
    </tr>
  );
}

function LinhaCarregando() {
  return (
    <tr aria-hidden>
      <th className="mt-unit sticky left-0 px-3 py-3.5 text-left"><span className="mt-skel block h-3.5 w-32" /></th>
      {Array.from({ length: 8 }, (_, i) => (
        <td key={i} className="px-3 py-3.5"><span className="mt-skel ml-auto block h-3.5 w-14" /></td>
      ))}
    </tr>
  );
}

export default function Metricas() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const secao = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const [un, cons, mens, anu] = await Promise.all([
        supabase.from("profiles").select("id, unidade_nome").eq("role", "unidade").eq("ativo", true).order("unidade_nome"),
        supabase.from("consolidado_mensal").select("unidade_id, unidade_nome, mes, visitas_totais, matriculas_totais, desligamentos").gte("mes", `${ANO}-01-01`).lt("mes", `${ANO + 1}-01-01`),
        supabase.from("metricas_mensais").select("unidade_id, ano, mes, alunos, treinamento_pct, equipe_pct, visitas, matriculas, desligamentos").in("ano", [ANO - 1, ANO]),
        supabase.from("metricas_anuais").select("unidade_id, meta_visitas, perdas_rematricula, saidas_pre").eq("ano", ANO),
      ]);
      const falha = un.error ?? cons.error ?? mens.error ?? anu.error;
      if (falha) return setErro(falha.message);
      setLinhas(montarLinhas(un.data ?? [], cons.data ?? [], mens.data ?? [], anu.data ?? []));
    })();
  }, []);

  const rede = useMemo(() => {
    if (!linhas) return null;
    const soma = (f: (l: Linha) => number | null) => linhas.reduce((s, l) => s + (f(l) ?? 0), 0);
    const visitas = soma((l) => l.visitas);
    const metaVisitas = soma((l) => l.metaVisitas);
    const matriculas = soma((l) => l.matriculas);
    const base = soma((l) => l.base);
    // Comparação com o ano anterior só entre unidades que têm os dois números.
    const comparaveis = linhas.filter((l) => l.alunos !== null && l.alunosAnoAnterior !== null);
    const alunosAntes = comparaveis.reduce((s, l) => s + (l.alunosAnoAnterior ?? 0), 0);
    const alunosAgora = comparaveis.reduce((s, l) => s + (l.alunos ?? 0), 0);
    return {
      visitas, metaVisitas, matriculas, metaMatriculas: metaVisitas * META_CONVERSAO, conversao: div(matriculas, visitas),
      treinamento: media(linhas.map((l) => l.treinamento)), equipe: media(linhas.map((l) => l.equipe)),
      alunos: soma((l) => l.alunos),
      alunosAntes: comparaveis.length && comparaveis.length === linhas.filter((l) => l.alunos !== null).length ? alunosAntes : null,
      dAlunos: comparaveis.length ? alunosAgora - alunosAntes : null,
      perda: div(soma((l) => (l.base === null ? 0 : l.desligamentos)), base || null),
      saldoPct: div(soma((l) => (l.base === null ? 0 : l.saldo)), base || null),
    };
  }, [linhas]);

  const metaRedeMatriculas = rede ? Math.round(rede.metaMatriculas) : 0;

  return (
    <div className="mt space-y-6">
      <header className="min-w-0">
        <h1 className="mt-title text-2xl font-bold tracking-tight">Métricas {ANO}</h1>
        <p className="mt-lede mt-1 text-sm">{pctAno}% do ano já passou</p>
      </header>

      {erro && <p role="alert" className="mt-error rounded-xl p-4 text-sm">Não foi possível carregar as métricas: {erro}. Recarregue a página; se continuar, avise o time de sistemas.</p>}

      <section aria-label="Resumo da rede" className="mt-panel mt-summary grid gap-x-10 gap-y-6 px-5 py-5 sm:px-6 lg:grid-cols-[3fr_3fr_2fr]">
        <Grupo titulo="Visitas e matrículas" colunas={3}>
          <Figura rotulo="Visitas" valor={rede ? num(rede.visitas) : "—"} meta={rede ? `/ ${num(rede.metaVisitas)}` : undefined}
            estado={estadoDe(rede?.visitas ?? null, rede ? rede.metaVisitas * fracaoDoAno : null)}>
            {rede && rede.metaVisitas > 0 && <dd><Barra feito={rede.visitas} alvo={rede.metaVisitas} /></dd>}
          </Figura>
          <Figura rotulo="Matrículas" valor={rede ? num(rede.matriculas) : "—"} meta={rede ? `/ ${num(metaRedeMatriculas)}` : undefined}
            estado={estadoDe(rede?.matriculas ?? null, rede ? rede.metaMatriculas * fracaoDoAno : null)}>
            {rede && metaRedeMatriculas > 0 && <dd><Barra feito={rede.matriculas} alvo={rede.metaMatriculas} /></dd>}
          </Figura>
          <Figura rotulo="Conversão" valor={pct(rede?.conversao ?? null)} meta={`≥ ${pctInt(META_CONVERSAO)}`} estado={estadoDe(rede?.conversao ?? null, META_CONVERSAO)} />
        </Grupo>
        <Grupo titulo="Alunos" colunas={3}>
          <Figura rotulo="Alunos" valor={rede ? num(rede.alunos) : "—"}
            meta={rede?.alunosAntes != null ? `/ ${num(rede.alunosAntes)} em ${ANO - 1}` : undefined}
            estado={rede?.dAlunos == null ? null : rede.dAlunos >= 0 ? "ok" : "longe"} />
          <Figura rotulo="Perda" valor={pct(rede?.perda ?? null)} meta={`≤ ${pctInt(META_PERDA)}`} estado={estadoDe(rede?.perda ?? null, META_PERDA, true)} />
          <Figura rotulo="Saldo" valor={pct(rede?.saldoPct ?? null)} meta={`≥ ${pctInt(META_SALDO)}`} estado={estadoDe(rede?.saldoPct ?? null, META_SALDO)} />
        </Grupo>
        <Grupo titulo="Equipe" colunas={2}>
          <Figura rotulo="Treinamento" valor={pct(rede?.treinamento ?? null)} meta={`≥ ${pctInt(META_TREINAMENTO)}`} estado={estadoDe(rede?.treinamento ?? null, META_TREINAMENTO)} />
          <Figura rotulo="Rotatividade" valor={pct(rede?.equipe ?? null)} meta={`≤ ${pctInt(META_EQUIPE)}`} estado={estadoDe(rede?.equipe ?? null, META_EQUIPE, true)} />
        </Grupo>
      </section>

      <section ref={secao} aria-labelledby="mt-titulo" className="mt-panel scroll-mt-4 overflow-clip">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="mt-titulo" className="mt-title text-lg font-bold tracking-tight">Por unidade</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-table w-full min-w-[920px] border-collapse text-sm tabular-nums">
            <thead className="text-xs">
              <tr>
                <td className="mt-unit sticky left-0 z-[1]" />
                <th scope="colgroup" colSpan={3} className="mt-group mt-gap px-3 pb-0 pt-4 text-left text-sm font-semibold"><span className="mt-group-label block pb-2">Visitas e matrículas</span></th>
                <th scope="colgroup" colSpan={3} className="mt-group mt-gap px-3 pb-0 pt-4 text-left text-sm font-semibold"><span className="mt-group-label block pb-2">Alunos</span></th>
                <th scope="colgroup" colSpan={2} className="mt-group mt-gap px-3 pb-0 pt-4 text-left text-sm font-semibold"><span className="mt-group-label block pb-2">Equipe</span></th>
              </tr>
              <tr>
                <th scope="col" className="mt-unit mt-col-title sticky left-0 z-[1] px-3 pb-3 pt-1.5 text-left align-bottom font-semibold">Unidade</th>
                <Cabecalho grupo titulo="Visitas" ideal={`≥ ${pctAno}% da meta`} dica={`Janeiro a maio vem das planilhas e junho em diante do formulário diário. O ideal acompanha o ano: já passou ${pctAno}%, então o ideal de hoje é ter feito ${pctAno}% da meta.`} />
                <Cabecalho titulo="Matrículas" ideal={`≥ ${pctAno}% da meta`} dica={`Janeiro a maio vem das planilhas e junho em diante do formulário diário. O ideal acompanha o ano: já passou ${pctAno}%, então o ideal de hoje é ter feito ${pctAno}% da meta.`} />
                <Cabecalho titulo="Conversão" ideal={`≥ ${pctInt(META_CONVERSAO)}`} />
                <Cabecalho grupo titulo="Alunos" ideal={`> ${ANO - 1}`} />
                <Cabecalho titulo="Perda" ideal={`≤ ${pctInt(META_PERDA)}`} />
                <Cabecalho titulo="Saldo" ideal={`≥ ${pctInt(META_SALDO)}`} dica="Matrículas − desligamentos − não rematriculados − saídas do Pré, sobre a média de alunos." />
                <Cabecalho grupo titulo="Treinamento" ideal={`≥ ${pctInt(META_TREINAMENTO)}`} />
                <Cabecalho titulo="Rotatividade" ideal={`≤ ${pctInt(META_EQUIPE)}`} />
              </tr>
            </thead>
            <tbody>
              {!linhas && !erro && Array.from({ length: 6 }, (_, i) => <LinhaCarregando key={i} />)}
              {linhas?.length === 0 && (
                <tr><td colSpan={9} className="mt-lede px-3 py-8 text-center">Nenhuma planilha de métricas importada para {ANO}.</td></tr>
              )}
              {(aberto ? linhas : linhas?.slice(0, LINHAS_INICIAIS))?.map((l) => <LinhaUnidade key={l.unidade_id} l={l} />)}
            </tbody>
          </table>
        </div>

        {linhas && linhas.length > LINHAS_INICIAIS && (
          <div className="mt-foot sticky bottom-0 z-10 flex items-center justify-between gap-4 px-4 py-2 text-sm sm:px-6">
            <span>{aberto ? linhas.length : LINHAS_INICIAIS} de {linhas.length}</span>
            <button type="button" aria-expanded={aberto}
              onClick={() => {
                setAberto((a) => !a);
                if (aberto) secao.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              }}
              className="mt-link inline-flex min-h-[44px] items-center gap-1 px-3 font-semibold">
              {aberto ? "Mostrar menos" : "Ver todas"}
              <ChevronDown className={`mt-chevron h-4 w-4 ${aberto ? "rotate-180" : ""}`} aria-hidden />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
