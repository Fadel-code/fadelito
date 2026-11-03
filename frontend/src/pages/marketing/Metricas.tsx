import { useEffect, useMemo, useRef, useState } from "react";
import { Award, CalendarCheck, ChevronDown, GraduationCap, Percent, Repeat, Scale, UserMinus, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import KpiCard, { KpiGrid, type TomKpi } from "../../components/KpiCard";
import { pct, num } from "../../components/ranking/formato";
import { MESES_CURTOS } from "../../lib/rankingSupervisoras";
import { MESES } from "../../types";
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

const hoje = new Date();
// Último mês com dados: o mês corrente em ANO, dezembro depois dele.
const MES_ATUAL = hoje.getFullYear() > ANO ? 12 : hoje.getFullYear() < ANO ? 1 : hoje.getMonth() + 1;

// Visitas e matrículas têm meta anual: o ideal é a parte da meta que o ano já "gastou" até o fim do
// mês escolhido (no mês corrente, até hoje).
function fracaoAte(mes: number) {
  const inicio = new Date(ANO, 0, 1).getTime();
  const fim = mes === MES_ATUAL && hoje.getFullYear() === ANO ? hoje.getTime() : new Date(ANO, mes, 1).getTime();
  return (fim - inicio) / (new Date(ANO + 1, 0, 1).getTime() - inicio);
}
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

/** Métricas acumuladas de janeiro até o mês `ate` (1–12); a coluna Alunos é a foto do mês `mesAlunos`, igual para todas. */
function montarLinhas(unidades: { id: string; unidade_nome: string }[], cons: Consolidado[], mensais: Mensal[], anuais: Anual[], ate: number, mesAlunos: number): Linha[] {
  // Só entra quem tem planilha importada: as unidades fechadas (Brooklin, Klabin, Perdizes, Real Parque) ficam de fora.
  return unidades.flatMap((u) => {
    const a = anuais.find((x) => x.unidade_id === u.id);
    if (!a) return [];
    const c = cons.filter((x) => x.unidade_id === u.id);
    const m = mensais.filter((x) => x.unidade_id === u.id);
    const doAno = m.filter((x) => x.ano === ANO && x.mes <= ate).sort((x, y) => x.mes - y.mes);
    const formulario = c.filter((x) => { const mes = Number(x.mes.slice(5, 7)); return mes >= MES_INICIO_FORMULARIO && mes <= ate; });
    const planilha = doAno.filter((x) => x.mes < MES_INICIO_FORMULARIO);
    const somaPlanilha = (f: (x: Mensal) => number | null) => planilha.reduce((s, x) => s + (f(x) ?? 0), 0);
    const visitas = formulario.reduce((s, x) => s + x.visitas_totais, 0) + somaPlanilha((x) => x.visitas);
    const matriculas = formulario.reduce((s, x) => s + x.matriculas_totais, 0) + somaPlanilha((x) => x.matriculas);
    const desligamentos = formulario.reduce((s, x) => s + x.desligamentos, 0) + somaPlanilha((x) => x.desligamentos);
    // Base dos percentuais: tamanho médio da escola no ano (janeiro exagera a perda de quem cresce).
    const base = media(doAno.map((x) => x.alunos));
    const noMes = doAno.find((x) => x.mes === mesAlunos)?.alunos ?? null;
    // ponytail: não rematriculados e saídas do Pré são números anuais da planilha; entram inteiros em qualquer mês.
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
      alunos: noMes,
      alunosAnoAnterior: noMes === null ? null : m.find((x) => x.ano === ANO - 1 && x.mes === mesAlunos)?.alunos ?? null,
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
const TOM_DO_ESTADO: Record<NonNullable<Estado>, TomKpi> = { ok: "green", perto: "amber", longe: "red" };
const tomDe = (e: Estado): TomKpi => (e === null ? "primary" : TOM_DO_ESTADO[e]);
const TEXTO = { ok: "no ideal", perto: "perto do ideal", longe: "longe do ideal" };

// Só o que está fora do ideal ganha cor; "no ideal" fica em tinta normal para o olho ir direto aos problemas.
const CELULA: Record<NonNullable<Estado>, string> = { ok: "", perto: "mt-cell--perto", longe: "mt-cell--longe" };
const classeCelula = (e: Estado) => (e === null ? "mt-cell--nulo" : CELULA[e]);




function Cabecalho({ titulo, ideal, grupo, dica }: { titulo: string; ideal: string; grupo?: boolean; dica?: string }) {
  return (
    <th scope="col" title={dica} className={`px-3 pb-3 pt-3 text-right align-bottom ${grupo ? "mt-gap" : ""}`}>
      <span className="mt-col-title block whitespace-nowrap font-semibold">{titulo}</span>
      <span className="block whitespace-nowrap font-normal">{ideal}</span>
    </th>
  );
}

function Celula({ valor, sub, dica, estado, grupo }: { valor: string; sub?: string; dica?: string; estado?: Estado; grupo?: boolean }) {
  return (
    <td title={dica} className={`mt-cell px-3 py-3 text-right ${estado === undefined ? "" : classeCelula(estado)} ${grupo ? "mt-gap" : ""}`}>
      <span className="font-medium">{valor}</span>
      {estado && <span className="sr-only"> ({TEXTO[estado]})</span>}
      {sub && <span className="mt-sub ml-2 whitespace-nowrap text-xs">{sub}</span>}
    </td>
  );
}

/** Visitas e matrículas: o número, a barra da meta do ano e a linha do ano atravessando a coluna. */
function CelulaMeta({ feito, alvo, estado, grupo, fracao }: { feito: number; alvo: number | null; estado: Estado; grupo?: boolean; fracao: number }) {
  return (
    <td title={alvo ? `${pctInt(feito / alvo)} da meta do ano; o ideal até aqui é ${num(Math.round(alvo * fracao))}` : "sem meta"}
      className={`mt-cell px-3 py-3 text-right ${classeCelula(estado)} ${grupo ? "mt-gap" : ""}`}>
      <span className="font-medium">{num(feito)}</span>
      {estado && <span className="sr-only"> ({TEXTO[estado]})</span>}
      {alvo !== null && <span className="mt-meta ml-1 text-xs">/ {num(alvo)}</span>}
    </td>
  );
}

function LinhaUnidade({ l, fracao, mesAlunos }: { l: Linha; fracao: number; mesAlunos: string }) {
  const meta = l.metaVisitas;
  const metaMatriculas = meta === null ? null : Math.round(meta * META_CONVERSAO);
  return (
    <tr>
      <th scope="row" className="mt-unit sticky left-0 z-[1] whitespace-nowrap px-3 py-3 text-left font-medium">{l.unidade}</th>
      <CelulaMeta grupo fracao={fracao} feito={l.visitas} alvo={meta} estado={estadoDe(l.visitas, meta === null ? null : meta * fracao)} />
      <CelulaMeta fracao={fracao} feito={l.matriculas} alvo={metaMatriculas} estado={estadoDe(l.matriculas, metaMatriculas === null ? null : metaMatriculas * fracao)} />
      <Celula valor={pct(l.conversao)} dica={`${num(l.matriculas)} matrículas em ${num(l.visitas)} visitas`} estado={estadoDe(l.conversao, META_CONVERSAO)} />
      {l.alunos === null ? (
        <td title={`A planilha não tem o número de alunos de ${mesAlunos}`} className="mt-cell mt-gap px-3 py-3 text-right">
          <span className="mt-sub whitespace-nowrap text-xs italic">sem dados de {mesAlunos} na planilha</span>
        </td>
      ) : (
        <Celula grupo valor={num(l.alunos)} dica={`alunos em ${mesAlunos}`} />
      )}
      <Celula valor={pct(l.perda)} dica={`${num(l.desligamentos)} ${l.desligamentos === 1 ? "desligamento" : "desligamentos"} no período`} estado={estadoDe(l.perda, META_PERDA, true)} />
      <Celula grupo valor={pct(l.treinamento)} estado={estadoDe(l.treinamento, META_TREINAMENTO)} />
      <Celula valor={pct(l.equipe)} estado={estadoDe(l.equipe, META_EQUIPE, true)} />
    </tr>
  );
}

function LinhaCarregando() {
  return (
    <tr aria-hidden>
      <th className="mt-unit sticky left-0 px-3 py-3.5 text-left"><span className="mt-skel block h-3.5 w-32" /></th>
      {Array.from({ length: 7 }, (_, i) => (
        <td key={i} className="px-3 py-3.5"><span className="mt-skel ml-auto block h-3.5 w-14" /></td>
      ))}
    </tr>
  );
}

export default function Metricas() {
  const [dados, setDados] = useState<{ un: { id: string; unidade_nome: string }[]; cons: Consolidado[]; mens: Mensal[]; anu: Anual[] } | null>(null);
  const [mes, setMes] = useState(MES_ATUAL);
  // Alunos vêm da planilha, que anda atrás do calendário: no mês atual, usa o último mês que alguma
  // unidade já preencheu. Quem não tem esse mês mostra "—", em vez de um número de outro mês.
  const mesAlunos = useMemo(() => {
    if (!dados || mes !== MES_ATUAL) return mes;
    const preenchidos = dados.mens.filter((x) => x.ano === ANO && x.alunos !== null && x.mes <= mes).map((x) => x.mes);
    return preenchidos.length ? Math.max(...preenchidos) : mes;
  }, [dados, mes]);
  const rotuloMesAlunos = `${MESES_CURTOS[mesAlunos - 1].toLowerCase()}/${ANO}`;
  const linhas = useMemo(() => (dados ? montarLinhas(dados.un, dados.cons, dados.mens, dados.anu, mes, mesAlunos) : null), [dados, mes, mesAlunos]);
  const fracao = fracaoAte(mes);
  const pctAno = Math.round(fracao * 100);
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
      setDados({ un: un.data ?? [], cons: cons.data ?? [], mens: mens.data ?? [], anu: anu.data ?? [] });
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
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="mt-title text-2xl font-bold tracking-tight">Métricas {ANO}</h1>
          <p className="mt-lede mt-1 text-sm">
            {mes === MES_ATUAL ? `${pctAno}% do ano já passou` : `Acumulado de janeiro a ${MESES[mes - 1].toLowerCase()} (${pctAno}% do ano)`}
          </p>
        </div>
        <label className="mt-lede flex flex-col gap-1 text-xs font-medium">
          Mês
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
            className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            {Array.from({ length: MES_ATUAL }, (_, i) => MES_ATUAL - i).map((m) => (
              <option key={m} value={m}>{m === MES_ATUAL ? "Mês atual" : `${MESES[m - 1]} de ${ANO}`}</option>
            ))}
          </select>
        </label>
      </header>

      {erro && <p role="alert" className="mt-error rounded-xl p-4 text-sm">Não foi possível carregar as métricas: {erro}. Recarregue a página; se continuar, avise o time de sistemas.</p>}

      {/* Mesmo cartão de KPI das outras telas; a ordem segue os grupos da tabela (visitas e matrículas, alunos, equipe). */}
      <KpiGrid rotulo="Resumo da rede" colunas={8}>
        <KpiCard compacto rotulo="Visitas" Icone={CalendarCheck} carregando={!rede}
          tom={tomDe(estadoDe(rede?.visitas ?? null, rede ? rede.metaVisitas * fracao : null))}
          valor={rede ? num(rede.visitas) : "—"} sub={rede ? `meta do ano: ${num(rede.metaVisitas)}` : undefined}
          corProgresso="primary" progresso={rede?.metaVisitas ? rede.visitas / rede.metaVisitas : undefined} />
        <KpiCard compacto rotulo="Matrículas" Icone={GraduationCap} carregando={!rede}
          tom={tomDe(estadoDe(rede?.matriculas ?? null, rede ? rede.metaMatriculas * fracao : null))}
          valor={rede ? num(rede.matriculas) : "—"} sub={rede ? `meta do ano: ${num(metaRedeMatriculas)}` : undefined}
          corProgresso="primary" progresso={rede?.metaMatriculas ? rede.matriculas / rede.metaMatriculas : undefined} />
        <KpiCard compacto rotulo="Conversão" Icone={Percent} carregando={!rede} tom={tomDe(estadoDe(rede?.conversao ?? null, META_CONVERSAO))}
          valor={pct(rede?.conversao ?? null)} sub={`ideal: ${pctInt(META_CONVERSAO)} ou mais`} />
        <KpiCard compacto rotulo="Alunos" Icone={Users} carregando={!rede}
          tom={tomDe(rede?.dAlunos == null ? null : rede.dAlunos >= 0 ? "ok" : "longe")}
          valor={rede ? num(rede.alunos) : "—"} sub={rede?.alunosAntes != null ? `em ${ANO - 1}: ${num(rede.alunosAntes)}` : undefined} />
        <KpiCard compacto rotulo="Perda" Icone={UserMinus} carregando={!rede} tom={tomDe(estadoDe(rede?.perda ?? null, META_PERDA, true))}
          valor={pct(rede?.perda ?? null)} sub={`ideal: até ${pctInt(META_PERDA)}`} />
        <KpiCard compacto rotulo="Saldo" Icone={Scale} carregando={!rede} tom={tomDe(estadoDe(rede?.saldoPct ?? null, META_SALDO))}
          valor={pct(rede?.saldoPct ?? null)} sub={`ideal: ${pctInt(META_SALDO)} ou mais`} />
        <KpiCard compacto rotulo="Treinamento" Icone={Award} carregando={!rede} tom={tomDe(estadoDe(rede?.treinamento ?? null, META_TREINAMENTO))}
          valor={pct(rede?.treinamento ?? null)} sub={`ideal: ${pctInt(META_TREINAMENTO)} ou mais`} />
        <KpiCard compacto rotulo="Rotatividade" Icone={Repeat} carregando={!rede} tom={tomDe(estadoDe(rede?.equipe ?? null, META_EQUIPE, true))}
          valor={pct(rede?.equipe ?? null)} sub={`ideal: até ${pctInt(META_EQUIPE)}`} />
      </KpiGrid>

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
                <th scope="colgroup" colSpan={2} className="mt-group mt-gap px-3 pb-0 pt-4 text-left text-sm font-semibold"><span className="mt-group-label block pb-2">Alunos</span></th>
                <th scope="colgroup" colSpan={2} className="mt-group mt-gap px-3 pb-0 pt-4 text-left text-sm font-semibold"><span className="mt-group-label block pb-2">Equipe</span></th>
              </tr>
              <tr>
                <th scope="col" className="mt-unit mt-col-title sticky left-0 z-[1] px-3 pb-3 pt-1.5 text-left align-bottom font-semibold">Unidade</th>
                <Cabecalho grupo titulo="Visitas" ideal={`≥ ${pctAno}% da meta`} dica={`Janeiro a maio vem das planilhas e junho em diante do formulário diário. O ideal acompanha o ano: já passou ${pctAno}%, então o ideal é ter feito ${pctAno}% da meta.`} />
                <Cabecalho titulo="Matrículas" ideal={`≥ ${pctAno}% da meta`} dica={`Janeiro a maio vem das planilhas e junho em diante do formulário diário. O ideal acompanha o ano: já passou ${pctAno}%, então o ideal é ter feito ${pctAno}% da meta.`} />
                <Cabecalho titulo="Conversão" ideal={`≥ ${pctInt(META_CONVERSAO)}`} />
                <Cabecalho grupo titulo="Alunos" ideal={rotuloMesAlunos} />
                <Cabecalho titulo="Perda" ideal={`≤ ${pctInt(META_PERDA)}`} />
                <Cabecalho grupo titulo="Treinamento" ideal={`≥ ${pctInt(META_TREINAMENTO)}`} />
                <Cabecalho titulo="Rotatividade" ideal={`≤ ${pctInt(META_EQUIPE)}`} />
              </tr>
            </thead>
            <tbody>
              {!linhas && !erro && Array.from({ length: 6 }, (_, i) => <LinhaCarregando key={i} />)}
              {linhas?.length === 0 && (
                <tr><td colSpan={8} className="mt-lede px-3 py-8 text-center">Nenhuma planilha de métricas importada para {ANO}.</td></tr>
              )}
              {(aberto ? linhas : linhas?.slice(0, LINHAS_INICIAIS))?.map((l) => <LinhaUnidade key={l.unidade_id} l={l} fracao={fracao} mesAlunos={rotuloMesAlunos} />)}
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
