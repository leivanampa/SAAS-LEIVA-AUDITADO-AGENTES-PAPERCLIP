import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import { Plus, Trash2, Zap, ArrowRight, Bell, Mail, FileText, Lock } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const STAGE_NAMES = {
  1: "Proveedor", 2: "Producto", 3: "Negociacion", 4: "Muestras", 5: "Pedido",
  6: "Produccion", 7: "Logistica", 8: "Aduana", 9: "Entrega Final"
};
const ACTION_TYPES = [
  { value: "notification", label: "Enviar Notificacion", icon: Bell },
  { value: "email", label: "Enviar Email", icon: Mail },
  { value: "lock", label: "Bloquear Expediente", icon: Lock },
  { value: "generate_doc", label: "Generar Documento", icon: FileText }
];

const AutomationsPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/automations`, authHeaders());
      setRules(res.data);
    } catch { toast.error("Error cargando automatizaciones"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const toggleRule = async (rule) => {
    try {
      await axios.put(`${API}/automations/${rule.id}`, { active: !rule.active }, authHeaders());
      fetchRules();
    } catch { toast.error("Error"); }
  };

  const deleteRule = async (id) => {
    try {
      await axios.delete(`${API}/automations/${id}`, authHeaders());
      toast.success("Regla eliminada");
      fetchRules();
    } catch { toast.error("Error"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" data-testid="automations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-3xl font-bold uppercase tracking-tight">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Reglas de negocio automaticas para tu flujo de importacion</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="new-automation-btn">
              <Plus size={16} className="mr-2" />Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nueva Automatizacion</DialogTitle><DialogDescription>Crea una regla que se ejecute automaticamente</DialogDescription></DialogHeader>
            <AutomationForm onSave={() => { setShowNew(false); fetchRules(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-lg">
          <Zap size={40} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay automatizaciones configuradas</p>
          <p className="text-sm text-muted-foreground mt-1">Crea una regla para automatizar tareas en tu pipeline</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const ActionIcon = (ACTION_TYPES.find(a => a.value === rule.action_type) || ACTION_TYPES[0]).icon;
            return (
              <div key={rule.id} className={`bg-card border rounded-lg p-4 transition-all ${rule.active !== false ? "border-border" : "border-border/30 opacity-60"}`} data-testid={`rule-${rule.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#00ff84]/10 flex items-center justify-center">
                      <Zap size={18} className="text-[#00ff84]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[9px]">Etapa {rule.trigger_stage}: {STAGE_NAMES[rule.trigger_stage]}</Badge>
                        <ArrowRight size={10} />
                        <Badge variant="outline" className="text-[9px]"><ActionIcon size={9} className="mr-1" />{(ACTION_TYPES.find(a => a.value === rule.action_type) || {}).label}</Badge>
                      </div>
                      {rule.notification_message && <p className="text-[10px] text-muted-foreground mt-1 italic">"{rule.notification_message}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={rule.active !== false} onCheckedChange={() => toggleRule(rule)} data-testid={`toggle-${rule.id}`} />
                    <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"><Trash2 size={14} /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AutomationForm = ({ onSave }) => {
  const [form, setForm] = useState({
    name: "", trigger_stage: "8", action_type: "notification",
    notification_message: "", email_to: "", active: true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Introduce un nombre"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/automations`, {
        ...form, trigger_stage: parseInt(form.trigger_stage), active: true
      }, authHeaders());
      toast.success("Automatizacion creada");
      onSave();
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nombre de la regla</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary/50" placeholder="Ej: Notificar cuando llegue a Aduana" required data-testid="auto-name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cuando la importacion llegue a</Label>
          <Select value={form.trigger_stage} onValueChange={v => setForm(f => ({ ...f, trigger_stage: v }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="auto-trigger"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>Etapa {k}: {v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Accion</Label>
          <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
            <SelectTrigger className="bg-secondary/50" data-testid="auto-action"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.action_type === "notification" && (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Mensaje de notificacion</Label>
          <Input value={form.notification_message} onChange={e => setForm(f => ({ ...f, notification_message: e.target.value }))} className="bg-secondary/50" placeholder="Texto del mensaje" data-testid="auto-message" />
        </div>
      )}
      {form.action_type === "email" && (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Email destino</Label>
          <Input value={form.email_to} onChange={e => setForm(f => ({ ...f, email_to: e.target.value }))} className="bg-secondary/50" placeholder="destinatario@empresa.com" data-testid="auto-email" />
        </div>
      )}
      <Button type="submit" disabled={saving} className="w-full bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="auto-submit">
        {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Crear Automatizacion"}
      </Button>
    </form>
  );
};

export default AutomationsPage;
