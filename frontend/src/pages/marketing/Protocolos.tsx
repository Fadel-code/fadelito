import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, EyeOff } from "lucide-react";
import { useAuth } from "../../App";
import { useProtocolos, type ProtocoloInput } from "../../hooks/useProtocolos";
import ProtocolBrowser from "../../components/ProtocolBrowser";
import ProtocolDetail from "../../components/ProtocolDetail";
import ProtocolForm from "../../components/ProtocolForm";
import { Button } from "../../components/ui/button";
import type { Protocolo } from "../../types";

export default function Protocolos() {
  const { profile } = useAuth();
  const podeEditar = profile?.role === "marketing";
  const { protocolos, loading, carregar, criar, atualizar, remover } = useProtocolos();
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Protocolo | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleSalvar(input: ProtocoloInput) {
    return editando ? atualizar(editando.id, input) : criar(input);
  }

  async function handleRemover(id: string) {
    setRemovendo(true);
    const ok = await remover(id);
    setRemovendo(false);
    if (ok) {
      setConfirmandoId(null);
      if (selecionado?.id === id) setSelecionado(null);
    }
  }

  if (selecionado) {
    return (
      <div className="max-w-3xl space-y-4">
        <ProtocolDetail protocolo={selecionado} onVoltar={() => setSelecionado(null)} />
        {podeEditar && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditando(selecionado); setFormAberto(true); }}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="destructive" onClick={() => setConfirmandoId(selecionado.id)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        )}
        {confirmandoId === selecionado.id && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-red-800">Excluir "{selecionado.titulo}" definitivamente?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => handleRemover(selecionado.id)} disabled={removendo}>
                {removendo ? "Excluindo..." : "Sim, excluir"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmandoId(null)} disabled={removendo}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
        <ProtocolForm
          open={formAberto}
          protocolo={editando}
          onClose={() => { setFormAberto(false); setEditando(null); }}
          onSalvar={handleSalvar}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Protocolos — Assistente Fadelito</h1>
          <p className="text-gray-500 text-sm mt-1">
            {podeEditar
              ? "Biblioteca de protocolos oficiais — crie, edite ou despublique."
              : "Biblioteca de protocolos oficiais (somente leitura)."}
          </p>
        </div>
        {podeEditar && (
          <Button onClick={() => { setEditando(null); setFormAberto(true); }}>
            <Plus className="h-4 w-4" /> Novo protocolo
          </Button>
        )}
      </div>

      <ProtocolBrowser
        protocolos={protocolos}
        loading={loading}
        onSelect={setSelecionado}
        renderCardExtra={(p) =>
          !p.publicado ? (
            <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-gray-800 text-white rounded-full px-2 py-0.5">
              <EyeOff className="h-3 w-3" /> Rascunho
            </span>
          ) : null
        }
      />

      <ProtocolForm
        open={formAberto}
        protocolo={editando}
        onClose={() => { setFormAberto(false); setEditando(null); }}
        onSalvar={handleSalvar}
      />
    </div>
  );
}
