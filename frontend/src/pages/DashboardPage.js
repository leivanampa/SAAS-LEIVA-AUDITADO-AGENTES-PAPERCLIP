import React, { useState, useEffect } from "react";
import { useAuth, apiClient } from "@/App";
import { useNavigate } from "react-router-dom";
import {
  Users, Ship, FileText, Receipt, TrendingUp, Package,
  ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle2,
  BarChart3, Wallet, Warehouse, Zap
} from "lucide-react";
import { toast } from "sonner";

const StatCard = ({ title, value, icon: Icon, trend, color = "green", onClick }) => (
  <div
    className={`stat-card animate-fade-in ${onClick ? "cursor-pointer hover:border-[#00ff84]/30 hover:bg-secondary/30 transition-all" : ""}`}
    data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${
        color === "green" ? "bg-[#00ff84]/10 text-[#00ff84]" :
        color === "blue" ? "bg-blue-500/10 text-blue-400" :
        color === "amber" ? "bg-amber-500/10 text-amber-400" :
        "bg-zinc-500/10 text-zinc-400"
      }`}>
        <Icon size={18} />
      </div>
      {trend && (
        <span className={`text-[10px] flex items-center gap-0.5 ${trend > 0 ? "text-[#00ff84]" : "text-red-400"}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-barlow font-bold text-white">{value}</p>
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{title}</p>
  </div>
);

const statusLabels = { pending: "Pendiente", in_transit: "En Transito", customs: "En Aduana", delivered: "Entregado", cancelled: "Cancelado" };
const statusIcons = { pending: Clock, in_transit: Ship, customs: AlertCircle, delivered: CheckCircle2, cancelled: AlertCircle };

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          apiClient.get("/dashboard/stats"),
          apiClient.get("/dashboard/recent-activity")
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
      } catch (err) { toast.error("Error cargando datos del dashboard"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Bienvenido, {user?.name || "Usuario"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Hoy</p>
          <p className="font-mono-data text-sm text-zinc-300">{new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        </div>
      </div>

      {/* Stats Grid - CLICKABLE */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Contactos" value={stats?.total_contacts || 0} icon={Users} color="blue" onClick={() => navigate("/crm")} />
        <StatCard title="Importaciones" value={stats?.total_imports || 0} icon={Package} color="green" onClick={() => navigate("/imports")} />
        <StatCard title="Envios Activos" value={stats?.active_shipments || 0} icon={Ship} color="blue" onClick={() => navigate("/shipments")} />
        <StatCard title="Facturas Pendientes" value={stats?.pending_invoices || 0} icon={Receipt} color="amber" onClick={() => navigate("/invoices")} />
        <StatCard title="Documentos" value={stats?.total_documents || 0} icon={FileText} color="zinc" onClick={() => navigate("/documents")} />
      </div>

      {/* Quick access modules */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Contabilidad", icon: BarChart3, path: "/accounting", color: "text-[#00ff84]", bg: "bg-[#00ff84]/5 hover:bg-[#00ff84]/10" },
          { label: "Tesoreria", icon: Wallet, path: "/treasury", color: "text-blue-400", bg: "bg-blue-500/5 hover:bg-blue-500/10" },
          { label: "Almacenes", icon: Warehouse, path: "/warehouses", color: "text-purple-400", bg: "bg-purple-500/5 hover:bg-purple-500/10" },
          { label: "Automatizaciones", icon: Zap, path: "/automations", color: "text-amber-400", bg: "bg-amber-500/5 hover:bg-amber-500/10" }
        ].map(m => (
          <button key={m.path} onClick={() => navigate(m.path)} className={`flex items-center gap-3 p-4 rounded-lg border border-border/50 ${m.bg} transition-all cursor-pointer`} data-testid={`quick-${m.path.replace("/","")}`}>
            <m.icon size={20} className={m.color} />
            <span className="text-sm font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card col-span-1 cursor-pointer hover:border-[#00ff84]/30 transition-all" onClick={() => navigate("/accounting")}>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Ingresos Cobrados</p>
          <p className="text-3xl font-barlow font-bold text-[#00ff84]">
            {(stats?.total_revenue || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} <span className="text-lg text-zinc-500">EUR</span>
          </p>
        </div>
        <div className="stat-card col-span-1 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => navigate("/treasury")}>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Pendiente de Cobro</p>
          <p className="text-3xl font-barlow font-bold text-amber-400">
            {(stats?.pending_amount || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} <span className="text-lg text-zinc-500">EUR</span>
          </p>
        </div>
        <div className="stat-card col-span-1 cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => navigate("/shipments")}>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Envios Totales</p>
          <div className="flex items-end gap-4">
            <p className="text-3xl font-barlow font-bold text-white">{stats?.total_shipments || 0}</p>
            <div className="flex gap-2 text-xs pb-1">
              <span className="text-[#00ff84]">{stats?.delivered_shipments || 0} entregados</span>
              <span className="text-zinc-500">|</span>
              <span className="text-amber-400">{stats?.pending_shipments || 0} pendientes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">Envios Recientes</h3>
            <button onClick={() => navigate("/shipments")} className="text-[10px] uppercase tracking-widest text-[#00ff84] hover:text-[#33ff9d] transition-colors" data-testid="view-all-shipments">Ver todos</button>
          </div>
          {activity?.recent_shipments?.length > 0 ? (
            <div className="space-y-3">
              {activity.recent_shipments.map((s) => {
                const StatusIcon = statusIcons[s.status] || Package;
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 cursor-pointer hover:bg-secondary/20 rounded transition-colors" onClick={() => navigate("/shipments")}>
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${s.status === "delivered" ? "bg-[#00ff84]/10 text-[#00ff84]" : s.status === "in_transit" ? "bg-blue-500/10 text-blue-400" : s.status === "customs" ? "bg-purple-500/10 text-purple-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                      <StatusIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.reference}</p>
                      <p className="text-[10px] text-zinc-500">{s.supplier_name || s.origin + " -> " + s.destination}</p>
                    </div>
                    <span className={`badge-status badge-${s.status?.replace("_", "-")}`}>{statusLabels[s.status] || s.status}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-zinc-500 text-center py-8">No hay envios recientes</p>}
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">Facturas Recientes</h3>
            <button onClick={() => navigate("/invoices")} className="text-[10px] uppercase tracking-widest text-[#00ff84] hover:text-[#33ff9d] transition-colors" data-testid="view-all-invoices">Ver todos</button>
          </div>
          {activity?.recent_invoices?.length > 0 ? (
            <div className="space-y-3">
              {activity.recent_invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 cursor-pointer hover:bg-secondary/20 rounded transition-colors" onClick={() => navigate("/invoices")}>
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${inv.status === "paid" ? "bg-[#00ff84]/10 text-[#00ff84]" : inv.status === "sent" ? "bg-blue-500/10 text-blue-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                    <Receipt size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{inv.invoice_number}</p>
                    <p className="text-[10px] text-zinc-500">{inv.contact_name}</p>
                  </div>
                  <p className="font-mono-data text-sm text-white">{(inv.total || 0).toFixed(2)} EUR</p>
                  <span className={`badge-status badge-${inv.status}`}>{inv.status === "paid" ? "Pagada" : inv.status === "sent" ? "Enviada" : inv.status === "draft" ? "Borrador" : inv.status}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-zinc-500 text-center py-8">No hay facturas recientes</p>}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
