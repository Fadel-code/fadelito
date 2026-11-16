import { describe, expect, it } from "vitest";
import { calcularCampos, calcularKpisRematricula, derivarStatusRematricula, registroVazio, TURMAS } from "./types";
import { dateToIso, diasUteisDoMes, formatarData, podeEditarMesAnterior, semAcento } from "./lib/utils";
import { FERIADOS_SET } from "./lib/feriados";
import { aproveitamentoTurma, resumoPorTurma, somarTurmas, zeradaTurma } from "./lib/turmas";
import { faixasDeMeses, mesAnterior, mesesDoIntervalo, mesesParciais, ultimoDiaDoMes } from "./lib/rankingSupervisoras";
import { buscarProtocolos } from "./lib/protocoloSearch";
import type { Protocolo } from "./types";

const aluno = (o: Partial<{ contrato_assinado: boolean; motivo: string | null; negociando: boolean; inadimplente: boolean; aceite: boolean }> = {}) => ({
  contrato_assinado: false,
  motivo: null,
  negociando: false,
  inadimplente: false,
  aceite: false,
  ...o,
});

describe("rematrícula — status", () => {
  it("contrato assinado vence qualquer outro estado", () => {
    expect(derivarStatusRematricula(aluno({ contrato_assinado: true, negociando: true, motivo: "x" }))).toBe("rematriculado");
  });
  it("em conversa antes de não rematriculado", () => {
    expect(derivarStatusRematricula(aluno({ negociando: true, motivo: "x" }))).toBe("negociando");
  });
  // Regressão (Marajoara, nov/2026): "Não rematriculou" só persiste via motivo preenchido.
  it("motivo vazio ou só espaço é pendente; o padrão 'Não informado' é não rematriculado", () => {
    expect(derivarStatusRematricula(aluno({ motivo: "" }))).toBe("pendente");
    expect(derivarStatusRematricula(aluno({ motivo: "   " }))).toBe("pendente");
    expect(derivarStatusRematricula(aluno({ motivo: "Não informado" }))).toBe("nao_rematriculado");
  });
});

describe("rematrícula — KPIs", () => {
  const lista = [
    aluno({ contrato_assinado: true }),
    aluno({ negociando: true }),
    aluno({ motivo: "mudou" }),
    aluno({ aceite: true }),
    aluno(),
    aluno({ inadimplente: true, contrato_assinado: true }),
  ];
  const k = calcularKpisRematricula(lista);
  it("inadimplente sai do denominador mas é contado à parte", () => {
    expect(k.total).toBe(5);
    expect(k.inadimplentes).toBe(1);
    expect(k.rematriculados).toBe(1);
    expect(k.pct).toBeCloseTo(0.2);
  });
  it("aguardando contrato não conta como pendente", () => {
    expect(k.aguardandoContrato).toBe(1);
    expect(k.pendentes).toBe(1);
  });
  it("as categorias somam o total", () => {
    expect(k.rematriculados + k.negociando + k.naoRematriculados + k.aguardandoContrato + k.pendentes).toBe(k.total);
  });
  it("lista vazia não divide por zero", () => {
    expect(calcularKpisRematricula([]).pct).toBe(0);
  });
});

describe("registros diários", () => {
  it("totais, aproveitamento e saldo", () => {
    const r = { ...registroVazio(TURMAS[0]), visitas: 3, visitas_curso_ferias: 1, matriculas: 1, matriculas_curso_ferias: 1, desligamentos: 3 };
    const c = calcularCampos(r);
    expect(c.visitas_totais).toBe(4);
    expect(c.matriculas_totais).toBe(2);
    expect(c.aproveitamento).toBe("50.0%");
    expect(c.saldo).toBe(-1);
  });
  it("sem visitas o aproveitamento é traço", () => {
    expect(calcularCampos(registroVazio(TURMAS[0])).aproveitamento).toBe("—");
    expect(aproveitamentoTurma(0, 5)).toBe("—");
  });
});

