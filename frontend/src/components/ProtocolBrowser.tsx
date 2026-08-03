import { useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import ProtocolCard from "./ProtocolCard";
import { buscarProtocolos } from "../lib/protocoloSearch";
import type { Protocolo } from "../types";

const AREAS: Array<Protocolo["area"] | "Todos"> = ["Todos", "Pedagógico", "Administrativo", "Em comum"];
const SUGESTOES = ["mordida", "desfralde", "foto", "falta"];

interface ProtocolBrowserProps {
  protocolos: Protocolo[];
  loading: boolean;
  onSelect: (protocolo: Protocolo) => void;
  renderCardExtra?: (protocolo: Protocolo) => ReactNode;
}

function ProtocolCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-full bg-gray-100 rounded mb-1.5" />
      <div className="h-3 w-5/6 bg-gray-100 rounded" />
    </div>
  );
}

export default function ProtocolBrowser({ protocolos, loading, onSelect, renderCardExtra }: ProtocolBrowserProps) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<(typeof AREAS)[number]>("Todos");

  const buscando = query.trim().length > 0;
  const resultados = buscando
    ? buscarProtocolos(protocolos, query)
    : protocolos.filter((p) => area === "Todos" || p.area === area);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Descreva a situação... ex: "mordida", "desfralde", "foto"'
          aria-label="Buscar protocolo"
          className="w-full rounded-xl border border-gray-300 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!buscando && (
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrar por área">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              aria-pressed={area === a}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
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

      <p className="text-xs text-gray-400">
        {loading
          ? "Carregando..."
          : `${resultados.length} protocolo${resultados.length === 1 ? "" : "s"}${
              buscando ? ` para "${query.trim()}"` : ""
            }`}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProtocolCardSkeleton key={i} />
          ))}
        </div>
      ) : resultados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-3">
          <p className="text-gray-500">
            {buscando ? `Nenhum protocolo encontrado para "${query.trim()}".` : "Nenhum protocolo nesta área."}
          </p>
          {buscando && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Tente:</span>
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-600 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resultados.map((p) => (
            <div key={p.id} className="relative">
              <ProtocolCard protocolo={p} onClick={() => onSelect(p)} />
              {renderCardExtra?.(p)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
