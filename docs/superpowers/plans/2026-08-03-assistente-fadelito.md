# Assistente Fadelito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o protótipo standalone `Assistente Fadelito/index.html` por uma feature integrada ao sistema de visitas (rotas React + tabela Supabase com RLS), fechando o buraco de autenticação da área "Administração" e criando uma fonte única de dados.

**Architecture:** Duas páginas React (`/unidade/assistente` somente leitura, `/marketing/protocolos` com CRUD) compartilhando um hook (`useProtocolos`) e componentes (`ProtocolCard`, `ProtocolDetail`) que leem/escrevem na tabela `public.protocolos` do Supabase. RLS decide quem pode gravar (`role = 'marketing'`); a UI só esconde os botões de escrita para os demais papéis como conveniência, não como a defesa real.

**Tech Stack:** React + TypeScript + Vite, Tailwind, Supabase (Postgres + RLS), `react-hot-toast`, `lucide-react`. Segue exatamente os padrões já usados em `useEventosLead.ts` / `Desfechos.tsx`.

## Global Constraints

- Todo o trabalho fica na branch `feature/assistente-fadelito` — **nunca** commitar direto em `main`, e não fazer push/PR até o usuário liberar (ele já disse: protótipo primeiro em localhost).
- Sem framework de testes automatizados neste projeto (nenhum `*.test.*` existe hoje) — a verificação de cada task é manual (`tsc --noEmit` + checar no navegador), igual ao restante do código. Isto já foi acordado no spec (`docs/superpowers/specs/2026-08-03-assistente-fadelito-design.md`, seção "Testes"); não é preciso reabrir essa decisão em cada task.
- Nomeação de campos em português, como o resto do schema (`registros`, `eventos_lead`).
- `supervisao` reaproveita a página de marketing em modo leitura — nunca crie uma terceira página para esse papel.
- Não tocar nos arquivos dentro de `Assistente Fadelito/` — ficam no repo até o usuário decidir removê-los, depois deste v1.

---

### Task 1: Migrations Supabase — tabela, RLS e seed

**Files:**
- Create: `supabase/migrations/015_protocolos.sql`
- Create: `supabase/migrations/016_protocolos_seed.sql`

**Interfaces:**
- Produces: tabela `public.protocolos` (colunas: `id uuid`, `titulo text`, `area text`, `categoria text`, `palavras_chave text[]`, `status text`, `resumo text`, `acoes text[]`, `mensagem_familia text`, `atencao text`, `publicado boolean`, `fonte text`, `created_at timestamptz`, `updated_at timestamptz`) — usada por todas as tasks seguintes via `supabase.from("protocolos")`.

- [ ] **Step 1: Criar a branch de trabalho**

```bash
git checkout main
git pull
git checkout -b feature/assistente-fadelito
```

- [ ] **Step 2: Escrever `supabase/migrations/015_protocolos.sql`**

```sql
-- Tabela protocolos: biblioteca de protocolos oficiais do Assistente Fadelito

CREATE TABLE public.protocolos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           text        NOT NULL,
  area             text        NOT NULL CHECK (area IN ('Pedagógico','Administrativo','Em comum')),
  categoria        text        NOT NULL,
  palavras_chave   text[]      NOT NULL DEFAULT '{}',
  status           text        NOT NULL CHECK (status IN ('validado','revisao')),
  resumo           text        NOT NULL,
  acoes            text[]      NOT NULL DEFAULT '{}',
  mensagem_familia text        NOT NULL DEFAULT '',
  atencao          text        NOT NULL DEFAULT '',
  publicado        boolean     NOT NULL DEFAULT true,
  fonte            text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_protocolos_area      ON public.protocolos(area);
CREATE INDEX idx_protocolos_categoria ON public.protocolos(categoria);
CREATE INDEX idx_protocolos_publicado ON public.protocolos(publicado);

CREATE TRIGGER trg_protocolos_updated_at
  BEFORE UPDATE ON public.protocolos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;

-- Leitura: publicados para todo mundo autenticado; marketing/supervisão veem tudo (inclusive rascunhos)
CREATE POLICY "protocolos_select"
  ON public.protocolos FOR SELECT TO authenticated
  USING (
    publicado = true
    OR get_my_role() IN ('marketing', 'supervisao')
  );

-- Escrita: só marketing
CREATE POLICY "protocolos_insert"
  ON public.protocolos FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'marketing');

CREATE POLICY "protocolos_update"
  ON public.protocolos FOR UPDATE TO authenticated
  USING (get_my_role() = 'marketing')
  WITH CHECK (get_my_role() = 'marketing');

CREATE POLICY "protocolos_delete"
  ON public.protocolos FOR DELETE TO authenticated
  USING (get_my_role() = 'marketing');
```

