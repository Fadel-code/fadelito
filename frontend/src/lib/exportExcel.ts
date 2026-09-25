import * as XLSX from "xlsx";
import type { ConsolidadoUnidade, LinhaTurma } from "../types";
import { MESES, TURMAS } from "../types";

function calcAproveitamento(vt: number, mt: number): string {
  return vt > 0 ? `${((mt / vt) * 100).toFixed(1)}%` : "—";
}

function somarDados(dados: ConsolidadoUnidade[], campo: keyof ConsolidadoUnidade): number {
  return dados.reduce((acc, d) => acc + (Number(d[campo]) || 0), 0);
}

function linhaParaPlanilha(u: ConsolidadoUnidade) {
  return {
    "Unidade": u.unidade_nome,
    "Visitas": u.visitas,
    "Visitas CF": u.visitas_curso_ferias,
    "Visitas Totais": u.visitas_totais,
    "Matrículas": u.matriculas,
    "Matrículas CF": u.matriculas_curso_ferias,
    "Matrículas Totais": u.matriculas_totais,
    "% Aproveitamento": u.aproveitamento,
    "Desligamentos": u.desligamentos,
    "Saldo": u.saldo,
    "Transferências": u.transferencias,
    "Religamentos": u.religamentos,
  };
}

export async function exportarExcel(
  dadosMes: ConsolidadoUnidade[],
  mes: number,
  ano: number,
  // Quebra por turma do mesmo período — vai junto no arquivo pra não precisar
  // exportar duas vezes em telas diferentes.
  turmas?: LinhaTurma[]
) {
  const wb = XLSX.utils.book_new();

  // Aba do mês atual com dados reais
  const linhas = dadosMes.map(linhaParaPlanilha);

  // Linha de total
  const vtTotal = somarDados(dadosMes, "visitas_totais");
  const mtTotal = somarDados(dadosMes, "matriculas_totais");
  const totalRow = {
    "Unidade": "Total da Rede",
    "Visitas": somarDados(dadosMes, "visitas"),
    "Visitas CF": somarDados(dadosMes, "visitas_curso_ferias"),
    "Visitas Totais": vtTotal,
    "Matrículas": somarDados(dadosMes, "matriculas"),
    "Matrículas CF": somarDados(dadosMes, "matriculas_curso_ferias"),
    "Matrículas Totais": mtTotal,
    "% Aproveitamento": calcAproveitamento(vtTotal, mtTotal),
    "Desligamentos": somarDados(dadosMes, "desligamentos"),
    "Saldo": somarDados(dadosMes, "saldo"),
    "Transferências": somarDados(dadosMes, "transferencias"),
    "Religamentos": somarDados(dadosMes, "religamentos"),
  };
  linhas.push(totalRow);

  const ws = XLSX.utils.json_to_sheet(linhas);

  // Largura das colunas
  ws["!cols"] = [
    { wch: 20 }, // Unidade
    { wch: 10 }, { wch: 11 }, { wch: 14 },
    { wch: 11 }, { wch: 13 }, { wch: 16 },
    { wch: 16 }, { wch: 14 }, { wch: 8 },
    { wch: 14 }, { wch: 13 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, MESES[mes - 1]);

  // Abas vazias para os outros meses (estrutura fiel à planilha original)
  for (let m = 1; m <= 12; m++) {
    if (m === mes) continue;
    const wsVazia = XLSX.utils.json_to_sheet([{
      "Unidade": "", "Visitas": "", "Visitas CF": "", "Visitas Totais": "",
      "Matrículas": "", "Matrículas CF": "", "Matrículas Totais": "",
      "% Aproveitamento": "", "Desligamentos": "", "Saldo": "",
      "Transferências": "", "Religamentos": "",
    }]);
    XLSX.utils.book_append_sheet(wb, wsVazia, MESES[m - 1]);
  }

  if (turmas && turmas.length > 0) {
    const wsResumo = XLSX.utils.json_to_sheet(montarResumo(turmas, TURMAS.map(String)));
    wsResumo["!cols"] = COLS_TURMA.slice(1);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo por Turma");

    const wsTurmas = XLSX.utils.json_to_sheet(turmas.map((l) => linhaTurmaParaPlanilha(l, true)));
    wsTurmas["!cols"] = COLS_TURMA;
    XLSX.utils.book_append_sheet(wb, wsTurmas, "Unidade x Turma");
  }

  XLSX.writeFile(wb, `Resultados_Fadelito_${ano}.xlsx`);
}

// ============================================================
// Relatório por turma (marketing / supervisão)
// ============================================================

function linhaTurmaParaPlanilha(l: LinhaTurma, comUnidade: boolean) {
  const vt = l.visitas + l.visitas_curso_ferias;
  const mt = l.matriculas + l.matriculas_curso_ferias;
  return {
    ...(comUnidade ? { "Unidade": l.unidade } : {}),
    "Turma": l.turma,
    "Visitas": l.visitas,
    "Visitas CF": l.visitas_curso_ferias,
    "Visitas Totais": vt,
    "Matrículas": l.matriculas,
    "Matrículas CF": l.matriculas_curso_ferias,
    "Matrículas Totais": mt,
    "% Aproveitamento": calcAproveitamento(vt, mt),
    "Desligamentos": l.desligamentos,
    "Saldo": mt - l.desligamentos,
    "Transferências": l.transferencias,
    "Religamentos": l.religamentos,
  };
}

function somarLinhasTurma(linhas: LinhaTurma[], turma: string, unidade: string): LinhaTurma {
  return linhas.reduce<LinhaTurma>(
    (acc, l) => ({
      unidade,
      turma,
      visitas: acc.visitas + l.visitas,
      visitas_curso_ferias: acc.visitas_curso_ferias + l.visitas_curso_ferias,
      matriculas: acc.matriculas + l.matriculas,
      matriculas_curso_ferias: acc.matriculas_curso_ferias + l.matriculas_curso_ferias,
      desligamentos: acc.desligamentos + l.desligamentos,
      transferencias: acc.transferencias + l.transferencias,
      religamentos: acc.religamentos + l.religamentos,
    }),
    {
      unidade,
      turma,
      visitas: 0,
      visitas_curso_ferias: 0,
      matriculas: 0,
      matriculas_curso_ferias: 0,
      desligamentos: 0,
      transferencias: 0,
      religamentos: 0,
    }
  );
}

/** Resumo consolidado (uma linha por turma) + linha de total, na ordem recebida. */
function montarResumo(detalhe: LinhaTurma[], turmas: string[]) {
  const resumo = turmas.map((t) =>
    somarLinhasTurma(detalhe.filter((l) => l.turma === t), t, "—")
  );
  resumo.push(somarLinhasTurma(detalhe, "Total", "—"));
  return resumo.map((l) => linhaTurmaParaPlanilha(l, false));
}

const COLS_TURMA = [
  { wch: 20 }, { wch: 14 },
  { wch: 10 }, { wch: 11 }, { wch: 14 },
  { wch: 11 }, { wch: 13 }, { wch: 16 },
  { wch: 16 }, { wch: 14 }, { wch: 8 },
  { wch: 14 }, { wch: 13 },
];

// ============================================================
// Relatório de Rematrícula (marketing)
// ============================================================

interface LinhaRematriculaPlanilha {
  unidade_nome: string;
  total: number;
  rematriculados: number;
  naoRematriculados: number;
  pendentes: number;
  pct: number;
}

function linhaRematriculaParaPlanilha(u: LinhaRematriculaPlanilha) {
  return {
    "Unidade": u.unidade_nome,
    "A rematricular": u.total,
    "Rematriculados": u.rematriculados,
    "Não rematriculados": u.naoRematriculados,
    "Pendentes": u.pendentes,
    "% Rematrícula": `${(u.pct * 100).toFixed(1)}%`,
  };
}

const COLS_REMATRICULA = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];

