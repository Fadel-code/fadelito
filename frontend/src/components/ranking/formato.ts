import { MESES } from "../../types";
import { MESES_CURTOS } from "../../lib/rankingSupervisoras";

export const pct = (x: number | null) =>
  x === null ? "—" : `${(x * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const num = (x: number) => x.toLocaleString("pt-BR");
export const rotuloMes = (iso: string) => `${MESES_CURTOS[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "Setembro de 2026" (só a 1ª letra maiúscula). */
export const nomeMesCompleto = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;
