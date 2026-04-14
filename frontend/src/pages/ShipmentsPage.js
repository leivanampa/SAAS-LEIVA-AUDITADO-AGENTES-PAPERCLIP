import React, { useState, useEffect } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ship, Plus, Search, MoreVertical, Edit, Trash2, Eye,
  Plane, Train, Truck, Anchor, MapPin, Clock, CheckCircle2, AlertCircle, X as XIcon
} from "lucide-react";

const statusLabels = { pending: "Pendiente", in_transit: "En Transito", customs: "En Aduana", delivered: "Entregado", cancelled: "Cancelado" };
const methodIcons = { sea: Anchor, air: Plane, train: Train, truck: Truck };
const methodLabels = { sea: "Maritimo", air: "Aereo", train: "Ferrocarril", truck: "Terrestre" };

const ShipmentsPage = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [editingShipment, setEditingShipment] = useState(null);
  const [form, setForm] = useState({
    reference: "", origin: "China", destination: "Spain", supplier_name: "",
    product_description: "", quantity: 0, weight_kg: 0, volume_cbm: 0,
    shipping_method: "sea", status: "pending", estimated_departure: "",
    estimated_arrival: "", tracking_number: "", container_number: "",
    incoterm: "FOB", notes: "", cost_eur: 0
  });

  const fetchShipments = async () => {
    try {
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (search) params.search = search;
      const res = await apiClient.get("/shipments", { params });
      setShipments(res.data);
    } catch {
      toast.error("Error cargando envios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShipments(); }, [filterStatus, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, quantity: Number(form.quantity), weight_kg: Number(form.weight_kg), volume_cbm: Number(form.volume_cbm), cost_eur: Number(form.cost_eur) };
      if (editingShipment) {
        await apiClient.put(`/shipments/${editingShipment.id}`, payload);
        toast.success("Envio actualizado");
      } else {
        await apiClient.post("/shipments", payload);
        toast.success("Envio creado");
      }
      setDialogOpen(false);
      setEditingShipment(null);
      resetForm();
      fetchShipments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error guardando envio");
    }
  };

  const resetForm = () => setForm({
    reference: "", origin: "China", destination: "Spain", supplier_name: "",
    product_description: "", quantity: 0, weight_kg: 0, volume_cbm: 0,
    shipping_method: "sea", status: "pending", estimated_departure: "",
    estimated_arrival: "", tracking_number: "", container_number: "",
    incoterm: "FOB", notes: "", cost_eur: 0
  });

  const handleEdit = (s) => {
    setEditingShipment(s);
    setForm({
      reference: s.reference || "", origin: s.origin || "China", destination: s.destination || "Spain",
      supplier_name: s.supplier_name || "", product_description: s.product_description || "",
      quantity: s.quantity || 0, weight_kg: s.weight_kg || 0, volume_cbm: s.volume_cbm || 0,
      shipping_method: s.shipping_method || "sea", status: s.status || "pending",
      estimated_departure: s.estimated_departure || "", estimated_arrival: s.estimated_arrival || "",
      tracking_number: s.tracking_number || "", container_number: s.container_number || "",
      incoterm: s.incoterm || "FOB", notes: s.notes || "", cost_eur: s.cost_eur || 0
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/shipments/${id}`);
      toast.success("Envio eliminado");
      fetchShipments();
    } catch { toast.error("Error eliminando envio"); }
  };

  const viewDetail = async (id) => {
    try {
      const res = await apiClient.get(`/shipments/${id}`);
      setSelectedShipment(res.data);
      setDetailOpen(true);
    } catch { toast.error("Error cargando detalle"); }
  };

  const openNew = () => {
    setEditingShipment(null);
    resetForm();
    setDialogOpen(true);
  };

  const MethodIcon = ({ method }) => {
    const Icon = methodIcons[method] || Ship;
    return <Icon size={14} />;
  };

  return (
    <div data-testid="shipments-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Envios</h1>
          <p className="text-sm text-zinc-500 mt-1">{shipments.length} envios</p>
        </div>
        <Button onClick={openNew} className="bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all rounded-sm" data-testid="add-shipment-btn">
          <Plus size={16} className="mr-2" /> Nuevo Envio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Buscar envios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary/50 border-input font-mono text-sm" data-testid="search-shipments" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] bg-secondary/50 border-input" data-testid="filter-shipment-status">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_transit">En Transito</SelectItem>
            <SelectItem value="customs">En Aduana</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shipments Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-16">
          <Ship size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No hay envios</p>
          <Button onClick={openNew} variant="ghost" className="mt-4 text-[#00ff84]" data-testid="add-first-shipment">Crear primer envio</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="shipments-table">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Ruta</th>
                <th>Metodo</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Coste</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-white font-mono-data text-xs">{s.reference}</td>
                  <td>
                    <div className="flex items-center gap-1 text-xs">
                      <MapPin size={12} className="text-zinc-600" />
                      {s.origin} → {s.destination}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <MethodIcon method={s.shipping_method} />
                      {methodLabels[s.shipping_method] || s.shipping_method}
                    </div>
                  </td>
                  <td className="text-xs">{s.supplier_name || "-"}</td>
                  <td>
                    <span className={`badge-status badge-${s.status?.replace("_", "-")}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="font-mono-data text-xs">{(s.cost_eur || 0).toFixed(2)} EUR</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`shipment-menu-${s.id}`}>
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => viewDetail(s.id)} data-testid={`view-shipment-${s.id}`}>
                          <Eye size={14} className="mr-2" /> Ver Detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(s)} data-testid={`edit-shipment-${s.id}`}>
                          <Edit size={14} className="mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-red-400" data-testid={`delete-shipment-${s.id}`}>
                          <Trash2 size={14} className="mr-2" /> Eliminar
                        </DropdownMenuItem>
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
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto" data-testid="shipment-dialog">
          <DialogHeader>
            <DialogTitle className="font-barlow text-lg uppercase tracking-tight">
              {editingShipment ? "Editar Envio" : "Nuevo Envio"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Referencia *</Label>
                <Input value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} required className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-reference-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Metodo</Label>
                <Select value={form.shipping_method} onValueChange={(v) => setForm({...form, shipping_method: v})}>
                  <SelectTrigger className="bg-secondary/50 border-input" data-testid="shipment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sea">Maritimo</SelectItem>
                    <SelectItem value="air">Aereo</SelectItem>
                    <SelectItem value="train">Ferrocarril</SelectItem>
                    <SelectItem value="truck">Terrestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Origen</Label>
                <Input value={form.origin} onChange={(e) => setForm({...form, origin: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-origin-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Destino</Label>
                <Input value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-destination-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Proveedor</Label>
              <Input value={form.supplier_name} onChange={(e) => setForm({...form, supplier_name: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-supplier-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Descripcion del producto</Label>
              <Input value={form.product_description} onChange={(e) => setForm({...form, product_description: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-product-input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Cantidad</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-quantity-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Peso (kg)</Label>
                <Input type="number" step="0.01" value={form.weight_kg} onChange={(e) => setForm({...form, weight_kg: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-weight-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Volumen (CBM)</Label>
                <Input type="number" step="0.01" value={form.volume_cbm} onChange={(e) => setForm({...form, volume_cbm: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-volume-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">N. Tracking</Label>
                <Input value={form.tracking_number} onChange={(e) => setForm({...form, tracking_number: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-tracking-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">N. Contenedor</Label>
                <Input value={form.container_number} onChange={(e) => setForm({...form, container_number: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-container-input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Incoterm</Label>
                <Select value={form.incoterm} onValueChange={(v) => setForm({...form, incoterm: v})}>
                  <SelectTrigger className="bg-secondary/50 border-input" data-testid="shipment-incoterm-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["EXW","FCA","FOB","CFR","CIF","DAP","DDP"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger className="bg-secondary/50 border-input" data-testid="shipment-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_transit">En Transito</SelectItem>
                    <SelectItem value="customs">En Aduana</SelectItem>
                    <SelectItem value="delivered">Entregado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Coste (EUR)</Label>
                <Input type="number" step="0.01" value={form.cost_eur} onChange={(e) => setForm({...form, cost_eur: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-cost-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Salida estimada</Label>
                <Input type="date" value={form.estimated_departure} onChange={(e) => setForm({...form, estimated_departure: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-departure-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Llegada estimada</Label>
                <Input type="date" value={form.estimated_arrival} onChange={(e) => setForm({...form, estimated_arrival: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-arrival-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="shipment-notes-input" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1" data-testid="cancel-shipment-btn">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] rounded-sm" data-testid="save-shipment-btn">
                {editingShipment ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto" data-testid="shipment-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-barlow text-lg uppercase tracking-tight">
              Detalle del Envio
            </DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono-data text-lg text-white">{selectedShipment.reference}</p>
                <span className={`badge-status badge-${selectedShipment.status?.replace("_","-")}`}>
                  {statusLabels[selectedShipment.status] || selectedShipment.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Ruta</p><p className="text-zinc-300">{selectedShipment.origin} → {selectedShipment.destination}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Metodo</p><p className="text-zinc-300">{methodLabels[selectedShipment.shipping_method]}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Proveedor</p><p className="text-zinc-300">{selectedShipment.supplier_name || "-"}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Incoterm</p><p className="text-zinc-300">{selectedShipment.incoterm}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Tracking</p><p className="text-zinc-300 font-mono-data text-xs">{selectedShipment.tracking_number || "-"}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Contenedor</p><p className="text-zinc-300 font-mono-data text-xs">{selectedShipment.container_number || "-"}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Coste</p><p className="text-white font-mono-data">{(selectedShipment.cost_eur || 0).toFixed(2)} EUR</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Peso / Volumen</p><p className="text-zinc-300 font-mono-data text-xs">{selectedShipment.weight_kg} kg / {selectedShipment.volume_cbm} CBM</p></div>
              </div>

              {/* Status Timeline */}
              {selectedShipment.status_history?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Historial de Estados</p>
                  <div className="space-y-3">
                    {selectedShipment.status_history.map((ev, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${i === selectedShipment.status_history.length - 1 ? "bg-[#00ff84]" : "bg-zinc-600"}`} />
                          {i < selectedShipment.status_history.length - 1 && <div className="w-px h-full bg-zinc-700 mt-1" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm text-white">{statusLabels[ev.status] || ev.status}</p>
                          <p className="text-[10px] text-zinc-500">{ev.description}</p>
                          {ev.location && <p className="text-[10px] text-zinc-500">{ev.location}</p>}
                          <p className="text-[10px] text-zinc-600 font-mono-data">{new Date(ev.timestamp).toLocaleString("es-ES")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShipmentsPage;
