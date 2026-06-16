# Fadelito — Sistema de Gestão de Visitas e Matrículas

Sistema web para gerenciamento de visitas e matrículas de uma rede de 35 escolas de educação infantil em São Paulo. Substitui planilhas Excel manuais com um painel em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Banco / Auth / Realtime | Supabase (PostgreSQL + RLS) |
| Gráficos | Recharts |
| Export Excel | SheetJS (xlsx) |
| Export PDF | jsPDF + jspdf-autotable |
| E-mail | Resend |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Resend](https://resend.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)
- Supabase CLI instalado: `npm install -g supabase`

---

## Instalação Local

```bash
# 1. Clone / entre na pasta do projeto
cd fadelito/frontend

# 2. Instale as dependências
npm install

# 3. Copie o arquivo de variáveis de ambiente
cp ../.env.example .env

# 4. Edite .env com suas credenciais Supabase e Resend
# (veja seção "Configuração Supabase" abaixo)

# 5. Rode o servidor de desenvolvimento
npm run dev
# → http://localhost:5173
```

---

## Configuração Supabase

### 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Aguarde a inicialização (1–2 min)
3. Em **Settings → API**, copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Rodar a migration

```bash
# Na raiz do projeto fadelito/
supabase link --project-ref <seu-project-ref>
supabase db push
```

Ou execute o conteúdo de `supabase/migrations/001_schema_inicial.sql` diretamente no **SQL Editor** do painel Supabase.

### 3. Verificar RLS

No painel Supabase → **Authentication → Policies**, confirme que as tabelas `profiles`, `registros` e `audit_log` têm as políticas ativas.

### 4. Criar usuários (Seed)

```bash
# Na pasta raiz do projeto
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node supabase/seed-users.js
```

Isso cria:
- 1 usuário marketing: `marketing@fadelito.com.br`
- 35 usuários de unidade: `<nome-unidade>@fadelito.com.br`
- Senha padrão de todos: `Fadelito2026!`

> **Importante:** Oriente os usuários a alterarem a senha no primeiro acesso.

### 5. Habilitar Realtime

No painel Supabase → **Database → Replication**, ative a tabela `registros` para Realtime.

### 6. Deploy da Edge Function (Alertas)

```bash
# Configure as variáveis de ambiente da função
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set MARKETING_EMAIL=marketing@fadelito.com.br
supabase secrets set FRONTEND_URL=https://fadelito.vercel.app

# Deploy da função
supabase functions deploy alerta-diario

# Configurar cron (no painel Supabase → Edge Functions → Schedules)
# Cron: 0 21 * * 1-5   (18h horário de Brasília = 21h UTC)
```

---

## Configuração Resend

1. Crie uma conta em [resend.com](https://resend.com)
2. Em **Domains**, adicione e verifique seu domínio (ex: `fadelito.com.br`)
3. Em **API Keys**, crie uma nova chave → `RESEND_API_KEY`
4. A função de alerta enviará e-mails de `noreply@fadelito.com.br`

---

## Deploy no Vercel

### 1. Importar projeto

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório Git (ou faça upload da pasta `frontend/`)
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 2. Variáveis de ambiente

Em **Settings → Environment Variables**, adicione:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Deploy

Clique em **Deploy**. O Vercel gera a URL de produção automaticamente.

> Atualize `FRONTEND_URL` nos secrets da Edge Function com a URL gerada.

---

## Perfis de Usuário

| Perfil | Acesso |
|---|---|
| **Unidade** | Apenas seus próprios dados · Edita somente o mês atual · Date picker só habilita dias úteis |
| **Marketing** | Acesso total · Dashboard consolidado · Gráficos · Ranking · Exportações · Audit log · Usuários |

---

## Funcionalidades Principais

- **Formulário diário**: preenchimento por turma (Berçário → Pré) com campos calculados em tempo real
- **Histórico mensal**: visão de grade fiel à planilha original
- **Dashboard em tempo real**: tabela consolidada com Supabase Realtime
- **Exportação Excel**: uma aba por mês, `Resultados_Fadelito_2026.xlsx`
- **Exportação PDF**: A4 paisagem com tabela consolidada
- **Gráficos**: ranking por matrículas, evolução anual, aproveitamento por unidade
- **Alerta diário**: e-mail automático às 18h com unidades que não preencheram
- **Audit log**: histórico completo de todas as alterações

---

## Estrutura do Projeto

```
fadelito/
├── frontend/              React + Vite
│   └── src/
│       ├── pages/         Login, Unidade, Marketing
│       ├── components/    TabelaConsolidada, FormularioTurmas, Modal, Gráficos
│       ├── hooks/         useRegistros, useConsolidado
│       ├── lib/           supabase, exportExcel, exportPdf, feriados, utils
│       └── types/         TypeScript types
├── supabase/
│   ├── migrations/        001_schema_inicial.sql
│   ├── functions/         alerta-diario (Edge Function)
│   └── seed-users.js      Script para criar os 36 usuários
├── .env.example
└── README.md
```

---

## Feriados Nacionais 2026

O sistema bloqueia automaticamente as seguintes datas no date picker e na Edge Function:

| Data | Feriado |
|---|---|
| 01/01 | Confraternização Universal |
| 20/04 | Paixão de Cristo |
| 21/04 | Tiradentes |
| 01/05 | Dia do Trabalho |
| 07/09 | Independência do Brasil |
| 12/10 | Nossa Senhora Aparecida |
| 02/11 | Finados |
| 15/11 | Proclamação da República |
| 25/12 | Natal |
