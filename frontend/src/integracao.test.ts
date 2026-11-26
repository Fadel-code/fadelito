import { beforeEach, describe, expect, it, vi } from "vitest";

// Supabase e CRM falsos: nada sai da máquina, nada grava no banco.
const chamadas: string[] = [];
vi.mock("./lib/crm", () => ({
  reverterDesfecho: vi.fn(async (id: number) => { chamadas.push(`crm:revert:${id}`); }),
  enviarDesfecho: vi.fn(),
  fetchLeadsElegiveis: vi.fn(),
}));
vi.mock("./lib/supabase", async (orig) => {
  const real = await orig<typeof import("./lib/supabase")>();
  const del = { eq: () => ({ select: async () => { chamadas.push("db:delete"); return { data: [{ id: "x" }], error: null }; } }) };
  return { ...real, supabase: { from: () => ({ delete: () => del }) }, avisarEventosLeadAlterados: () => {} };
});
vi.mock("./components/Layout", () => ({ BANNER_KEY: "k" }));

const { apagarEventoLead } = await import("./hooks/useEventosLead");
const { buscarTudo } = await import("./lib/supabase");

describe("desfechos ↔ CRM", () => {
  beforeEach(() => { chamadas.length = 0; });

  it("lead 'removido' (de outra unidade) não reverte o stage no CRM", async () => {
    await apagarEventoLead({ id: "x", crm_lead_id: 7, tipo: "removido" });
    expect(chamadas).toEqual(["db:delete"]);
  });

  it("desfecho real reverte no CRM antes de apagar local", async () => {
    await apagarEventoLead({ id: "x", crm_lead_id: 7, tipo: "matricula" });
    expect(chamadas).toEqual(["crm:revert:7", "db:delete"]);
  });
});

describe("buscarTudo", () => {
  it("segue paginando além de 1000 linhas", async () => {
    const total = 2500;
    const linhas = await buscarTudo<number>(async (de, ate) => ({
      data: Array.from({ length: Math.max(0, Math.min(ate, total - 1) - de + 1) }, (_, i) => de + i),
      error: null,
    }));
    expect(linhas.length).toBe(total);
    expect(new Set(linhas).size).toBe(total);
  });
});
