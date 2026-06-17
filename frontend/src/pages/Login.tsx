import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarReset, setMostrarReset] = useState(false);
  const [emailReset, setEmailReset] = useState("");
  const [enviandoReset, setEnviandoReset] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !senha) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) throw error;

      // Buscar role para redirecionar
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, ativo")
        .eq("id", data.user.id)
        .single();

      if (!profile?.ativo) {
        await supabase.auth.signOut();
        toast.error("Usuário inativo. Contate o marketing.");
        return;
      }

      if (profile.role === "marketing") {
        navigate("/marketing/dashboard");
      } else {
        navigate("/unidade/formulario");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(msg === "Invalid login credentials" ? "E-mail ou senha incorretos." : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!emailReset) return;
    setEnviandoReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailReset.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success("E-mail de redefinição enviado!");
      setMostrarReset(false);
      setEmailReset("");
    } catch (err: unknown) {
      toast.error("Erro ao enviar e-mail. Verifique o endereço.");
    } finally {
      setEnviandoReset(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Fadelito</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão de Visitas e Matrículas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {!mostrarReset ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Entrar na conta</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    placeholder="seu@email.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <button
                onClick={() => setMostrarReset(true)}
                className="mt-4 w-full text-center text-sm text-primary-500 hover:text-primary-600 transition-colors"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Redefinir senha</h2>
              <p className="text-sm text-gray-500 mb-6">
                Informe seu e-mail para receber o link de redefinição.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emailReset">E-mail</Label>
                  <Input
                    id="emailReset"
                    type="text"
                    inputMode="email"
                    placeholder="seu@email.com.br"
                    value={emailReset}
                    onChange={(e) => setEmailReset(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={enviandoReset}>
                  {enviandoReset ? "Enviando..." : "Enviar link"}
                </Button>
              </form>
              <button
                onClick={() => setMostrarReset(false)}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Voltar ao login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