describe("turmas", () => {
  it("resumo tem uma linha por turma, mesmo zerada", () => {
    const linhas = [{ ...zeradaTurma("A", TURMAS[1]), visitas: 2 }, { ...zeradaTurma("B", TURMAS[1]), visitas: 3 }];
    const r = resumoPorTurma(linhas);
    expect(r).toHaveLength(TURMAS.length);
    expect(r[1].visitas).toBe(5);
    expect(r[0].visitas).toBe(0);
  });
  it("somarTurmas acumula todos os campos", () => {
    const s = somarTurmas([{ ...zeradaTurma("A", "x"), desligamentos: 1 }, { ...zeradaTurma("A", "x"), desligamentos: 2 }], "A", "x");
    expect(s.desligamentos).toBe(3);
  });
});

describe("datas e feriados", () => {
  it("formatação e normalização", () => {
    expect(formatarData("2026-11-16")).toBe("16/11/2026");
    expect(dateToIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(semAcento("Ação JOSÉ")).toBe("acao jose");
  });
  it("Consciência Negra e Sexta-feira Santa são feriados", () => {
    expect(FERIADOS_SET.has(`${new Date().getFullYear()}-11-20`)).toBe(true);
    expect(FERIADOS_SET.has("2026-04-03")).toBe(true); // Páscoa 2026 = 05/04
  });
  // Em janeiro a unidade ainda edita dezembro: o feriado do ano anterior tem que valer.
  it("cobre ano anterior e seguinte", () => {
    const ano = new Date().getFullYear();
    expect(FERIADOS_SET.has(`${ano - 1}-12-25`)).toBe(true);
    expect(FERIADOS_SET.has(`${ano + 1}-01-01`)).toBe(true);
  });
  it("dias úteis pulam fim de semana e feriado", () => {
    const iso = diasUteisDoMes(2026, 11, FERIADOS_SET).map(dateToIso);
    expect(iso).not.toContain("2026-11-02"); // Finados, segunda
    expect(iso).not.toContain("2026-11-20"); // Consciência Negra, sexta
    expect(iso).not.toContain("2026-11-07"); // sábado
    expect(iso).toHaveLength(19);
  });
  it("mês anterior editável só até o 2º dia útil", () => {
    // Dez/2026: 01 (ter) e 02 (qua) são os dois primeiros dias úteis.
    expect(podeEditarMesAnterior(new Date(2026, 11, 2))).toBe(true);
    expect(podeEditarMesAnterior(new Date(2026, 11, 3))).toBe(false);
  });
});

describe("ranking — meses", () => {
  it("virada de ano", () => {
    expect(mesAnterior("2027-01-01")).toBe("2026-12-01");
    expect(mesesDoIntervalo("2026-11-15", "2027-02-10")).toEqual(["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]);
  });
  it("parciais e último dia", () => {
    expect(ultimoDiaDoMes("2028-02-01")).toBe("2028-02-29");
    expect(mesesParciais("2026-03-01", "2026-05-31")).toEqual([]);
    expect(mesesParciais("2026-03-10", "2026-05-20")).toEqual(["2026-03-01", "2026-05-01"]);
  });
  it("faixas contíguas", () => {
    expect(faixasDeMeses(["2026-01-01", "2026-02-01", "2026-03-01", "2026-05-01"])).toMatch(/–.*, /);
  });
});

describe("busca de protocolos", () => {
  const p = (titulo: string, palavras_chave: string[] = []): Protocolo =>
    ({ id: titulo, titulo, area: "Em comum", categoria: "", palavras_chave, status: "validado", resumo: "", acoes: [], mensagem_familia: "", atencao: "", fonte: "" }) as unknown as Protocolo;
  const lista = [p("Febre na escola", ["temperatura"]), p("Queda no parque"), p("Atraso na retirada")];
  it("vazio não retorna nada", () => expect(buscarProtocolos(lista, "  ")).toEqual([]));
  it("acha por título e palavra-chave, ignorando acento", () => {
    expect(buscarProtocolos(lista, "febre")[0].titulo).toBe("Febre na escola");
    expect(buscarProtocolos(lista, "temperatura")[0].titulo).toBe("Febre na escola");
    expect(buscarProtocolos(lista, "QUEDA")[0].titulo).toBe("Queda no parque");
  });
});
