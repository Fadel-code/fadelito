import * as XLSX from "xlsx";
import type { ConsolidadoUnidade } from "../types";
import { MESES } from "../types";

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
  ano: number
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

  XLSX.writeFile(wb, `Resultados_Fadelito_${ano}.xlsx`);
}
