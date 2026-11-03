// Gera o refresh token OAuth que o importar-metricas.mjs --drive usa. Rodar uma vez, no computador:
//
//   node frontend/scripts/autorizar-google.mjs ~/Downloads/client_secret_XXXX.json
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node frontend/scripts/autorizar-google.mjs
//
// Abre o navegador; entre com a conta que já lê a pasta das métricas e clique em "Permitir".
// Grava client_id, client_secret e refresh_token em ~/.config/fadelito-metricas-google.json (só seu usuário lê).
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const arquivo = process.argv[2];
const cfg = arquivo ? JSON.parse(readFileSync(arquivo, "utf8")) : null;
const { client_id, client_secret } = cfg
  ? cfg.installed ?? cfg.web
  : { client_id: process.env.GOOGLE_CLIENT_ID?.trim(), client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() };
if (!client_id || !client_secret) {
  console.error("uso: node frontend/scripts/autorizar-google.mjs <client_secret.json>\n  ou: GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node frontend/scripts/autorizar-google.mjs");
  process.exit(1);
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const code = url.searchParams.get("code");
  if (!code) { res.end(url.searchParams.get("error") ?? "sem código"); return; }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id, client_secret, redirect_uri }),
  });
  const j = await r.json();
  if (!j.refresh_token) {
    res.end("Falhou: veja o terminal.");
    console.error("Sem refresh_token:", j.error ?? j);
  } else {
    const destino = join(homedir(), ".config", "fadelito-metricas-google.json");
    mkdirSync(join(homedir(), ".config"), { recursive: true });
    writeFileSync(destino, JSON.stringify({ client_id, client_secret, refresh_token: j.refresh_token }, null, 2), { mode: 0o600 });
    res.end("Pronto! Pode fechar esta aba e voltar ao terminal.");
    console.error(`Refresh token salvo em ${destino}`);
  }
  servidor.close();
});

let redirect_uri;
servidor.listen(0, "127.0.0.1", () => {
  redirect_uri = `http://127.0.0.1:${servidor.address().port}`;
  const auth = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id, redirect_uri, response_type: "code", access_type: "offline", prompt: "consent",
    scope: "https://www.googleapis.com/auth/drive.readonly",
  })}`;
  console.error(`Abrindo o navegador. Se não abrir, cole este link:\n\n${auth}\n`);
  execFile("xdg-open", [auth], () => {});
});
