import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Feriados nacionais 2026 (formato YYYY-MM-DD)
const FERIADOS_2026 = new Set([
  "2026-01-01", // Confraternização Universal
  "2026-04-20", // Paixão de Cristo
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalho
  "2026-09-07", // Independência do Brasil
  "2026-10-12", // Nossa Senhora Aparecida
  "2026-11-02", // Finados
  "2026-11-15", // Proclamação da República
  "2026-12-25", // Natal
]);

function formatarData(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aaaa = d.getFullYear();
  return `${dd}/${mm}/${aaaa}`;
}

function isDiaUtil(d: Date): boolean {
  const diaSemana = d.getDay(); // 0=Dom, 6=Sab
  if (diaSemana === 0 || diaSemana === 6) return false;
  const iso = d.toISOString().slice(0, 10);
  if (FERIADOS_2026.has(iso)) return false;
  return true;
}

serve(async () => {
  try {
    // Hora atual em Sao Paulo (UTC-3)
    const agora = new Date();
    const horaSpOffset = -3 * 60;
    const utcMs = agora.getTime() + agora.getTimezoneOffset() * 60000;
    const hoje = new Date(utcMs + horaSpOffset * 60000);

    if (!isDiaUtil(hoje)) {
      return new Response(
        JSON.stringify({ ok: true, msg: "Hoje não é dia útil — sem envio." }),
        { status: 200 }
      );
    }

    const hojeIso = hoje.toISOString().slice(0, 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar todas as unidades ativas
    const { data: unidades, error: errUnidades } = await supabase
      .from("profiles")
      .select("id, unidade_nome")
      .eq("role", "unidade")
      .eq("ativo", true);

    if (errUnidades) throw errUnidades;
    if (!unidades?.length) {
      return new Response(
        JSON.stringify({ ok: true, msg: "Nenhuma unidade ativa encontrada." }),
        { status: 200 }
      );
    }

    // Buscar unidades que JÁ preencheram hoje
    const { data: preenchidas, error: errReg } = await supabase
      .from("registros")
      .select("unidade_id")
      .eq("data", hojeIso);

    if (errReg) throw errReg;

    const preenchedasIds = new Set((preenchidas ?? []).map((r: { unidade_id: string }) => r.unidade_id));

    const faltantes = unidades.filter(
      (u: { id: string; unidade_nome: string }) => !preenchedasIds.has(u.id)
    );

    if (!faltantes.length) {
      return new Response(
        JSON.stringify({ ok: true, msg: "Todas as unidades já preencheram hoje." }),
        { status: 200 }
      );
    }

    // Montar corpo do e-mail
    const listaFaltantes = faltantes
      .map((u: { unidade_nome: string }) => `• ${u.unidade_nome}`)
      .join("\n");

    const dataFormatada = formatarData(hoje);
    const total = faltantes.length;
    const dashboardUrl = `${Deno.env.get("FRONTEND_URL") ?? "https://fadelito.vercel.app"}/marketing/dashboard`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /></head>
<body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#F97316;padding:16px 24px;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ Fadelito — Unidades sem atualização</h1>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p style="font-size:16px;"><strong>${total} de 35 unidades</strong> não atualizaram em <strong>${dataFormatada}</strong>:</p>
      <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
        ${faltantes.map((u: { unidade_nome: string }) => `<p style="margin:4px 0;">• ${u.unidade_nome}</p>`).join("")}
      </div>
      <a href="${dashboardUrl}"
         style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;
                padding:12px 24px;border-radius:6px;font-weight:bold;margin-top:8px;">
        Ver dashboard
      </a>
    </div>
  </div>
</body>
</html>`;

    // Enviar e-mail via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const marketingEmail = Deno.env.get("MARKETING_EMAIL")!;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fadelito <noreply@fadelito.com.br>",
        to: [marketingEmail],
        subject: `⚠️ Fadelito — Unidades sem atualização em ${dataFormatada}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      throw new Error(`Resend error: ${errText}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        msg: `E-mail enviado. ${total} unidade(s) sem preenchimento.`,
        faltantes: faltantes.map((u: { unidade_nome: string }) => u.unidade_nome),
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500 }
    );
  }
});
