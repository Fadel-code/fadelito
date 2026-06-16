#!/usr/bin/env node
/**
 * Fix logins — cria ou reseta senha dos usuários problemáticos
 *
 * Uso:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node supabase/fix-logins.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SENHA_PADRAO = "Fadelito2026!";

// Unidades com problema de login
const UNIDADES_PROBLEMA = [
  { nome: "São Caetano",     email: "sao.caetano@fadelito.com.br" },
  { nome: "Vila Madalena",   email: "vila.madalena@fadelito.com.br" },
  { nome: "Granja",          email: "granja@fadelito.com.br" },
  { nome: "Vila Gumercindo", email: "vila.gumercindo@fadelito.com.br" },
  { nome: "Panamby",         email: "panamby@fadelito.com.br" },
];

async function adminFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${path}: ${err}`);
  }
  return res.json();
}

async function supabaseUpsert(table, data, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
      "Prefer": `resolution=merge-duplicates,return=minimal`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upsert ${table}: ${err}`);
  }
}

async function main() {
  console.log("🔧 Corrigindo logins problemáticos...\n");

  // Busca todos os usuários existentes para cruzar por email
  const { users } = await adminFetch("users?per_page=100");
  const porEmail = new Map(users.map((u) => [u.email, u]));

  for (const { nome, email } of UNIDADES_PROBLEMA) {
    const existente = porEmail.get(email);

    if (existente) {
      // Usuário existe — reseta a senha e confirma e-mail
      await adminFetch(`users/${existente.id}`, "PUT", {
        password: SENHA_PADRAO,
        email_confirm: true,
      });
      // Garante que o profile existe e está ativo
      await supabaseUpsert("profiles", {
        id: existente.id,
        role: "unidade",
        unidade_nome: nome,
        email,
        ativo: true,
      });
      console.log(`✅ ${nome} — senha resetada (${email})`);
    } else {
      // Usuário não existe — cria do zero
      const user = await adminFetch("users", "POST", {
        email,
        password: SENHA_PADRAO,
        email_confirm: true,
        user_metadata: { unidade_nome: nome },
      });
      await supabaseUpsert("profiles", {
        id: user.id,
        role: "unidade",
        unidade_nome: nome,
        email,
        ativo: true,
      });
      console.log(`🆕 ${nome} — criado (${email})`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n✨ Pronto! Credenciais:");
  for (const { nome, email } of UNIDADES_PROBLEMA) {
    console.log(`   ${nome}: ${email} / ${SENHA_PADRAO}`);
  }
  console.log("\n⚠️  Nota: a unidade está cadastrada como 'Granja' (sem 'Viana').");
  console.log("   O login é: granja@fadelito.com.br");
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
