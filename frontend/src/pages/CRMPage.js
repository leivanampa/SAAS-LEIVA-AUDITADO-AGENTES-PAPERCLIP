import React, { useState, useEffect } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { Users, Plus, Search, MoreVertical, Edit, Trash2, Phone, Mail, Building, Globe, CreditCard, MapPin } from "lucide-react";

const typeLabels = { supplier: "Proveedor", client: "Cliente", agent: "Agente" };
const typeColors = {
  supplier: "bg-blue-500/10 text-blue-400",
  client: "bg-[#00ff84]/10 text-[#00ff84]",
  agent: "bg-purple-500/10 text-purple-400"
};

const emptyForm = {
  name: "", company: "", email: "", phone: "", type: "supplier", country: "", notes: "",
  fiscal_id: "", fiscal_id_type: "NIF", tax_regime: "",
  address: "", city: "", province: "", postal_code: "",
  bank_iban: "", bank_swift: "", bank_name: ""
};

const CRMPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchContacts = async () => {
    try {
      const params = {};
      if (filterType !== "all") params.type = filterType;
      if (search) params.search = search;
      const res = await apiClient.get("/contacts", { params });
      setContacts(res.data);
    } catch { toast.error("Error cargando contactos"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, [filterType, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await apiClient.put(`/contacts/${editingContact.id}`, form);
        toast.success("Contacto actualizado");
      } else {
        await apiClient.post("/contacts", form);
        toast.success("Contacto creado");
      }
      setDialogOpen(false);
      setEditingContact(null);
      setForm({ ...emptyForm });
      fetchContacts();
    } catch (err) { toast.error(err.response?.data?.detail || "Error guardando contacto"); }
  };

  const handleEdit = (c) => {
    setEditingContact(c);
    setForm({
      name: c.name || "", company: c.company || "", email: c.email || "", phone: c.phone || "",
      type: c.type || "supplier", country: c.country || "", notes: c.notes || "",
      fiscal_id: c.fiscal_id || "", fiscal_id_type: c.fiscal_id_type || "NIF", tax_regime: c.tax_regime || "",
      address: c.address || "", city: c.city || "", province: c.province || "", postal_code: c.postal_code || "",
      bank_iban: c.bank_iban || "", bank_swift: c.bank_swift || "", bank_name: c.bank_name || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/contacts/${id}`);
      toast.success("Contacto eliminado");
      fetchContacts();
    } catch { toast.error("Error eliminando contacto"); }
  };

  const openNew = () => { setEditingContact(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const F = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div data-testid="crm-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">CRM</h1>
          <p className="text-sm text-zinc-500 mt-1">{contacts.length} contactos</p>
        </div>
        <Button onClick={openNew} className="bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all duration-300 rounded-sm" data-testid="add-contact-btn">
          <Plus size={16} className="mr-2" /> Nuevo Contacto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Buscar contactos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary/50 border-input font-mono text-sm" data-testid="search-contacts" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] bg-secondary/50 border-input" data-testid="filter-contact-type"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="supplier">Proveedores</SelectItem>
            <SelectItem value="client">Clientes</SelectItem>
            <SelectItem value="agent">Agentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No hay contactos</p>
          <Button onClick={openNew} variant="ghost" className="mt-4 text-[#00ff84]" data-testid="add-first-contact">Crear primer contacto</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="contacts-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Empresa</th>
                <th>NIF/CIF</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Ciudad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-white">{c.name}</td>
                  <td><div className="flex items-center gap-1.5"><Building size={12} className="text-zinc-600" />{c.company || "-"}</div></td>
                  <td className="font-mono-data text-xs">{c.fiscal_id ? `${c.fiscal_id_type || "NIF"}: ${c.fiscal_id}` : "-"}</td>
                  <td><span className={`badge-status ${typeColors[c.type] || ""}`}>{typeLabels[c.type] || c.type}</span></td>
                  <td><div className="flex items-center gap-1.5 font-mono-data text-xs"><Mail size={12} className="text-zinc-600" />{c.email || "-"}</div></td>
                  <td><div className="flex items-center gap-1.5 font-mono-data text-xs"><Phone size={12} className="text-zinc-600" />{c.phone || "-"}</div></td>
                  <td><div className="flex items-center gap-1.5 text-xs"><MapPin size={12} className="text-zinc-600" />{c.city || c.country || "-"}</div></td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`contact-menu-${c.id}`}><MoreVertical size={14} /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(c)} data-testid={`edit-contact-${c.id}`}><Edit size={14} className="mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-red-400" data-testid={`delete-contact-${c.id}`}><Trash2 size={14} className="mr-2" /> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-xl max-h-[85vh] overflow-y-auto" data-testid="contact-dialog">
          <DialogHeader>
            <DialogTitle className="font-barlow text-lg uppercase tracking-tight">{editingContact ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
            <DialogDescription>Datos del contacto con informacion fiscal</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-2">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="bg-secondary/50 border border-border mb-3 w-full">
                <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
                <TabsTrigger value="fiscal" className="flex-1 text-xs">Fiscal</TabsTrigger>
                <TabsTrigger value="address" className="flex-1 text-xs">Direccion</TabsTrigger>
                <TabsTrigger value="bank" className="flex-1 text-xs">Bancario</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nombre *</Label>
                  <Input value={form.name} onChange={F("name")} required className="bg-secondary/50 border-input text-sm" data-testid="contact-name-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Empresa / Razon Social</Label>
                    <Input value={form.company} onChange={F("company")} className="bg-secondary/50 border-input text-sm" data-testid="contact-company-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="bg-secondary/50 border-input" data-testid="contact-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier">Proveedor</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="agent">Agente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Email</Label>
                    <Input value={form.email} onChange={F("email")} type="email" className="bg-secondary/50 border-input text-sm" data-testid="contact-email-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Telefono</Label>
                    <Input value={form.phone} onChange={F("phone")} className="bg-secondary/50 border-input text-sm" data-testid="contact-phone-input" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Notas</Label>
                  <Input value={form.notes} onChange={F("notes")} className="bg-secondary/50 border-input text-sm" data-testid="contact-notes-input" />
                </div>
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Tipo Identificador</Label>
                    <Select value={form.fiscal_id_type} onValueChange={(v) => setForm(f => ({ ...f, fiscal_id_type: v }))}>
                      <SelectTrigger className="bg-secondary/50 border-input" data-testid="contact-fiscal-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIF">NIF</SelectItem>
                        <SelectItem value="CIF">CIF</SelectItem>
                        <SelectItem value="NIE">NIE</SelectItem>
                        <SelectItem value="VAT">VAT (Intracomunitario)</SelectItem>
                        <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                        <SelectItem value="OTHER">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">NIF/CIF/NIE</Label>
                    <Input value={form.fiscal_id} onChange={F("fiscal_id")} placeholder="B12345678" className="bg-secondary/50 border-input font-mono text-sm" data-testid="contact-fiscal-id" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Regimen Fiscal</Label>
                  <Select value={form.tax_regime} onValueChange={(v) => setForm(f => ({ ...f, tax_regime: v }))}>
                    <SelectTrigger className="bg-secondary/50 border-input" data-testid="contact-tax-regime"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Regimen General</SelectItem>
                      <SelectItem value="simplified">Regimen Simplificado</SelectItem>
                      <SelectItem value="recargo">Recargo de Equivalencia</SelectItem>
                      <SelectItem value="intracom">Operador Intracomunitario</SelectItem>
                      <SelectItem value="extracom">Operador Extracomunitario</SelectItem>
                      <SelectItem value="exempt">Exento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Direccion (Calle, Numero, Piso)</Label>
                  <Input value={form.address} onChange={F("address")} placeholder="Calle Mayor 15, 2o B" className="bg-secondary/50 border-input text-sm" data-testid="contact-address" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Ciudad</Label>
                    <Input value={form.city} onChange={F("city")} className="bg-secondary/50 border-input text-sm" data-testid="contact-city" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Provincia</Label>
                    <Input value={form.province} onChange={F("province")} className="bg-secondary/50 border-input text-sm" data-testid="contact-province" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Codigo Postal</Label>
                    <Input value={form.postal_code} onChange={F("postal_code")} placeholder="28001" className="bg-secondary/50 border-input font-mono text-sm" data-testid="contact-postal" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Pais</Label>
                  <Input value={form.country} onChange={F("country")} className="bg-secondary/50 border-input text-sm" data-testid="contact-country-input" />
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">IBAN</Label>
                  <Input value={form.bank_iban} onChange={F("bank_iban")} placeholder="ES12 3456 7890 1234 5678 9012" className="bg-secondary/50 border-input font-mono text-sm" data-testid="contact-iban" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">SWIFT/BIC</Label>
                    <Input value={form.bank_swift} onChange={F("bank_swift")} placeholder="BBVAESMMXXX" className="bg-secondary/50 border-input font-mono text-sm" data-testid="contact-swift" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nombre del Banco</Label>
                    <Input value={form.bank_name} onChange={F("bank_name")} className="bg-secondary/50 border-input text-sm" data-testid="contact-bank" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1" data-testid="cancel-contact-btn">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] rounded-sm" data-testid="save-contact-btn">
                {editingContact ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMPage;
