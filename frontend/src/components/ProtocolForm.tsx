import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import type { Protocolo } from "../types";
import type { ProtocoloInput } from "../hooks/useProtocolos";

interface ProtocolFormProps {
  open: boolean;
  protocolo: Protocolo | null; // null = criando novo
  onClose: () => void;
  onSalvar: (input: ProtocoloInput) => Promise<boolean>;
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

export default function ProtocolForm({ open, protocolo, onClose, onSalvar }: ProtocolFormProps) {
  const [form, setForm] = useState<ProtocoloInput>(vazio());
  const [acoesTexto, setAcoesTexto] = useState("");
  const [palavrasTexto, setPalavrasTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (protocolo) {
      const { id, created_at, updated_at, ...rest } = protocolo;
      void id; void created_at; void updated_at;
      setForm(rest);
      setAcoesTexto(protocolo.acoes.join("\n"));
      setPalavrasTexto(protocolo.palavras_chave.join(", "));
    } else {
      setForm(vazio());
      setAcoesTexto("");
      setPalavrasTexto("");
    }
  }, [protocolo, open]);

  async function handleSalvar() {
    setSalvando(true);
    const ok = await onSalvar({
      ...form,
      acoes: acoesTexto.split("\n").map((l) => l.trim()).filter(Boolean),
      palavras_chave: palavrasTexto.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setSalvando(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{protocolo ? "Editar protocolo" : "Novo protocolo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Área</Label>
              <select
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value as Protocolo["area"] }))}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Palavras-chave (separadas por vírgula)</Label>
            <Input value={palavrasTexto} onChange={(e) => setPalavrasTexto(e.target.value)} />
          </div>
          <div>
            <Label>Resumo</Label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm resize-none"
              rows={3}
              value={form.resumo}
              onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
            />
          </div>
          <div>
            <Label>Ações (uma por linha)</Label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm resize-none"
              rows={5}
              value={acoesTexto}
              onChange={(e) => setAcoesTexto(e.target.value)}
            />
          </div>
          <div>
            <Label>Mensagem para a família</Label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm resize-none"
              rows={3}
              value={form.mensagem_familia}
              onChange={(e) => setForm((f) => ({ ...f, mensagem_familia: e.target.value }))}
            />
          </div>
          <div>
            <Label>Atenção (opcional)</Label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm resize-none"
              rows={2}
              value={form.atencao}
              onChange={(e) => setForm((f) => ({ ...f, atencao: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label>Status</Label>
              <select
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Protocolo["status"] }))}
              >
                <option value="validado">Validado</option>
                <option value="revisao">Em revisão</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="publicado"
                checked={form.publicado}
                onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked }))}
              />
              <Label htmlFor="publicado">Publicado (visível às unidades)</Label>
            </div>
          </div>
          <div>
            <Label>Fonte (documento original)</Label>
            <Input value={form.fonte} onChange={(e) => setForm((f) => ({ ...f, fonte: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSalvar} disabled={!form.titulo.trim() || !form.resumo.trim() || salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
