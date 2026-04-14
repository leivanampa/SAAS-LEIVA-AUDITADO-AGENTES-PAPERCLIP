import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";

const AGENT_LABELS = {
  "ceo-agent": { label: "CEO", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  "logistics-agent": { label: "Logística", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "imports-agent": { label: "Importaciones", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "suppliers-agent": { label: "Proveedores", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  "finance-agent": { label: "Finanzas", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  "customer-agent": { label: "Clientes", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

const STATUS_STYLES = {
  queued:    "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  running:   "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed:    "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-600/20 text-zinc-500 border-zinc-600/30",
};

const Badge = ({ text, colorClass }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold font-barlow uppercase tracking-wider ${colorClass}`}>
    {text}
  </span>
);

const formatDuration = (ms) => {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const formatCost = (usd) => {
  if (!usd) return "$0.00";
  return `$${usd.toFixed(4)}`;
};

const formatTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

// ── Task Detail Modal ────────────────────────────────────────────────────────
const TaskModal = ({ task, logs, onClose }) => {
  if (!task) return null;
  const agentInfo = AGENT_LABELS[task.agent_id] || { label: task.agent_id, color: "bg-zinc-500/20 text-zinc-400" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Badge text={agentInfo.label} colorClass={agentInfo.color} />
            <span className="text-sm font-medium text-foreground">{task.task_type}</span>
            <Badge text={task.status} colorClass={STATUS_STYLES[task.status] || STATUS_STYLES.cancelled} />
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-secondary/30 rounded p-3">
              <div className="text-zinc-500 mb-1">Tokens</div>
              <div className="font-bold text-foreground">{task.tokens_used?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-secondary/30 rounded p-3">
              <div className="text-zinc-500 mb-1">Coste</div>
              <div className="font-bold text-foreground">{formatCost(task.cost_usd)}</div>
            </div>
            <div className="bg-secondary/30 rounded p-3">
              <div className="text-zinc-500 mb-1">Duración</div>
              <div className="font-bold text-foreground">{formatDuration(task.duration_ms)}</div>
            </div>
          </div>

          {task.result?.summary && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Resultado</div>
              <div className="bg-secondary/30 rounded p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {task.result.summary}
              </div>
            </div>
          )}

          {task.error && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-2">Error</div>
              <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400">
                {task.error}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Log de ejecución</div>
              <div className="bg-secondary/30 rounded p-3 max-h-48 overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="text-[11px] font-mono flex gap-2">
                    <span className="text-zinc-600 shrink-0">{formatTime(log.timestamp)}</span>
                    <span className={`shrink-0 ${log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-amber-400' : log.level === 'tool_call' ? 'text-blue-400' : 'text-zinc-500'}`}>
                      [{log.level}]
                    </span>
                    <span className="text-foreground truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function AgentsDashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [agentStatus, setAgentStatus] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [triggerForm, setTriggerForm] = useState({ agent_id: "ceo-agent", task_type: "daily_business_digest", context: "{}" });

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filterAgent) params.set("agent_id", filterAgent);
      if (filterStatus) params.set("status", filterStatus);

      const [tasksRes, approvalsRes, statusRes] = await Promise.all([
        apiClient.get(`/agents/tasks?${params}`),
        apiClient.get("/agents/approvals"),
        apiClient.get("/agents/status"),
      ]);
      setTasks(tasksRes.data);
      setApprovals(approvalsRes.data);
      setAgentStatus(statusRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterAgent, filterStatus]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const openTask = async (task) => {
    setSelectedTask(task);
    try {
      const res = await apiClient.get(`/agents/logs/${task.task_id}`);
      setTaskLogs(res.data);
    } catch {
      setTaskLogs([]);
    }
  };

  const retryTask = async (taskId) => {
    try {
      await apiClient.post(`/agents/tasks/${taskId}/retry`);
      toast.success("Tarea re-encolada");
      fetchAll();
    } catch {
      toast.error("Error al reintentar la tarea");
    }
  };

  const handleApproval = async (approvalId, action) => {
    try {
      await apiClient.post(`/agents/approvals/${approvalId}/${action}`, { reviewer_notes: "" });
      toast.success(action === "approve" ? "Acción aprobada" : "Acción rechazada");
      fetchAll();
    } catch {
      toast.error("Error al procesar la aprobación");
    }
  };

  const triggerAgent = async () => {
    try {
      let contextObj = {};
      try { contextObj = JSON.parse(triggerForm.context); } catch { toast.error("Contexto JSON inválido"); return; }
      await apiClient.post("/agents/tasks", {
        agent_id: triggerForm.agent_id,
        task_type: triggerForm.task_type,
        context: contextObj,
        triggered_by: "manual",
      });
      toast.success("Tarea creada");
      setTriggerModalOpen(false);
      fetchAll();
    } catch {
      toast.error("Error al crear la tarea");
    }
  };

  // Aggregate monthly cost
  const monthlyCost = tasks.reduce((sum, t) => sum + (t.cost_usd || 0), 0);
  const totalTokens = tasks.reduce((sum, t) => sum + (t.tokens_used || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-barlow text-foreground">Agentes IA</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Empresa autónoma de agentes — Leivas Import</p>
        </div>
        <button
          onClick={() => setTriggerModalOpen(true)}
          className="flex items-center gap-2 bg-[#00ff84] text-black font-bold text-sm px-4 py-2 rounded hover:bg-[#00ff84]/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3l14 9-14 9V3z"/></svg>
          Ejecutar Agente
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tareas hoy", value: tasks.filter(t => t.created_at?.startsWith(new Date().toISOString().slice(0,10))).length },
          { label: "En ejecución", value: tasks.filter(t => t.status === "running").length },
          { label: "Aprobaciones pendientes", value: approvals.filter(a => a.status === "pending").length },
          { label: "Coste (últimas 50)", value: `$${monthlyCost.toFixed(4)}` },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-barlow">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Agent Status Cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">Estado de Agentes</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.keys(AGENT_LABELS).map(agentId => {
            const info = AGENT_LABELS[agentId];
            const stats = agentStatus[agentId] || {};
            return (
              <div key={agentId} className="bg-card border border-border rounded-sm p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge text={info.label} colorClass={info.color} />
                  <span className="text-xs text-zinc-500">{agentId}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div><span className="text-zinc-600">Total: </span><span className="text-foreground">{stats.total || 0}</span></div>
                  <div><span className="text-zinc-600">OK: </span><span className="text-green-400">{stats.completed || 0}</span></div>
                  <div><span className="text-zinc-600">Err: </span><span className="text-red-400">{stats.failed || 0}</span></div>
                </div>
                {stats.total > 0 && (
                  <div className="text-[10px] text-zinc-500">
                    Éxito: {stats.success_rate}% · ${(stats.total_cost_usd || 0).toFixed(4)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Approvals */}
      {approvals.filter(a => a.status === "pending").length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-3">
            Aprobaciones Pendientes ({approvals.filter(a => a.status === "pending").length})
          </h2>
          <div className="space-y-2">
            {approvals.filter(a => a.status === "pending").map(approval => (
              <div key={approval.approval_id} className="bg-card border border-amber-500/30 rounded-sm p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge text={AGENT_LABELS[approval.agent_id]?.label || approval.agent_id} colorClass={AGENT_LABELS[approval.agent_id]?.color || ""} />
                    <span className="text-xs text-zinc-500">{approval.type}</span>
                    <span className="text-xs text-zinc-600">{formatTime(approval.created_at)}</span>
                  </div>
                  {approval.payload?.subject && (
                    <div className="text-sm text-foreground">
                      <span className="text-zinc-500">Para: </span>{approval.payload.to} &nbsp;·&nbsp;
                      <span className="text-zinc-500">Asunto: </span>{approval.payload.subject}
                    </div>
                  )}
                  {approval.payload?.body_text && (
                    <div className="text-xs text-zinc-400 mt-1 truncate">{approval.payload.body_text.slice(0, 120)}…</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApproval(approval.approval_id, "approve")}
                    className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded hover:bg-green-500/30 transition-colors">
                    Aprobar
                  </button>
                  <button onClick={() => handleApproval(approval.approval_id, "reject")}
                    className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors">
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Tareas Recientes</h2>
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground">
            <option value="">Todos los agentes</option>
            {Object.entries(AGENT_LABELS).map(([id, { label }]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground">
            <option value="">Todos los estados</option>
            {["queued","running","completed","failed","cancelled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={fetchAll} className="text-xs text-zinc-500 hover:text-foreground ml-auto transition-colors">
            Actualizar
          </button>
        </div>

        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-secondary/30">
              <tr>
                {["Agente","Tipo de tarea","Estado","Tokens","Coste","Duración","Creado",""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-600">No hay tareas todavía</td>
                </tr>
              ) : tasks.map(task => {
                const agentInfo = AGENT_LABELS[task.agent_id] || { label: task.agent_id, color: "bg-zinc-500/20 text-zinc-400" };
                return (
                  <tr key={task.task_id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => openTask(task)}>
                    <td className="px-3 py-2.5">
                      <Badge text={agentInfo.label} colorClass={agentInfo.color} />
                    </td>
                    <td className="px-3 py-2.5 text-foreground max-w-[180px] truncate">{task.task_type}</td>
                    <td className="px-3 py-2.5">
                      <Badge text={task.status} colorClass={STATUS_STYLES[task.status] || STATUS_STYLES.cancelled} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{task.tokens_used?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatCost(task.cost_usd)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatDuration(task.duration_ms)}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{formatTime(task.created_at)}</td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {task.status === "failed" && (
                        <button onClick={() => retryTask(task.task_id)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 underline transition-colors">
                          Reintentar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskModal task={selectedTask} logs={taskLogs} onClose={() => setSelectedTask(null)} />
      )}

      {/* Trigger Agent Modal */}
      {triggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Ejecutar Agente Manualmente</h3>
              <button onClick={() => setTriggerModalOpen(false)} className="text-zinc-500 hover:text-foreground">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Agente</label>
                <select value={triggerForm.agent_id} onChange={e => setTriggerForm(f => ({...f, agent_id: e.target.value}))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground">
                  {Object.entries(AGENT_LABELS).map(([id, { label }]) => (
                    <option key={id} value={id}>{label} ({id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Tipo de tarea</label>
                <input value={triggerForm.task_type} onChange={e => setTriggerForm(f => ({...f, task_type: e.target.value}))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Contexto (JSON)</label>
                <textarea value={triggerForm.context} onChange={e => setTriggerForm(f => ({...f, context: e.target.value}))}
                  rows={4}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground resize-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setTriggerModalOpen(false)}
                  className="text-sm px-4 py-2 border border-border rounded text-zinc-400 hover:text-foreground transition-colors">
                  Cancelar
                </button>
                <button onClick={triggerAgent}
                  className="text-sm px-4 py-2 bg-[#00ff84] text-black font-bold rounded hover:bg-[#00ff84]/90 transition-colors">
                  Ejecutar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
