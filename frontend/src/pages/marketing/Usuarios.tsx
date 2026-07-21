import { useState, useEffect } from "react";
import { UserPlus, RefreshCw, KeyRound, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types";
import { UNIDADES } from "../../types";
import { formatarData } from "../../lib/utils";
import { Button } from "../../components/ui/button";
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

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [gestores, setGestores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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

  function CelulasSenha({ u }: { u: Profile }) {
    const visivel = senhasVisiveis.has(u.id);
    return (
      <td className="px-4 py-3 text-center">
        {u.senha_temp ? (
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-mono text-xs text-gray-700">
              {visivel ? u.senha_temp : "••••••••"}
            </span>
            <button
              onClick={() => toggleSenha(u.id)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              title={visivel ? "Ocultar senha" : "Revelar senha"}
            >
              {visivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">35 unidades da rede</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={carregarUsuarios}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setModalCriar(true)}>
            <UserPlus className="h-4 w-4" />
            Nova Unidade
          </Button>
        </div>
      </div>

      {/* Acessos de Gestão */}
      {gestores.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Acessos de Gestão</h2>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">E-mail</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Perfil</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Senha</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {gestores.map((u, i) => (
                <tr key={u.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}>
                  <td className="px-4 py-3 text-gray-800">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  </td>
                  <CelulasSenha u={u} />
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.ativo ? "success" : "destructive"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setModalSenha(u); setNovaSenhaAdmin(""); }}>
                        <Lock className="h-3.5 w-3.5" />
                        Redefinir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => resetarSenhaEmail(u.email!)} title="Enviar e-mail de redefinição">
                        <KeyRound className="h-3.5 w-3.5" />
                        E-mail
                      </Button>
                      <Button variant={u.ativo ? "destructive" : "secondary"} size="sm" onClick={() => toggleAtivo(u)}>
                        {u.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unidades */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Unidade</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">E-mail</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Senha</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Criado em</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.unidade_nome}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <CelulasSenha u={u} />
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.ativo ? "success" : "destructive"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">
                    {formatarData(u.created_at.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setModalSenha(u); setNovaSenhaAdmin(""); }}>
                        <Lock className="h-3.5 w-3.5" />
                        Redefinir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => resetarSenhaEmail(u.email!)} title="Enviar e-mail de redefinição">
                        <KeyRound className="h-3.5 w-3.5" />
                        E-mail
                      </Button>
                      <Button variant={u.ativo ? "destructive" : "secondary"} size="sm" onClick={() => toggleAtivo(u)}>
                        {u.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
