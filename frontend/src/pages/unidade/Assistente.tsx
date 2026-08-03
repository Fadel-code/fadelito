import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useProtocolos } from "../../hooks/useProtocolos";
import { buscarProtocolos } from "../../lib/protocoloSearch";
import ProtocolCard from "../../components/ProtocolCard";
import ProtocolDetail from "../../components/ProtocolDetail";
import type { Protocolo } from "../../types";

const AREAS: Array<Protocolo["area"] | "Todos"> = ["Todos", "Pedagógico", "Administrativo", "Em comum"];

export default function Assistente() {
  const { protocolos, loading, carregar } = useProtocolos();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<(typeof AREAS)[number]>("Todos");
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resultados = query.trim()
    ? buscarProtocolos(protocolos, query)
    : protocolos.filter((p) => area === "Todos" || p.area === area);

  if (selecionado) {
    return (
      <div className="max-w-3xl">
        <ProtocolDetail protocolo={selecionado} onVoltar={() => setSelecionado(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assistente Fadelito</h1>
        <p className="text-gray-500 text-sm mt-1">
          Busque um protocolo pela situação — ex: "mordida", "desfralde", "foto".
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Descreva a situação..."
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
          Nenhum protocolo encontrado para essa busca.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resultados.map((p) => (
            <ProtocolCard key={p.id} protocolo={p} onClick={() => setSelecionado(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