function linhasRematricula(porUnidade: LinhaRematriculaPlanilha[], kpisRede: Omit<LinhaRematriculaPlanilha, "unidade_nome">) {
  return [...porUnidade, { unidade_nome: "Total da Rede", ...kpisRede }].map(linhaRematriculaParaPlanilha);
}

export function exportarRematriculaExcel(
  porUnidade: LinhaRematriculaPlanilha[],
  kpisRede: Omit<LinhaRematriculaPlanilha, "unidade_nome">
) {
  const ws = XLSX.utils.json_to_sheet(linhasRematricula(porUnidade, kpisRede));
  ws["!cols"] = COLS_REMATRICULA;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rematrícula");
  XLSX.writeFile(wb, `Rematricula_${new Date().getFullYear()}.xlsx`);
}

/** CSV UTF-8 com BOM — abre direto no Google Sheets e no Excel. */
export function exportarRematriculaCsv(
  porUnidade: LinhaRematriculaPlanilha[],
  kpisRede: Omit<LinhaRematriculaPlanilha, "unidade_nome">
) {
  const ws = XLSX.utils.json_to_sheet(linhasRematricula(porUnidade, kpisRede));
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: "," });
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rematricula_${new Date().getFullYear()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function nomeArquivo(escopo: string, mes: number, ano: number, ext: string) {
  const slug = escopo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_");
  return `Turmas_${slug}_${MESES[mes - 1]}_${ano}.${ext}`;
}

/** .xlsx com duas abas: resumo por turma e detalhe unidade × turma. */
export function exportarTurmasExcel(
  detalhe: LinhaTurma[],
  turmas: string[],
  escopo: string,
  mes: number,
  ano: number,
  comUnidade: boolean
) {
  const wb = XLSX.utils.book_new();

  const wsResumo = XLSX.utils.json_to_sheet(montarResumo(detalhe, turmas));
  wsResumo["!cols"] = COLS_TURMA.slice(1);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo por Turma");

  const wsDetalhe = XLSX.utils.json_to_sheet(
    detalhe.map((l) => linhaTurmaParaPlanilha(l, comUnidade))
  );
  wsDetalhe["!cols"] = comUnidade ? COLS_TURMA : COLS_TURMA.slice(1);
  XLSX.utils.book_append_sheet(wb, wsDetalhe, comUnidade ? "Unidade x Turma" : "Detalhe");

  XLSX.writeFile(wb, nomeArquivo(escopo, mes, ano, "xlsx"));
}

/** CSV UTF-8 com BOM e separador vírgula — abre direto no Google Sheets e no Excel. */
export function exportarTurmasCsv(
  detalhe: LinhaTurma[],
  escopo: string,
  mes: number,
  ano: number,
  comUnidade: boolean
) {
  const ws = XLSX.utils.json_to_sheet(detalhe.map((l) => linhaTurmaParaPlanilha(l, comUnidade)));
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: "," });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo(escopo, mes, ano, "csv");
  a.click();
  URL.revokeObjectURL(url);
}
