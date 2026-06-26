import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart2,
  Trophy,
  Users,
  FileText,
  History,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../App";
import { cn } from "../lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_UNIDADE: NavItem[] = [
  { to: "/unidade/formulario", label: "Formulário Diário", icon: ClipboardList },
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
          {navItems.map((item) => (
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
              {item.label}
            </NavLink>
          ))}
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

        {/* Page content */}
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
