import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { apiClient } from "@/App";
import { t } from "@/i18n";
import {
  LayoutDashboard,
  Users,
  Ship,
  FileText,
  Receipt,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Warehouse,
  Package,
  Calculator,
  Sun,
  Moon,
  BarChart3,
  Zap,
  Shield,
  Wallet,
  PieChart,
  Inbox,
  Languages,
  Bot,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_china-trade/artifacts/je15mcr1_image.png";

const navItems = [
  { path: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { path: "/imports", labelKey: "imports", icon: Package },
  { path: "/crm", labelKey: "crm", icon: Users },
  { path: "/shipments", labelKey: "shipments", icon: Ship },
  { path: "/documents", labelKey: "documents", icon: FileText },
  { path: "/invoices", labelKey: "invoices", icon: Receipt },
  { path: "/accounting", labelKey: "accounting", icon: BarChart3 },
  { path: "/treasury", labelKey: "treasury", icon: Wallet },
  { path: "/warehouses", labelKey: "warehouses", icon: Warehouse },
  { path: "/profitability", labelKey: "profitability", icon: PieChart },
  { path: "/automations", labelKey: "automations", icon: Zap },
  { path: "/cost-estimator", labelKey: "cost_estimator", icon: Calculator },
  { path: "/inbox", labelKey: "inbox", icon: Inbox, adminOnly: true, hasBadge: true },
  { path: "/agents", labelKey: "agents_ia", icon: Bot, adminOnly: true },
  { path: "/control-center", labelKey: "control_center", icon: Activity, adminOnly: true },
  { path: "/users", labelKey: "users", icon: Shield, adminOnly: true },
  { path: "/settings", labelKey: "settings", icon: Settings },
];

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, theme, toggleTheme, lang, toggleLang } = useAuth();
  const [newInboxCount, setNewInboxCount] = useState(0);

  useEffect(() => {
    const fetchInboxCount = async () => {
      try {
        const res = await apiClient.get("/contact-forms?status=new");
        setNewInboxCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch { /* ignore */ }
    };
    if (user?.role === "admin" || user?.role === "manager") {
      fetchInboxCount();
      const interval = setInterval(fetchInboxCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNavigate = (path) => {
    navigate(path);
    onToggle();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border p-2 rounded-sm"
        data-testid="sidebar-mobile-toggle"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <img src={LOGO_URL} alt="Leiva's Import" className="w-10 h-10 rounded-lg object-contain" />
          <div>
            <h1 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">
              Leiva's Import
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Consulting</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.filter(item => !item.adminOnly || (user?.role === "admin")).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`sidebar-link w-full ${isActive ? "active" : ""}`}
                data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
              >
                <item.icon size={18} />
                <span>{t(item.labelKey, lang)}</span>
                {item.hasBadge && newInboxCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="inbox-badge">
                    {newInboxCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border/50">
          <button
            onClick={toggleLang}
            className="w-full flex items-center gap-3 px-4 py-2 mb-1 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors rounded-sm"
            data-testid="lang-toggle-btn"
          >
            <Languages size={16} />
            <span>{lang === 'es' ? 'English' : 'Espanol'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2 mb-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors rounded-sm"
            data-testid="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? t('light_mode', lang) : t('dark_mode', lang)}</span>
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#00ff84]/10 flex items-center justify-center text-[#00ff84] text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.name || "Usuario"}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{user?.role || "user"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/5"
            data-testid="logout-btn"
          >
            <LogOut size={16} className="mr-2" />
            {t('logout', lang)}
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
