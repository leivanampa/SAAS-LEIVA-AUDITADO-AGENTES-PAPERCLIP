import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import {
  BarChart3, TrendingUp, TrendingDown, Plus, Search, Trash2, Edit2,
  Upload, FileText, Paperclip, ArrowUpRight, ArrowDownLeft,
  Receipt, CreditCard, Building2, Clock, CheckCircle2, XCircle, Filter, MoreVertical, DollarSign
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "../components/ui/dropdown-menu";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const CATEGORY_LABELS = {
  ventas: "Ventas", servicios: "Servicios", comisiones: "Comisiones", otros_ingresos: "Otros Ingresos",
  devolucion_proveedor: "Dev. Proveedor", mercancia: "Mercancia", flete: "Flete", aduanas: "Aduanas",
  seguro: "Seguro", almacenaje: "Almacenaje", transporte_local: "Transporte", servicios_profesionales: "Serv. Prof.",
  personal: "Personal", oficina: "Oficina", marketing: "Marketing", impuestos: "Impuestos",
  financieros: "Financieros", otros_gastos: "Otros Gastos", sin_categoria: "Sin Categoria"
};
const IVA_RATES = [0, 4, 10, 21];
const PAYMENT_METHODS = [
  { value: "transfer", label: "Transferencia" }, { value: "card", label: "Tarjeta" },
  { value: "cash", label: "Efectivo" }, { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" }
];
const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente", color: "bg-amber-500/20 text-amber-400" },
  { value: "paid", label: "Pagado", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "reconciled", label: "Conciliado", color: "bg-blue-500/20 text-blue-400" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-500/20 text-red-400" }
];
const CHART_COLORS = ["#00ff84", "#00cc6a", "#009950", "#22d3ee", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb923c", "#facc15"];

const fmt = (n) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const AccountingPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [ivaData, setIvaData] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [showNewTx, setShowNewTx] = useState(false);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("year");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const h = authHeaders();
      const [txRes, sumRes, monthRes, catRes, ivaRes, payRes] = await Promise.all([
        axios.get(`${API}/accounting/transactions`, h),
        axios.get(`${API}/accounting/summary?period=${period}`, h),
        axios.get(`${API}/accounting/monthly-report`, h),
        axios.get(`${API}/accounting/category-report?period=${period}`, h),
        axios.get(`${API}/accounting/iva-report`, h),
        axios.get(`${API}/supplier-payments`, h)
      ]);
      setTransactions(txRes.data);
      setSummary(sumRes.data);
      setMonthlyData(monthRes.data);
      setCategoryData(catRes.data);
      setIvaData(ivaRes.data);
      setSupplierPayments(payRes.data);
    } catch (err) { toast.error("Error cargando datos"); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredTxs = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (t.description || "").toLowerCase().includes(q) || (t.reference || "").toLowerCase().includes(q) || (t.contact_name || "").toLowerCase().includes(q);
    }
    return true;
  });

  const handleDeleteTx = async (id) => {
    try {
      await axios.delete(`${API}/accounting/transactions/${id}`, authHeaders());
      toast.success("Transaccion eliminada");
      fetchAll();
    } catch { toast.error("Error"); }
  };

  const handleMarkPaymentPaid = async (pay) => {
    try {
      await axios.put(`${API}/supplier-payments/${pay.id}`, { status: "paid" }, authHeaders());
      toast.success("Pago marcado como realizado");
      fetchAll();
    } catch { toast.error("Error"); }
  };

  const handleDeletePayment = async (id) => {
    try {
      await axios.delete(`${API}/supplier-payments/${id}`, authHeaders());
      toast.success("Pago eliminado");
      fetchAll();
    } catch { toast.error("Error"); }
  };

  const monthNames = { "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun", "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic" };
  const chartMonthly = monthlyData.map(m => ({ name: monthNames[m.month] || m.month, Ingresos: m.income, Gastos: m.expenses, Neto: m.net }));
  const expensesByCategory = categoryData.filter(c => c.type === "expense").map((c, i) => ({ name: CATEGORY_LABELS[c.category] || c.category, value: c.total, fill: CHART_COLORS[i % CHART_COLORS.length] }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-3xl font-bold uppercase tracking-tight" data-testid="accounting-title">Contabilidad</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion financiera completa con IVA</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-secondary/50" data-testid="period-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showNewTx} onOpenChange={setShowNewTx}>
            <DialogTrigger asChild>
              <Button className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="new-transaction-btn"><Plus size={16} className="mr-2" />Nueva Transaccion</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nueva Transaccion</DialogTitle><DialogDescription>Registra un ingreso o gasto</DialogDescription></DialogHeader>
              <TransactionForm onSave={() => { setShowNewTx(false); fetchAll(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="overview" data-testid="tab-overview"><BarChart3 size={14} className="mr-1.5" />Vista General</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions"><Receipt size={14} className="mr-1.5" />Transacciones</TabsTrigger>
          <TabsTrigger value="iva" data-testid="tab-iva"><FileText size={14} className="mr-1.5" />IVA</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments"><Building2 size={14} className="mr-1.5" />Pagos Proveedores</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={<TrendingUp size={20} />} label="Ingresos" value={fmt(summary.total_income)} sub={`Base: ${fmt(summary.income_base)}`} color="text-emerald-400" bg="bg-emerald-500/10" testId="card-income" />
            <SummaryCard icon={<TrendingDown size={20} />} label="Gastos" value={fmt(summary.total_expenses)} sub={`Base: ${fmt(summary.expense_base)}`} color="text-red-400" bg="bg-red-500/10" testId="card-expenses" />
            <SummaryCard icon={<DollarSign size={20} />} label="Beneficio Neto" value={fmt(summary.net_profit)} sub={`IVA neto: ${fmt(summary.iva_balance)}`} color={summary.net_profit >= 0 ? "text-[#00ff84]" : "text-red-400"} bg="bg-[#00ff84]/10" testId="card-net" />
            <SummaryCard icon={<Clock size={20} />} label="Pendiente" value={fmt(summary.pending_amount)} sub="Por cobrar/pagar" color="text-amber-400" bg="bg-amber-500/10" testId="card-pending" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Flujo de Caja Mensual</h3>
              {chartMonthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="Ingresos" stroke="#00ff84" fill="#00ff84" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-12">Sin datos para mostrar</p>}
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Gastos por Categoria</h3>
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" paddingAngle={2}>
                      {expensesByCategory.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => `${fmt(v)} EUR`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-12">Sin gastos</p>}
              <div className="space-y-1.5 mt-2">
                {expensesByCategory.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c.fill }} /><span className="text-muted-foreground">{c.name}</span></div>
                    <span className="font-mono">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-secondary/50 h-9" data-testid="tx-search" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] bg-secondary/50 h-9" data-testid="filter-type"><Filter size={12} className="mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Gastos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] bg-secondary/50 h-9" data-testid="filter-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Fecha</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Tipo</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Categoria</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Descripcion</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Contacto</th>
                <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Base</th>
                <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">IVA</th>
                <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Total</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Estado</th>
                <th className="p-3 w-10"></th>
              </tr></thead>
              <tbody>
                {filteredTxs.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Sin transacciones</td></tr>
                ) : filteredTxs.map(tx => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors" data-testid={`tx-row-${tx.id}`}>
                    <td className="p-3 font-mono text-xs">{tx.date}</td>
                    <td className="p-3">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.type === "income" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {tx.type === "income" ? "Ingreso" : "Gasto"}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{CATEGORY_LABELS[tx.category] || tx.category || "-"}</td>
                    <td className="p-3">
                      <div className="max-w-[200px] truncate text-xs">{tx.description}</div>
                      {tx.attachments?.length > 0 && <Paperclip size={10} className="inline text-muted-foreground ml-1" />}
                      {tx.labels?.length > 0 && tx.labels.map((l, i) => <Badge key={i} variant="outline" className="ml-1 text-[9px] py-0 px-1.5">{l}</Badge>)}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{tx.contact_name || "-"}</td>
                    <td className="p-3 text-right font-mono text-xs">{fmt(tx.base_amount)}</td>
                    <td className="p-3 text-right font-mono text-xs text-muted-foreground">{tx.iva_rate}% ({fmt(tx.iva_amount)})</td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)} EUR
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={`text-[9px] ${(STATUS_OPTIONS.find(s => s.value === tx.status) || STATUS_OPTIONS[0]).color}`}>{(STATUS_OPTIONS.find(s => s.value === tx.status) || STATUS_OPTIONS[0]).label}</Badge>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical size={14} /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTx(tx)}><Edit2 size={12} className="mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteTx(tx.id)} className="text-red-400"><Trash2 size={12} className="mr-2" />Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingTx && (
            <Dialog open={!!editingTx} onOpenChange={() => setEditingTx(null)}>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Transaccion</DialogTitle><DialogDescription>Modifica los datos</DialogDescription></DialogHeader>
                <TransactionForm initial={editingTx} onSave={() => { setEditingTx(null); fetchAll(); }} isEdit />
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* IVA TAB */}
        <TabsContent value="iva" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard icon={<ArrowUpRight size={20} />} label="IVA Repercutido" value={fmt(summary.income_iva)} sub="IVA en ventas" color="text-emerald-400" bg="bg-emerald-500/10" testId="iva-repercutido" />
            <SummaryCard icon={<ArrowDownLeft size={20} />} label="IVA Soportado" value={fmt(summary.expense_iva)} sub="IVA en compras" color="text-red-400" bg="bg-red-500/10" testId="iva-soportado" />
            <SummaryCard icon={<DollarSign size={20} />} label="Resultado IVA" value={fmt(summary.iva_balance)} sub={summary.iva_balance >= 0 ? "A pagar a Hacienda" : "A compensar"} color={summary.iva_balance >= 0 ? "text-amber-400" : "text-emerald-400"} bg="bg-amber-500/10" testId="iva-balance" />
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Resumen Trimestral IVA (Modelo 303)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Trimestre</th>
                  <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Base Imponible (Ventas)</th>
                  <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground">IVA Repercutido</th>
                  <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Base Imponible (Compras)</th>
                  <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground">IVA Soportado</th>
                  <th className="text-right p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Resultado</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Operaciones</th>
                </tr></thead>
                <tbody>
                  {ivaData.map(q => (
                    <tr key={q.quarter} className="border-b border-border/50 hover:bg-secondary/20" data-testid={`iva-row-${q.quarter}`}>
                      <td className="p-3 font-semibold">{q.quarter}</td>
                      <td className="p-3 text-right font-mono text-xs">{fmt(q.base_income)}</td>
                      <td className="p-3 text-right font-mono text-xs text-emerald-400">{fmt(q.iva_repercutido)}</td>
                      <td className="p-3 text-right font-mono text-xs">{fmt(q.base_expense)}</td>
                      <td className="p-3 text-right font-mono text-xs text-red-400">{fmt(q.iva_soportado)}</td>
                      <td className={`p-3 text-right font-mono text-xs font-bold ${q.iva_result >= 0 ? "text-amber-400" : "text-emerald-400"}`}>{fmt(q.iva_result)}</td>
                      <td className="p-3 text-center text-muted-foreground">{q.tx_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">IVA Trimestral</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ivaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => `${fmt(v)} EUR`} />
                <Bar dataKey="iva_repercutido" name="Repercutido" fill="#00ff84" radius={[4, 4, 0, 0]} />
                <Bar dataKey="iva_soportado" name="Soportado" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* SUPPLIER PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{supplierPayments.length} pagos programados</p>
            <Dialog open={showNewPayment} onOpenChange={setShowNewPayment}>
              <DialogTrigger asChild>
                <Button className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="new-payment-btn"><Plus size={16} className="mr-2" />Nuevo Pago</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nuevo Pago a Proveedor</DialogTitle><DialogDescription>Programa un pago</DialogDescription></DialogHeader>
                <PaymentForm onSave={() => { setShowNewPayment(false); fetchAll(); }} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3">
            {supplierPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-lg">Sin pagos programados</div>
            ) : supplierPayments.map(pay => (
              <div key={pay.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors" data-testid={`payment-${pay.id}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pay.status === "paid" ? "bg-emerald-500/10" : pay.status === "cancelled" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                    {pay.status === "paid" ? <CheckCircle2 size={18} className="text-emerald-400" /> : pay.status === "cancelled" ? <XCircle size={18} className="text-red-400" /> : <Clock size={18} className="text-amber-400" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{pay.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">{pay.reference} {pay.due_date && `- Vence: ${pay.due_date}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm">{fmt(pay.amount)} {pay.currency}</p>
                    <Badge className={`text-[9px] ${(STATUS_OPTIONS.find(s => s.value === pay.status) || { color: "bg-zinc-500/20 text-zinc-400" }).color}`}>
                      {pay.status === "scheduled" ? "Programado" : pay.status === "pending" ? "Pendiente" : pay.status === "paid" ? "Pagado" : "Cancelado"}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical size={14} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {pay.status !== "paid" && <DropdownMenuItem onClick={() => handleMarkPaymentPaid(pay)}><CheckCircle2 size={12} className="mr-2" />Marcar como pagado</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => handleDeletePayment(pay.id)} className="text-red-400"><Trash2 size={12} className="mr-2" />Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, sub, color, bg, testId }) => (
  <div className="bg-card border border-border rounded-lg p-4" data-testid={testId}>
    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${color} mb-3`}>{icon}</div>
    <p className={`text-2xl font-bold font-mono ${color}`}>{value} <span className="text-xs text-muted-foreground">EUR</span></p>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const TransactionForm = ({ initial, onSave, isEdit }) => {
  const [form, setForm] = useState({
    type: "expense", base_amount: "", iva_rate: "21", description: "", category: "", reference: "",
    payment_method: "", status: "pending", date: new Date().toISOString().split("T")[0],
    due_date: "", contact_name: "", notes: "", labels: "", ...initial,
    base_amount: initial?.base_amount?.toString() || "",
    iva_rate: initial?.iva_rate?.toString() || "21",
    labels: initial?.labels?.join(", ") || ""
  });
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState(initial?.attachments || []);
  const [saving, setSaving] = useState(false);

  const base = parseFloat(form.base_amount) || 0;
  const ivaRate = parseFloat(form.iva_rate) || 0;
  const ivaAmount = Math.round(base * ivaRate) / 100;
  const total = base + ivaAmount;

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await axios.post(`${API}/files/upload`, fd, { headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "multipart/form-data" } });
        setAttachments(prev => [...prev, { id: res.data.id, filename: res.data.filename, url: res.data.url, size: res.data.size, content_type: res.data.content_type }]);
      }
      toast.success("Archivo adjuntado");
    } catch { toast.error("Error al subir archivo"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.base_amount || !form.description) { toast.error("Completa importe base y descripcion"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form, base_amount: base, iva_rate: ivaRate, iva_amount: ivaAmount, amount: total,
        labels: form.labels ? form.labels.split(",").map(l => l.trim()).filter(Boolean) : [],
        attachments
      };
      if (isEdit) {
        await axios.put(`${API}/accounting/transactions/${initial.id}`, payload, authHeaders());
        toast.success("Transaccion actualizada");
      } else {
        await axios.post(`${API}/accounting/transactions`, payload, authHeaders());
        toast.success("Transaccion creada");
      }
      onSave();
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  };

  const categories = form.type === "income"
    ? ["ventas", "servicios", "comisiones", "otros_ingresos", "devolucion_proveedor"]
    : ["mercancia", "flete", "aduanas", "seguro", "almacenaje", "transporte_local", "servicios_profesionales", "personal", "oficina", "marketing", "impuestos", "financieros", "otros_gastos"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, category: "" }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="tx-type-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Ingreso</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="tx-category-select"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Descripcion</Label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary/50" data-testid="tx-description" required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Base Imponible</Label>
          <Input type="number" step="0.01" value={form.base_amount} onChange={e => setForm(f => ({ ...f, base_amount: e.target.value }))} className="bg-secondary/50 font-mono" data-testid="tx-base-amount" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Tipo IVA (%)</Label>
          <Select value={form.iva_rate} onValueChange={v => setForm(f => ({ ...f, iva_rate: v }))}>
            <SelectTrigger className="bg-secondary/50 font-mono" data-testid="tx-iva-select"><SelectValue /></SelectTrigger>
            <SelectContent>{IVA_RATES.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</Label>
          <div className="bg-secondary/30 border border-border rounded-md px-3 h-10 flex items-center font-mono text-sm font-bold text-[#00ff84]">{fmt(total)} EUR</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fecha</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary/50" data-testid="tx-date" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fecha Vencimiento</Label>
          <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="bg-secondary/50" data-testid="tx-due-date" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Metodo de Pago</Label>
          <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="tx-payment-method"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Estado</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="tx-status-select"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Contacto</Label>
          <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="bg-secondary/50" placeholder="Nombre del contacto" data-testid="tx-contact" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Referencia</Label>
          <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="bg-secondary/50" placeholder="Ej: INV-001" data-testid="tx-reference" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Etiquetas (separadas por coma)</Label>
        <Input value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} className="bg-secondary/50" placeholder="importacion, urgente" data-testid="tx-labels" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Notas</Label>
        <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary/50" data-testid="tx-notes" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Adjuntos</Label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-xs">
            <Upload size={14} />{uploading ? "Subiendo..." : "Adjuntar archivo"}
            <input type="file" className="hidden" onChange={handleFileUpload} multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.csv,.eml" data-testid="tx-file-upload" />
          </label>
        </div>
        {attachments.length > 0 && (
          <div className="space-y-1 mt-2">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-secondary/30 rounded px-2 py-1">
                <Paperclip size={10} /><span className="truncate flex-1">{a.filename}</span>
                <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><XCircle size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Button type="submit" disabled={saving} className="w-full bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="tx-submit-btn">
        {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : isEdit ? "Actualizar" : "Crear Transaccion"}
      </Button>
    </form>
  );
};

const PaymentForm = ({ onSave }) => {
  const [form, setForm] = useState({
    supplier_name: "", amount: "", currency: "EUR", payment_method: "transfer",
    status: "scheduled", due_date: "", reference: "", notes: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_name || !form.amount) { toast.error("Completa proveedor e importe"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/supplier-payments`, { ...form, amount: parseFloat(form.amount) }, authHeaders());
      toast.success("Pago programado");
      onSave();
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Proveedor</Label>
        <Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} className="bg-secondary/50" required data-testid="pay-supplier" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Importe</Label>
          <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-secondary/50 font-mono" required data-testid="pay-amount" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Metodo de Pago</Label>
          <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="pay-method"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fecha Vencimiento</Label>
          <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="bg-secondary/50" data-testid="pay-due-date" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Referencia</Label>
          <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="bg-secondary/50" data-testid="pay-reference" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Notas</Label>
        <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary/50" data-testid="pay-notes" />
      </div>
      <Button type="submit" disabled={saving} className="w-full bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="pay-submit-btn">
        {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Programar Pago"}
      </Button>
    </form>
  );
};

export default AccountingPage;
