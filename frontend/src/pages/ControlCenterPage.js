/**
 * Centro de Control 360° — Leivas Import
 *
 * Visión en tiempo real de toda la actividad de los agentes IA:
 *  - Feed de actividad en vivo (SSE)
 *  - Aprobaciones financieras pendientes (bloqueo obligatorio)
 *  - Borradores de email pendientes de revisión
 *  - Presupuestos por agente con configuración de límites
 *  - Tareas en ejecución y recientes
 *  - Panel de errores e incidencias 24h
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";

// ── Agent meta ────────────────────────────────────────────────────────────────
const AGENTS = {
  "ceo-agent":       { label: "CEO",           emoji: "🧠", color: "#a855f7" },
  "logistics-agent": { label: "Logística",     emoji: "🚢", color: "#3b82f6" },
  "imports-agent":   { label: "Importaciones", emoji: "📦", color: "#f59e0b" },
  "suppliers-agent": { label: "Proveedores",   emoji: "🤝", color: "#f97316" },
  "finance-agent":   { label: "Finanzas",      emoji: "💶", color: "#22c55e" },
  "customer-agent":  { label: "Clientes",      emoji: "👤", color: "#ec4899" },
};

const SEVERITY_STYLES = {
  info:    { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   dot: "bg-blue-400"   },
  success: { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20",  dot: "bg-green-400"  },
  warning: { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20",  dot: "bg-amber-400"  },
  error:   { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    dot: "bg-red-500"    },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmt = {
  time: (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 60000) return "hace " + Math.round(diffMs / 1000) + "s";
    if (diffMs < 3600000) return "hace " + Math.round(diffMs / 60000) + "m";
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  },
  eur: (n) => n != null ? `€${Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2 })}` : "€0,00",
  usd: (n) => n != null ? `$${Number(n).toFixed(4)}` : "$0.0000",
  pct: (n) => `${Number(n || 0).toFixed(1)}%`,
};

// ── Sub-components ────────────────────────────────────────────────────────────

const AgentBadge = ({ agentId, size = "sm" }) => {
  const a = AGENTS[agentId] || { label: agentId, emoji: "🤖", color: "#6b7280" };
  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded border font-bold uppercase tracking-wider ${px}`}
      style={{ background: a.color + "20", color: a.color, borderColor: a.color + "40" }}>
      {a.emoji} {a.label}
    </span>
  );
};

const SeverityDot = ({ severity }) => {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${s.dot} ${severity === "error" ? "animate-pulse" : ""}`} />;
};

const SectionTitle = ({ children, count, alert }) => (
  <div className="flex items-center gap-2 mb-3">
    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{children}</h2>
    {count != null && (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${alert && count > 0 ? "bg-red-500 text-white animate-pulse" : "bg-zinc-700 text-zinc-300"}`}>
        {count}
      </span>
    )}
  </div>
);

// ── Budget Bar ─────────────────────────────────────────────────────────────────
const BudgetBar = ({ budget, onEdit }) => {
  const a = AGENTS[budget.agent_id] || { label: budget.agent_id, emoji: "🤖", color: "#6b7280" };
  const pct = Math.min(budget.usage_pct || 0, 100);
  const exceeded = budget.limit_exceeded;
  const barColor = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : a.color;

  return (
    <div className="bg-card border border-border rounded-sm p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{a.emoji}</span>
          <div>
            <div className="text-xs font-bold text-foreground">{a.label}</div>
            <div className="text-[10px] text-zinc-500">{budget.agent_id}</div>
          </div>
        </div>
        <button onClick={() => onEdit(budget)}
          className="text-[10px] text-zinc-500 hover:text-[#00ff84] transition-colors underline">
          Configurar
        </button>
      </div>
      {/* API cost bar */}
      <div>
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>API {fmt.usd(budget.current_month_spent_usd)} / {fmt.usd(budget.monthly_api_limit_usd)}</span>
          <span className={exceeded ? "text-red-400 font-bold" : ""}>{fmt.pct(pct)}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
      {/* Financial limit */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-500">Límite financiero</span>
        <span className={budget.can_propose_payments ? "text-amber-400 font-bold" : "text-green-400"}>
          {budget.can_propose_payments
            ? (budget.financial_action_limit_eur === 0 ? "Todo requiere aprobación ✓" : `€${budget.financial_action_limit_eur} → aprobación`)
            : "No puede proponer pagos 🔒"}
        </span>
      </div>
    </div>
  );
};

