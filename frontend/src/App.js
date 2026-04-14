import React, { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CRMPage from "@/pages/CRMPage";
import ShipmentsPage from "@/pages/ShipmentsPage";
import DocumentsPage from "@/pages/DocumentsPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ImportsPage from "@/pages/ImportsPage";
import CostEstimatorPage from "@/pages/CostEstimatorPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountingPage from "@/pages/AccountingPage";
import WarehousesPage from "@/pages/WarehousesPage";
import AutomationsPage from "@/pages/AutomationsPage";
import UsersPage from "@/pages/UsersPage";
import ClientPortalPage from "@/pages/ClientPortalPage";
import LandingPage from "@/pages/LandingPage";
import TreasuryPage from "@/pages/TreasuryPage";
import ProfitabilityPage from "@/pages/ProfitabilityPage";
import MarketingDigitalPage from "@/pages/MarketingDigitalPage";
import InboxPage from "@/pages/InboxPage";
import AgentsDashboardPage from "@/pages/AgentsDashboardPage";
import ControlCenterPage from "@/pages/ControlCenterPage";
import Sidebar from "@/components/Sidebar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// API helper with auth
export const apiClient = axios.create({ baseURL: API });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role || "user")) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const { lang } = useAuth();
  const navigate = useNavigate();

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await apiClient.get(`/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.results || []);
    } catch { setSearchResults([]); }
  };

  return (
    <div className="flex min-h-screen bg-background noise-bg">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="flex-1 md:pl-64 min-h-screen" data-testid="main-content">
        {/* Global Search Bar */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 md:px-6 py-2.5">
          <div className="relative max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              placeholder={lang === 'en' ? "Search invoices, imports, contacts..." : "Buscar facturas, importaciones, contactos..."}
              className="w-full bg-secondary/50 border border-border rounded-sm pl-9 pr-3 py-1.5 text-sm font-instrument text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-[#00ff84]/50"
              data-testid="global-search-input"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-sm shadow-xl max-h-64 overflow-y-auto z-50" data-testid="search-results">
                {searchResults.map((r, i) => (
                  <button key={i} onMouseDown={() => { navigate(r.path); setSearchQuery(""); setSearchResults([]); }} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0">
                    <span className="text-[9px] font-barlow font-bold uppercase tracking-wider text-[#00ff84] bg-[#00ff84]/10 px-1.5 py-0.5 rounded">{r.type}</span>
                    <span className="text-xs text-foreground font-instrument truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 md:p-6 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user.role === "client") return <Navigate to="/portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('leiva-theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('leiva-lang') || 'es');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('leiva-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('leiva-lang', lang);
  }, [lang]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleLang = () => setLang(prev => prev === 'es' ? 'en' : 'es');

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiClient.get("/auth/me")
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, theme, toggleTheme, lang, toggleLang }}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/marketing-digital" element={<MarketingDigitalPage />} />
          {/* Admin/Manager routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin","manager","user"]}><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><CRMPage /></AppLayout></ProtectedRoute>} />
          <Route path="/shipments" element={<ProtectedRoute allowedRoles={["admin","manager","user"]}><AppLayout><ShipmentsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute allowedRoles={["admin","manager","user"]}><AppLayout><DocumentsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><InvoicesPage /></AppLayout></ProtectedRoute>} />
          <Route path="/imports" element={<ProtectedRoute allowedRoles={["admin","manager","user"]}><AppLayout><ImportsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/cost-estimator" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><CostEstimatorPage /></AppLayout></ProtectedRoute>} />
          <Route path="/accounting" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><AccountingPage /></AppLayout></ProtectedRoute>} />
          <Route path="/treasury" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><TreasuryPage /></AppLayout></ProtectedRoute>} />
          <Route path="/warehouses" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><WarehousesPage /></AppLayout></ProtectedRoute>} />
          <Route path="/profitability" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><ProfitabilityPage /></AppLayout></ProtectedRoute>} />
          <Route path="/automations" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><AutomationsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><AppLayout><UsersPage /></AppLayout></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute allowedRoles={["admin"]}><AppLayout><AgentsDashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/control-center" element={<ProtectedRoute allowedRoles={["admin"]}><AppLayout><ControlCenterPage /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin","manager","user"]}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute allowedRoles={["admin","manager"]}><AppLayout><InboxPage /></AppLayout></ProtectedRoute>} />
          {/* Client portal */}
          <Route path="/portal" element={<ProtectedRoute allowedRoles={["client","admin","manager"]}><ClientPortalPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
