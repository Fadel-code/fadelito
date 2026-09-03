import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import toast from "react-hot-toast";

type Factor = { id: string; status: string; factor_type: string };

export default function ContaMfa() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }

  useEffect(() => {
    loadFactors();
  }, []);

  async function handleEnroll() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar o MFA.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolling.factorId,
      });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
      toast.success("MFA ativado com sucesso.");
      setEnrolling(null);
      setCode("");
      await loadFactors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnenroll(factorId: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("MFA desativado.");
      await loadFactors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar.");
    } finally {
      setLoading(false);
    }
  }

  const verifiedFactor = factors.find((f) => f.status === "verified");

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-lg font-bold">Autenticação em duas etapas</h1>

      {verifiedFactor ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">MFA está ativo na sua conta.</p>
          <Button variant="destructive" disabled={loading} onClick={() => handleUnenroll(verifiedFactor.id)}>
            Desativar MFA
          </Button>
        </div>
      ) : enrolling ? (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escaneie o QR code com seu app autenticador e digite o código gerado.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="QR code MFA" className="w-40 h-40" />
          <code className="block break-all text-xs text-muted-foreground">{enrolling.secret}</code>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            maxLength={6}
          />
          <Button type="submit" disabled={loading}>
            Confirmar
          </Button>
        </form>
      ) : (
        <Button disabled={loading} onClick={handleEnroll}>
          Ativar MFA
        </Button>
      )}
    </div>
  );
}
