import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import type { Protocolo } from "../../types";
import type { ProtocoloInput } from "../../hooks/useProtocolos";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  protocolos: Protocolo[];
  criar: (input: ProtocoloInput) => Promise<boolean>;
  atualizar: (id: string, input: Partial<ProtocoloInput>) => Promise<boolean>;
  remover: (id: string) => Promise<boolean>;
}

const AREAS: Protocolo["area"][] = ["Pedagógico", "Administrativo", "Em comum"];

function vazio(): ProtocoloInput {
  return {
    titulo: "",
    area: "Pedagógico",
    categoria: "",
    palavras_chave: [],
    status: "revisao",
    resumo: "",
    acoes: [],
    mensagem_familia: "",
    atencao: "",
    publicado: true,
    fonte: "",
  };
}

export default function AdminPanel({ open, onClose, protocolos, criar, atualizar, remover }: AdminPanelProps) {
  const [editando, setEditando] = useState<Protocolo | null>(null);
  const [form, setForm] = useState<ProtocoloInput>(vazio());
  const [acoesTexto, setAcoesTexto] = useState("");
  const [palavrasTexto, setPalavrasTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editando) {
      const { id, created_at, updated_at, ...rest } = editando;
      void id;
      void created_at;
      void updated_at;
      setForm(rest);
      setAcoesTexto(editando.acoes.join("\n"));
      setPalavrasTexto(editando.palavras_chave.join(", "));
    } else {
      setForm(vazio());
      setAcoesTexto("");
      setPalavrasTexto("");
    }
  }, [editando, open]);

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const input: ProtocoloInput = {
      ...form,
      acoes: acoesTexto.split("\n").map((l) => l.trim()).filter(Boolean),
      palavras_chave: palavrasTexto.split(",").map((k) => k.trim()).filter(Boolean),
    };
    const ok = editando ? await atualizar(editando.id, input) : await criar(input);
    setSalvando(false);
    if (ok) setEditando(null);
  }

  async function handleRemover(id: string) {
    setRemovendoId(id);
    const ok = await remover(id);
    setRemovendoId(null);
    if (ok) {
      setConfirmandoId(null);
      if (editando?.id === id) setEditando(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="assistente-fadelito max-w-5xl max-h-[88vh] overflow-y-auto p-0">
        <div className="grid md:grid-cols-[1.4fr_1fr]">
          <section className="p-6 md:border-r" style={{ borderColor: "var(--af-line)" }}>
            <DialogHeader className="mb-1">
              <DialogTitle style={{ fontFamily: "Georgia, serif" }}>
                {editando ? "Editar protocolo" : "Adicionar protocolo"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvar} className="grid grid-cols-2 gap-3 mt-4">
              <div className="af-field col-span-2">
                <label>Título</label>
                <input required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>Área</label>
                <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value as Protocolo["area"] }))}>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="af-field">
                <label>Categoria</label>
                <input required value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>Situação</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Protocolo["status"] }))}>
                  <option value="validado">Validado</option>
                  <option value="revisao">Em revisão</option>
                </select>
              </div>
              <div className="af-field">
                <label>Nome da fonte</label>
                <input value={form.fonte} onChange={(e) => setForm((f) => ({ ...f, fonte: e.target.value }))} />
              </div>
              <div className="af-field col-span-2">
                <label>Como agir — texto completo</label>
                <textarea required rows={4} value={form.resumo} onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))} />
              </div>
              <div className="af-field col-span-2">
                <label>Palavras de busca (separadas por vírgula)</label>
                <input value={palavrasTexto} onChange={(e) => setPalavrasTexto(e.target.value)} />
              </div>
              <div className="af-field col-span-2">
                <label>Passos recomendados — um por linha</label>
                <textarea rows={5} value={acoesTexto} onChange={(e) => setAcoesTexto(e.target.value)} />
              </div>
              <div className="af-field col-span-2">
                <label>Como comunicar à família</label>
                <textarea
                  rows={4}
                  value={form.mensagem_familia}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem_familia: e.target.value }))}
                />
              </div>
              <div className="af-field col-span-2">
                <label>Alerta ou restrição (opcional)</label>
                <textarea rows={2} value={form.atencao} onChange={(e) => setForm((f) => ({ ...f, atencao: e.target.value }))} />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "#52615d" }}>
                <input
                  type="checkbox"
                  checked={form.publicado}
                  onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked }))}
                  className="h-4 w-4"
                  style={{ accentColor: "var(--af-green)" }}
                />
                Publicar imediatamente para aparecer nas consultas
              </label>
              <div className="col-span-2 flex gap-3 items-center pt-1">
                <button type="submit" className="af-save-content" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar conteúdo"}
                </button>
                {editando && (
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="text-sm font-semibold cursor-pointer"
                    style={{ color: "var(--af-muted)" }}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="p-6" style={{ background: "#f5f4ee" }}>
            <h3 className="text-lg mb-1" style={{ fontFamily: "Georgia, serif" }}>
              Gestão de protocolos
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--af-muted)" }}>
              {protocolos.length} protocolos cadastrados.
            </p>
            <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {protocolos.map((p) => (
                <div key={p.id} className="af-item">
                  <div className="flex justify-between gap-2">
                    <strong className="text-[13px]">{p.titulo}</strong>
                    {!p.publicado && (
                      <span
                        className="text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 flex-shrink-0"
                        style={{ background: "var(--af-ink)", color: "#fff" }}
                      >
                        Rascunho
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] my-1.5" style={{ color: "var(--af-muted)" }}>
                    {p.categoria} · {p.area}
                  </p>
                  {confirmandoId === p.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: "var(--af-coral)" }}>Excluir?</span>
                      <button
                        onClick={() => handleRemover(p.id)}
                        disabled={removendoId === p.id}
                        className="font-bold cursor-pointer"
                        style={{ color: "var(--af-coral)" }}
                      >
                        {removendoId === p.id ? "..." : "Sim"}
                      </button>
                      <button onClick={() => setConfirmandoId(null)} className="cursor-pointer" style={{ color: "var(--af-muted)" }}>
                        Não
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditando(p)}
                        className="text-[10px] font-bold rounded-md border px-2 py-1 cursor-pointer"
                        style={{ borderColor: "#d7d7ce" }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmandoId(p.id)}
                        className="text-[10px] font-bold rounded-md border px-2 py-1 cursor-pointer"
                        style={{ borderColor: "#d7d7ce", color: "var(--af-coral)" }}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
