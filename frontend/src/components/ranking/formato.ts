import { MESES } from "../../lib/rankingSupervisoras";

export const pct = (x: number | null) =>
  x === null ? "—" : `${(x * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const num = (x: number) => x.toLocaleString("pt-BR");
export const rotuloMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export const MESES_COMPLETOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "Setembro de 2026" (só a 1ª letra maiúscula). */
export const nomeMesCompleto = (ym: string) => {
  const nome = MESES_COMPLETOS[Number(ym.slice(5, 7)) - 1];
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ym.slice(0, 4)}`;
};
