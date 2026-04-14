import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Warehouse, Plus, Trash2, MoreVertical, Edit, Package, MapPin, X,
  Weight, Ruler, Tag, Calendar, Truck
} from "lucide-react";

const FF = ({ label, value, onChange, placeholder, type = "text", className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
    <Input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-secondary/50 border-input font-mono text-sm" />
  </div>
);

const WarehousesPage = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", province: "", postal_code: "", country: "Spain", capacity: "", contact_name: "", contact_phone: "", notes: "" });
  const [invForm, setInvForm] = useState({ product_name: "", sku: "", quantity: 0, location: "", import_reference: "", supplier: "", batch: "", weight_kg: 0, dimensions: "", entry_date: new Date().toISOString().split("T")[0], notes: "" });
  const [editingInv, setEditingInv] = useState(null);
  const [showInvDetails, setShowInvDetails] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    try { const res = await apiClient.get("/warehouses"); setWarehouses(res.data); }
    catch { toast.error("Error cargando almacenes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await apiClient.put(`/warehouses/${editing.id}`, form); toast.success("Almacen actualizado"); }
      else { await apiClient.post("/warehouses", form); toast.success("Almacen creado"); }
      setDialogOpen(false); setEditing(null);
      setForm({ name: "", address: "", city: "", province: "", postal_code: "", country: "Spain", capacity: "", contact_name: "", contact_phone: "", notes: "" });
      fetchWarehouses();
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
  };

  const handleDelete = async (id) => {
    try { await apiClient.delete(`/warehouses/${id}`); toast.success("Eliminado"); fetchWarehouses(); }
    catch { toast.error("Error"); }
  };

  const openEdit = (w) => {
    setEditing(w);
    setForm({ name: w.name || "", address: w.address || "", city: w.city || "", province: w.province || "", postal_code: w.postal_code || "", country: w.country || "Spain", capacity: w.capacity || "", contact_name: w.contact_name || "", contact_phone: w.contact_phone || "", notes: w.notes || "" });
    setDialogOpen(true);
  };

  const openInventory = async (w) => {
    setInventoryDialog(w);
    try { const res = await apiClient.get(`/warehouses/${w.id}/inventory`); setInventory(res.data); }
    catch { toast.error("Error cargando inventario"); }
  };

  const resetInvForm = () => { setInvForm({ product_name: "", sku: "", quantity: 0, location: "", import_reference: "", supplier: "", batch: "", weight_kg: 0, dimensions: "", entry_date: new Date().toISOString().split("T")[0], notes: "" }); setEditingInv(null); };

  const addInventoryItem = async () => {
    if (!invForm.product_name) { toast.error("Nombre de producto requerido"); return; }
    try {
      if (editingInv) {
        await apiClient.put(`/warehouses/${inventoryDialog.id}/inventory/${editingInv.id}`, { ...invForm, quantity: Number(invForm.quantity), weight_kg: Number(invForm.weight_kg) });
        toast.success("Item actualizado");
      } else {
        await apiClient.post(`/warehouses/${inventoryDialog.id}/inventory`, { ...invForm, quantity: Number(invForm.quantity), weight_kg: Number(invForm.weight_kg) });
        toast.success("Item agregado");
      }
      resetInvForm();
      const res = await apiClient.get(`/warehouses/${inventoryDialog.id}/inventory`);
      setInventory(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
  };

  const startEditItem = (item) => {
    setEditingInv(item);
    setInvForm({
      product_name: item.product_name || "",
      sku: item.sku || "",
      quantity: item.quantity || 0,
      location: item.location || "",
      import_reference: item.import_reference || "",
      supplier: item.supplier || "",
      batch: item.batch || "",
      weight_kg: item.weight_kg || 0,
      dimensions: item.dimensions || "",
      entry_date: item.entry_date || new Date().toISOString().split("T")[0],
      notes: item.notes || ""
    });
    setShowInvDetails(true);
  };

  const deleteInventoryItem = async (itemId) => {
    try {
      await apiClient.delete(`/warehouses/${inventoryDialog.id}/inventory/${itemId}`);
      setInventory(prev => prev.filter(i => i.id !== itemId));
      toast.success("Item eliminado");
    } catch { toast.error("Error"); }
  };

  return (
    <div data-testid="warehouses-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight">Almacenes</h1>
          <p className="text-sm text-muted-foreground mt-1">{warehouses.length} almacenes</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: "", address: "", city: "", province: "", postal_code: "", country: "Spain", capacity: "", contact_name: "", contact_phone: "", notes: "" }); setDialogOpen(true); }} className="bg-primary text-primary-foreground font-bold uppercase tracking-wide hover:opacity-90 rounded-sm" data-testid="add-warehouse-btn">
          <Plus size={16} className="mr-2" /> Nuevo Almacen
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-16"><Warehouse size={48} className="mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No hay almacenes</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(w => (
            <div key={w.id} className="stat-card space-y-3" data-testid={`warehouse-card-${w.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground">{w.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><MapPin size={10} />{w.city || w.address || "Sin direccion"}{w.province ? `, ${w.province}` : ""}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={14} /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openInventory(w)}><Package size={14} className="mr-2" /> Inventario</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(w)}><Edit size={14} className="mr-2" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(w.id)} className="text-red-400"><Trash2 size={14} className="mr-2" /> Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {w.capacity && <p className="text-xs text-muted-foreground">Capacidad: {w.capacity}</p>}
              {w.contact_name && <p className="text-xs text-muted-foreground">Contacto: {w.contact_name} {w.contact_phone ? `- ${w.contact_phone}` : ""}</p>}
              <Button variant="ghost" size="sm" onClick={() => openInventory(w)} className="w-full text-xs text-primary" data-testid={`view-inventory-${w.id}`}>
                <Package size={12} className="mr-1" /> Ver Inventario
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Warehouse dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md" data-testid="warehouse-dialog">
          <DialogHeader><DialogTitle className="font-barlow text-lg uppercase tracking-tight">{editing ? "Editar" : "Nuevo"} Almacen</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FF label="Nombre *" value={form.name} onChange={v => setForm({...form, name: v})} />
            <FF label="Direccion" value={form.address} onChange={v => setForm({...form, address: v})} />
            <div className="grid grid-cols-3 gap-3">
              <FF label="Ciudad" value={form.city} onChange={v => setForm({...form, city: v})} />
              <FF label="Provincia" value={form.province} onChange={v => setForm({...form, province: v})} />
              <FF label="CP" value={form.postal_code} onChange={v => setForm({...form, postal_code: v})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FF label="Pais" value={form.country} onChange={v => setForm({...form, country: v})} />
              <FF label="Capacidad" value={form.capacity} onChange={v => setForm({...form, capacity: v})} placeholder="ej: 500 m2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FF label="Contacto" value={form.contact_name} onChange={v => setForm({...form, contact_name: v})} />
              <FF label="Telefono" value={form.contact_phone} onChange={v => setForm({...form, contact_phone: v})} />
            </div>
            <FF label="Notas" value={form.notes} onChange={v => setForm({...form, notes: v})} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground font-bold rounded-sm" data-testid="save-warehouse-btn">{editing ? "Actualizar" : "Crear"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory dialog - Enhanced */}
      <Dialog open={!!inventoryDialog} onOpenChange={() => { setInventoryDialog(null); setShowInvDetails(false); resetInvForm(); }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="inventory-dialog">
          <DialogHeader><DialogTitle className="font-barlow text-lg uppercase tracking-tight">Inventario - {inventoryDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Add item form */}
            <div className="space-y-3 p-3 border border-border/30 rounded-sm bg-secondary/10">
              <div className="flex gap-2 items-end">
                <FF label="Producto *" value={invForm.product_name} onChange={v => setInvForm({...invForm, product_name: v})} className="flex-1" />
                <FF label="SKU" value={invForm.sku} onChange={v => setInvForm({...invForm, sku: v})} placeholder="SKU-001" className="w-28" />
                <FF label="Cantidad" value={invForm.quantity} onChange={v => setInvForm({...invForm, quantity: v})} type="number" className="w-20" />
                <FF label="Ubicacion" value={invForm.location} onChange={v => setInvForm({...invForm, location: v})} placeholder="A1-01" className="w-24" />
              </div>

              <button type="button" onClick={() => setShowInvDetails(!showInvDetails)} className="text-xs text-primary hover:underline" data-testid="toggle-inv-details">
                {showInvDetails ? "- Menos campos" : "+ Mas campos (trazabilidad)"}
              </button>

              {showInvDetails && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 animate-fade-in">
                  <FF label="Proveedor" value={invForm.supplier} onChange={v => setInvForm({...invForm, supplier: v})} />
                  <FF label="Lote / Batch" value={invForm.batch} onChange={v => setInvForm({...invForm, batch: v})} />
                  <FF label="Ref. Importacion" value={invForm.import_reference} onChange={v => setInvForm({...invForm, import_reference: v})} />
                  <FF label="Peso (kg)" value={invForm.weight_kg} onChange={v => setInvForm({...invForm, weight_kg: v})} type="number" />
                  <FF label="Dimensiones" value={invForm.dimensions} onChange={v => setInvForm({...invForm, dimensions: v})} placeholder="30x20x15 cm" />
                  <FF label="Fecha Entrada" value={invForm.entry_date} onChange={v => setInvForm({...invForm, entry_date: v})} type="date" />
                  <FF label="Notas" value={invForm.notes} onChange={v => setInvForm({...invForm, notes: v})} className="col-span-2 md:col-span-3" />
                </div>
              )}

              <Button onClick={addInventoryItem} size="sm" className="bg-primary text-primary-foreground font-bold rounded-sm" data-testid="add-inventory-item">
                <Plus size={14} className="mr-1" /> {editingInv ? "Guardar Cambios" : "Agregar Item"}
              </Button>
              {editingInv && (
                <Button onClick={resetInvForm} size="sm" variant="ghost" className="text-muted-foreground" data-testid="cancel-edit-inventory">
                  Cancelar edicion
                </Button>
              )}
            </div>

            <Separator className="bg-border/30" />

            {/* Inventory list */}
            {inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin items en inventario</p>
            ) : (
              <div className="space-y-2">
                {inventory.map(item => (
                  <div key={item.id} className="p-3 border border-border/30 rounded-sm hover:bg-secondary/10 transition-colors" data-testid={`inv-item-${item.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                          {item.sku && <span className="text-[10px] font-mono bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">{item.sku}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Package size={9} /> Qty: {item.quantity}</span>
                          {item.location && <span className="flex items-center gap-1"><MapPin size={9} /> {item.location}</span>}
                          {item.supplier && <span className="flex items-center gap-1"><Truck size={9} /> {item.supplier}</span>}
                          {item.batch && <span className="flex items-center gap-1"><Tag size={9} /> Lote: {item.batch}</span>}
                          {item.weight_kg > 0 && <span className="flex items-center gap-1"><Weight size={9} /> {item.weight_kg} kg</span>}
                          {item.dimensions && <span className="flex items-center gap-1"><Ruler size={9} /> {item.dimensions}</span>}
                          {item.entry_date && <span className="flex items-center gap-1"><Calendar size={9} /> {item.entry_date}</span>}
                          {item.import_reference && <span className="font-mono">Ref: {item.import_reference}</span>}
                        </div>
                        {item.notes && <p className="text-[10px] text-zinc-500 mt-1 italic">{item.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEditItem(item)} className="h-7 w-7 text-muted-foreground hover:text-primary" data-testid={`edit-inv-${item.id}`}><Edit size={12} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteInventoryItem(item.id)} className="h-7 w-7 text-muted-foreground hover:text-red-400"><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehousesPage;