// ── Budget Edit Modal ──────────────────────────────────────────────────────────
const BudgetModal = ({ budget, onSave, onClose }) => {
  const [form, setForm] = useState({
    monthly_api_limit_usd: budget.monthly_api_limit_usd || 10,
    per_task_limit_usd: budget.per_task_limit_usd || 1,
    financial_action_limit_eur: budget.financial_action_limit_eur ?? 0,
    can_propose_payments: budget.can_propose_payments || false,
    alert_threshold_pct: budget.alert_threshold_pct || 80,
    active: budget.active !== false,
  });

  const a = AGENTS[budget.agent_id] || { label: budget.agent_id, emoji: "🤖" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">{a.emoji}</span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Configurar Presupuesto</h3>
              <p className="text-[11px] text-zinc-500">{budget.agent_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Límite mensual API (USD)</label>
              <input type="number" step="0.5" min="0"
                value={form.monthly_api_limit_usd}
                onChange={e => setForm(f => ({...f, monthly_api_limit_usd: parseFloat(e.target.value)}))}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Límite por tarea (USD)</label>
              <input type="number" step="0.1" min="0"
                value={form.per_task_limit_usd}
                onChange={e => setForm(f => ({...f, per_task_limit_usd: parseFloat(e.target.value)}))}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 space-y-3">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">⚠ Control de pagos</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.can_propose_payments}
                onChange={e => setForm(f => ({...f, can_propose_payments: e.target.checked}))}
                className="w-4 h-4 accent-amber-400" />
              <span className="text-xs text-foreground">Puede proponer pagos (requiere aprobación siempre)</span>
            </label>
            {form.can_propose_payments && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Límite por acción financiera (EUR) — 0 = siempre aprobación
                </label>
                <input type="number" step="100" min="0"
                  value={form.financial_action_limit_eur}
                  onChange={e => setForm(f => ({...f, financial_action_limit_eur: parseFloat(e.target.value)}))}
                  className="w-full bg-secondary border border-amber-500/30 rounded px-3 py-2 text-sm text-foreground" />
                <p className="text-[10px] text-amber-400/70 mt-1">Recomendado: 0 — todos los pagos requieren tu aprobación</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Alerta al alcanzar (% del límite mensual)
            </label>
            <input type="number" step="5" min="50" max="100"
              value={form.alert_threshold_pct}
              onChange={e => setForm(f => ({...f, alert_threshold_pct: parseFloat(e.target.value)}))}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose}
              className="text-sm px-4 py-2 border border-border rounded text-zinc-400 hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button onClick={() => onSave(budget.agent_id, form)}
              className="text-sm px-4 py-2 bg-[#00ff84] text-black font-bold rounded hover:bg-[#00ff84]/90 transition-colors">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Financial Approval Card ────────────────────────────────────────────────────
const FinancialApprovalCard = ({ approval, onApprove, onReject }) => {
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border-2 border-amber-500/50 rounded-sm overflow-hidden">
      <div className="bg-amber-500/10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-sm">💶 PAGO PENDIENTE DE APROBACIÓN</span>
          <AgentBadge agentId={approval.agent_id} />
        </div>
        <span className="text-[10px] text-amber-400/70">{fmt.time(approval.created_at)}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-2xl font-bold text-amber-400">{fmt.eur(approval.amount_eur)}</div>
            <div className="text-sm text-foreground mt-0.5">{approval.description}</div>
            {approval.recipient && (
              <div className="text-xs text-zinc-500 mt-1">
                <span className="text-zinc-600">Para: </span>{approval.recipient}
                {approval.reference && <> &nbsp;·&nbsp; <span className="text-zinc-600">Ref: </span>{approval.reference}</>}
              </div>
            )}
          </div>
          <span className="text-[10px] bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded uppercase tracking-wider">
            {approval.action_type}
          </span>
        </div>

        {approval.context && Object.keys(approval.context).length > 0 && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-zinc-500 hover:text-foreground underline transition-colors">
            {expanded ? "Ocultar contexto" : "Ver contexto completo"}
          </button>
        )}
        {expanded && (
          <pre className="text-[10px] font-mono bg-secondary/50 rounded p-3 overflow-auto max-h-32 text-zinc-400">
            {JSON.stringify(approval.context, null, 2)}
          </pre>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Notas (opcional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Añadir nota de revisión..."
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => onApprove(approval.approval_id, notes)}
            className="flex-1 bg-green-500/20 text-green-400 border border-green-500/40 font-bold text-sm py-2.5 rounded hover:bg-green-500/30 transition-colors">
            ✅ APROBAR PAGO
          </button>
          <button onClick={() => onReject(approval.approval_id, notes)}
            className="flex-1 bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-sm py-2.5 rounded hover:bg-red-500/30 transition-colors">
            ❌ RECHAZAR
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Activity Feed Item ─────────────────────────────────────────────────────────
const ActivityItem = ({ event }) => {
  const s = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info;
  const a = AGENTS[event.agent_id] || { emoji: "🤖" };

  return (
    <div className={`flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0`}>
      <SeverityDot severity={event.severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px]">{a.emoji}</span>
          <span className={`text-xs font-medium ${s.text} truncate`}>{event.title}</span>
        </div>
        {event.detail && (
          <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{event.detail}</div>
        )}
      </div>
      <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">{fmt.time(event.timestamp)}</span>
    </div>
  );
};

// ── Email Draft Card ───────────────────────────────────────────────────────────
const EmailDraftCard = ({ draft, onApprove, onReject }) => (
  <div className="bg-card border border-border rounded-sm p-3 space-y-2">
    <div className="flex items-center justify-between">
      <AgentBadge agentId={draft.agent_id} />
      <span className="text-[10px] text-zinc-500">{fmt.time(draft.created_at)}</span>
    </div>
    <div className="text-xs">
      <span className="text-zinc-500">Para: </span>
      <span className="text-foreground">{draft.payload?.to}</span>
    </div>
    <div className="text-xs">
      <span className="text-zinc-500">Asunto: </span>
      <span className="text-foreground font-medium">{draft.payload?.subject}</span>
    </div>
    {draft.payload?.body_text && (
      <div className="text-[10px] text-zinc-400 bg-secondary/30 rounded p-2 line-clamp-3">
        {draft.payload.body_text.slice(0, 200)}…
      </div>
    )}
    <div className="flex gap-2 pt-1">
      <button onClick={() => onApprove(draft.approval_id)}
        className="flex-1 text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 py-1.5 rounded hover:bg-green-500/25 transition-colors font-bold">
        ✅ Enviar email
      </button>
      <button onClick={() => onReject(draft.approval_id)}
        className="flex-1 text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 py-1.5 rounded hover:bg-red-500/25 transition-colors font-bold">
        ❌ Descartar
      </button>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ControlCenterPage() {
  const [summary, setSummary] = useState(null);
  const [liveActivity, setLiveActivity] = useState([]);
  const [budgetEdit, setBudgetEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const activityRef = useRef(null);
  const sseRef = useRef(null);

  // ── Fetch full summary ───────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiClient.get("/agents/control-center/summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Summary fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── SSE: real-time activity stream ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const url = `${backendUrl}/api/agents/activity/stream`;

    // SSE doesn't support custom headers in browser — pass token as query param
    // The backend should accept ?token=... as fallback (or use polling below)
    // For now use EventSource with credentials
    const es = new EventSource(url, { withCredentials: false });
    sseRef.current = es;

    es.onopen = () => setSseConnected(true);
    es.onerror = () => {
      setSseConnected(false);
      // Fallback: poll /activity every 3s
    };
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "connected") return;
        setLiveActivity(prev => [event, ...prev].slice(0, 200));
        // Auto-refresh summary on financial events
        if (["financial_approval_requested", "task_completed", "task_failed"].includes(event.event_type)) {
          fetchSummary();
        }
      } catch { /* ignore parse errors */ }
    };

    return () => es.close();
  }, [fetchSummary]);

  // ── Polling fallback (also used to keep summary fresh) ──────────────────────
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Also poll activity feed directly (covers SSE failures)
  useEffect(() => {
    const pollActivity = async () => {
      try {
        const res = await apiClient.get("/agents/activity?limit=80");
        setLiveActivity(res.data);
      } catch { /* ignore */ }
    };
    pollActivity();
    const interval = setInterval(pollActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Approval handlers ────────────────────────────────────────────────────────
  const handleFinancialApprove = async (id, notes) => {
    try {
      await apiClient.post(`/agents/financial-approvals/${id}/approve`, { reviewer_notes: notes });
      toast.success("✅ Pago aprobado");
      fetchSummary();
    } catch { toast.error("Error al aprobar"); }
  };

  const handleFinancialReject = async (id, notes) => {
    try {
      await apiClient.post(`/agents/financial-approvals/${id}/reject`, { reviewer_notes: notes });
      toast.success("Pago rechazado");
      fetchSummary();
    } catch { toast.error("Error al rechazar"); }
  };

  const handleEmailApprove = async (id) => {
    try {
      await apiClient.post(`/agents/approvals/${id}/approve`, { reviewer_notes: "" });
      toast.success("✅ Email aprobado para envío");
      fetchSummary();
    } catch { toast.error("Error al aprobar email"); }
  };

  const handleEmailReject = async (id) => {
    try {
      await apiClient.post(`/agents/approvals/${id}/reject`, { reviewer_notes: "Descartado desde Centro de Control" });
      toast.success("Email descartado");
      fetchSummary();
    } catch { toast.error("Error al descartar email"); }
  };

  const handleBudgetSave = async (agentId, form) => {
    try {
      await apiClient.put(`/agents/budgets/${agentId}`, { agent_id: agentId, ...form });
      toast.success("Presupuesto actualizado");
      setBudgetEdit(null);
      fetchSummary();
    } catch { toast.error("Error al guardar presupuesto"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const alerts = summary?.alerts || {};
  const costs = summary?.costs || {};
  const financialPending = summary?.financial_approvals_pending || [];
  const emailDraftsPending = summary?.email_drafts_pending || [];
  const runningTasks = summary?.running_tasks || [];
  const budgets = summary?.budgets || [];
  const errors24h = summary?.errors_24h || [];
  const failedTasks = summary?.failed_tasks_24h || [];

  const totalPendingActions = financialPending.length + emailDraftsPending.length;
  const totalMonthEur = financialPending.reduce((s, a) => s + (a.amount_eur || 0), 0);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-barlow text-foreground flex items-center gap-2">
            🎛 Centro de Control 360°
            {sseConnected && (
              <span className="text-[10px] font-normal bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                EN VIVO
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Visión global de los agentes IA — toda acción requiere tu aprobación</p>
        </div>
        <button onClick={fetchSummary}
          className="text-xs text-zinc-500 hover:text-foreground border border-border rounded px-3 py-1.5 transition-colors">
          ↻ Actualizar
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Aprobaciones pendientes",
            value: totalPendingActions,
            sub: totalPendingActions > 0 ? "⚠ Acción requerida" : "Todo al día",
            alert: totalPendingActions > 0,
            color: totalPendingActions > 0 ? "#f59e0b" : "#22c55e",
          },
          {
            label: "Pagos en espera",
            value: fmt.eur(totalMonthEur),
            sub: `${financialPending.length} operación${financialPending.length !== 1 ? "es" : ""}`,
            alert: financialPending.length > 0,
            color: financialPending.length > 0 ? "#f59e0b" : "#6b7280",
          },
          {
            label: "Agentes activos ahora",
            value: runningTasks.length,
            sub: runningTasks.map(t => (AGENTS[t.agent_id]?.emoji || "🤖")).join(" ") || "Ninguno",
            alert: false,
            color: runningTasks.length > 0 ? "#3b82f6" : "#6b7280",
          },
          {
            label: "Errores 24h",
            value: errors24h.length,
            sub: failedTasks.length > 0 ? `${failedTasks.length} tarea${failedTasks.length !== 1 ? "s" : ""} fallida${failedTasks.length !== 1 ? "s" : ""}` : "Sin incidencias",
            alert: errors24h.length > 0,
            color: errors24h.length > 0 ? "#ef4444" : "#22c55e",
          },
          {
            label: "Coste del mes",
            value: fmt.usd(costs.month_usd),
            sub: `${costs.month_tasks || 0} tareas completadas`,
            alert: false,
            color: "#6b7280",
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-3"
            style={kpi.alert ? { borderColor: kpi.color + "60" } : {}}>
            <div className="text-[10px] uppercase tracking-wider font-barlow mb-1"
              style={{ color: kpi.alert ? kpi.color : "#71717a" }}>{kpi.label}</div>
            <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── URGENT: Financial Approvals ── */}
      {financialPending.length > 0 && (
        <div>
          <SectionTitle count={financialPending.length} alert>
            💶 APROBACIONES FINANCIERAS — REQUIEREN TU DECISIÓN
          </SectionTitle>
          <div className="space-y-3">
            {financialPending.map(a => (
              <FinancialApprovalCard key={a.approval_id} approval={a}
                onApprove={handleFinancialApprove} onReject={handleFinancialReject} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main 3-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Column 1: Activity Feed ── */}
        <div className="lg:col-span-1">
          <SectionTitle count={liveActivity.length}>Feed de actividad en vivo</SectionTitle>
          <div ref={activityRef}
            className="bg-card border border-border rounded-sm overflow-y-auto"
            style={{ maxHeight: "520px" }}>
            <div className="p-3">
              {liveActivity.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs">Sin actividad reciente</div>
              ) : liveActivity.map(event => (
                <ActivityItem key={event.event_id || Math.random()} event={event} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Column 2: Email Drafts + Running Tasks + Errors ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Email drafts */}
          {emailDraftsPending.length > 0 && (
            <div>
              <SectionTitle count={emailDraftsPending.length} alert={emailDraftsPending.length > 0}>
                ✉ Borradores pendientes de revisión
              </SectionTitle>
              <div className="space-y-2">
                {emailDraftsPending.map(d => (
                  <EmailDraftCard key={d.approval_id} draft={d}
                    onApprove={handleEmailApprove} onReject={handleEmailReject} />
                ))}
              </div>
            </div>
          )}

          {/* Running tasks */}
          <div>
            <SectionTitle count={runningTasks.length}>Tareas en ejecución</SectionTitle>
            <div className="space-y-2">
              {runningTasks.length === 0 ? (
                <div className="bg-card border border-border rounded-sm p-4 text-xs text-zinc-600 text-center">
                  Ningún agente activo en este momento
                </div>
              ) : runningTasks.map(task => (
                <div key={task.task_id} className="bg-card border border-blue-500/30 rounded-sm p-3 flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <AgentBadge agentId={task.agent_id} />
                    <div className="text-xs text-foreground mt-1 truncate">{task.task_type}</div>
                    <div className="text-[10px] text-zinc-500">{fmt.time(task.started_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Errors 24h */}
          {(errors24h.length > 0 || failedTasks.length > 0) && (
            <div>
              <SectionTitle count={errors24h.length + failedTasks.length} alert>
                ❌ Incidencias últimas 24h
              </SectionTitle>
              <div className="bg-card border border-red-500/20 rounded-sm p-3 space-y-2 max-h-56 overflow-y-auto">
                {errors24h.map(e => (
                  <div key={e.event_id} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                    <div className="text-xs text-red-400 font-medium">{e.title}</div>
                    {e.detail && <div className="text-[10px] text-zinc-500 truncate">{e.detail}</div>}
                    <div className="text-[10px] text-zinc-600">{e.agent_id} · {fmt.time(e.timestamp)}</div>
                  </div>
                ))}
                {failedTasks.map(t => (
                  <div key={t.task_id} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                    <div className="text-xs text-red-400 font-medium">{t.task_type} — FALLIDA</div>
                    {t.error && <div className="text-[10px] text-zinc-500 truncate">{t.error}</div>}
                    <div className="text-[10px] text-zinc-600">{t.agent_id} · {fmt.time(t.completed_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Column 3: Budget Control ── */}
        <div className="lg:col-span-1">
          <SectionTitle count={alerts.budget_exceeded?.length || 0} alert={alerts.budget_exceeded?.length > 0}>
            💰 Presupuestos y límites
          </SectionTitle>
          <div className="space-y-2">
            {budgets.map(b => (
              <BudgetBar key={b.agent_id} budget={b} onEdit={setBudgetEdit} />
            ))}
          </div>
          <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-sm p-3">
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              🔒 <strong>Control total:</strong> Todos los pagos propuestos por los agentes requieren
              tu aprobación explícita sin excepción. Los límites financieros están a <strong>€0 por defecto</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Budget Edit Modal ── */}
      {budgetEdit && (
        <BudgetModal
          budget={budgetEdit}
          onSave={handleBudgetSave}
          onClose={() => setBudgetEdit(null)}
        />
      )}
    </div>
  );
}
