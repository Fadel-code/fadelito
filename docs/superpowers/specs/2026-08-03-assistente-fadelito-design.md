# Assistente Fadelito — integração ao sistema de visitas

## Contexto

A pasta `Assistente Fadelito/` (raiz do repo) contém um protótipo feito via
"vibe coding" pelo CEO: um `index.html` estático (~960 linhas, vanilla
JS/CSS, sem build) com uma biblioteca de 42 protocolos oficiais da rede,
busca por palavra-chave e uma área "Administração" para editar o conteúdo.
Vem acompanhado de `schema.sql`/`seed.sql` (SQLite/D1) e um JSON/CSV com os
mesmos dados — nenhum desses arquivos está conectado ao HTML.

Problemas identificados nesse protótipo:

1. **Área "Administração" sem autenticação** — qualquer pessoa que abra a
   página edita/apaga qualquer protocolo, incluindo os de proteção infantil,
   medicação e RH. O próprio app expõe isso na tela
   ("Modo de demonstração: não há login real nesta versão").
2. **Persistência em `localStorage`** — cada edição fica presa no navegador
   de quem editou; não sincroniza entre unidades nem sobrevive a limpar o
   cache. Não existe fonte única da verdade.
3. **Conteúdo duplicado em 4 lugares** (JS inline, JSON, seed.sql, CSV) sem
   nenhum vínculo entre eles — já há divergência visível (2 protocolos
   catalogados pelo próprio autor como "fonte inconsistente": título e
   conteúdo não batem).
4. **Stack incompatível** — `schema.sql`/`seed.sql` são para SQLite/
   Cloudflare D1, não Postgres/Supabase. O front é HTML/CSS/JS vanilla,
   desconectado do stack React/Vite/Tailwind/Supabase do sistema de visitas.

Ponto positivo a preservar: a lógica de busca (normalização, radicais
simples, scoring por termo) é razoavelmente boa e escapa HTML corretamente
(`esc()`) em toda a renderização — vale portar, não descartar.

## Objetivo

Substituir o protótipo standalone por uma feature integrada ao sistema de
visitas (React + Supabase), reaproveitando a autenticação e os papéis
(`unidade`, `marketing`, `supervisao`) que já existem — o que fecha o
buraco de autenticação "de graça" — e criando uma fonte única de dados no
Postgres do Supabase no lugar dos 4 arquivos soltos.

Fora do escopo deste v1 (evitar inchar o protótipo):
- Analytics de quais protocolos são mais buscados (existia via
  `localStorage` no original).
- Histórico de versões / quem editou o quê (além do `updated_at` padrão).
- Import/export de JSON/CSV — os arquivos originais servem só para
  popular o seed uma vez.

## Arquitetura

Duas páginas React compartilhando os mesmos componentes de busca:

- `frontend/src/pages/unidade/Assistente.tsx` — busca/consulta, somente
  leitura. Adicionado ao `NAV_UNIDADE` em `Layout.tsx`, ao lado de
  "Formulário Diário" e "Desfecho das Visitas".
- `frontend/src/pages/marketing/Protocolos.tsx` — mesma busca/consulta,
  mais criar/editar/despublicar/excluir. Adicionado ao `NAV_MARKETING`.
  `supervisao` acessa a mesma página, mas em modo leitura (mesmo padrão já
  usado nas outras rotas de marketing: RLS decide o que cada role pode
  gravar, a UI só habilita os botões de escrita quando `profile.role ===
  "marketing"`).

Peças compartilhadas:
- `frontend/src/hooks/useProtocolos.ts` — fetch de `protocolos` do
  Supabase + funções `create`/`update`/`remove` (só chamadas pela página de
  marketing).
- `frontend/src/lib/protocoloSearch.ts` — porta da lógica de normalização/
  scoring do `index.html` original (função `score`, `normalize`, `words`),
  em TypeScript, operando sobre os registros vindos do Supabase em vez do
  array hardcoded.
- Componentes `ProtocolCard`/`ProtocolDetail` (dentro de
  `frontend/src/components/`) reaproveitados pelas duas páginas — a página
  de marketing os envolve com controles de edição.

## Modelo de dados (Supabase)

Nova migration `supabase/migrations/015_protocolos.sql` (próximo número
livre; a última aplicada é `014_libera_mes_anterior_ate_dia5.sql`):

```sql
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

CREATE POLICY "protocolos_select"
  ON public.protocolos FOR SELECT TO authenticated
  USING (
    publicado = true
    OR get_my_role() IN ('marketing', 'supervisao')
  );

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

Segue o padrão já usado em `007_eventos_lead.sql` (trigger
`handle_updated_at`, função `get_my_role()`, policies por role).

Seed: migration separada `016_protocolos_seed.sql` com os 42 `INSERT`
convertidos do `seed.sql` do protótipo — troca de `id` texto fixo por
`gen_random_uuid()`, e de `keywords_json`/`actions_json` (string JSON) para
`text[]` nativo. Roda uma vez, colada no SQL Editor do Supabase, como as
demais migrations do projeto.

Tipo TypeScript em `frontend/src/types/index.ts`:

```ts
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

## Fluxo de dados

1. `useProtocolos` faz `supabase.from("protocolos").select("*")` no mount
   de cada página. RLS já filtra o que cada role pode ver — a página não
   precisa reimplementar essa checagem.
2. Busca/filtro por área/categoria acontece client-side sobre os dados já
   carregados (42 registros — não justifica busca full-text no Postgres
   neste volume).
3. Marketing edita → `update`/`insert`/`remove` do hook chamam Supabase
   diretamente; RLS rejeita a escrita se o usuário não for `marketing`
   (defesa em profundidade — a UI também esconde os botões, mas quem
   protege de verdade é a policy).

## Tratamento de erro

- Falha ao carregar protocolos: mostrar estado vazio com opção de retry
  (mesmo padrão dos demais hooks do projeto, ex. `useRegistros`).
- Falha ao salvar/excluir (RLS ou rede): `react-hot-toast` com mensagem de
  erro, sem otimismo de UI (só atualiza a lista após confirmação do
  Supabase) — evita mostrar um protocolo "salvo" que na verdade foi
  rejeitado pela policy.

## Testes

Sem suíte de testes automatizados no projeto atualmente (nenhum `*.test.*`
no frontend) — este v1 segue o mesmo padrão. Verificação manual: rodar em
localhost, logar como `unidade` (confirmar só leitura) e como `marketing`
(confirmar CRUD completo e que `supervisao` não consegue gravar mesmo
acessando a mesma tela).

## Deploy

Todo o trabalho deste v1 fica em `localhost` (branch de trabalho, sem push
para `main`) até liberação explícita do usuário. Nenhuma alteração na pasta
`Assistente Fadelito/` original — ela pode ser removida do repo depois que
a migração for validada, mas isso é uma decisão separada, fora deste v1.
