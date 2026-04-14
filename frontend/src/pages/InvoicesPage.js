import React, { useState, useEffect } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Receipt, Plus, Search, MoreVertical, Edit, Trash2, Eye, X, Building2, FileText } from "lucide-react";

const statusLabels = { draft: "Borrador", sent: "Enviada", paid: "Pagada", overdue: "Vencida", cancelled: "Cancelada" };
const statusColors = { draft: "bg-zinc-500/10 text-zinc-400", sent: "bg-blue-500/10 text-blue-400", paid: "bg-emerald-500/10 text-emerald-400", overdue: "bg-red-500/10 text-red-400", cancelled: "bg-zinc-500/10 text-zinc-500" };
const typeLabels = { purchase: "Compra", sale: "Venta", expense: "Gasto" };

const emptyForm = {
  invoice_number: "", contact_name: "", type: "purchase",
  items: [{ description: "", quantity: 1, unit_price: 0 }],
  subtotal: 0, tax_rate: 21, tax_amount: 0, total: 0,
  currency: "EUR", status: "draft", due_date: "", notes: "",
  payment_method: "", invoice_series: "",
  sender_name: "", sender_fiscal_id: "", sender_address: "", sender_city: "", sender_postal_code: "", sender_country: "Espana",
  receiver_name: "", receiver_fiscal_id: "", receiver_address: "", receiver_city: "", receiver_postal_code: "", receiver_country: ""
};

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchInvoices = async () => {
    try {
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (search) params.search = search;
      const res = await apiClient.get("/invoices", { params });
      setInvoices(res.data);
    } catch { toast.error("Error cargando facturas"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [filterStatus, search]);

  const calculateTotals = (items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const taxAmount = subtotal * (Number(taxRate) / 100);
    return { subtotal, tax_amount: taxAmount, total: subtotal + taxAmount };
  };

  const updateItems = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const totals = calculateTotals(newItems, form.tax_rate);
    setForm({ ...form, items: newItems, ...totals });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, subtotal: Number(form.subtotal), tax_rate: Number(form.tax_rate), tax_amount: Number(form.tax_amount), total: Number(form.total) };
      if (editingInvoice) {
        await apiClient.put(`/invoices/${editingInvoice.id}`, payload);
        toast.success("Factura actualizada");
      } else {
        await apiClient.post("/invoices", payload);
        toast.success("Factura creada");
      }
      setDialogOpen(false);
      setEditingInvoice(null);
      setForm({ ...emptyForm });
      fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.detail || "Error guardando factura"); }
  };

  const handleEdit = (inv) => {
    setEditingInvoice(inv);
    setForm({
      invoice_number: inv.invoice_number || "", contact_name: inv.contact_name || "", type: inv.type || "purchase",
      items: inv.items?.length > 0 ? inv.items : [{ description: "", quantity: 1, unit_price: 0 }],
      subtotal: inv.subtotal || 0, tax_rate: inv.tax_rate || 21, tax_amount: inv.tax_amount || 0, total: inv.total || 0,
      currency: inv.currency || "EUR", status: inv.status || "draft", due_date: inv.due_date || "", notes: inv.notes || "",
      payment_method: inv.payment_method || "", invoice_series: inv.invoice_series || "",
      sender_name: inv.sender_name || "", sender_fiscal_id: inv.sender_fiscal_id || "",
      sender_address: inv.sender_address || "", sender_city: inv.sender_city || "",
      sender_postal_code: inv.sender_postal_code || "", sender_country: inv.sender_country || "",
      receiver_name: inv.receiver_name || "", receiver_fiscal_id: inv.receiver_fiscal_id || "",
      receiver_address: inv.receiver_address || "", receiver_city: inv.receiver_city || "",
      receiver_postal_code: inv.receiver_postal_code || "", receiver_country: inv.receiver_country || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try { await apiClient.delete(`/invoices/${id}`); toast.success("Factura eliminada"); fetchInvoices(); }
    catch { toast.error("Error eliminando factura"); }
  };

  const F = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const fmt = (n) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  return (
    <div data-testid="invoices-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Facturacion</h1>
          <p className="text-sm text-zinc-500 mt-1">{invoices.length} facturas</p>
        </div>
        <Button onClick={() => { setEditingInvoice(null); setForm({ ...emptyForm }); setDialogOpen(true); }} className="bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all rounded-sm" data-testid="add-invoice-btn">
          <Plus size={16} className="mr-2" /> Nueva Factura
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Buscar facturas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary/50 border-input font-mono text-sm" data-testid="search-invoices" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] bg-secondary/50 border-input" data-testid="filter-invoice-status"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No hay facturas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="invoices-table">
            <thead><tr>
              <th>N. Factura</th><th>Contacto</th><th>NIF Receptor</th><th>Tipo</th><th>Total</th><th>Estado</th><th>Vencimiento</th><th></th>
            </tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-medium text-white font-mono-data text-xs">{inv.invoice_number}</td>
                  <td className="text-xs">{inv.contact_name || "-"}</td>
                  <td className="font-mono-data text-xs text-zinc-400">{inv.receiver_fiscal_id || "-"}</td>
                  <td><span className="badge-status bg-zinc-500/10 text-zinc-400">{typeLabels[inv.type] || inv.type}</span></td>
                  <td className="font-mono-data text-xs text-white">{fmt(inv.total)} {inv.currency}</td>
                  <td><span className={`badge-status ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</span></td>
                  <td className="font-mono-data text-xs">{inv.due_date || "-"}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`invoice-menu-${inv.id}`}><MoreVertical size={14} /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedInvoice(inv); setDetailOpen(true); }}><Eye size={14} className="mr-2" /> Ver Detalle</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(inv)}><Edit size={14} className="mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="text-red-400"><Trash2 size={14} className="mr-2" /> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="invoice-dialog">
          <DialogHeader>
            <DialogTitle className="font-barlow text-lg uppercase tracking-tight">{editingInvoice ? "Editar Factura" : "Nueva Factura"}</DialogTitle>
            <DialogDescription>Datos completos de la factura con informacion fiscal</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-2">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="bg-secondary/50 border border-border mb-3 w-full">
                <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
                <TabsTrigger value="items" className="flex-1 text-xs">Lineas</TabsTrigger>
                <TabsTrigger value="sender" className="flex-1 text-xs">Emisor</TabsTrigger>
                <TabsTrigger value="receiver" className="flex-1 text-xs">Receptor</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Serie</Label>
                    <Input value={form.invoice_series} onChange={F("invoice_series")} placeholder="A" className="bg-secondary/50 border-input text-sm" data-testid="invoice-series" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">N. Factura *</Label>
                    <Input value={form.invoice_number} onChange={F("invoice_number")} required className="bg-secondary/50 border-input font-mono text-sm" data-testid="invoice-number-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="bg-secondary/50 border-input" data-testid="invoice-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Compra</SelectItem>
                        <SelectItem value="sale">Venta</SelectItem>
                        <SelectItem value="expense">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Contacto</Label>
                    <Input value={form.contact_name} onChange={F("contact_name")} className="bg-secondary/50 border-input text-sm" data-testid="invoice-contact-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Estado</Label>
                    <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="bg-secondary/50 border-input" data-testid="invoice-status-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Metodo de Pago</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm(f => ({ ...f, payment_method: v }))}>
                      <SelectTrigger className="bg-secondary/50 border-input" data-testid="invoice-payment-method"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Vencimiento</Label>
                    <Input type="date" value={form.due_date} onChange={F("due_date")} className="bg-secondary/50 border-input text-sm" data-testid="invoice-due-date-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Notas</Label>
                    <Input value={form.notes} onChange={F("notes")} className="bg-secondary/50 border-input text-sm" data-testid="invoice-notes-input" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Lineas de factura</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: "", quantity: 1, unit_price: 0 }] }))} className="text-[#00ff84] text-xs h-7" data-testid="add-invoice-item"><Plus size={12} className="mr-1" /> Linea</Button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={item.description} onChange={(e) => updateItems(i, "description", e.target.value)} placeholder="Descripcion" className="flex-1 bg-secondary/50 border-input text-xs h-9" data-testid={`item-desc-${i}`} />
                    <Input type="number" value={item.quantity} onChange={(e) => updateItems(i, "quantity", e.target.value)} className="w-16 bg-secondary/50 border-input font-mono text-xs h-9 text-center" data-testid={`item-qty-${i}`} />
                    <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItems(i, "unit_price", e.target.value)} className="w-24 bg-secondary/50 border-input font-mono text-xs h-9" data-testid={`item-price-${i}`} />
                    {form.items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => { const ni = form.items.filter((_, j) => j !== i); const t = calculateTotals(ni, form.tax_rate); setForm({ ...form, items: ni, ...t }); }} className="h-9 w-9 text-zinc-500 hover:text-red-400"><X size={14} /></Button>}
                  </div>
                ))}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-zinc-500">Subtotal</span><span className="font-mono-data text-white">{fmt(form.subtotal)} EUR</span></div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">IVA</span>
                      <Input type="number" value={form.tax_rate} onChange={(e) => { const t = calculateTotals(form.items, e.target.value); setForm({ ...form, tax_rate: e.target.value, ...t }); }} className="w-16 bg-secondary/50 border-input font-mono text-xs h-7 text-center" data-testid="invoice-tax-input" /><span className="text-zinc-500">%</span>
                    </div>
                    <span className="font-mono-data text-white">{fmt(form.tax_amount)} EUR</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2"><span className="text-white">Total</span><span className="font-mono-data text-[#00ff84]">{fmt(form.total)} EUR</span></div>
                </div>
              </TabsContent>

              <TabsContent value="sender" className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-[#00ff84] mb-1">Datos del Emisor</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nombre / Razon Social</Label>
                    <Input value={form.sender_name} onChange={F("sender_name")} className="bg-secondary/50 border-input text-sm" data-testid="sender-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">NIF/CIF</Label>
                    <Input value={form.sender_fiscal_id} onChange={F("sender_fiscal_id")} className="bg-secondary/50 border-input font-mono text-sm" data-testid="sender-fiscal" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Direccion</Label>
                  <Input value={form.sender_address} onChange={F("sender_address")} className="bg-secondary/50 border-input text-sm" data-testid="sender-address" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest text-zinc-500">Ciudad</Label><Input value={form.sender_city} onChange={F("sender_city")} className="bg-secondary/50 border-input text-sm" data-testid="sender-city" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest text-zinc-500">CP</Label><Input value={form.sender_postal_code} onChange={F("sender_postal_code")} className="bg-secondary/50 border-input font-mono text-sm" data-testid="sender-postal" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest text-zinc-500">Pais</Label><Input value={form.sender_country} onChange={F("sender_country")} className="bg-secondary/50 border-input text-sm" data-testid="sender-country" /></div>
                </div>
              </TabsContent>

              <TabsContent value="receiver" className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-[#00ff84] mb-1">Datos del Receptor</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nombre / Razon Social</Label>
                    <Input value={form.receiver_name} onChange={F("receiver_name")} className="bg-secondary/50 border-input text-sm" data-testid="receiver-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">NIF/CIF</Label>
                    <Input value={form.receiver_fiscal_id} onChange={F("receiver_fiscal_id")} className="bg-secondary/50 border-input font-mono text-sm" data-testid="receiver-fiscal" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Direccion</Label>
                  <Input value={form.receiver_address} onChange={F("receiver_address")} className="bg-secondary/50 border-input text-sm" data-testid="receiver-address" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest text-zinc-500">Ciudad</Label><Input value={form.receiver_city} onChange={F("receiver_city")} className="bg-secondary/50 border-input text-sm" data-testid="receiver-city" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest text-zinc-500">CP</Label><Input value={form.receiver_postal_code} onChange={F("receiver_postal_code")} className="bg-secondary/50 border-input font-mono text-sm" data-testid="receiver-postal" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest text-zinc-500">Pais</Label><Input value={form.receiver_country} onChange={F("receiver_country")} className="bg-secondary/50 border-input text-sm" data-testid="receiver-country" /></div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] rounded-sm" data-testid="save-invoice-btn">{editingInvoice ? "Actualizar" : "Crear"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-lg" data-testid="invoice-detail-dialog">
          <DialogHeader><DialogTitle className="font-barlow text-lg uppercase tracking-tight">Detalle Factura</DialogTitle><DialogDescription>Vista completa de la factura</DialogDescription></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono-data text-lg text-white">{selectedInvoice.invoice_series ? `${selectedInvoice.invoice_series}-` : ""}{selectedInvoice.invoice_number}</p>
                <span className={`badge-status ${statusColors[selectedInvoice.status] || ""}`}>{statusLabels[selectedInvoice.status]}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Contacto</p><p className="text-zinc-300">{selectedInvoice.contact_name || "-"}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Tipo</p><p className="text-zinc-300">{typeLabels[selectedInvoice.type]}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Vencimiento</p><p className="text-zinc-300">{selectedInvoice.due_date || "-"}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Metodo Pago</p><p className="text-zinc-300">{selectedInvoice.payment_method || "-"}</p></div>
              </div>
              {(selectedInvoice.sender_name || selectedInvoice.receiver_name) && (
                <div className="grid grid-cols-2 gap-4 text-xs border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#00ff84] mb-1">Emisor</p>
                    <p className="text-zinc-300">{selectedInvoice.sender_name}</p>
                    <p className="text-zinc-500 font-mono">{selectedInvoice.sender_fiscal_id}</p>
                    <p className="text-zinc-500">{selectedInvoice.sender_address}</p>
                    <p className="text-zinc-500">{[selectedInvoice.sender_postal_code, selectedInvoice.sender_city, selectedInvoice.sender_country].filter(Boolean).join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#00ff84] mb-1">Receptor</p>
                    <p className="text-zinc-300">{selectedInvoice.receiver_name}</p>
                    <p className="text-zinc-500 font-mono">{selectedInvoice.receiver_fiscal_id}</p>
                    <p className="text-zinc-500">{selectedInvoice.receiver_address}</p>
                    <p className="text-zinc-500">{[selectedInvoice.receiver_postal_code, selectedInvoice.receiver_city, selectedInvoice.receiver_country].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              )}
              {selectedInvoice.items?.length > 0 && (
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Lineas</p>
                  {selectedInvoice.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-border/30"><span className="text-zinc-300">{item.description}</span><span className="font-mono-data text-white">{item.quantity} x {Number(item.unit_price).toFixed(2)}</span></div>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-zinc-500">Subtotal</span><span className="font-mono-data text-white">{fmt(selectedInvoice.subtotal)} EUR</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-500">IVA ({selectedInvoice.tax_rate}%)</span><span className="font-mono-data text-white">{fmt(selectedInvoice.tax_amount)} EUR</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-2"><span className="text-white">Total</span><span className="font-mono-data text-[#00ff84]">{fmt(selectedInvoice.total)} EUR</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;
