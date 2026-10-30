import { useEffect, useMemo, useRef, useState } from "react";
import { Award, CalendarCheck, ChevronDown, GraduationCap, Percent, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import KpiCard, { KpiGrid, type TomKpi } from "../../components/KpiCard";
import { CARD_DESTAQUE } from "../../components/ui/estilos";
import { pct, num } from "../../components/ranking/formato";

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
const COR = { ok: "text-green-700", perto: "text-amber-700", longe: "text-red-600" };
const TEXTO = { ok: "no ideal", perto: "perto do ideal", longe: "longe do ideal" };

function Cabecalho({ titulo, ideal, grupo, dica }: { titulo: string; ideal: string; grupo?: boolean; dica?: string }) {
  return (
    <th scope="col" title={dica} className={`px-3 pb-3 pt-1 text-right align-bottom ${grupo ? "border-l border-gray-200" : ""}`}>
      <span className="block pt-1.5 font-semibold text-gray-900">{titulo}</span>
      <span className="block whitespace-nowrap font-normal text-gray-600">{ideal}</span>
    </th>
  );
}

function Celula({ valor, sub, dica, estado, grupo }: { valor: string; sub?: string; dica?: string; estado: Estado; grupo?: boolean }) {
  return (
    <td title={dica} className={`px-3 py-2.5 text-right ${estado ? COR[estado] : "text-gray-400"} ${grupo ? "border-l border-gray-100" : ""}`}>
      <span className="font-medium">{valor}</span>
      {estado && <span className="sr-only"> ({TEXTO[estado]})</span>}
      {sub && <span className="ml-2 whitespace-nowrap text-xs">{sub}</span>}
    </td>
  );
}

const diferenca = (d: number) => (d === 0 ? "igual a 2025" : `${num(Math.abs(d))} ${d > 0 ? "a mais" : "a menos"}`);

function LinhaUnidade({ l, par }: { l: Linha; par: boolean }) {
  const meta = l.metaVisitas;
  const metaMatriculas = meta === null ? null : Math.round(meta * META_CONVERSAO);
  const dAlunos = l.alunos === null || l.alunosAnoAnterior === null ? null : l.alunos - l.alunosAnoAnterior;
  const daMeta = (feito: number, alvo: number | null) => (alvo ? `${pctInt(feito / alvo)} da meta do ano` : "sem meta");
  return (
    <tr className={`border-b border-gray-100 ${par ? "bg-white" : "bg-gray-50/60"} hover:bg-primary-50/50`}>
      <th scope="row" className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-900">{l.unidade}</th>
      <Celula grupo valor={meta === null ? num(l.visitas) : `${num(l.visitas)} de ${num(meta)}`} dica={daMeta(l.visitas, meta)}
        estado={estadoDe(l.visitas, meta === null ? null : meta * fracaoDoAno)} />
      <Celula valor={metaMatriculas === null ? num(l.matriculas) : `${num(l.matriculas)} de ${num(metaMatriculas)}`} dica={daMeta(l.matriculas, metaMatriculas)}
        estado={estadoDe(l.matriculas, metaMatriculas === null ? null : metaMatriculas * fracaoDoAno)} />
      <Celula valor={pct(l.conversao)} dica={`${num(l.matriculas)} matrículas em ${num(l.visitas)} visitas`} estado={estadoDe(l.conversao, META_CONVERSAO)} />
      <Celula grupo valor={l.alunos === null ? "—" : num(l.alunos)} sub={dAlunos === null ? "sem dado de 2025" : diferenca(dAlunos)}
        dica={dAlunos === null || l.alunos === null ? undefined : `${num(l.alunos)} alunos hoje; no mesmo mês de ${ANO - 1} eram ${num(l.alunosAnoAnterior ?? 0)}`}
        estado={dAlunos === null ? null : dAlunos >= 0 ? "ok" : "longe"} />
      <Celula valor={pct(l.perda)} dica={`${num(l.desligamentos)} ${l.desligamentos === 1 ? "desligamento" : "desligamentos"} no ano`} estado={estadoDe(l.perda, META_PERDA, true)} />
      <Celula valor={pct(l.saldoPct)} dica={`${l.saldo >= 0 ? "+" : ""}${num(l.saldo)} alunos no ano`} estado={estadoDe(l.saldoPct, META_SALDO)} />
      <Celula grupo valor={pct(l.treinamento)} estado={estadoDe(l.treinamento, META_TREINAMENTO)} />
      <Celula valor={pct(l.equipe)} estado={estadoDe(l.equipe, META_EQUIPE, true)} />
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
    return { visitas, metaVisitas, matriculas, metaMatriculas: metaVisitas * META_CONVERSAO, conversao: div(matriculas, visitas), treinamento: media(linhas.map((l) => l.treinamento)), equipe: media(linhas.map((l) => l.equipe)) };
  }, [linhas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Métricas {ANO}</h1>
        <p className="mt-1.5 text-sm text-gray-600">
          Como cada unidade está frente ao ideal da rede. <span className="font-semibold text-primary-700">{pctAno}% do ano</span> já passou.
        </p>
      </div>

      {erro && <p className="card p-4 text-sm text-red-600">Erro ao carregar: {erro}</p>}

      <KpiGrid rotulo="Resumo da rede" colunas={5}>
        <KpiCard rotulo="Visitas" Icone={CalendarCheck} carregando={!rede}
          tom={tomDe(estadoDe(rede?.visitas ?? null, rede ? rede.metaVisitas * fracaoDoAno : null))}
          valor={rede ? num(rede.visitas) : "—"} sub={rede ? `meta do ano: ${num(rede.metaVisitas)}` : undefined}
          progresso={rede?.metaVisitas ? rede.visitas / rede.metaVisitas : undefined} />
        <KpiCard rotulo="Matrículas" Icone={GraduationCap} carregando={!rede}
          tom={tomDe(estadoDe(rede?.matriculas ?? null, rede ? rede.metaMatriculas * fracaoDoAno : null))}
          valor={rede ? num(rede.matriculas) : "—"} sub={rede ? `meta do ano: ${num(Math.round(rede.metaMatriculas))}` : undefined}
          progresso={rede?.metaMatriculas ? rede.matriculas / rede.metaMatriculas : undefined} />
        <KpiCard rotulo="Conversão" Icone={Percent} tom={tomDe(estadoDe(rede?.conversao ?? null, META_CONVERSAO))} carregando={!rede}
          valor={pct(rede?.conversao ?? null)} sub={`ideal: ${pctInt(META_CONVERSAO)} ou mais`} />
        <KpiCard rotulo="Treinamento" Icone={Award} tom={tomDe(estadoDe(rede?.treinamento ?? null, META_TREINAMENTO))} carregando={!rede}
          valor={pct(rede?.treinamento ?? null)} sub={`ideal: ${pctInt(META_TREINAMENTO)} ou mais`} />
        <KpiCard rotulo="Rotatividade da equipe" Icone={Users} tom={tomDe(estadoDe(rede?.equipe ?? null, META_EQUIPE, true))} carregando={!rede}
          valor={pct(rede?.equipe ?? null)} sub={`ideal: até ${pctInt(META_EQUIPE)}`} />
      </KpiGrid>

      <section ref={secao} aria-labelledby="mt-titulo" className={`${CARD_DESTAQUE} scroll-mt-4 overflow-clip`}>
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 id="mt-titulo" className="text-xl font-bold tracking-tight text-gray-900">Resultados por unidade</h2>
            <p className="mt-1 text-sm text-gray-700">Cada número é comparado com o ideal, que aparece embaixo do nome da coluna.</p>
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />No ideal</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />Perto (até 20%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" aria-hidden />Longe</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm tabular-nums">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-700">
              <tr>
                <td className="border-b-2 border-b-transparent" />
                <th scope="colgroup" colSpan={3} className="border-b-2 border-l border-b-primary-200 border-l-gray-200 px-3 pb-1.5 pt-3 text-left text-sm font-semibold text-primary-700">Visitas e matrículas</th>
                <th scope="colgroup" colSpan={3} className="border-b-2 border-l border-b-primary-200 border-l-gray-200 px-3 pb-1.5 pt-3 text-left text-sm font-semibold text-primary-700">Alunos</th>
                <th scope="colgroup" colSpan={2} className="border-b-2 border-l border-b-primary-200 border-l-gray-200 px-3 pb-1.5 pt-3 text-left text-sm font-semibold text-primary-700">Equipe</th>
              </tr>
              <tr>
                <th scope="col" className="px-3 pb-3 pt-1.5 text-left align-bottom font-semibold text-gray-900">Unidade</th>
                <Cabecalho grupo titulo="Visitas" ideal="meta do ano" dica={`Janeiro a maio vem das planilhas e junho em diante do formulário diário. O ideal acompanha o ano: já passou ${pctAno}%, então o ideal de hoje é ter feito ${pctAno}% da meta.`} />
                <Cabecalho titulo="Matrículas" ideal="meta do ano" dica={`Janeiro a maio vem das planilhas e junho em diante do formulário diário. O ideal acompanha o ano: já passou ${pctAno}%, então o ideal de hoje é ter feito ${pctAno}% da meta.`} />
                <Cabecalho titulo="Conversão" ideal={`ideal: ${pctInt(META_CONVERSAO)} ou mais`} />
                <Cabecalho grupo titulo="Alunos hoje" ideal={`ideal: mais que em ${ANO - 1}`} />
                <Cabecalho titulo="Perda" ideal={`ideal: até ${pctInt(META_PERDA)}`} />
                <Cabecalho titulo="Saldo" ideal={`ideal: ${pctInt(META_SALDO)} ou mais`} dica="Matrículas − desligamentos − não rematriculados − saídas do Pré, sobre a média de alunos." />
                <Cabecalho grupo titulo="Treinamento" ideal={`ideal: ${pctInt(META_TREINAMENTO)} ou mais`} />
                <Cabecalho titulo="Rotatividade" ideal={`ideal: até ${pctInt(META_EQUIPE)}`} />
              </tr>
            </thead>
            <tbody>
              {!linhas && !erro && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Carregando…</td></tr>
              )}
              {(aberto ? linhas : linhas?.slice(0, LINHAS_INICIAIS))?.map((l, i) => <LinhaUnidade key={l.unidade_id} l={l} par={i % 2 === 0} />)}
            </tbody>
          </table>
        </div>

        {linhas && linhas.length > LINHAS_INICIAIS && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-gray-100 bg-white px-4 py-2.5 text-sm text-gray-700 sm:px-6">
            <span>Mostrando {aberto ? linhas.length : LINHAS_INICIAIS} de {linhas.length} unidades</span>
            <button type="button" aria-expanded={aberto}
              onClick={() => {
                setAberto((a) => !a);
                if (aberto) secao.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              }}
              className="inline-flex items-center gap-1 rounded px-1 py-1 font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              {aberto ? "Mostrar menos" : `Ver as ${linhas.length} unidades`}
              <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} aria-hidden />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
