import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import toast from "react-hot-toast";

const inputClass =
  "h-10 rounded-[9px] border-white/[0.12] bg-white/[0.07] px-3.5 text-white placeholder:text-white/30 " +
  "focus:border-transparent focus:ring-2 focus:ring-sun-soft focus:ring-offset-0";

const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-white/60";

const ctaClass =
  "h-11 w-full rounded-[9px] bg-sun-soft font-extrabold text-[#001233] shadow-none " +
  "transition hover:brightness-105 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarReset, setMostrarReset] = useState(false);
  const [emailReset, setEmailReset] = useState("");
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function redirectByRole() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, ativo")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.ativo) {
      await supabase.auth.signOut();
      toast.error("Usuário inativo. Contate o marketing.");
      return;
    }

    if (profile.role === "marketing" || profile.role === "supervisao") {
      navigate("/marketing/dashboard");
    } else {
      navigate("/unidade/formulario");
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !senha) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) throw error;

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp?.[0];
        if (factor) {
          setMfaFactorId(factor.id);
          setLoading(false);
          return;
        }
      }

      await redirectByRole();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(msg === "Invalid login credentials" ? "E-mail ou senha incorretos." : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || !mfaCode) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (error) throw error;

      await redirectByRole();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Código inválido.");
      setMfaCode("");
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[url('/fundo-fadelito.webp')] bg-cover bg-center opacity-[0.08]"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
        }}
      />

      {/* Mascote atrás do card, dando as boas-vindas */}
      <div className="relative z-10 flex flex-col items-center">
        <img
          src="/mascot-fadelito.webp"
          alt="Mascote Fadelito dando as boas-vindas"
          className="relative z-0 mb-[-72px] h-[212px] w-auto select-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] motion-safe:animate-float sm:mb-[-86px] sm:h-[248px]"
        />

        <div className="relative z-10 w-full max-w-[380px] rounded-[18px] border border-white/[0.14] bg-white/[0.06] p-[30px] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_24px_60px_-10px_rgba(0,0,0,0.55)]">
          {mfaFactorId ? (
            <>
              <h1 className="text-lg font-extrabold text-white">Verificação em duas etapas</h1>
              <p className="mt-1.5 text-sm text-white/50">
                Digite o código do seu app autenticador.
              </p>
              <form onSubmit={handleMfaVerify} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mfaCode" className={labelClass}>
                    Código
                  </Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    autoFocus
                    className={inputClass}
                  />
                </div>
                <Button type="submit" disabled={loading} className={ctaClass}>
                  {loading ? "Verificando..." : "Verificar"}
                </Button>
              </form>
              <button
                onClick={() => { setMfaFactorId(null); setMfaCode(""); }}
                className="mt-4 w-full text-center text-sm text-white/50 transition-colors hover:text-white"
              >
                ← Voltar ao login
              </button>
            </>
          ) : !mostrarReset ? (
            <>
              <h1 className="text-lg font-extrabold text-white">Bem-vindo de volta</h1>
              <p className="mt-1.5 text-sm text-white/50">
                Entre com seus dados para acessar o painel.
              </p>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className={labelClass}>
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    placeholder="seu@email.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className={labelClass}>
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      autoComplete="current-password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center text-white/40 transition-colors hover:text-white"
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className={ctaClass}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <button
                onClick={() => setMostrarReset(true)}
                className="mt-4 w-full text-center text-sm font-bold text-sun-soft transition-colors hover:brightness-110"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <h1 className="text-lg font-extrabold text-white">Redefinir senha</h1>
              <p className="mt-1.5 text-sm text-white/50">
                Informe seu e-mail para receber o link de redefinição.
              </p>
              <form onSubmit={handleReset} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emailReset" className={labelClass}>
                    E-mail
                  </Label>
                  <Input
                    id="emailReset"
                    type="text"
                    inputMode="email"
                    placeholder="seu@email.com.br"
                    value={emailReset}
                    onChange={(e) => setEmailReset(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <Button type="submit" disabled={enviandoReset} className={ctaClass}>
                  {enviandoReset ? "Enviando..." : "Enviar link"}
                </Button>
              </form>
              <button
                onClick={() => setMostrarReset(false)}
                className="mt-4 w-full text-center text-sm text-white/50 transition-colors hover:text-white"
              >
                ← Voltar ao login
              </button>
            </>
          )}
        </div>

        <div className="mt-5 flex w-full max-w-[380px] items-start gap-2.5 rounded-[14px] border border-white/[0.10] bg-white/[0.04] px-4 py-3">
          <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-sun-soft" />
          <p className="text-xs leading-relaxed text-white/55">
            <span className="font-bold text-white/80">Assistente Fadelito:</span> depois de entrar, consulte em segundos
            os protocolos oficiais da rede para dúvidas do dia a dia da unidade (mordida, desfralde, emergências e mais).
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-bold text-white">Fadelito</span>
        <p className="text-xs font-medium tracking-wide text-white/35">
          Sistema de Gestão de Visitas e Matrículas
        </p>
      </div>
    </div>
  );
}
