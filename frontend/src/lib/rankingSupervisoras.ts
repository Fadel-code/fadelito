// Ranking de Supervisoras — cálculo puro (sem Supabase), pra dar pra conferir contra a planilha.
//
// Aproveitamento = matrículas ÷ visitas. Perda = desligamentos ÷ alunos ativos.
// Dois métodos: "ponderado" soma antes de dividir (unidade grande pesa mais);
// "simples" tira a média das % das unidades (é o que a planilha "Evolução Rede" faz).

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type Linha = "F" | "P";
export const GRUPO: Record<Linha, string> = { F: "Financeiro", P: "Pedagógico" };
export type Metodo = "ponderado" | "simples";

export interface Supervisora {
  id: string;
  nome: string;
  linha: Linha;
  ativo: boolean;
}

export interface Atribuicao {
  id: string;
  supervisoraId: string;
  unidadeId: string;
  mesInicio: string; // YYYY-MM-01
  mesFim: string | null; // YYYY-MM-01, inclusive
}

export interface DadoUnidadeMes {
  unidadeId: string;
  mes: string;
  visitas: number;
  matriculas: number;
  desligamentos: number;
  alunosBase: number | null;
}

export const mesIso = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}-01`;

export function mesAnterior(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return m === 1 ? mesIso(a - 1, 12) : mesIso(a, m - 1);
}

const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const media = (xs: number[]) => (xs.length ? soma(xs) / xs.length : null);

const atribuicaoAtiva = (a: Atribuicao, mes: string) =>
  a.mesInicio <= mes && (a.mesFim === null || mes <= a.mesFim);

// ---------------- Dados por unidade/mês ----------------

export interface SistemaMes {
  unidade_id: string;
  mes: string;
  visitas: number;
  matriculas: number;
  desligamentos: number;
}

export interface EvolucaoMes {
  unidade_id: string;
  mes: string;
  visitas: number | null;
  matriculas: number | null;
  desligamentos: number | null;
  alunos_base: number | null;
}

/**
 * Formulário Diário é a base; a planilha importada (evolucao_rede_mensal) sobrescreve os
 * campos que tiver preenchidos. Sem atividade no mês (nem Formulário, nem planilha) a
 * unidade não entra — senão uma unidade fechada contaria como "0 visitas".
 *
 * Mês parcial (período com datas que cortam o mês): só vale o Formulário Diário dos dias
 * pedidos (`parciais.linhas`); a planilha só tem o total do mês, então contribui apenas
 * com os alunos ativos.
 */
export function mesclarDados(
  sistema: SistemaMes[],
  evolucao: EvolucaoMes[],
  parciais?: { meses: string[]; linhas: SistemaMes[] }
): Map<string, DadoUnidadeMes> {
  const parcial = new Set(parciais?.meses ?? []);
  const dados = new Map<string, DadoUnidadeMes>();
  for (const s of [...sistema.filter((x) => !parcial.has(x.mes)), ...(parciais?.linhas ?? [])]) {
    dados.set(`${s.unidade_id}|${s.mes}`, {
      unidadeId: s.unidade_id,
      mes: s.mes,
      visitas: s.visitas,
      matriculas: s.matriculas,
      desligamentos: s.desligamentos,
      alunosBase: null,
    });
  }
  for (const e of evolucao) {
    const chave = `${e.unidade_id}|${e.mes}`;
    const soBase = parcial.has(e.mes);
    const temAtividade = !soBase && (e.visitas !== null || e.matriculas !== null || e.desligamentos !== null);
    const atual = dados.get(chave);
    if (!atual && !temAtividade) continue;
    dados.set(chave, {
      unidadeId: e.unidade_id,
      mes: e.mes,
      visitas: (soBase ? null : e.visitas) ?? atual?.visitas ?? 0,
      matriculas: (soBase ? null : e.matriculas) ?? atual?.matriculas ?? 0,
      desligamentos: (soBase ? null : e.desligamentos) ?? atual?.desligamentos ?? 0,
      alunosBase: e.alunos_base,
    });
  }
  return dados;
}

// ---------------- Métricas ----------------

interface MetricasMes {
  visitas: number;
  matriculas: number;
  aprovPond: number | null;
  aprovSimples: number | null;
  perdaPond: number | null;
  perdaSimples: number | null;
  semBase: number;
}

function metricasMes(unidades: DadoUnidadeMes[]): MetricasMes {
  const visitas = soma(unidades.map((u) => u.visitas));
  const matriculas = soma(unidades.map((u) => u.matriculas));
  const comVisitas = unidades.filter((u) => u.visitas > 0);
  const comBase = unidades.filter((u) => (u.alunosBase ?? 0) > 0);
  return {
    visitas,
    matriculas,
    aprovPond: visitas > 0 ? matriculas / visitas : null,
    aprovSimples: media(comVisitas.map((u) => u.matriculas / u.visitas)),
    perdaPond: comBase.length ? soma(comBase.map((u) => u.desligamentos)) / soma(comBase.map((u) => u.alunosBase!)) : null,
    perdaSimples: media(comBase.map((u) => u.desligamentos / u.alunosBase!)),
    semBase: unidades.length - comBase.length,
  };
}

export interface DetalheUnidade {
  unidadeId: string;
  visitas: number;
  matriculas: number;
  aproveitamento: number | null;
  perda: number | null; // acumulada (soma das perdas mensais)
  /** Meses do período em que a unidade esteve na carteira dela (pela carteira, não pelos dados). */
  meses: string[];
  /** Ainda está com ela no mês de referência ("hoje"). */
  atual: boolean;
}

export interface LinhaRanking {
  supervisora: Supervisora;
  unidades: number; // distintas no período
  unidadesAgora: number; // na carteira no último mês com dados do período
  mesAgora: string | null;
  visitas: number;
  matriculas: number;
  aproveitamento: number | null;
  perda: number | null; // acumulada no período (soma das perdas mensais, como a planilha)
  unidadesSemBase: number;
  /** Meses do período em que teve ao menos uma unidade na carteira. */
  mesesAtuacao: string[];
  detalhe: DetalheUnidade[];
}

/**
 * Uma pessoa pode ter um cadastro por linha (Lilian: P e, desde a 040, F na Vila Madalena).
 * O ranking é por pessoa: junta os cadastros pelo nome, usando o id do primeiro como o da
 * pessoa, e aponta a carteira de todos pra ele.
 */
export function porPessoa(supervisoras: Supervisora[], atribuicoes: Atribuicao[]) {
  const idDoNome = new Map<string, string>();
  const idCanonico = new Map<string, string>();
  for (const s of supervisoras) {
    const chave = s.nome.trim().toLowerCase();
    if (!idDoNome.has(chave)) idDoNome.set(chave, s.id);
    idCanonico.set(s.id, idDoNome.get(chave)!);
  }
  return {
    pessoas: supervisoras.filter((s) => idCanonico.get(s.id) === s.id),
    atribuicoes: atribuicoes.map((a) => ({ ...a, supervisoraId: idCanonico.get(a.supervisoraId) ?? a.supervisoraId })),
  };
}

/** Um mês (`meses` com 1 item) ou o acumulado de vários, todas as supervisoras juntas. Ordenado do maior aproveitamento pro menor. */
export function calcularRanking(args: {
  supervisoras: Supervisora[];
  atribuicoes: Atribuicao[];
  dados: Map<string, DadoUnidadeMes>;
  meses: string[];
  metodo: Metodo;
  /** Mês da contagem "unidades agora" (padrão: o último do período). */
  mesAgora?: string;
}): LinhaRanking[] {
  const { dados, meses, metodo } = args;
  const { pessoas: supervisoras, atribuicoes } = porPessoa(args.supervisoras, args.atribuicoes);
  const ponderado = metodo === "ponderado";

  // Set: a mesma unidade nas duas linhas da mesma pessoa conta uma vez só.
  const unidadesDoMes = (supervisoraId: string, mes: string) =>
    [...new Set(atribuicoes.filter((a) => a.supervisoraId === supervisoraId && atribuicaoAtiva(a, mes)).map((a) => a.unidadeId))]
      .map((unidadeId) => dados.get(`${unidadeId}|${mes}`))
      .filter((d): d is DadoUnidadeMes => !!d);

  const mesAgora = args.mesAgora ?? meses[meses.length - 1] ?? null;

  const linhas = supervisoras
    .map<LinhaRanking>((supervisora) => {
      const porMesUnidades = meses.map((m) => unidadesDoMes(supervisora.id, m));
      const metricas = porMesUnidades.map(metricasMes);
      const todas = porMesUnidades.flat();
      const visitas = soma(metricas.map((m) => m.visitas));
      const matriculas = soma(metricas.map((m) => m.matriculas));

      const aprovMensal = metricas
        .map((m) => (ponderado ? m.aprovPond : m.aprovSimples))
        .filter((x): x is number => x !== null);
      const perdaMensal = metricas
        .map((m) => (ponderado ? m.perdaPond : m.perdaSimples))
        .filter((x): x is number => x !== null);

      const detalhe = new Map<string, DetalheUnidade>();
      const vazio = (unidadeId: string): DetalheUnidade => ({ unidadeId, visitas: 0, matriculas: 0, aproveitamento: null, perda: null, meses: [], atual: false });
      // Carteira mês a mês (inclui meses sem registro, pra mostrar a atuação real).
      const mesesAtuacao: string[] = [];
      for (const mes of meses) {
        const doMes = atribuicoes.filter((a) => a.supervisoraId === supervisora.id && atribuicaoAtiva(a, mes));
        if (doMes.length) mesesAtuacao.push(mes);
        for (const a of doMes) {
          const atual = detalhe.get(a.unidadeId) ?? vazio(a.unidadeId);
          if (!atual.meses.includes(mes)) atual.meses.push(mes);
          detalhe.set(a.unidadeId, atual);
        }
      }
      for (const d of todas) {
        const atual = detalhe.get(d.unidadeId) ?? vazio(d.unidadeId);
        atual.visitas += d.visitas;
        atual.matriculas += d.matriculas;
        if ((d.alunosBase ?? 0) > 0) atual.perda = (atual.perda ?? 0) + d.desligamentos / d.alunosBase!;
        detalhe.set(d.unidadeId, atual);
      }
      for (const d of detalhe.values()) {
        d.aproveitamento = d.visitas > 0 ? d.matriculas / d.visitas : null;
        d.atual = !!mesAgora && atribuicoes.some((a) => a.supervisoraId === supervisora.id && a.unidadeId === d.unidadeId && atribuicaoAtiva(a, mesAgora));
      }

      return {
        supervisora,
        unidades: new Set(todas.map((d) => d.unidadeId)).size,
        // Pela carteira (não pelos dados): um registro perdido num mês futuro não muda a contagem.
        unidadesAgora: mesAgora
          ? new Set(atribuicoes.filter((a) => a.supervisoraId === supervisora.id && atribuicaoAtiva(a, mesAgora)).map((a) => a.unidadeId)).size
          : 0,
        mesAgora,
        visitas,
        matriculas,
        aproveitamento: ponderado ? (visitas > 0 ? matriculas / visitas : null) : media(aprovMensal),
        perda: perdaMensal.length ? soma(perdaMensal) : null,
        unidadesSemBase: new Set(todas.filter((d) => !((d.alunosBase ?? 0) > 0)).map((d) => d.unidadeId)).size,
        mesesAtuacao,
        // Atuais primeiro, depois as que saíram; dentro de cada grupo, maior aproveitamento.
        detalhe: [...detalhe.values()].sort((a, b) => Number(b.atual) - Number(a.atual) || (b.aproveitamento ?? -1) - (a.aproveitamento ?? -1)),
      };
    })
    .filter((l) => l.unidades > 0);

  return linhas.sort((a, b) => (b.aproveitamento ?? -1) - (a.aproveitamento ?? -1));
}

export interface ProblemaCarteira {
  tipo: "sem" | "duas";
  linha: Linha;
  unidadeId: string;
  primeiroMes: string;
  ultimoMes: string;
}

/**
 * Unidades com atividade no período que não entram em ranking nenhum (sem supervisora da linha)
 * ou entram em dobro (duas supervisoras na mesma linha). Sem isso a troca de carteira some em silêncio.
 */
export function conferirCarteira(args: {
  supervisoras: Supervisora[];
  atribuicoes: Atribuicao[];
  dados: Map<string, DadoUnidadeMes>;
  meses: string[];
}): ProblemaCarteira[] {
  const { supervisoras, atribuicoes, dados, meses } = args;
  const linhaDe = new Map(supervisoras.filter((s) => s.ativo).map((s) => [s.id, s.linha]));
  const achados = new Map<string, ProblemaCarteira>();
  for (const mes of meses) {
    for (const d of dados.values()) {
      if (d.mes !== mes) continue;
      for (const linha of ["F", "P"] as Linha[]) {
        const n = atribuicoes.filter((a) => a.unidadeId === d.unidadeId && linhaDe.get(a.supervisoraId) === linha && atribuicaoAtiva(a, mes)).length;
        if (n === 1) continue;
        const tipo = n === 0 ? "sem" : "duas";
        const chave = `${tipo}|${linha}|${d.unidadeId}`;
        const atual = achados.get(chave);
        if (atual) atual.ultimoMes = mes;
        else achados.set(chave, { tipo, linha, unidadeId: d.unidadeId, primeiroMes: mes, ultimoMes: mes });
      }
    }
  }
  return [...achados.values()];
}

/** Aproveitamento de todas as unidades juntas no período — a régua pra ver quem está acima ou abaixo da rede. */
export function calcularRede(dados: Map<string, DadoUnidadeMes>, meses: string[], metodo: Metodo) {
  const todas = [...dados.values()];
  const porMes = meses.map((mes) => metricasMes(todas.filter((d) => d.mes === mes)));
  const visitas = soma(porMes.map((m) => m.visitas));
  const matriculas = soma(porMes.map((m) => m.matriculas));
  const mensal = porMes.map((m) => (metodo === "ponderado" ? m.aprovPond : m.aprovSimples)).filter((x): x is number => x !== null);
  return {
    visitas,
    matriculas,
    aproveitamento: metodo === "ponderado" ? (visitas > 0 ? matriculas / visitas : null) : media(mensal),
  };
}

/** Aproveitamento da supervisora em cada mês do período, pra linha do tempo no detalhe. */
export function serieMeses(args: {
  supervisora: Supervisora;
  atribuicoes: Atribuicao[];
  dados: Map<string, DadoUnidadeMes>;
  meses: string[];
  metodo: Metodo;
}): { mes: string; valor: number | null; unidades: number }[] {
  // `atribuicoes` precisa vir agrupada por pessoa (porPessoa), como no calcularRanking.
  const { supervisora, atribuicoes, dados, meses, metodo } = args;
  return meses.map((mes) => {
    const carteira = new Set(atribuicoes.filter((a) => a.supervisoraId === supervisora.id && atribuicaoAtiva(a, mes)).map((a) => a.unidadeId));
    const unidades = [...carteira].map((u) => dados.get(`${u}|${mes}`)).filter((d): d is DadoUnidadeMes => !!d);
    const m = metricasMes(unidades);
    return { mes, valor: metodo === "ponderado" ? m.aprovPond : m.aprovSimples, unidades: carteira.size };
  });
}

// ---------------- Período ----------------

const rotuloCurto = (iso: string) => MESES[Number(iso.slice(5, 7)) - 1];

/** ["2026-01-01","2026-02-01","2026-03-01","2026-05-01"] → "Jan–Mar, Mai". Ano só quando o período cruza anos. */
export function faixasDeMeses(meses: string[]): string {
  const ord = [...new Set(meses)].sort();
  const cruzaAno = ord.length > 0 && ord[0].slice(0, 4) !== ord[ord.length - 1].slice(0, 4);
  const r = (iso: string) => (cruzaAno ? `${rotuloCurto(iso)}/${iso.slice(2, 4)}` : rotuloCurto(iso));
  const faixas: string[] = [];
  for (let i = 0; i < ord.length; ) {
    let j = i;
    while (j + 1 < ord.length && mesAnterior(ord[j + 1]) === ord[j]) j++;
    faixas.push(i === j ? r(ord[i]) : `${r(ord[i])}–${r(ord[j])}`);
    i = j + 1;
  }
  return faixas.join(", ");
}

export const ultimoDiaDoMes = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return `${iso.slice(0, 8)}${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
};

/** Meses (YYYY-MM-01) que o intervalo toca, do primeiro ao último. */
export function mesesDoIntervalo(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  for (let m = `${inicio.slice(0, 7)}-01`; m <= fim; ) {
    lista.push(m);
    const [a, mm] = m.split("-").map(Number);
    m = mm === 12 ? mesIso(a + 1, 1) : mesIso(a, mm + 1);
  }
  return lista;
}

/** Meses em que o intervalo não cobre o mês inteiro (só pode ser o primeiro e/ou o último). */
export function mesesParciais(inicio: string, fim: string): string[] {
  const parciais = new Set<string>();
  if (!inicio.endsWith("-01")) parciais.add(`${inicio.slice(0, 7)}-01`);
  if (fim !== ultimoDiaDoMes(fim)) parciais.add(`${fim.slice(0, 7)}-01`);
  return [...parciais];
}
