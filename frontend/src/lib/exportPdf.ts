import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ConsolidadoUnidade } from "../types";
import { MESES } from "../types";

// jsPDF-autotable types
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

function somarDados(dados: ConsolidadoUnidade[], campo: keyof ConsolidadoUnidade): number {
  return dados.reduce((acc, d) => acc + (Number(d[campo]) || 0), 0);
}

function calcAproveitamento(vt: number, mt: number): string {
  return vt > 0 ? `${((mt / vt) * 100).toFixed(1)}%` : "—";
}

export async function exportarPdf(
  dados: ConsolidadoUnidade[],
  mes: number,
  ano: number
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const nomeMes = MESES[mes - 1];

  // Cabeçalho
  doc.setFillColor(249, 115, 22); // #F97316
  doc.rect(0, 0, 297, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FADELITO", 14, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Dashboard Consolidado — ${nomeMes} ${ano}`, 50, 13);
  const dataGeracao = new Date().toLocaleDateString("pt-BR");
  doc.text(`Gerado em: ${dataGeracao}`, 230, 13);

  // Tabela consolidada
  const vtTotal = somarDados(dados, "visitas_totais");
  const mtTotal = somarDados(dados, "matriculas_totais");

  const rows = dados.map((u) => [
    u.unidade_nome,
    u.visitas,
    u.visitas_curso_ferias,
    u.visitas_totais,
    u.matriculas,
    u.matriculas_curso_ferias,
    u.matriculas_totais,
    u.aproveitamento,
    u.desligamentos,
    u.saldo,
    u.transferencias,
    u.religamentos,
  ]);

  rows.push([
    "TOTAL DA REDE",
    somarDados(dados, "visitas"),
    somarDados(dados, "visitas_curso_ferias"),
    vtTotal,
    somarDados(dados, "matriculas"),
    somarDados(dados, "matriculas_curso_ferias"),
    mtTotal,
    calcAproveitamento(vtTotal, mtTotal),
    somarDados(dados, "desligamentos"),
    somarDados(dados, "saldo"),
    somarDados(dados, "transferencias"),
    somarDados(dados, "religamentos"),
  ]);

  autoTable(doc, {
    startY: 25,
    head: [[
      "Unidade",
      "Visitas", "Vis. CF", "Vis. Tot.",
      "Matrículas", "Mat. CF", "Mat. Tot.",
      "% Aprov.",
      "Deslig.", "Saldo", "Transfer.", "Religam."
    ]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { halign: "left", cellWidth: 30 },
      1: { halign: "center" }, 2: { halign: "center" },
      3: { halign: "center", fontStyle: "bold" },
      4: { halign: "center" }, 5: { halign: "center" },
      6: { halign: "center", fontStyle: "bold" },
      7: { halign: "center", fontStyle: "bold" },
      8: { halign: "center" }, 9: { halign: "center" },
      10: { halign: "center" }, 11: { halign: "center" },
    },
    didParseCell: (data) => {
      // Destaque na última linha (Total da Rede)
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fillColor = [253, 186, 116];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(150);
    doc.setFontSize(7);
    doc.text(
      `Fadelito — Confidencial — Página ${i} de ${pageCount}`,
      148,
      205,
      { align: "center" }
    );
  }

  doc.save(`Dashboard_Fadelito_${nomeMes}_${ano}.pdf`);
}
