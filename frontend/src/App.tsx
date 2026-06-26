import {
  createContext,
  useContext,
  useEffect,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Profile } from "./types";

import Login from "./pages/Login";
import Layout from "./components/Layout";

const FormularioDiario = lazy(() => import("./pages/unidade/FormularioDiario"));
const HistoricoMensal = lazy(() => import("./pages/unidade/HistoricoMensal"));
const Desfechos = lazy(() => import("./pages/unidade/Desfechos"));
const Dashboard = lazy(() => import("./pages/marketing/Dashboard"));
const Graficos = lazy(() => import("./pages/marketing/Graficos"));
const Ranking = lazy(() => import("./pages/marketing/Ranking"));
const Usuarios = lazy(() => import("./pages/marketing/Usuarios"));
const AuditLog = lazy(() => import("./pages/marketing/AuditLog"));
const Observacoes = lazy(() => import("./pages/marketing/Observacoes"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );
}

// ---- Auth Context ----
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          loadProfile(session.user.id).finally(() => setLoading(false));
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---- Protected Routes ----
function RequireAuth({ children, role }: { children: ReactNode; role?: "unidade" | "marketing" }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || !profile) return <Navigate to="/login" replace />;
  if (!profile.ativo) return <Navigate to="/login" replace />;
  // supervisao acessa as mesmas rotas de marketing
  const effectiveRole = profile.role === "supervisao" ? "marketing" : profile.role;
  if (role && effectiveRole !== role) {
    return <Navigate to={effectiveRole === "marketing" ? "/marketing/dashboard" : "/unidade/formulario"} replace />;
  }

  return <>{children}</>;
}

function MarketingOnly({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role === "supervisao") return <Navigate to="/marketing/dashboard" replace />;
  return <>{children}</>;
}

function RedirectByRole() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === "marketing" || profile.role === "supervisao") return <Navigate to="/marketing/dashboard" replace />;
  return <Navigate to="/unidade/formulario" replace />;
}

// ---- Router ----
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RedirectByRole />} />

        {/* Unidade */}
        <Route
          path="/unidade"
          element={
            <RequireAuth role="unidade">
              <Layout role="unidade" />
            </RequireAuth>
          }
        >
          <Route path="formulario" element={<FormularioDiario />} />
          <Route path="historico" element={<HistoricoMensal />} />
          <Route path="desfechos" element={<Desfechos />} />
          <Route index element={<Navigate to="formulario" replace />} />
        </Route>

        {/* Marketing */}
        <Route
          path="/marketing"
          element={
            <RequireAuth role="marketing">
              <Layout role="marketing" />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="graficos" element={<Graficos />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="usuarios" element={<MarketingOnly><Usuarios /></MarketingOnly>} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="observacoes" element={<Observacoes />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  );
}
