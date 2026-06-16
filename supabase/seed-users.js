#!/usr/bin/env node
/**
 * Seed — Cria os 35 usuários de unidade + 1 de marketing via Supabase Admin API
 *
 * Uso:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node supabase/seed-users.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const UNIDADES = [
  "Aclamação", "Anália Franco", "Boa Vista", "Bonfiglioli", "Brooklin",
  "Campinas", "Campo Belo", "Granja", "Guarulhos", "Higienópolis",
  "Indianópolis", "Ipiranga", "Jardins", "Klabin", "Lapa",
  "Marajoará", "Moema", "Mooca", "Osasco", "Panaмby",
  "Paraíso", "Perdizes", "Pinheiros", "Piracicaba", "Portal",
  "Real Parque", "Santo André", "São Caetano", "Saúde", "Tatuapé",
  "Vila Gumercindo", "Vila Leopoldina", "Vila Madalena", "Vila Mariana", "Vila Sônia",
];

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
  console.log("🚀 Iniciando seed de usuários Fadelito...\n");

  // 1. Criar usuário de marketing
  console.log("📧 Criando usuário marketing...");
  const marketing = await adminPost("users", {
    email: "marketing@fadelito.com.br",
    password: SENHA_PADRAO,
    email_confirm: true,
    user_metadata: { role: "marketing" },
  });
  await supabaseInsert("profiles", {
    id: marketing.id,
    role: "marketing",
    unidade_nome: null,
    email: "marketing@fadelito.com.br",
    ativo: true,
  });
  console.log(`   ✅ marketing@fadelito.com.br (${marketing.id})`);

  // 2. Criar usuários das 35 unidades
  console.log("\n🏫 Criando usuários das unidades...");
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

    // Pequeno delay para não sobrecarregar a API
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n✨ Seed concluído!");
  console.log(`\n📋 Credenciais padrão:`);
  console.log(`   Senha: ${SENHA_PADRAO}`);
  console.log(`   Marketing: marketing@fadelito.com.br`);
  console.log(`   Unidades: <nome-unidade>@fadelito.com.br`);
  console.log(`\n⚠️  Solicite que cada usuário altere a senha no primeiro acesso.`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
