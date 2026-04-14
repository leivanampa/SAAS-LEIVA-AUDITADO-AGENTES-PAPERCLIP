import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft,
  Clock, AlertTriangle, CheckCircle2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine
} from "recharts";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const fmt = (n) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TreasuryPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("6");

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/treasury/forecast?months_ahead=${months}`, authHeaders());
      setData(res.data);
    } catch { toast.error("Error cargando tesoreria"); }
    finally { setLoading(false); }
  }, [months]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  const balanceColor = data.current_balance >= 0 ? "text-[#00ff84]" : "text-red-400";
  const projectedColor = data.projected_balance >= 0 ? "text-emerald-400" : "text-red-400";
  const hasRisk = data.forecast.some(f => f.projected_balance < 0);

  return (
    <div className="space-y-6" data-testid="treasury-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-3xl font-bold uppercase tracking-tight">Tesoreria</h1>
          <p className="text-sm text-muted-foreground mt-1">Prevision de flujo de caja y liquidez</p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[160px] bg-secondary/50" data-testid="months-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasRisk && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4" data-testid="risk-alert">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Alerta de liquidez</p>
            <p className="text-xs text-muted-foreground">El saldo proyectado sera negativo en algun mes. Revisa los cobros y pagos pendientes.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4" data-testid="card-balance">
          <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center text-[#00ff84] mb-3"><Wallet size={20} /></div>
          <p className={`text-2xl font-bold font-mono ${balanceColor}`}>{fmt(data.current_balance)} <span className="text-xs text-muted-foreground">EUR</span></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Saldo Actual</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4" data-testid="card-receivable">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3"><ArrowDownLeft size={20} /></div>
          <p className="text-2xl font-bold font-mono text-emerald-400">{fmt(data.total_receivable)} <span className="text-xs text-muted-foreground">EUR</span></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Por Cobrar ({data.pending_invoices_receivable})</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4" data-testid="card-payable">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-3"><ArrowUpRight size={20} /></div>
          <p className="text-2xl font-bold font-mono text-red-400">{fmt(data.total_payable)} <span className="text-xs text-muted-foreground">EUR</span></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Por Pagar ({data.pending_invoices_payable + data.scheduled_payments})</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4" data-testid="card-projected">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3"><TrendingUp size={20} /></div>
          <p className={`text-2xl font-bold font-mono ${projectedColor}`}>{fmt(data.projected_balance)} <span className="text-xs text-muted-foreground">EUR</span></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Saldo Proyectado</p>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Prevision de Saldo</h3>
        {data.forecast.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => `${fmt(v)} EUR`} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="projected_balance" name="Saldo" stroke="#00ff84" fill="#00ff84" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground text-center py-12">Sin datos de prevision</p>}
      </div>

      {/* Cashflow bars */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Cobros vs Pagos por Mes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
            <YAxis tick={{ fontSize: 11, fill: "#888" }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => `${fmt(v)} EUR`} />
            <Bar dataKey="receivable" name="Cobros" fill="#00ff84" radius={[4, 4, 0, 0]} />
            <Bar dataKey="payable" name="Pagos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pending detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><ArrowDownLeft size={14} className="text-emerald-400" /> Por Cobrar</h3>
          {data.receivable_detail.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Sin facturas por cobrar</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.receivable_detail.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30">
                  <div>
                    <span className="font-mono font-medium">{inv.invoice_number}</span>
                    <span className="text-muted-foreground ml-2">{inv.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.due_date && <span className="text-muted-foreground">{inv.due_date}</span>}
                    <span className="font-mono font-bold text-emerald-400">{fmt(inv.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><ArrowUpRight size={14} className="text-red-400" /> Por Pagar</h3>
          {data.payable_detail.length === 0 && data.payments_detail.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Sin facturas ni pagos pendientes</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.payable_detail.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30">
                  <div>
                    <span className="font-mono font-medium">{inv.invoice_number}</span>
                    <span className="text-muted-foreground ml-2">{inv.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.due_date && <span className="text-muted-foreground">{inv.due_date}</span>}
                    <span className="font-mono font-bold text-red-400">{fmt(inv.total)}</span>
                  </div>
                </div>
              ))}
              {data.payments_detail.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30">
                  <div>
                    <Badge variant="outline" className="text-[8px] mr-1">PAGO</Badge>
                    <span className="text-muted-foreground">{p.supplier_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.due_date && <span className="text-muted-foreground">{p.due_date}</span>}
                    <span className="font-mono font-bold text-red-400">{fmt(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreasuryPage;
