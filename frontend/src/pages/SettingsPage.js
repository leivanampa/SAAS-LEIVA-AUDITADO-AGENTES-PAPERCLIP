import React, { useState, useEffect } from "react";
import { useAuth, apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Bell, Plug, Save, Mail, Building, CheckCircle2, AlertCircle } from "lucide-react";

const FF = ({ label, value, onChange, placeholder, type = "text", disabled = false }) => (
  <div className="space-y-2">
    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</Label>
    <Input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`bg-secondary/50 border-input font-mono text-sm ${disabled ? "opacity-50" : ""}`} />
  </div>
);

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", phone: "", company: "" });
  const [m365, setM365] = useState({ tenant_id: "", client_id: "", client_secret: "", sender_email: "" });
  const [aeat, setAeat] = useState({ certificate_serial: "", nif: "", environment: "test" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingInt, setSavingInt] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || "", phone: user.phone || "", company: user.company || "" });
    }
    loadIntegrations();
  }, [user]);

  const loadIntegrations = async () => {
    try {
      const res = await apiClient.get("/settings/integrations");
      if (res.data.m365) setM365(prev => ({ ...prev, ...res.data.m365 }));
      if (res.data.aeat) setAeat(prev => ({ ...prev, ...res.data.aeat }));
    } catch {}
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiClient.put("/settings/profile", profile);
      toast.success("Perfil actualizado");
    } catch { toast.error("Error al guardar"); }
    finally { setSavingProfile(false); }
  };

  const saveIntegrations = async () => {
    setSavingInt(true);
    try {
      await apiClient.put("/settings/integrations", { m365, aeat });
      toast.success("Configuracion guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSavingInt(false); }
  };

  const tabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "roles", label: "Roles", icon: Shield },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "integrations", label: "Integraciones", icon: Plug },
  ];

  return (
    <div data-testid="settings-page" className="space-y-6">
      <div>
        <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Configuracion</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona tu cuenta y preferencias</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab Nav */}
        <div className="w-full md:w-48 flex md:flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-[#00ff84]/5 text-[#00ff84] border-l-2 border-[#00ff84]"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
              data-testid={`settings-tab-${tab.id}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="stat-card space-y-6" data-testid="settings-profile">
              <h3 className="font-barlow text-lg font-bold uppercase tracking-tight text-white">Perfil de Usuario</h3>
              <Separator className="bg-border" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FF label="Nombre" value={profile.name} onChange={v => setProfile({...profile, name: v})} data-testid="settings-name-input" />
                <FF label="Email" value={user?.email || ""} onChange={() => {}} disabled data-testid="settings-email-input" />
                <FF label="Telefono" value={profile.phone} onChange={v => setProfile({...profile, phone: v})} placeholder="+34 600 000 000" />
                <FF label="Empresa" value={profile.company} onChange={v => setProfile({...profile, company: v})} placeholder="Mi Empresa S.L." />
                <FF label="Rol" value={user?.role || "user"} onChange={() => {}} disabled />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile} className="bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] rounded-sm" data-testid="save-profile-btn">
                <Save size={16} className="mr-2" /> {savingProfile ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="stat-card space-y-6" data-testid="settings-roles">
              <h3 className="font-barlow text-lg font-bold uppercase tracking-tight text-white">Gestion de Roles</h3>
              <Separator className="bg-border" />
              <div className="space-y-3">
                {[
                  { role: "admin", label: "Administrador", desc: "Acceso total al sistema" },
                  { role: "manager", label: "Manager", desc: "Gestion de envios, facturas y CRM" },
                  { role: "user", label: "Usuario", desc: "Acceso basico de lectura" },
                  { role: "client", label: "Cliente", desc: "Acceso al portal de cliente" }
                ].map((r) => (
                  <div key={r.role} className="flex items-center justify-between p-3 border border-border/50 rounded-sm">
                    <div>
                      <p className="text-sm font-medium text-white">{r.label}</p>
                      <p className="text-xs text-zinc-500">{r.desc}</p>
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded ${user?.role === r.role ? "bg-[#00ff84]/10 text-[#00ff84]" : "bg-zinc-500/10 text-zinc-400"}`}>
                      {r.role}{user?.role === r.role ? " (tu)" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="stat-card space-y-6" data-testid="settings-notifications">
              <h3 className="font-barlow text-lg font-bold uppercase tracking-tight text-white">Notificaciones</h3>
              <Separator className="bg-border" />
              <div className="space-y-3">
                {[
                  { label: "Cambios de etapa en importaciones", enabled: true },
                  { label: "Facturas vencidas", enabled: true },
                  { label: "Envios entregados", enabled: true },
                  { label: "Alertas de tesoreria", enabled: false }
                ].map((n, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-border/50 rounded-sm">
                    <p className="text-sm text-white">{n.label}</p>
                    <span className={`text-[10px] uppercase tracking-widest ${n.enabled ? "text-[#00ff84]" : "text-zinc-500"}`}>
                      {n.enabled ? "Activa" : "Proximamente"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 italic">Las notificaciones por email requieren la configuracion de Microsoft 365.</p>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              {/* Microsoft 365 */}
              <div className="stat-card space-y-5" data-testid="settings-m365">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center">
                    <Mail size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-barlow text-lg font-bold uppercase tracking-tight text-white">Microsoft 365 / Outlook</h3>
                    <p className="text-xs text-zinc-500">Envio de correos electronicos desde tu cuenta</p>
                  </div>
                  {m365.client_id ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-[#00ff84]"><CheckCircle2 size={14} /> Configurado</span>
                  ) : (
                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-400"><AlertCircle size={14} /> Pendiente</span>
                  )}
                </div>
                <Separator className="bg-border" />
                <p className="text-xs text-zinc-400">
                  Para configurar el envio de emails, necesitas registrar una aplicacion en Azure AD (portal.azure.com &gt; App registrations) y obtener las credenciales.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FF label="Tenant ID" value={m365.tenant_id} onChange={v => setM365({...m365, tenant_id: v})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  <FF label="Client ID (Application ID)" value={m365.client_id} onChange={v => setM365({...m365, client_id: v})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  <FF label="Client Secret" value={m365.client_secret} onChange={v => setM365({...m365, client_secret: v})} type="password" placeholder="Tu client secret" />
                  <FF label="Email de envio" value={m365.sender_email} onChange={v => setM365({...m365, sender_email: v})} placeholder="admin@tuempresa.com" type="email" />
                </div>
              </div>

              {/* AEAT */}
              <div className="stat-card space-y-5" data-testid="settings-aeat">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                    <Building size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-barlow text-lg font-bold uppercase tracking-tight text-white">AEAT / Aduana Espanola</h3>
                    <p className="text-xs text-zinc-500">Declaraciones y tramites aduaneros</p>
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-xs text-amber-400"><AlertCircle size={14} /> En investigacion</span>
                </div>
                <Separator className="bg-border" />
                <p className="text-xs text-zinc-400">
                  La integracion con la AEAT requiere un certificado digital (FNMT) o Cl@ve PIN. Actualmente estamos investigando la API de la Ventanilla Unica de Aduanas (VUACAT).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FF label="NIF de la Empresa" value={aeat.nif} onChange={v => setAeat({...aeat, nif: v})} placeholder="B12345678" />
                  <FF label="N Serie Certificado" value={aeat.certificate_serial} onChange={v => setAeat({...aeat, certificate_serial: v})} placeholder="Numero de serie" />
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Entorno</Label>
                    <select value={aeat.environment} onChange={e => setAeat({...aeat, environment: e.target.value})} className="w-full bg-secondary/50 border border-input rounded-sm px-3 py-2 text-sm font-mono text-foreground">
                      <option value="test">Pruebas (Pre-produccion)</option>
                      <option value="production">Produccion</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button onClick={saveIntegrations} disabled={savingInt} className="bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] rounded-sm" data-testid="save-integrations-btn">
                <Save size={16} className="mr-2" /> {savingInt ? "Guardando..." : "Guardar Configuracion"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
