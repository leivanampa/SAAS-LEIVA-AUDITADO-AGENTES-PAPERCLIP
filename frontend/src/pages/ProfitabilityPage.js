import React, { useState, useEffect } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  BarChart3, ArrowUpRight, ArrowDownRight, PieChart
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPie, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#00ff84", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

const KPI = ({ label, value, icon: Icon, color = "green", suffix = "", prefix = "" }) => (
  <div className="stat-card" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${
        color === "green" ? "bg-[#00ff84]/10 text-[#00ff84]" :
        color === "blue" ? "bg-blue-500/10 text-blue-400" :
        color === "amber" ? "bg-amber-500/10 text-amber-400" :
        "bg-red-500/10 text-red-400"
      }`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-2xl font-barlow font-bold text-white">
      {prefix}{typeof value === "number" ? value.toLocaleString("es-ES", { minimumFractionDigits: 2 }) : value}{suffix}
    </p>
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{label}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {Number(p.value).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR
        </p>
      ))}
    </div>
  );
};

const ProfitabilityPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get("/profitability-analysis");
        setData(res.data);
      } catch { toast.error("Error cargando analisis de rentabilidad"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};
  const imports = data?.imports || [];
  const trend = data?.monthly_trend || [];
  const costBreakdown = data?.cost_breakdown || [];

  return (
    <div data-testid="profitability-page" className="space-y-6">
      <div>
        <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Analisis de Rentabilidad</h1>
        <p className="text-sm text-zinc-500 mt-1">Margenes, costes y tendencias de tus importaciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Ingresos Totales" value={s.total_revenue || 0} icon={TrendingUp} color="green" />
        <KPI label="Costes Totales" value={s.total_costs || 0} icon={TrendingDown} color="red" />
        <KPI label="Margen Neto" value={s.total_margin || 0} icon={DollarSign} color={s.total_margin >= 0 ? "green" : "red"} />
        <KPI label="Margen Medio" value={`${s.avg_margin_pct || 0}%`} icon={BarChart3} color="blue" />
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Importaciones Totales</p>
          <p className="text-3xl font-barlow font-bold text-white">{s.total_imports || 0}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Importaciones Rentables</p>
          <p className="text-3xl font-barlow font-bold text-[#00ff84]">{s.profitable_imports || 0}</p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {trend.length > 0 && (
        <div className="stat-card" data-testid="monthly-trend-chart">
          <h3 className="font-barlow text-sm font-bold uppercase tracking-tight text-white mb-4">Tendencia Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Ingresos" fill="#00ff84" radius={[2, 2, 0, 0]} />
              <Bar dataKey="costs" name="Costes" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Margin Trend */}
        {trend.length > 0 && (
          <div className="stat-card" data-testid="margin-trend-chart">
            <h3 className="font-barlow text-sm font-bold uppercase tracking-tight text-white mb-4">Evolucion del Margen</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="margin" name="Margen" stroke="#00ff84" strokeWidth={2} dot={{ fill: "#00ff84", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost Breakdown Pie */}
        {costBreakdown.length > 0 && (
          <div className="stat-card" data-testid="cost-breakdown-chart">
            <h3 className="font-barlow text-sm font-bold uppercase tracking-tight text-white mb-4">Desglose de Costes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie data={costBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: "#71717a" }}>
                  {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val) => `${Number(val).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 4, fontSize: 12 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Per-import table */}
      <div className="stat-card" data-testid="import-profitability-table">
        <h3 className="font-barlow text-sm font-bold uppercase tracking-tight text-white mb-4">Rentabilidad por Importacion</h3>
        {imports.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No hay datos de importaciones</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="text-left py-2 pr-4">Referencia</th>
                  <th className="text-left py-2 pr-4">Nombre</th>
                  <th className="text-right py-2 pr-4">Ingresos</th>
                  <th className="text-right py-2 pr-4">Costes</th>
                  <th className="text-right py-2 pr-4">Margen</th>
                  <th className="text-right py-2">% Margen</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr key={imp.import_id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-xs text-zinc-300">{imp.reference}</td>
                    <td className="py-2.5 pr-4 text-white">{imp.name || "-"}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[#00ff84]">{imp.revenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-red-400">{imp.costs.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 pr-4 text-right font-mono font-bold" style={{ color: imp.margin >= 0 ? "#00ff84" : "#f87171" }}>
                      {imp.margin.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${imp.margin_pct >= 0 ? "text-[#00ff84]" : "text-red-400"}`}>
                        {imp.margin_pct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(imp.margin_pct)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitabilityPage;
