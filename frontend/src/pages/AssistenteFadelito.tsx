import { useEffect, useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "../App";
import { useProtocolos } from "../hooks/useProtocolos";
import { buscarProtocolos } from "../lib/protocoloSearch";
import AssistenteCard from "../components/assistente/AssistenteCard";
import AssistenteDetail from "../components/assistente/AssistenteDetail";
import AdminPanel from "../components/assistente/AdminPanel";
import type { Protocolo } from "../types";
import "./assistente-fadelito.css";

const AREAS: Array<Protocolo["area"] | "Todos"> = ["Todos", "Pedagógico", "Administrativo", "Em comum"];
const CATEGORIAS: string[] = [
  "Todos",
  "Saúde e segurança",
  "Família e acolhimento",
  "Rotina pedagógica",
  "Cuidado e convivência",
  "Proteção e conduta",
  "Desenvolvimento infantil",
  "Comunicação e privacidade",
  "Gestão da unidade",
];
const SUGESTOES = [
  "Uma criança mordeu outra. O que fazemos?",
  "Como iniciar o desfralde?",
  "Como organizar uma manutenção na unidade?",
  "Como agir em uma emergência?",
];

export default function AssistenteFadelito() {
  const { profile } = useAuth();
  const podeEditar = profile?.role === "marketing";
  const { protocolos, loading, carregar, criar, atualizar, remover } = useProtocolos();

  const [pergunta, setPergunta] = useState("");
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [semResultado, setSemResultado] = useState(false);
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null);
  const [activeArea, setActiveArea] = useState<(typeof AREAS)[number]>("Todos");
  const [activeCategoria, setActiveCategoria] = useState("Todos");
  const [adminAberto, setAdminAberto] = useState(false);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function consultar(texto: string) {
    const termo = texto.trim();
    if (!termo) return;
    const [top] = buscarProtocolos(protocolos, termo);
    setBuscaFeita(true);
    setSemResultado(!top);
    setSelecionado(top ?? null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    consultar(pergunta);
  }

  function usarSugestao(sugestao: string) {
    setPergunta(sugestao);
    consultar(sugestao);
  }

  function voltarBiblioteca() {
    setSelecionado(null);
    setBuscaFeita(false);
    setSemResultado(false);
    setPergunta("");
  }

  function abrirProtocolo(p: Protocolo) {
    setSelecionado(p);
    setBuscaFeita(false);
    setSemResultado(false);
  }

  const visiveis = protocolos.filter((p) => p.publicado !== false);
  const itensFiltrados = visiveis.filter(
    (p) => (activeArea === "Todos" || p.area === activeArea) && (activeCategoria === "Todos" || p.categoria === activeCategoria)
  );
  const mostrarResultado = selecionado !== null || (buscaFeita && semResultado);

  return (
    <div className="assistente-fadelito space-y-6">
      <div
        className="flex items-start gap-2.5 rounded-[14px] border px-4 py-3"
        style={{ borderColor: "var(--af-line)", background: "var(--af-brand-soft)" }}
      >
        <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "var(--af-brand)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--af-muted)" }}>
          <span className="font-bold" style={{ color: "var(--af-brand-deep)" }}>
            O que é o Assistente Fadelito?
          </span>{" "}
          É a biblioteca de protocolos oficiais da rede: descreva a situação (mordida, desfralde, emergência etc.) e
          receba na hora a orientação correta, sem precisar procurar em pastas ou grupos.
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistente Fadelito</h1>
          <p className="text-gray-500 text-sm mt-1">
            {podeEditar
              ? "Biblioteca de protocolos oficiais: crie, edite ou despublique."
              : "Descreva a situação e consulte o protocolo oficial."}
          </p>
        </div>
        {podeEditar && (
          <button className="af-admin-open" onClick={() => setAdminAberto(true)}>
            Administração
          </button>
        )}
      </div>

      <section className="af-hero">
        <span className="af-eyebrow">Consulta orientada</span>
        <h2 className="af-hero-title">Como podemos agir nesta situação?</h2>
        <p className="af-intro">Descreva o que aconteceu. A resposta será baseada nos protocolos oficiais da Rede Fadelito.</p>
        <form className="af-search-card" onSubmit={handleSubmit}>
          <label htmlFor="af-question" className="sr-only">
            Descreva a situação
          </label>
          <div className="af-search-row">
            <input
              id="af-question"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Ex.: Uma criança mordeu outra durante a brincadeira. O que devo fazer?"
            />
            <button type="submit">Consultar →</button>
          </div>
        </form>
        <div className="af-suggestions">
          <span>Experimente:</span>
          {SUGESTOES.map((s) => (
            <button key={s} type="button" onClick={() => usarSugestao(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="af-hero-stats">
          <span>
            <b>{visiveis.filter((p) => p.area === "Pedagógico").length}</b> fontes pedagógicas
          </span>
          <span>
            <b>{visiveis.filter((p) => p.area === "Administrativo").length}</b> fontes administrativas
          </span>
          <span>
            <b>{visiveis.filter((p) => p.area === "Em comum").length}</b> fontes em comum
          </span>
          <span>Conteúdo interno com indicação de revisão</span>
        </div>
      </section>

      {mostrarResultado ? (
        selecionado ? (
          <AssistenteDetail protocolo={selecionado} onVoltar={voltarBiblioteca} />
        ) : (
          <div className="af-answer p-8 text-center">
            <p style={{ color: "var(--af-muted)" }}>
              Não encontrei um protocolo específico para "{pergunta.trim()}". Tente uma palavra central, como "câmera",
              "mordida", "desfralde" ou "falta".
            </p>
            <div className="af-suggestions-light">
              <span>Experimente:</span>
              {SUGESTOES.map((s) => (
                <button key={s} type="button" onClick={() => usarSugestao(s)}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={voltarBiblioteca} className="af-admin-open mt-4">
              Voltar aos protocolos
            </button>
          </div>
        )
      ) : (
        <div className="grid md:grid-cols-[220px_1fr] gap-5">
          <aside className="space-y-4">
            <div>
              <div
                className="flex items-center justify-between px-1 mb-2 text-[10px] font-black uppercase tracking-wide"
                style={{ color: "var(--af-muted)" }}
              >
                <span>Áreas dos protocolos</span>
                <span>{visiveis.length}</span>
              </div>
              <div className="af-area-list grid gap-1.5">
                {AREAS.map((a) => (
                  <button
                    key={a}
                    data-area={a}
                    className={activeArea === a ? "active" : ""}
                    aria-pressed={activeArea === a}
                    onClick={() => {
                      setActiveArea(a);
                      setActiveCategoria("Todos");
                    }}
                  >
                    <strong>{a}</strong>
                    <small>{a === "Todos" ? visiveis.length : visiveis.filter((p) => p.area === a).length}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="af-category-nav grid gap-1">
              {CATEGORIAS.map((c) => {
                const n =
                  c === "Todos"
                    ? visiveis.filter((p) => activeArea === "Todos" || p.area === activeArea).length
                    : visiveis.filter((p) => (activeArea === "Todos" || p.area === activeArea) && p.categoria === c).length;
                return (
                  <button
                    key={c}
                    className={activeCategoria === c ? "active" : ""}
                    aria-pressed={activeCategoria === c}
                    onClick={() => setActiveCategoria(c)}
                  >
                    <span>{c}</span>
                    <small>{n}</small>
                  </button>
                );
              })}
            </div>
            <div className="af-privacy">
              <p>Não informe nomes, telefones, diagnósticos ou outros dados pessoais de crianças e famílias.</p>
            </div>
          </aside>

          <div>
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true" aria-label="Carregando protocolos">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="af-card-skeleton">
                    <div className="af-skeleton-line" style={{ height: 10, width: "40%", marginBottom: 14 }} />
                    <div className="af-skeleton-line" style={{ height: 14, width: "80%", marginBottom: 10 }} />
                    <div className="af-skeleton-line" style={{ height: 10, width: "100%", marginBottom: 6 }} />
                    <div className="af-skeleton-line" style={{ height: 10, width: "90%" }} />
                  </div>
                ))}
              </div>
            ) : itensFiltrados.length === 0 ? (
              <div className="af-answer p-10 text-center" style={{ color: "var(--af-muted)" }}>
                Nenhum protocolo nesta seleção.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {itensFiltrados.map((p) => (
                  <AssistenteCard key={p.id} protocolo={p} onClick={() => abrirProtocolo(p)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {podeEditar && (
        <AdminPanel
          open={adminAberto}
          onClose={() => setAdminAberto(false)}
          protocolos={protocolos}
          criar={criar}
          atualizar={atualizar}
          remover={remover}
        />
      )}
    </div>
  );
}
