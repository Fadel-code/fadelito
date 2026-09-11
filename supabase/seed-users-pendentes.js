#!/usr/bin/env node
/**
 * Seed — Cria as contas de Brooklin, Klabin, Perdizes e Real Parque, as 4
 * unidades removidas em 5df0f84 (2026-08-20) e reintroduzidas depois.
 * Não mexe nas outras 31 unidades nem no usuário de marketing (rodar o
 * seed-users.js completo de novo falha ao tentar recriar a marketing, que já
 * existe, e nunca chega no loop de unidades).
 *
 * Uso:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node supabase/seed-users-pendentes.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const UNIDADES = ["Brooklin", "Klabin", "Perdizes", "Real Parque"];

const SENHA_PADRAO = "Fadelito2026!";

async function adminPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${path}: ${err}`);
  }
  return res.json();
}

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Insert ${table}: ${err}`);
  }
}

async function main() {
  console.log("🏫 Criando contas das unidades pendentes...\n");

  for (const unidade of UNIDADES) {
    const slug = unidade
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, ".");
    const email = `${slug}@fadelito.com.br`;

    try {
      const user = await adminPost("users", {
        email,
        password: SENHA_PADRAO,
        email_confirm: true,
        user_metadata: { unidade_nome: unidade },
      });
      await supabaseInsert("profiles", {
        id: user.id,
        role: "unidade",
        unidade_nome: unidade,
        email,
        ativo: true,
      });
      console.log(`   ✅ ${unidade} → ${email}`);
    } catch (err) {
      console.error(`   ❌ ${unidade}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✨ Concluído! Senha padrão: ${SENHA_PADRAO}`);
  console.log("Depois de rodar isso, cole supabase/migrations/030_rematricula_seed_lote2_pendentes.sql no SQL Editor pra semear os alunos.");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
