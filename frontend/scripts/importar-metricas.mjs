// Lê as planilhas "Métricas - <Unidade>.xlsx" (pasta do Drive baixada em .zip e extraída)
// e imprime o SQL de UPSERT em metricas_mensais / metricas_anuais pra colar no SQL Editor.
//
//   node frontend/scripts/importar-metricas.mjs ~/Downloads/Metricas > metricas.sql
//   node frontend/scripts/importar-metricas.mjs --drive     # baixa do Drive e grava direto no Supabase
//   node frontend/scripts/importar-metricas.mjs --drive --seco  # só baixa e lê, sem gravar
//   node frontend/scripts/importar-metricas.mjs --teste
//
// --drive (usado pelo workflow sincronizar-metricas.yml) precisa de:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
//     OAuth de uma conta que já lê a PASTA_DRIVE (hisdevotions@gmail.com). O refresh token sai de
//     `node frontend/scripts/autorizar-google.mjs <client_secret.json>`, rodado uma vez.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Relatório (unidades lidas, faltantes, valores estranhos) sai no stderr.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import XLSX from "xlsx";

const ANO = 2026;
// Pasta "2026 -SUPERVISÃO RELATÓRIO": uma subpasta por unidade com a "Métricas - <Unidade>.xlsx".
const PASTA_DRIVE = "1lIW7YK3tzhgeRmqaNO06l6Wes-aYnrOv";

// Nome na planilha → nome em UNIDADES, quando não bate só tirando acento.
const ALIAS = {
  bonfa: "Bonfiglioli",
  "portal do morumbi": "Portal",
  "chacara klabin": "Klabin",
  "granja viana": "Granja",
};

// Unidades fechadas (migration 021): têm planilha no Drive, mas ficam fora das métricas.
const FORA = ["Klabin", "Real Parque", "Brooklin", "Perdizes"];

const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Célula de % formatada já chega como fração (0.24); texto digitado ("10%%", "0/100%") vem em pontos.
export function lerPct(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n / 100;
}