`handle_updated_at()` e `get_my_role()` já existem desde `001_schema_inicial.sql` — não precisam ser recriados.

- [ ] **Step 3: Escrever `supabase/migrations/016_protocolos_seed.sql`**

Conteúdo: os 42 `INSERT INTO public.protocolos (...)` gerados a partir de
`Assistente Fadelito/banco-de-dados/seed.sql`, já validados carregando o
seed original numa base SQLite em memória e reemitindo em sintaxe Postgres
(`text[]` no lugar de `keywords_json`/`actions_json`, `boolean` no lugar de
`published` inteiro). O arquivo gerado está em
`/tmp/claude-1001/-home-usuario-Downloads-rober-sistemas-visita/e1f595fe-29e9-4ff8-a524-2d04107b7190/scratchpad/protocolos_seed_generated.sql`
(635 linhas, 42 `INSERT`s confirmados) — copiar esse conteúdo integralmente
para `016_protocolos_seed.sql`.

- [ ] **Step 4: Aplicar as duas migrations no Supabase**

Estas duas migrations **não podem ser aplicadas por mim** — não há Supabase
CLI configurado neste projeto nem uma connection string de Postgres nas
variáveis de ambiente (só `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/
`VITE_SUPABASE_SERVICE_ROLE_KEY`, que não dão acesso a "rodar SQL cru").
Igual às migrations 001–014 deste projeto: cole o conteúdo de
`015_protocolos.sql` no SQL Editor do Supabase e rode; depois cole
`016_protocolos_seed.sql` e rode. **Não usar a aba Migrations do Supabase**
(gera conflito com policies existentes — regra já documentada no
`CLAUDE.md`).

- [ ] **Step 5: Verificar**

No SQL Editor do Supabase: `SELECT count(*) FROM public.protocolos;` deve
retornar `42`. `SELECT titulo, area, publicado FROM public.protocolos LIMIT 5;`
deve mostrar títulos em português com acentuação correta (confirma que o
`INSERT` não corrompeu UTF-8).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/015_protocolos.sql supabase/migrations/016_protocolos_seed.sql
git commit -m "feat: tabela protocolos com RLS e seed dos 42 protocolos oficiais"
```

---

### Task 2: Tipos TypeScript + lógica de busca

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/lib/protocoloSearch.ts`

**Interfaces:**
- Consumes: nenhuma (task independente de UI).
- Produces: `Protocolo` (tipo, em `types/index.ts`), `buscarProtocolos(protocolos: Protocolo[], query: string): Protocolo[]` (em `protocoloSearch.ts`) — usados por `useProtocolos` (Task 3) e pelas páginas (Tasks 5–6).

- [ ] **Step 1: Adicionar o tipo `Protocolo` em `frontend/src/types/index.ts`**

Adicionar ao final do arquivo:

```ts
// ============================================================
// Assistente Fadelito — biblioteca de protocolos
// ============================================================

export interface Protocolo {
  id: string;
  titulo: string;
  area: "Pedagógico" | "Administrativo" | "Em comum";
  categoria: string;
  palavras_chave: string[];
  status: "validado" | "revisao";
  resumo: string;
  acoes: string[];
  mensagem_familia: string;
  atencao: string;
  publicado: boolean;
  fonte: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Registrar a tabela em `frontend/src/lib/supabase.ts`**

```ts
import type { Profile, Registro, AuditLog, EventoLead, Protocolo } from "../types";
```

E dentro de `Database.public.Tables`, adicionar:

```ts
      protocolos: { Row: Protocolo };
```

- [ ] **Step 3: Criar `frontend/src/lib/protocoloSearch.ts`**

Porta da lógica de normalização/scoring do protótipo original
(`Assistente Fadelito/index.html`, funções `normalize`/`words`/`score`),
adaptada para os nomes de campo em português da nova tabela:

```ts
import type { Protocolo } from "../types";

const STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos",
  "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "que",
  "um", "uma",
]);

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function rootWord(word: string): string {
  return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}

export function words(value: string): string[] {
  const clean = normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
  if (!clean) return [];
  const output: string[] = [];
  for (const word of clean.split(/\s+/)) {
    if (STOP_WORDS.has(word)) continue;
    output.push(word);
    const root = rootWord(word);
    if (root !== word) output.push(root);
  }
  return [...new Set(output)];
}

function searchableText(p: Protocolo): string {
  return [p.titulo, p.area, p.categoria, ...p.palavras_chave, p.resumo, ...p.acoes, p.atencao, p.fonte]
    .filter(Boolean)
    .join(" ");
}

function oneEditAway(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diffs = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diffs > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return true;
}

export function score(p: Protocolo, query: string): number {
  const cleanQuery = normalize(query).replace(/[^a-z0-9\s]+/g, " ").trim();
  const queryWords = words(cleanQuery);
  const title = normalize(p.titulo);
  const titleWords = words(p.titulo);
  const keywordWords = words(p.palavras_chave.join(" "));
  const allWords = words(searchableText(p));

  let points = 0;
  let matchedTerms = 0;

  if (title === cleanQuery) points += 240;
  else if (cleanQuery.length > 2 && title.includes(cleanQuery)) points += 120;

  for (const term of queryWords) {
    let matched = false;
    if (titleWords.includes(term)) { points += 80; matched = true; }
    else if (titleWords.some((w) => w.startsWith(term) || term.startsWith(w))) { points += 48; matched = true; }
    if (keywordWords.includes(term)) { points += 70; matched = true; }
    else if (keywordWords.some((w) => w.startsWith(term) || term.startsWith(w))) { points += 42; matched = true; }
    if (allWords.includes(term)) { points += 26; matched = true; }
    else if (allWords.some((w) => w.startsWith(term) || term.startsWith(w))) { points += 14; matched = true; }
    else if (term.length >= 5 && allWords.some((w) => w.length >= 5 && term[0] === w[0] && oneEditAway(term, w))) {
      points += 8; matched = true;
    }
    if (matched) matchedTerms++;
  }

  if (queryWords.length >= 2 && matchedTerms < Math.ceil(queryWords.length / 2)) return 0;
  return points;
}

export function buscarProtocolos(protocolos: Protocolo[], query: string): Protocolo[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return protocolos
    .map((p) => ({ p, s: score(p, trimmed) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ p }) => p);
}
```

Nota: o protótipo original tinha uma função `communicationFor()` que gerava
uma mensagem padrão por regex quando `mensagem_familia` estava vazia. Não
foi portada porque todas as 42 linhas do seed já têm `mensagem_familia`
preenchida (é `NOT NULL DEFAULT ''`, e o form de edição da Task 6 vai
exigir preenchimento) — YAGNI enquanto não existir um protocolo publicado
sem mensagem.

- [ ] **Step 4: Checar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros novos relacionados a `Protocolo`, `protocoloSearch.ts`
ou `supabase.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/supabase.ts frontend/src/lib/protocoloSearch.ts
git commit -m "feat: tipo Protocolo e porte da lógica de busca do Assistente Fadelito"
```

---

### Task 3: Hook `useProtocolos`

**Files:**
- Create: `frontend/src/hooks/useProtocolos.ts`

**Interfaces:**
- Consumes: `Protocolo` (Task 2, `types/index.ts`), `supabase` client (`lib/supabase.ts`).
- Produces: `useProtocolos()` retornando `{ protocolos: Protocolo[], loading: boolean, carregar: () => Promise<void>, criar: (input: ProtocoloInput) => Promise<boolean>, atualizar: (id: string, input: Partial<ProtocoloInput>) => Promise<boolean>, remover: (id: string) => Promise<boolean> }` e o tipo exportado `ProtocoloInput = Omit<Protocolo, "id" | "created_at" | "updated_at">` — usado pelas páginas (Tasks 5–6) e por `ProtocolForm` (Task 6).

- [ ] **Step 1: Escrever o hook**

```ts
import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Protocolo } from "../types";
import toast from "react-hot-toast";

export type ProtocoloInput = Omit<Protocolo, "id" | "created_at" | "updated_at">;

export function useProtocolos() {
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("protocolos")
      .select("*")
      .order("titulo");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar protocolos");
    } else {
      setProtocolos(data ?? []);
    }
    setLoading(false);
  }, []);

  const criar = useCallback(
    async (input: ProtocoloInput): Promise<boolean> => {
      const { error } = await supabase.from("protocolos").insert(input);
      if (error) {
        console.error(error);
        toast.error("Erro ao criar protocolo");
        return false;
      }
      toast.success("Protocolo criado!");
      await carregar();
      return true;
    },
    [carregar]
  );

  const atualizar = useCallback(
    async (id: string, input: Partial<ProtocoloInput>): Promise<boolean> => {
      const { error } = await supabase.from("protocolos").update(input).eq("id", id);
      if (error) {
        console.error(error);
        toast.error("Erro ao salvar protocolo");
        return false;
      }
      toast.success("Protocolo atualizado!");
      await carregar();
      return true;
    },
    [carregar]
  );

  const remover = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from("protocolos").delete().eq("id", id);
      if (error) {
        console.error(error);
        toast.error("Erro ao excluir protocolo");
        return false;
      }
      toast.success("Protocolo excluído.");
      await carregar();
      return true;
    },
    [carregar]
  );

  return { protocolos, loading, carregar, criar, atualizar, remover };
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useProtocolos.ts
git commit -m "feat: hook useProtocolos (fetch + CRUD contra a tabela protocolos)"
```

---

### Task 4: Componentes compartilhados — `ProtocolCard` e `ProtocolDetail`

**Files:**
- Create: `frontend/src/components/ProtocolCard.tsx`
- Create: `frontend/src/components/ProtocolDetail.tsx`

**Interfaces:**
- Consumes: `Protocolo` (Task 2).
- Produces: `<ProtocolCard protocolo={Protocolo} onClick={() => void} />`, `<ProtocolDetail protocolo={Protocolo} onVoltar={() => void} />` — usados pelas duas páginas (Tasks 5–6).

- [ ] **Step 1: Criar `frontend/src/components/ProtocolCard.tsx`**

```tsx
import type { Protocolo } from "../types";

const AREA_BADGE: Record<Protocolo["area"], string> = {
  "Pedagógico": "bg-blue-100 text-blue-700",
  "Administrativo": "bg-red-100 text-red-700",
  "Em comum": "bg-yellow-100 text-yellow-700",
};

interface ProtocolCardProps {
  protocolo: Protocolo;
  onClick: () => void;
}

export default function ProtocolCard({ protocolo, onClick }: ProtocolCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all flex flex-col gap-2 w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {protocolo.categoria}
        </span>
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${AREA_BADGE[protocolo.area]}`}>
          {protocolo.area}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 leading-snug">{protocolo.titulo}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{protocolo.resumo}</p>
      <span className={`text-xs font-medium ${protocolo.status === "validado" ? "text-green-600" : "text-amber-600"}`}>
        {protocolo.status === "validado" ? "● Disponível" : "● Em revisão"}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Criar `frontend/src/components/ProtocolDetail.tsx`**

```tsx
import { useState } from "react";
import { ArrowLeft, AlertTriangle, Copy, Check } from "lucide-react";
import type { Protocolo } from "../types";

interface ProtocolDetailProps {
  protocolo: Protocolo;
  onVoltar: () => void;
}

export default function ProtocolDetail({ protocolo, onVoltar }: ProtocolDetailProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(protocolo.mensagem_familia);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // clipboard indisponível (ex: contexto não-seguro) — usuário seleciona e copia manualmente
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à biblioteca
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{protocolo.titulo}</h2>
        <p className="mt-2 text-gray-600">{protocolo.resumo}</p>
      </div>

      {protocolo.atencao && (
        <div className="flex gap-3 items-start px-6 py-4 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{protocolo.atencao}</p>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Roteiro de ações</h3>
        <ol className="space-y-2">
          {protocolo.acoes.map((acao, i) => (
            <li key={i} className="flex gap-3 items-start bg-gray-50 rounded-lg p-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 whitespace-pre-line">{acao}</p>
            </li>
          ))}
        </ol>
      </div>

      {protocolo.mensagem_familia && (
        <div className="mx-6 mb-6 p-4 rounded-xl border border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700">
              {protocolo.area === "Administrativo" ? "Comunicação interna sugerida" : "Como comunicar à família"}
            </h3>
            <button
              onClick={copiarMensagem}
              className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar mensagem"}
            </button>
          </div>
          <blockquote className="text-sm text-gray-700 whitespace-pre-line border-l-4 border-primary-300 pl-3">
            {protocolo.mensagem_familia}
          </blockquote>
        </div>
      )}

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        Fonte: {protocolo.fonte}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Checar tipos**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProtocolCard.tsx frontend/src/components/ProtocolDetail.tsx
git commit -m "feat: componentes ProtocolCard e ProtocolDetail"
```

---

### Task 5: Página da unidade (`/unidade/assistente`) — busca somente leitura

**Files:**
- Create: `frontend/src/pages/unidade/Assistente.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `useProtocolos` (Task 3), `buscarProtocolos` (Task 2), `ProtocolCard`/`ProtocolDetail` (Task 4).
- Produces: rota `/unidade/assistente` navegável a partir do menu lateral.

- [ ] **Step 1: Criar `frontend/src/pages/unidade/Assistente.tsx`**

```tsx
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
```

- [ ] **Step 2: Adicionar a rota em `frontend/src/App.tsx`**

Adicionar o import lazy junto aos demais de `/unidade` (perto da linha 20):

```ts
const Assistente = lazy(() => import("./pages/unidade/Assistente"));
```

E a rota dentro do bloco `/unidade` (depois de `desfechos`, antes do `index`):

```tsx
          <Route path="assistente" element={<Assistente />} />
```

- [ ] **Step 3: Adicionar o item de menu em `frontend/src/components/Layout.tsx`**

Adicionar `BookOpen` ao import de `lucide-react` (linha 3-18) e o item em
`NAV_UNIDADE`:

```ts
const NAV_UNIDADE: NavItem[] = [
  { to: "/unidade/formulario", label: "Formulário Diário", icon: ClipboardList },
  { to: "/unidade/desfechos", label: "Desfecho das Visitas", icon: CalendarCheck },
  { to: "/unidade/historico", label: "Histórico Mensal", icon: History },
  { to: "/unidade/assistente", label: "Assistente Fadelito", icon: BookOpen },
];
```

- [ ] **Step 4: Verificação manual**

```bash
cd frontend && npm run dev
```

Logar como usuário `role=unidade`. Confirmar:
1. "Assistente Fadelito" aparece no menu lateral.
2. A página carrega os 42 protocolos (filtro "Todos" mostra 42 cards).
3. Buscar "mordida" — o topo do resultado deve ser "Protocolo de mordida"
   (valida `buscarProtocolos`/`score` contra dados reais).
4. Buscar algo sem sentido (ex: "xpto123") — mostra o estado vazio, sem
   erro no console.
5. Clicar num card abre o detalhe com roteiro de ações e mensagem para a
   família; "Voltar à biblioteca" retorna à lista.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/unidade/Assistente.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: página /unidade/assistente — busca de protocolos somente leitura"
```

---

### Task 6: Página de marketing (`/marketing/protocolos`) — CRUD completo

**Files:**
- Create: `frontend/src/components/ProtocolForm.tsx`
- Create: `frontend/src/pages/marketing/Protocolos.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `useProtocolos`/`ProtocoloInput` (Task 3), `buscarProtocolos` (Task 2), `ProtocolCard`/`ProtocolDetail` (Task 4), `useAuth` (`App.tsx`).
- Produces: rota `/marketing/protocolos`, navegável a partir do menu lateral de marketing (e usada por `supervisao` em modo leitura).

- [ ] **Step 1: Criar `frontend/src/components/ProtocolForm.tsx`**

```tsx
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
```

- [ ] **Step 2: Criar `frontend/src/pages/marketing/Protocolos.tsx`**

```tsx
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
```

- [ ] **Step 3: Adicionar a rota em `frontend/src/App.tsx`**

Import lazy junto aos demais de `/marketing`:

```ts
const Protocolos = lazy(() => import("./pages/marketing/Protocolos"));
```

Rota dentro do bloco `/marketing` (depois de `observacoes`, antes do `desfechos`
ou em qualquer posição — ordem não importa):

```tsx
          <Route path="protocolos" element={<Protocolos />} />
```

- [ ] **Step 4: Adicionar o item de menu em `frontend/src/components/Layout.tsx`**

Em `NAV_MARKETING`:

```ts
const NAV_MARKETING: NavItem[] = [
  { to: "/marketing/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketing/desfechos", label: "Desfechos", icon: CalendarCheck },
  { to: "/marketing/graficos", label: "Gráficos", icon: BarChart2 },
  { to: "/marketing/ranking", label: "Ranking", icon: Trophy },
  { to: "/marketing/usuarios", label: "Usuários", icon: Users },
  { to: "/marketing/audit", label: "Audit Log", icon: FileText },
  { to: "/marketing/observacoes", label: "Observações", icon: MessageSquare },
  { to: "/marketing/protocolos", label: "Protocolos", icon: BookOpen },
];
```

(`BookOpen` já foi importado na Task 5, Step 3 — não duplicar o import.)

- [ ] **Step 5: Verificação manual — três papéis**

```bash
cd frontend && npm run dev
```

1. Logar como `role=marketing`: "Protocolos" aparece no menu; abrir,
   criar um protocolo de teste (ex: título "Teste QA"), confirmar que
   aparece na lista; editá-lo (mudar o resumo); excluí-lo; confirmar que
   some da lista.
2. Logar como `role=supervisao`: acessar `/marketing/protocolos` — deve
   ver a mesma biblioteca, mas **sem** o botão "Novo protocolo" e sem
   botões de editar/excluir ao abrir um protocolo.
3. Confirmar no Supabase (Table Editor) que um rascunho (`publicado=false`)
   criado pelo marketing **não aparece** na página `/unidade/assistente`
   quando logado como `unidade` — valida a RLS de leitura na prática, não
   só no papel.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ProtocolForm.tsx frontend/src/pages/marketing/Protocolos.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: página /marketing/protocolos — CRUD de protocolos (marketing edita, supervisão só lê)"
```

---

## Spec Coverage Check

- Área "Administração" sem autenticação → resolvido por RLS (`protocolos_insert/update/delete` exigem `role=marketing`) — Task 1.
- Dados presos em `localStorage` / sem fonte única → tabela `protocolos` no Supabase é a única fonte — Tasks 1–3.
- Conteúdo duplicado em 4 arquivos → seed único gerado a partir do `seed.sql` original, tabela vira a fonte de verdade — Task 1.
- Stack incompatível (SQLite/D1 + HTML vanilla) → portado para Postgres/RLS + React/Tailwind — todas as tasks.
- Lógica de busca reaproveitável → portada em `protocoloSearch.ts` — Task 2.
- Unidade só lê, marketing edita, supervisão reaproveita a tela de marketing em modo leitura → Tasks 5–6.
- Fora de escopo (explicitamente, conforme o spec): analytics de busca, histórico de versões, import/export — nenhuma task cobre isso, intencional.
