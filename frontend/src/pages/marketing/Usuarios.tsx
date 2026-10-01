import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { UserPlus, RefreshCw, KeyRound, Eye, EyeOff, Lock, Search, X } from "lucide-react";
import { useAuth } from "../../App";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types";
import { UNIDADES } from "../../types";
import { formatarData } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import Segmentado from "../../components/ui/segmentado";
import { ROTULO, CARD_DESTAQUE } from "../../components/ui/estilos";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import toast from "react-hot-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

const ROLE_LABEL: Record<string, string> = {
  marketing: "Marketing",
  supervisao: "Supervisão",
};

async function adminUpdatePassword(userId: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await res.text());
}

const COLUNAS = "lg:grid-cols-[11rem_minmax(0,1fr)_9.5rem_5.5rem_6.5rem_auto]";
const ACAO_PERIGO = "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800";

interface LinhaProps {
  u: Profile;
  gestor?: boolean;
  senhaVisivel: boolean;
  onSenha: () => void;
  onRedefinir: () => void;
  onEmail: () => void;
  onAtivo: () => void;
}

function LinhaUsuario({ u, gestor, senhaVisivel, onSenha, onRedefinir, onEmail, onAtivo }: LinhaProps) {
  const nome = gestor ? ROLE_LABEL[u.role] ?? u.role : u.unidade_nome;
  return (
    <li className={`grid gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-gray-50/70 sm:px-6 lg:items-center ${COLUNAS}`}>
      <div className="flex items-center justify-between gap-3 lg:contents">
        <span className="font-semibold text-gray-900 lg:col-start-1 lg:row-start-1 lg:font-medium">{nome}</span>
        <Badge variant={u.ativo ? "success" : "destructive"} className="lg:col-start-4 lg:row-start-1 lg:justify-self-start">
          {u.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      <p className="truncate text-sm text-gray-700 lg:col-start-2 lg:row-start-1">{u.email}</p>
      <div className="flex items-center gap-1.5 lg:col-start-3 lg:row-start-1">
        {u.senha_temp ? (
          <>
            <span className="font-mono text-xs text-gray-800">{senhaVisivel ? u.senha_temp : "••••••••"}</span>
            <button
              type="button"
              onClick={onSenha}
              aria-label={senhaVisivel ? "Ocultar senha" : "Revelar senha"}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {senhaVisivel ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-600">Sem senha salva</span>
        )}
      </div>
      <span className="text-xs text-gray-600 lg:col-start-5 lg:row-start-1">
        <span className="lg:hidden">Criado em </span>
        {formatarData(u.created_at.slice(0, 10))}
      </span>
      <div className="flex flex-wrap gap-2 lg:col-start-6 lg:row-start-1 lg:justify-end">
        <Button variant="outline" size="sm" onClick={onRedefinir}>
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Redefinir
        </Button>
        <Button variant="outline" size="sm" onClick={onEmail} title="Enviar e-mail de redefinição">
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          E-mail
        </Button>
        <Button variant="outline" size="sm" className={u.ativo ? ACAO_PERIGO : ""} onClick={onAtivo}>
          {u.ativo ? "Desativar" : "Reativar"}
        </Button>
      </div>
    </li>
  );
}

function CabecalhoLista({ primeira }: { primeira: string }) {
  return (
    <div className={`hidden items-center gap-x-4 border-y border-gray-100 bg-gray-50 px-6 py-2 text-xs font-semibold text-gray-700 lg:grid ${COLUNAS}`} aria-hidden>
      <span>{primeira}</span><span>E-mail</span><span>Senha</span><span>Status</span><span>Criado em</span><span className="text-right">Ações</span>
    </div>
  );
}

export default function Usuarios() {
  const { profile } = useAuth();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [gestores, setGestores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | "ativos" | "inativos">("todos");

  // Visibilidade de senhas (por ID de usuário)
  const [senhasVisiveis, setSenhasVisiveis] = useState<Set<string>>(new Set());

  // Modal criar
  const [modalCriar, setModalCriar] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [criando, setCriando] = useState(false);

  // Modal redefinir senha
  const [modalSenha, setModalSenha] = useState<Profile | null>(null);
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");
  const [redefinindo, setRedefinindo] = useState(false);

  async function carregarUsuarios() {
    setLoading(true);
    const [{ data: unidades, error }, { data: gest }] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "unidade").order("unidade_nome"),
      supabase.from("profiles").select("*").in("role", ["marketing", "supervisao"]).order("email"),
    ]);
    if (error) toast.error("Erro ao carregar usuários.");
    setUsuarios(unidades ?? []);
    setGestores(gest ?? []);
    setLoading(false);
  }

  useEffect(() => { carregarUsuarios(); }, []);

  function toggleSenha(id: string) {
    setSenhasVisiveis(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function toggleAtivo(u: Profile) {
    const { error } = await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) { toast.error("Erro ao alterar status."); return; }
    toast.success(`Usuário ${u.ativo ? "desativado" : "ativado"}.`);
    carregarUsuarios();
  }

  async function resetarSenhaEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) { toast.error("Erro ao enviar e-mail de redefinição."); return; }
    toast.success(`E-mail de redefinição enviado para ${email}`);
  }

  async function redefinirSenha() {
    if (!modalSenha) return;
    if (novaSenhaAdmin.length < 8) { toast.error("Senha deve ter pelo menos 8 caracteres."); return; }
    setRedefinindo(true);
    try {
      await adminUpdatePassword(modalSenha.id, novaSenhaAdmin);
      await supabase.from("profiles").update({ senha_temp: novaSenhaAdmin }).eq("id", modalSenha.id);
      toast.success(`Senha de ${modalSenha.unidade_nome ?? modalSenha.email} redefinida!`);
      setModalSenha(null);
      setNovaSenhaAdmin("");
      carregarUsuarios();
    } catch {
      toast.error("Erro ao redefinir senha.");
    } finally {
      setRedefinindo(false);
    }
  }

  async function criarUsuario() {
    if (!novoNome || !novoEmail || !novaSenha) { toast.error("Preencha todos os campos."); return; }
    if (novaSenha.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    setCriando(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: novoEmail.trim(),
        password: novaSenha,
        options: { data: { unidade_nome: novoNome } },
      });
      if (authErr) throw authErr;

      if (authData.user) {
        const { error: profileErr } = await supabase.from("profiles").insert({
          id: authData.user.id,
          role: "unidade",
          unidade_nome: novoNome,
          email: novoEmail.trim(),
          ativo: true,
          senha_temp: novaSenha,
        });
        if (profileErr) throw profileErr;
      }

      toast.success(`Usuário ${novoNome} criado com sucesso!`);
      setModalCriar(false);
      setNovoNome(""); setNovoEmail(""); setNovaSenha("");
      carregarUsuarios();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setCriando(false);
    }
  }

  const termo = busca.trim().toLowerCase();
  const passa = (u: Profile) =>
    (status === "todos" || (status === "ativos") === u.ativo) &&
    (!termo || `${u.unidade_nome ?? ""} ${u.email ?? ""} ${ROLE_LABEL[u.role] ?? ""}`.toLowerCase().includes(termo));
  const unidadesVisiveis = useMemo(() => usuarios.filter(passa), [usuarios, termo, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const gestoresVisiveis = useMemo(() => gestores.filter(passa), [gestores, termo, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const nAtivas = usuarios.filter((u) => u.ativo).length;

  const linha = (u: Profile, gestor = false) => (
    <LinhaUsuario
      key={u.id}
      u={u}
      gestor={gestor}
      senhaVisivel={senhasVisiveis.has(u.id)}
      onSenha={() => toggleSenha(u.id)}
      onRedefinir={() => { setModalSenha(u); setNovaSenhaAdmin(""); }}
      onEmail={() => resetarSenhaEmail(u.email!)}
      onAtivo={() => toggleAtivo(u)}
    />
  );

  // Supervisão tem a mesma hierarquia de leitura da unidade — gestão de usuários e
  // senhas fica restrita a marketing, mesmo que a rota seja acessada direto pela URL.
  if (profile?.role === "supervisao") {
    return <Navigate to="/marketing/dashboard" replace />;
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="mt-1 text-sm text-gray-600">
            {loading ? "Carregando…" : `${usuarios.length} unidades na rede · ${nAtivas} ativas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={carregarUsuarios} title="Atualizar" aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Button>
          <Button onClick={() => setModalCriar(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Nova unidade
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <section aria-label="Filtros" className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
            <div className="w-full sm:w-72">
              <label htmlFor="us-busca" className={ROTULO}>Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                <Input id="us-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Unidade ou e-mail" className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden" />
                {busca && (
                  <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className={ROTULO}>Status</span>
              <Segmentado
                rotulo="Status"
                valor={status}
                opcoes={[
                  { valor: "todos", rotulo: "Todos", extra: loading ? undefined : String(usuarios.length) },
                  { valor: "ativos", rotulo: "Ativos", extra: loading ? undefined : String(nAtivas) },
                  { valor: "inativos", rotulo: "Inativos", extra: loading ? undefined : String(usuarios.length - nAtivas) },
                ]}
                onChange={setStatus}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="us-unidades" className={CARD_DESTAQUE}>
          <div className="px-4 py-5 sm:px-6">
            <h2 id="us-unidades" className="text-xl font-bold tracking-tight text-gray-900">Unidades</h2>
            <p className="mt-1 text-sm text-gray-700">
              {loading ? "" : unidadesVisiveis.length === usuarios.length ? "Todas as unidades da rede." : `${unidadesVisiveis.length} de ${usuarios.length} unidades.`}
            </p>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center border-t border-gray-100 text-gray-600">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Carregando…
            </div>
          ) : unidadesVisiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border-t border-gray-100 px-6 py-12 text-center">
              <p className="text-sm text-gray-700">Nenhuma unidade encontrada com esses filtros.</p>
              <Button variant="outline" size="sm" onClick={() => { setBusca(""); setStatus("todos"); }}>Limpar filtros</Button>
            </div>
          ) : (
            <>
              <CabecalhoLista primeira="Unidade" />
              <ul className="divide-y divide-gray-100 border-t border-gray-100 lg:border-t-0">{unidadesVisiveis.map((u) => linha(u))}</ul>
            </>
          )}
        </section>

        {gestoresVisiveis.length > 0 && (
          <section aria-labelledby="us-gestao" className="card overflow-hidden">
            <div className="px-4 py-4 sm:px-6">
              <h2 id="us-gestao" className="text-base font-semibold text-gray-900">Acessos de gestão</h2>
              <p className="mt-0.5 text-sm text-gray-600">Marketing e Supervisão.</p>
            </div>
            <CabecalhoLista primeira="Perfil" />
            <ul className="divide-y divide-gray-100 border-t border-gray-100 lg:border-t-0">{gestoresVisiveis.map((u) => linha(u, true))}</ul>
          </section>
        )}
      </div>

      {/* Modal redefinir senha */}
      <Dialog open={!!modalSenha} onOpenChange={(v) => !v && setModalSenha(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              {modalSenha?.unidade_nome ?? modalSenha?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="text"
                placeholder="Mínimo 8 caracteres"
                value={novaSenhaAdmin}
                onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalSenha(null)}>Cancelar</Button>
            <Button onClick={redefinirSenha} disabled={redefinindo || novaSenhaAdmin.length < 8}>
              <Lock className="h-4 w-4" />
              {redefinindo ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal criar usuário */}
      <Dialog open={modalCriar} onOpenChange={(v) => !v && setModalCriar(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo usuário de unidade</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select value={novoNome} onValueChange={setNovoNome}>
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" placeholder="unidade@fadelito.com.br" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha temporária</Label>
              <Input type="text" placeholder="Mínimo 8 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button onClick={criarUsuario} disabled={criando}>
              {criando ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
