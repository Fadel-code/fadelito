import type { Protocolo } from "../types";

const STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos",
  "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "que",
  "um", "uma",
]);

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function rootWord(word: string): string {
  return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}

export function words(value: string): string[] {
  const clean = normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
  if (!clean) return [];
  const output: string[] = [];
  for (const word of clean.split(/\s+/)) {
    if (STOP_WORDS.has(word)) continue;
    output.push(word);
    const root = rootWord(word);
    if (root !== word) output.push(root);
  }
  return [...new Set(output)];
}

function searchableText(p: Protocolo): string {
  return [p.titulo, p.area, p.categoria, ...p.palavras_chave, p.resumo, ...p.acoes, p.atencao, p.fonte]
    .filter(Boolean)
    .join(" ");
}

function oneEditAway(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diffs = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diffs > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return true;
}

export function score(p: Protocolo, query: string): number {
  const cleanQuery = normalize(query).replace(/[^a-z0-9\s]+/g, " ").trim();
  const queryWords = words(cleanQuery);
  const title = normalize(p.titulo);
  const titleWords = words(p.titulo);
  const keywordWords = words(p.palavras_chave.join(" "));
  const allWords = words(searchableText(p));

  let points = 0;
  let matchedTerms = 0;

  if (title === cleanQuery) points += 240;
  else if (cleanQuery.length > 2 && title.includes(cleanQuery)) points += 120;

  for (const term of queryWords) {
    let matched = false;
    if (titleWords.includes(term)) { points += 80; matched = true; }
    else if (titleWords.some((w) => w.startsWith(term) || term.startsWith(w))) { points += 48; matched = true; }
    if (keywordWords.includes(term)) { points += 70; matched = true; }
    else if (keywordWords.some((w) => w.startsWith(term) || term.startsWith(w))) { points += 42; matched = true; }
    if (allWords.includes(term)) { points += 26; matched = true; }
    else if (allWords.some((w) => w.startsWith(term) || term.startsWith(w))) { points += 14; matched = true; }
    else if (term.length >= 5 && allWords.some((w) => w.length >= 5 && term[0] === w[0] && oneEditAway(term, w))) {
      points += 8; matched = true;
    }
    if (matched) matchedTerms++;
  }

  if (queryWords.length >= 2 && matchedTerms < Math.ceil(queryWords.length / 2)) return 0;
  return points;
}

export function buscarProtocolos(protocolos: Protocolo[], query: string): Protocolo[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return protocolos
    .map((p) => ({ p, s: score(p, trimmed) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ p }) => p);
}
