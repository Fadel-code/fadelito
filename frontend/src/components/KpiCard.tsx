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
  /** Cor da barra de progresso (padrão: verde). */
  corProgresso?: "green" | "primary";
  /** Versão menor, para telas com muitos KPIs. */
  compacto?: boolean;
}

const BARRA = { green: "bg-green-500", primary: "bg-primary-500" };

export default function KpiCard({ rotulo, valor, sub, Icone, tom, alerta, progresso, carregando, corProgresso = "green", compacto }: Props) {
  return (
    <div className={`card flex flex-col ${compacto ? "px-3.5 py-3" : "p-4 sm:p-5"} ${alerta ? "ring-2 ring-red-200" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`${compacto ? "text-xs" : "text-sm"} font-medium text-gray-700`}>{rotulo}</p>
        <span className={`flex flex-shrink-0 items-center justify-center rounded-lg ${compacto ? "h-6 w-6" : "h-8 w-8"} ${TOM[tom].chip}`}>
          <Icone className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        </span>
      </div>
      <p className={`mt-1 ${compacto ? "text-xl" : "text-3xl"} font-bold tabular-nums tracking-tight ${TOM[tom].valor}`}>{carregando ? "—" : valor}</p>
      {progresso !== undefined && (
        <span className={`${compacto ? "mt-1 h-1" : "mt-1.5 h-1.5"} block overflow-hidden rounded-full bg-gray-100`} aria-hidden>
          <span className={`block h-full rounded-full ${BARRA[corProgresso]}`} style={{ width: `${Math.min(progresso, 1) * 100}%` }} />
        </span>
      )}
      {sub && <p className="mt-auto pt-1.5 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

/** Grade de KPIs: 2 colunas no celular (o último ímpar ocupa a linha), 4 ou 5 no desktop; 8 é a grade compacta (4 por linha, 8 em telas largas). */
export function KpiGrid({ rotulo, colunas, children }: { rotulo: string; colunas: 4 | 5 | 8; children: ReactNode }) {
  const grade = { 4: "lg:grid-cols-4", 5: "md:grid-cols-3 lg:grid-cols-5", 8: "sm:grid-cols-4 2xl:grid-cols-8" }[colunas];
  return (
    <section
      aria-label={rotulo}
      className={`grid grid-cols-2 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 ${colunas === 8 ? "gap-2.5" : "gap-3 lg:gap-4"} ${grade}`}
    >
      {children}
    </section>
  );
}
