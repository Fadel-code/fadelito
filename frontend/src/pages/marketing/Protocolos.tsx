import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, EyeOff } from "lucide-react";
import { useAuth } from "../../App";
import { useProtocolos, type ProtocoloInput } from "../../hooks/useProtocolos";
import { buscarProtocolos } from "../../lib/protocoloSearch";
import ProtocolCard from "../../components/ProtocolCard";
import ProtocolDetail from "../../components/ProtocolDetail";
import ProtocolForm from "../../components/ProtocolForm";
import { Button } from "../../components/ui/button";
import type { Protocolo } from "../../types";

const AREAS: Array<Protocolo["area"] | "Todos"> = ["Todos", "Pedagógico", "Administrativo", "Em comum"];

export default function Protocolos() {
  const { profile } = useAuth();
  const podeEditar = profile?.role === "marketing";
  const { protocolos, loading, carregar, criar, atualizar, remover } = useProtocolos();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<(typeof AREAS)[number]>("Todos");
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Protocolo | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resultados = query.trim()
    ? buscarProtocolos(protocolos, query)
    : protocolos.filter((p) => area === "Todos" || p.area === area);

  async function handleSalvar(input: ProtocoloInput) {
    return editando ? atualizar(editando.id, input) : criar(input);
  }

  async function handleRemover(id: string) {
    const ok = await remover(id);
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
              <Button size="sm" variant="destructive" onClick={() => handleRemover(selecionado.id)}>
                Sim, excluir
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmandoId(null)}>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, palavra-chave ou situação..."
          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {!query.trim() && (
        <div className="flex gap-2 flex-wrap">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                area === a
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Carregando protocolos...
        </div>
      ) : resultados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Nenhum protocolo encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resultados.map((p) => (
            <div key={p.id} className="relative">
              <ProtocolCard protocolo={p} onClick={() => setSelecionado(p)} />
              {!p.publicado && (
                <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-gray-800 text-white rounded-full px-2 py-0.5">
                  <EyeOff className="h-3 w-3" /> Rascunho
                </span>
              )}
            </div>
          ))}
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