export function lerInt(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? Math.round(v) : parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function unidadesDoSistema() {
  const fonte = readFileSync(new URL("../src/types/index.ts", import.meta.url), "utf8");
  const bloco = fonte.match(/export const UNIDADES = \[([\s\S]*?)\]/)[1];
  return [...bloco.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

// Duas abas, achadas pelo nome (a ordem varia: Vila Gumercindo vem invertida).
function lerPlanilha(caminho, unidades) {
  const wb = XLSX.read(readFileSync(caminho)); // readFile não acha o fs no build ESM do xlsx 0.20
  const aba = (nome) => {
    const sheet = wb.SheetNames.find((s) => normalizar(s) === nome);
    if (!sheet) throw new Error(`${caminho}: aba "${nome}" não encontrada`);
    const ws = wb.Sheets[sheet];
    const fim = XLSX.utils.decode_range(ws["!ref"]).e.r;
    const cel = (r, c) => {
      const x = ws[XLSX.utils.encode_cell({ r, c })];
      return !x || x.t === "e" || x.t === "z" ? null : x.v;
    };
    const linha = (inicio, exato = false) => {
      for (let r = 0; r <= fim; r++) {
        const a = normalizar(cel(r, 0));
        if (exato ? a === inicio : a.startsWith(inicio)) return r;
      }
      throw new Error(`${caminho}: linha "${inicio}" não encontrada na aba "${nome}"`);
    };
    return { cel, linha };
  };
  const res = aba("resultados resumidos");
  const meta = aba("meta de crescimento");

  const nomePlanilha = normalizar(res.cel(0, 1)).replace(/^fadelito /, "");
  const unidade = ALIAS[nomePlanilha] ?? unidades.find((u) => normalizar(u) === nomePlanilha);
  if (!unidade) throw new Error(`${caminho}: unidade "${res.cel(0, 1)}" não existe em UNIDADES (adicione em ALIAS)`);

  const rTrein = res.linha("treinamento equipe");
  const rEquipe = res.linha("manutencao de equipe");
  const rVisitas = res.linha("visitas");
  const rMatriculas = res.linha("matriculas");
  const rPerda = res.linha("manutencao de alunos (perda"); // cancelamentos do mês
  const rAlunos = meta.linha("janeiro"); // 12 linhas: mês | alunos 2025 | alunos 2026

  const mensais = [];
  for (let m = 1; m <= 12; m++) {
    mensais.push({ unidade, ano: ANO, mes: m, alunos: lerInt(meta.cel(rAlunos + m - 1, 2)), treinamento_pct: lerPct(res.cel(rTrein, m)), equipe_pct: lerPct(res.cel(rEquipe, m)),
      visitas: lerInt(res.cel(rVisitas, m)), matriculas: lerInt(res.cel(rMatriculas, m)), desligamentos: lerInt(res.cel(rPerda, m)) });
    mensais.push({ unidade, ano: ANO - 1, mes: m, alunos: lerInt(meta.cel(rAlunos + m - 1, 1)), treinamento_pct: null, equipe_pct: null, visitas: null, matriculas: null, desligamentos: null });
  }
  const anual = {
    unidade,
    ano: ANO,
    meta_visitas: lerInt(res.cel(res.linha("visitas"), 14)),
    perdas_rematricula: lerInt(meta.cel(meta.linha("perdas rematricula"), 1)),
    saidas_pre: lerInt(meta.cel(meta.linha("pre", true), 1)),
  };
  return { unidade, mensais, anual };
}

const sql = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

function upsert(tabela, chave, linhas) {
  const cols = Object.keys(linhas[0]).filter((c) => c !== "unidade");
  const valores = linhas.map((l) => `  (${[l.unidade, ...cols.map((c) => l[c])].map(sql).join(", ")})`).join(",\n");
  return `INSERT INTO public.${tabela} (unidade_id, ${cols.join(", ")})
SELECT p.id, ${cols.map((c) => `v.${c}::numeric`).join(", ")}
FROM (VALUES
${valores}
) AS v(unidade, ${cols.join(", ")})
JOIN public.profiles p ON p.role = 'unidade' AND p.unidade_nome = v.unidade
ON CONFLICT (unidade_id, ${chave}) DO UPDATE SET
  ${cols.filter((c) => !chave.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(",\n  ")},
  updated_at = now();`;
}

/** Lê todas as planilhas da pasta. Uma planilha quebrada não derruba as outras: vai para `erros`. */
function lerPasta(pasta) {
  const unidades = unidadesDoSistema();
  const arquivos = [];
  const varrer = (dir) => {
    for (const nome of readdirSync(dir)) {
      const p = join(dir, nome);
      if (statSync(p).isDirectory()) varrer(p);
      else if (/^m[eé]tricas?.*\.xlsx$/i.test(nome.normalize("NFC")) && !nome.startsWith("~$")) arquivos.push(p);
    }
  };
  varrer(pasta);

  const erros = [];
  const lidas = arquivos
    .flatMap((a) => { try { return [lerPlanilha(a, unidades)]; } catch (e) { erros.push(e.message); return []; } })
    .filter((l) => !FORA.includes(l.unidade));
  for (const e of erros) console.error(`erro: ${e}`);
  const repetidas = lidas.map((l) => l.unidade).filter((u, i, t) => t.indexOf(u) !== i);
  if (repetidas.length) throw new Error(`Mais de uma planilha para: ${repetidas.join(", ")}`);

  const mensais = lidas.flatMap((l) => l.mensais);
  for (const l of mensais)
    for (const c of ["treinamento_pct", "equipe_pct"])
      if (l[c] != null && (l[c] < 0 || l[c] > 1))
        console.error(`aviso: ${l.unidade} ${l.mes}/${l.ano} ${c} = ${(l[c] * 100).toFixed(2)}% (importado como está)`);

  const faltam = unidades.filter((u) => !FORA.includes(u) && !lidas.some((l) => l.unidade === u));
  console.error(`${lidas.length} planilhas lidas. Sem planilha: ${faltam.join(", ") || "nenhuma"}`);
  return { lidas, mensais, erros };
}

function main(pasta) {
  const { lidas, mensais, erros } = lerPasta(pasta);
  if (erros.length) process.exitCode = 1;
  console.log(`-- Gerado por frontend/scripts/importar-metricas.mjs em ${new Date().toISOString()}
BEGIN;
${upsert("metricas_mensais", "ano, mes", mensais)}

${upsert("metricas_anuais", "ano", lidas.map((l) => l.anual))}
COMMIT;`);
}

// ---------------- --drive: Google Drive → Supabase ----------------

/** Access token a partir do refresh token OAuth (lê o Drive como a conta que autorizou). */
async function tokenGoogle() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    }),
  });
  // invalid_grant = token revogado/expirado: rodar autorizar-google.mjs de novo e trocar o secret.
  if (!r.ok) throw new Error(`Google OAuth ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function baixarDoDrive() {
  const token = await tokenGoogle();
  const auth = { Authorization: `Bearer ${token}` };
  const destino = mkdtempSync(join(tmpdir(), "metricas-"));
  const PASTA = "application/vnd.google-apps.folder";
  const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const filhos = async (id) => {
    const todos = [];
    let pageToken = "";
    do {
      const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
        q: `'${id}' in parents and trashed = false`, includeItemsFromAllDrives: "true", supportsAllDrives: "true",
        fields: "nextPageToken, files(id, name, mimeType)", pageSize: "200", ...(pageToken && { pageToken }),
      })}`;
      const r = await fetch(url, { headers: auth });
      if (!r.ok) throw new Error(`Drive list ${r.status}: ${await r.text()}`);
      const j = await r.json();
      todos.push(...j.files);
      pageToken = j.nextPageToken ?? "";
    } while (pageToken);
    return todos;
  };
  // ponytail: desce a árvore inteira; as pastas das unidades têm poucos arquivos.
  const fila = [PASTA_DRIVE];
  let baixados = 0;
  while (fila.length) {
    for (const f of await filhos(fila.shift())) {
      if (f.mimeType === PASTA) { fila.push(f.id); continue; }
      if (f.mimeType !== XLSX_MIME || !/^m[eé]tricas?/i.test(f.name.normalize("NFC"))) continue;
      const d = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true`, { headers: auth });
      if (!d.ok) throw new Error(`Drive download ${f.name} ${d.status}`);
      // Uma subpasta por arquivo: duas unidades podem ter planilhas de mesmo nome.
      mkdirSync(join(destino, f.id));
      writeFileSync(join(destino, f.id, f.name.replace(/[/\\]/g, "_")), Buffer.from(await d.arrayBuffer()));
      baixados++;
    }
  }
  if (!baixados) throw new Error(`Nenhuma planilha de métricas na pasta ${PASTA_DRIVE}: a conta que autorizou o OAuth tem acesso a ela?`);
  console.error(`${baixados} planilhas baixadas do Drive`);
  return destino;
}

async function gravarNoSupabase(lidas, mensais) {
  const base = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
  const p = await fetch(`${base}/rest/v1/profiles?select=id,unidade_nome&role=eq.unidade`, { headers: h });
  if (!p.ok) throw new Error(`profiles ${p.status}: ${await p.text()}`);
  const idDe = new Map((await p.json()).map((x) => [x.unidade_nome, x.id]));
  const agora = new Date().toISOString();
  const linhas = (xs) => xs.flatMap(({ unidade, ...resto }) => (idDe.has(unidade) ? [{ unidade_id: idDe.get(unidade), ...resto, updated_at: agora }] : []));
  for (const [tabela, chave_, dados] of [["metricas_mensais", "unidade_id,ano,mes", linhas(mensais)], ["metricas_anuais", "unidade_id,ano", linhas(lidas.map((l) => l.anual))]]) {
    const r = await fetch(`${base}/rest/v1/${tabela}?on_conflict=${chave_}`, {
      method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(dados),
    });
    if (!r.ok) throw new Error(`${tabela} ${r.status}: ${await r.text()}`);
    console.error(`${tabela}: ${dados.length} linhas gravadas`);
  }
}

if (process.argv[2] === "--drive") {
  const { lidas, mensais, erros } = lerPasta(await baixarDoDrive());
  // --seco: baixa e lê, sem gravar (para testar o acesso ao Drive).
  if (process.argv[3] !== "--seco") await gravarNoSupabase(lidas, mensais);
  // As planilhas boas já foram gravadas; falha no fim para o GitHub avisar das quebradas.
  if (erros.length) process.exitCode = 1;
} else if (process.argv[2] === "--teste") {
  const ok = (a, b) => { if (a !== b) throw new Error(`esperado ${b}, veio ${a}`); };
  ok(lerPct(0.24), 0.24);
  ok(lerPct("10%%"), 0.1);
  ok(lerPct("0/100%"), 0);
  ok(lerPct("15%"), 0.15);
  ok(lerPct(""), null);
  ok(lerPct("#DIV/0!"), null);
  ok(lerInt(52.5), 53);
  ok(lerInt("69"), 69);
  ok(lerInt(null), null);
  ok(ALIAS[normalizar("Fadelito Granja viana ").replace(/^fadelito /, "")], "Granja");
  console.error("ok");
} else if (process.argv[2]) {
  main(process.argv[2]);
} else {
  console.error("uso: node frontend/scripts/importar-metricas.mjs <pasta-com-as-planilhas> > metricas.sql");
  process.exit(1);
}
