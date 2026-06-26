import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BarChart2,
  Trophy,
  Users,
  FileText,
  History,
  LogOut,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../App";
import { usePendingDesfechos } from "../hooks/usePendingDesfechos";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

export const BANNER_KEY = "fadelito_banner_desfecho_v2";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_UNIDADE: NavItem[] = [
  { to: "/unidade/formulario", label: "Formulário Diário", icon: ClipboardList },
  { to: "/unidade/desfechos", label: "Desfecho das Visitas", icon: CalendarCheck },
  { to: "/unidade/historico", label: "Histórico Mensal", icon: History },
];

const NAV_MARKETING: NavItem[] = [
  { to: "/marketing/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketing/graficos", label: "Gráficos", icon: BarChart2 },
  { to: "/marketing/ranking", label: "Ranking", icon: Trophy },
  { to: "/marketing/usuarios", label: "Usuários", icon: Users },
  { to: "/marketing/audit", label: "Audit Log", icon: FileText },
  { to: "/marketing/observacoes", label: "Observações", icon: MessageSquare },
];

export default function Layout({ role }: { role: "unidade" | "marketing" }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pendingCount = usePendingDesfechos(role === "unidade" ? profile?.id : undefined);

  const [bannerVisivel, setBannerVisivel] = useState(
    () => role === "unidade" && !localStorage.getItem(BANNER_KEY)
  );

  function dispensarBanner() {
    localStorage.setItem(BANNER_KEY, "1");
    setBannerVisivel(false);
  }

  // Modal de alerta — aparece uma vez por montagem do Layout (= uma vez por login)
  const [modalAberto, setModalAberto] = useState(false);
  const modalMostrado = useRef(false);

  useEffect(() => {
    if (role !== "unidade" || pendingCount === 0 || modalMostrado.current) return;
    modalMostrado.current = true;
    setModalAberto(true);
  }, [pendingCount, role]);

  const navItems = role === "unidade"
    ? NAV_UNIDADE
    : profile?.role === "supervisao"
      ? NAV_MARKETING.filter((i) => i.to !== "/marketing/usuarios")
      : NAV_MARKETING;

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Modal de desfechos pendentes */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Atualizar Desfecho das Visitas
            </DialogTitle>
            <DialogDescription>
              {pendingCount === 1
                ? "1 lead visitou mas ainda não tem um desfecho decisivo."
                : `${pendingCount} leads visitaram mas ainda não têm um desfecho decisivo.`}{" "}
              Acesse a página para registrar se matriculou, está em negociação ou não fechou.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-1">
            <Button
              onClick={() => {
                setModalAberto(false);
                navigate("/unidade/desfechos");
              }}
            >
              Ir para Desfecho das Visitas
            </Button>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Atualizar depois
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-white font-bold text-lg">Fadelito</span>
          </div>
          <p className="text-gray-400 text-xs mt-1">
            {role === "unidade" ? (profile?.unidade_nome ?? "Unidade") : profile?.role === "supervisao" ? "Supervisão" : "Marketing"}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const showBadge = item.to === "/unidade/desfechos" && pendingCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-500 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )
                }
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-gray-400 text-xs truncate">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="h-1 w-12 bg-primary-500 rounded" />
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Banner nova funcionalidade */}
        {bannerVisivel && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white px-8 py-3 flex items-center gap-4">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-primary-100" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">Nova funcionalidade disponível: </span>
              <span>
                Agora você pode registrar o <strong>Desfecho de Matrículas</strong> de cada visita — informe se o lead
                matriculou, está em negociação ou não fechou. Acesse{" "}
                <button
                  onClick={() => { dispensarBanner(); navigate("/unidade/desfechos"); }}
                  className="underline underline-offset-2 hover:text-primary-100 font-semibold"
                >
                  Desfecho das Visitas
                </button>{" "}
                no menu lateral para começar.
              </span>
            </div>
            <button
              onClick={dispensarBanner}
              aria-label="Fechar aviso"
              className="flex-shrink-0 p-1 rounded hover:bg-primary-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
