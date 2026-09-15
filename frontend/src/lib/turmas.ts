import { TURMAS } from "../types";
import type { LinhaTurma } from "../types";

export const CAMPOS_TURMA = [
  "visitas",
  "visitas_curso_ferias",
  "matriculas",
  "matriculas_curso_ferias",
  "desligamentos",
  "transferencias",
  "religamentos",
] as const;

export function zeradaTurma(unidade: string, turma: string): LinhaTurma {
  return {
    unidade,
    turma,
    visitas: 0,
    visitas_curso_ferias: 0,
    matriculas: 0,
    matriculas_curso_ferias: 0,
    desligamentos: 0,
    transferencias: 0,
    religamentos: 0,
  };
}

export function somarTurmas(linhas: LinhaTurma[], unidade: string, turma: string): LinhaTurma {
  const acc = zeradaTurma(unidade, turma);
  for (const l of linhas) for (const c of CAMPOS_TURMA) acc[c] += l[c];
  return acc;
}

export function temDadosTurma(l: LinhaTurma): boolean {
  return CAMPOS_TURMA.some((c) => l[c] > 0);
}

export function aproveitamentoTurma(vt: number, mt: number): string {
  return vt > 0 ? `${((mt / vt) * 100).toFixed(1)}%` : "—";
}

/** Uma linha por turma, na ordem pedagógica — turmas sem movimento entram zeradas. */
export function resumoPorTurma(linhas: LinhaTurma[]): LinhaTurma[] {
  return TURMAS.map((t) => somarTurmas(linhas.filter((l) => l.turma === t), "—", t));
}

/** Linhas unidade × turma com movimento, ordenadas por unidade e pela ordem das turmas. */
export function detalhePorUnidade(linhas: LinhaTurma[]): LinhaTurma[] {
  const ordem = new Map(TURMAS.map((t, i) => [String(t), i]));
  return linhas
    .filter(temDadosTurma)
    .sort(
      (a, b) =>
        a.unidade.localeCompare(b.unidade, "pt-BR") ||
        (ordem.get(a.turma) ?? 99) - (ordem.get(b.turma) ?? 99)
    );
}
