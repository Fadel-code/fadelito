#!/usr/bin/env node
/**
 * Cria o usuário supervisao@fadelito.com.br com role "supervisao"
 *
 * Uso:
 *   SUPABASE_URL=https://lizmyltmzlvoaaozbqpi.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node supabase/add-supervisao.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lizmyltmzlvoaaozbqpi.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "apikey": SERVICE_ROLE_KEY,
};

async function run() {
  // 1. Aplica a migration 004 (adiciona 'supervisao' ao CHECK constraint e RLS)
  console.log("⚙️  Aplicando migration 004...");
  const migration = await import("fs").then(fs =>
    fs.readFileSync(new URL("./migrations/004_add_supervisao_role.sql", import.meta.url), "utf8")
  );
  const migRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sql: migration }),
  });
  if (!migRes.ok) {
    const body = await migRes.text();
    // exec_sql pode não existir — orientar o usuário a rodar manualmente
    console.warn(`   ⚠️  Não foi possível aplicar via API (${migRes.status}): ${body}`);
    console.warn("   → Cole o conteúdo de supabase/migrations/004_add_supervisao_role.sql no SQL Editor do Supabase.");
  } else {
    console.log("   ✅ Migration aplicada.");
  }

  // 2. Cria o usuário no Auth
  console.log("\n👤 Criando usuário supervisao...");
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "supervisao@fadelito.com.br",
      password: "Fadelito2026@",
      email_confirm: true,
      user_metadata: { role: "supervisao" },
    }),
  });
  if (!authRes.ok) {
    const err = await authRes.text();
    throw new Error(`Criar auth user: ${err}`);
  }
  const user = await authRes.json();
  console.log(`   ✅ Auth user criado: ${user.id}`);

  // 3. Insere o profile
  console.log("\n📋 Inserindo profile...");
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers, "Prefer": "return=minimal" },
    body: JSON.stringify({
      id: user.id,
      role: "supervisao",
      unidade_nome: null,
      email: "supervisao@fadelito.com.br",
      ativo: true,
    }),
  });
  if (!profileRes.ok) {
    const err = await profileRes.text();
    throw new Error(`Inserir profile: ${err}`);
  }
  console.log("   ✅ Profile inserido.");

  console.log("\n✨ Pronto!");
  console.log("   Email: supervisao@fadelito.com.br");
  console.log("   Senha: Fadelito2026@");
  console.log("   Role:  supervisao (visualização geral, sem edição)");
}

run().catch(err => {
  console.error("\n❌ Erro:", err.message);
  process.exit(1);
});
