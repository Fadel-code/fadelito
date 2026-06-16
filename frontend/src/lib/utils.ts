import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function formatarDataObj(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function anoMesAtual(): { ano: number; mes: number } {
  const now = new Date();
  return { ano: now.getFullYear(), mes: now.getMonth() + 1 };
}

export function diasUteisDoMes(ano: number, mes: number, feriados: Set<string>): Date[] {
  const dias: Date[] = [];
  const total = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const dt = new Date(ano, mes - 1, d);
    const dia = dt.getDay();
    if (dia === 0 || dia === 6) continue;
    const iso = dateToIso(dt);
    if (feriados.has(iso)) continue;
    dias.push(dt);
  }
  return dias;
}
