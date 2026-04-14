import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth, apiClient } from "@/App";
import { t } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { UserPlus, Trash2, Shield, AlertTriangle } from "lucide-react";

const ROLE_MAP = {
  admin: { label: "Administrador", labelEn: "Administrator", color: "bg-red-500/20 text-red-400" },
  manager: { label: "Gestor", labelEn: "Manager", color: "bg-blue-500/20 text-blue-400" },
  user: { label: "Usuario", labelEn: "User", color: "bg-zinc-500/20 text-zinc-400" },
  client: { label: "Cliente", labelEn: "Client", color: "bg-emerald-500/20 text-emerald-400" }
};

const UsersPage = () => {
  const { user: currentUser, lang } = useAuth();
  const [users, setUsers] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  const [assignDialog, setAssignDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [uRes, iRes] = await Promise.all([
        apiClient.get("/users"),
        apiClient.get("/imports")
      ]);
      setUsers(uRes.data);
      setImports(iRes.data);
    } catch (err) {
      if (err.response?.status === 403) toast.error(lang === 'en' ? "No permissions to view users" : "Sin permisos para ver usuarios");
      else toast.error(lang === 'en' ? "Error loading data" : "Error cargando datos");
    }
    finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const changeRole = async (userId, newRole) => {
    try {
      await apiClient.put(`/users/${userId}/role`, { role: newRole });
      toast.success(t('role_updated', lang));
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
  };

  const assignImports = async (userId, importIds) => {
    try {
      await apiClient.put(`/users/${userId}/assign-imports`, { import_ids: importIds });
      toast.success(lang === 'en' ? "Imports assigned" : "Importaciones asignadas");
      setAssignDialog(null);
      fetchData();
    } catch { toast.error("Error"); }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await apiClient.delete(`/users/${deleteDialog.id}`);
      toast.success(t('user_deleted', lang));
      setDeleteDialog(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-3xl font-bold uppercase tracking-tight">{t('users_title', lang)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} {t('users_registered', lang)}</p>
        </div>
        <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="create-client-btn"><UserPlus size={16} className="mr-2" />{t('create_client', lang)}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t('create_client', lang)}</DialogTitle><DialogDescription>{t('create_client_desc', lang)}</DialogDescription></DialogHeader>
            <ClientForm imports={imports} lang={lang} onSave={() => { setShowNewClient(false); fetchData(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-secondary/30">
            <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t('name', lang)}</th>
            <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t('email', lang)}</th>
            <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t('company', lang)}</th>
            <th className="text-center p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t('role', lang)}</th>
            <th className="text-center p-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t('assigned_imports', lang)}</th>
            <th className="p-3 w-40 text-center text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t('actions', lang)}</th>
          </tr></thead>
          <tbody>
            {users.map(u => {
              const roleInfo = ROLE_MAP[u.role] || ROLE_MAP.user;
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors" data-testid={`user-row-${u.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold uppercase">{(u.name || "?")[0]}</div>
                      <span className="font-medium text-xs">{u.name || (lang === 'en' ? 'No name' : 'Sin nombre')}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{u.email}</td>
                  <td className="p-3 text-xs text-muted-foreground">{u.company || "-"}</td>
                  <td className="p-3 text-center">
                    <Select value={u.role || "user"} onValueChange={v => changeRole(u.id, v)}>
                      <SelectTrigger className="h-7 w-[130px] mx-auto text-[10px]" data-testid={`role-select-${u.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            <Badge className={`text-[9px] ${v.color}`}>{lang === 'en' ? v.labelEn : v.label}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-center">
                    {u.role === "client" ? (
                      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setAssignDialog(u)} data-testid={`assign-btn-${u.id}`}>
                        {(u.assigned_imports || []).length} {lang === 'en' ? 'assigned' : 'asignadas'}
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[9px] text-muted-foreground">{u.created_at?.split("T")[0]}</span>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => setDeleteDialog(u)}
                          data-testid={`delete-user-btn-${u.id}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assign imports dialog */}
      {assignDialog && (
        <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t('assign_imports', lang)} - {assignDialog.name}</DialogTitle><DialogDescription>{lang === 'en' ? 'Select the imports the client can view' : 'Selecciona las importaciones que el cliente puede ver'}</DialogDescription></DialogHeader>
            <AssignForm user={assignDialog} imports={imports} lang={lang} onSave={assignImports} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete user dialog */}
      {deleteDialog && (
        <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={18} />
                {t('delete_user', lang)}
              </DialogTitle>
              <DialogDescription>{t('delete_user_confirm', lang)}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold uppercase">{(deleteDialog.name || "?")[0]}</div>
              <div>
                <p className="text-sm font-medium">{deleteDialog.name}</p>
                <p className="text-xs text-muted-foreground">{deleteDialog.email}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteDialog(null)} data-testid="cancel-delete-btn">{t('cancel', lang)}</Button>
              <Button variant="destructive" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDelete} data-testid="confirm-delete-btn">{t('delete', lang)}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const ClientForm = ({ imports, lang, onSave }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", import_ids: [] });
  const [saving, setSaving] = useState(false);

  const toggleImport = (id) => {
    setForm(f => ({
      ...f, import_ids: f.import_ids.includes(id)
        ? f.import_ids.filter(i => i !== id)
        : [...f.import_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error(lang === 'en' ? "Email and password required" : "Email y contrasena son obligatorios"); return; }
    setSaving(true);
    try {
      await apiClient.post("/users/create-client", form);
      toast.success(t('client_created', lang));
      onSave();
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('name', lang)}</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary/50" required data-testid="client-name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('company', lang)}</Label>
          <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="bg-secondary/50" data-testid="client-company" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('email', lang)}</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-secondary/50" required data-testid="client-email" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('password', lang)}</Label>
          <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="bg-secondary/50" required data-testid="client-password" />
        </div>
      </div>
      {imports.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('assign_imports', lang)}</Label>
          <div className="max-h-32 overflow-y-auto space-y-1 bg-secondary/20 rounded p-2">
            {imports.map(imp => (
              <label key={imp.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/30 rounded px-1 py-0.5">
                <input type="checkbox" checked={form.import_ids.includes(imp.id)} onChange={() => toggleImport(imp.id)} className="rounded" />
                <span>{imp.reference} - {imp.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <Button type="submit" disabled={saving} className="w-full bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="create-client-submit">
        {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : t('create_client', lang)}
      </Button>
    </form>
  );
};

const AssignForm = ({ user, imports, lang, onSave }) => {
  const [selected, setSelected] = useState(user.assigned_imports || []);
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="space-y-4">
      <div className="max-h-48 overflow-y-auto space-y-1 bg-secondary/20 rounded p-2">
        {imports.map(imp => (
          <label key={imp.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/30 rounded px-2 py-1">
            <input type="checkbox" checked={selected.includes(imp.id)} onChange={() => toggle(imp.id)} className="rounded" />
            <span className="font-mono">{imp.reference}</span>
            <span className="text-muted-foreground">{imp.name}</span>
          </label>
        ))}
      </div>
      <Button onClick={() => onSave(user.id, selected)} className="w-full bg-[#00ff84] text-black hover:bg-[#33ff9d] font-bold" data-testid="assign-submit">
        {t('save_assignments', lang)} ({selected.length})
      </Button>
    </div>
  );
};

export default UsersPage;
