import type { ComponentType, ReactNode } from "react";

const TOM = {
  green: { chip: "bg-green-50 text-green-700", valor: "text-green-700" },
  red: { chip: "bg-red-50 text-red-600", valor: "text-red-600" },
  amber: { chip: "bg-amber-50 text-amber-700", valor: "text-amber-700" },
  blue: { chip: "bg-blue-50 text-blue-700", valor: "text-blue-700" },
  primary: { chip: "bg-primary-50 text-primary-700", valor: "text-primary-700" },
};
export type TomKpi = keyof typeof TOM;

interface Props {
  rotulo: string;
  valor: string | number;
  /** Linha de apoio: o que o número quer dizer. */
  sub?: string;
  Icone: ComponentType<{ className?: string }>;
  tom: TomKpi;
  /** Contorno de alerta: algo pede ação agora. */
  alerta?: boolean;
  /** 0–1: barra de progresso sob o número. */
  progresso?: number;
  carregando?: boolean;
}

export default function KpiCard({ rotulo, valor, sub, Icone, tom, alerta, progresso, carregando }: Props) {
  return (
    <div className={`card flex flex-col p-4 sm:p-5 ${alerta ? "ring-2 ring-red-200" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">{rotulo}</p>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${TOM[tom].chip}`}>
          <Icone className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${TOM[tom].valor}`}>{carregando ? "—" : valor}</p>
      {progresso !== undefined && (
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden>
          <span className="block h-full rounded-full bg-green-500" style={{ width: `${Math.min(progresso, 1) * 100}%` }} />
        </span>
      )}
      {sub && <p className="mt-auto pt-1.5 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

/** Grade de KPIs: 2 colunas no celular (o último ímpar ocupa a linha), 4 ou 5 no desktop. */
export function KpiGrid({ rotulo, colunas, children }: { rotulo: string; colunas: 4 | 5; children: ReactNode }) {
  return (
    <section
      aria-label={rotulo}
      className={`grid grid-cols-2 gap-3 lg:gap-4 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 ${colunas === 5 ? "md:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"}`}
    >
      {children}
    </section>
  );
}
