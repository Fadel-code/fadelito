import type { RematriculaAluno } from "../types";
import { REMATRICULA_META, REMATRICULA_FORA_DA_META } from "../types";

// O banco não guarda histórico de status, então 30/09 sai como faixa por unidade:
// - mínimo: contratos assinados sem edição depois do corte, nunca abaixo do export de 29/09 07h54
// - máximo: todos os contratos assinados hoje de alunos que já existiam no corte
// ponytail: aluno apagado depois do corte some das duas pontas; snapshot diário resolve as próximas datas.
const CORTE = new Date("2026-10-01T00:00:00-03:00").getTime();

// Rematriculados por unidade no export "Rematricula_2027 07h54.xlsx" (29/09, 07h54).
const EXPORT_29_09: Record<string, number> = {
  "Piracicaba": 0, "Guarulhos": 2, "Campinas": 7, "Panamby": 16, "Marajoara": 16,
  "Real Parque": 24, "Saúde": 19, "Brooklin": 29, "Paraíso": 21, "Klabin": 32,
  "Granja": 12, "Vila Mariana": 23, "Jardins": 22, "Vila Gumercindo": 34, "Perdizes": 71,
  "Boa Vista": 43, "Ipiranga": 43, "São Caetano": 22, "Tatuapé": 62, "Moema": 47,
  "Portal": 51, "Higienópolis": 28, "Anália Franco": 47, "Aclimação": 44, "Mooca": 59,
  "Santo André": 40, "Campo Belo": 115, "Lapa": 73, "Pinheiros": 94, "Vila Madalena": 46,
  "Bonfiglioli": 64, "Osasco": 57, "Vila Sônia": 51,
};

export interface FaixaUnidade {
  unidade_id: string;
  unidade_nome: string;
  total: number;
  min: number;
  max: number;
}

export function faixasEm30_09(alunos: RematriculaAluno[]): FaixaUnidade[] {
  const porUnidade = new Map<string, FaixaUnidade & { aprox: number }>();
  for (const a of alunos) {
    if (new Date(a.created_at).getTime() >= CORTE || a.inadimplente) continue;
    const u = porUnidade.get(a.unidade_id) ?? {
      unidade_id: a.unidade_id,
      unidade_nome: a.profiles?.unidade_nome ?? "—",
      total: 0, min: 0, max: 0, aprox: 0,
    };
    u.total++;
    if (a.contrato_assinado) {
      u.max++;
      if (new Date(a.updated_at).getTime() < CORTE) u.aprox++;
    }
    porUnidade.set(a.unidade_id, u);
  }
  return Array.from(porUnidade.values()).map(({ aprox, ...u }) => {
    const min = Math.max(aprox, EXPORT_29_09[u.unidade_nome] ?? 0);
    // Contrato desfeito depois do corte pode deixar o export acima do "hoje".
    return { ...u, min, max: Math.max(u.max, min) };
  });
}

const pct = (n: number, total: number) => (total > 0 ? n / total : 0);
const fmt = (p: number) => `${(p * 100).toFixed(1)}%`;

export default function RematriculaFaixa3009({ alunos }: { alunos: RematriculaAluno[] }) {
  const faixas = faixasEm30_09(alunos)
    .map((u) => ({ ...u, pMin: pct(u.min, u.total), pMax: pct(u.max, u.total) }))
    .sort((a, b) => b.pMin - a.pMin || b.pMax - a.pMax);

  const lider = faixas[0];
  // Quem ainda pode alcançar o líder: o máximo dela chega no mínimo dele.
  const concorrentes = lider ? faixas.filter((u) => u !== lider && u.pMax >= lider.pMin) : [];

  const rede = faixas.filter((u) => !REMATRICULA_FORA_DA_META.includes(u.unidade_nome));
  const somar = (k: "total" | "min" | "max") => rede.reduce((s, u) => s + u[k], 0);
  const totalRede = somar("total");

  return (
    <section aria-labelledby="rm-3009" className="card overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-5 sm:px-6">
        <h2 id="rm-3009" className="text-xl font-bold tracking-tight text-gray-900">Rematrícula em 30/09: faixa por unidade</h2>
        <p className="mt-1 text-sm text-gray-700">
          O número real de cada unidade está entre o mínimo e o máximo. Mínimo: contratos sem edição depois de 30/09,
          nunca abaixo do export de 29/09 às 07h54. Máximo: todos os contratos assinados hoje de alunos que já existiam em 30/09.
        </p>
        <p className="mt-3 text-sm text-gray-700">
          Rede (meta geral): <strong className="tabular-nums">{fmt(pct(somar("min"), totalRede))} a {fmt(pct(somar("max"), totalRede))}</strong>
        </p>
        {lider && (
          <p className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${concorrentes.length ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>
            {concorrentes.length
              ? `Primeiro lugar indefinido: ${lider.unidade_nome} pode ser alcançada por ${concorrentes.map((u) => u.unidade_nome).join(", ")}.`
              : `${lider.unidade_nome} estava em primeiro em 30/09 em qualquer cenário.`}
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse tabular-nums">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-700">
              <th className="px-3 py-3 text-left font-semibold">Unidade</th>
              <th className="px-3 py-3 text-right font-semibold">A rematricular</th>
              <th className="px-3 py-3 text-right font-semibold">Rematriculados</th>
              <th className="px-3 py-3 text-right font-semibold">% Rematrícula</th>
              <th className="px-3 py-3 text-left font-semibold">Meta {Math.round(REMATRICULA_META * 100)}%</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((u) => {
              const meta = u.pMin >= REMATRICULA_META ? "Atingiu" : u.pMax < REMATRICULA_META ? "Não atingiu" : "Indefinido";
              const cor = meta === "Atingiu" ? "text-green-700" : meta === "Não atingiu" ? "text-gray-600" : "text-amber-700";
              return (
                <tr key={u.unidade_id} className="border-b border-gray-100">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">{u.unidade_nome}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{u.total}</td>
                  <td className="px-3 py-2.5 text-right">{u.min === u.max ? u.min : `${u.min} a ${u.max}`}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                    {u.min === u.max ? fmt(u.pMin) : `${fmt(u.pMin)} a ${fmt(u.pMax)}`}
                  </td>
                  <td className={`px-3 py-2.5 font-medium ${cor}`}>{meta}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
