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
import { FileText, Plus, Search, MoreVertical, Trash2, Download, File, FileSpreadsheet, FileImage, FileBadge } from "lucide-react";

const categoryLabels = {
  general: "General", invoice: "Factura", packing_list: "Packing List",
  bill_of_lading: "Bill of Lading", customs: "Aduanas", certificate: "Certificado", contract: "Contrato"
};

const categoryIcons = {
  general: File, invoice: FileText, packing_list: FileSpreadsheet,
  bill_of_lading: FileBadge, customs: FileBadge, certificate: FileBadge, contract: FileText
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "general", shipment_id: "", description: "", file_url: "", file_type: "" });

  const fetchDocuments = async () => {
    try {
      const params = {};
      if (filterCategory !== "all") params.category = filterCategory;
      if (search) params.search = search;
      const res = await apiClient.get("/documents", { params });
      setDocuments(res.data);
    } catch {
      toast.error("Error cargando documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [filterCategory, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/documents", form);
      toast.success("Documento creado");
      setDialogOpen(false);
      setForm({ name: "", category: "general", shipment_id: "", description: "", file_url: "", file_type: "" });
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error guardando documento");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      toast.success("Documento eliminado");
      fetchDocuments();
    } catch { toast.error("Error eliminando documento"); }
  };

  return (
    <div data-testid="documents-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Documentos</h1>
          <p className="text-sm text-zinc-500 mt-1">{documents.length} documentos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all rounded-sm" data-testid="add-document-btn">
          <Plus size={16} className="mr-2" /> Nuevo Documento
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary/50 border-input font-mono text-sm" data-testid="search-documents" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] bg-secondary/50 border-input" data-testid="filter-document-category">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="invoice">Factura</SelectItem>
            <SelectItem value="packing_list">Packing List</SelectItem>
            <SelectItem value="bill_of_lading">Bill of Lading</SelectItem>
            <SelectItem value="customs">Aduanas</SelectItem>
            <SelectItem value="certificate">Certificado</SelectItem>
            <SelectItem value="contract">Contrato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No hay documentos</p>
          <Button onClick={() => setDialogOpen(true)} variant="ghost" className="mt-4 text-[#00ff84]" data-testid="add-first-document">Crear primer documento</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const CatIcon = categoryIcons[doc.category] || File;
            return (
              <div key={doc.id} className="stat-card flex items-start gap-3" data-testid={`document-card-${doc.id}`}>
                <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center text-zinc-400 shrink-0">
                  <CatIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                  <span className="badge-status bg-zinc-500/10 text-zinc-400 mt-1 inline-block">
                    {categoryLabels[doc.category] || doc.category}
                  </span>
                  {doc.description && <p className="text-xs text-zinc-500 mt-1 truncate">{doc.description}</p>}
                  <p className="text-[10px] text-zinc-600 font-mono-data mt-2">
                    {new Date(doc.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`doc-menu-${doc.id}`}>
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {doc.file_url && (
                      <DropdownMenuItem onClick={() => window.open(doc.file_url, "_blank")}>
                        <Download size={14} className="mr-2" /> Descargar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-red-400" data-testid={`delete-doc-${doc.id}`}>
                      <Trash2 size={14} className="mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md" data-testid="document-dialog">
          <DialogHeader>
            <DialogTitle className="font-barlow text-lg uppercase tracking-tight">Nuevo Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="bg-secondary/50 border-input font-mono text-sm" data-testid="doc-name-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger className="bg-secondary/50 border-input" data-testid="doc-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="invoice">Factura</SelectItem>
                  <SelectItem value="packing_list">Packing List</SelectItem>
                  <SelectItem value="bill_of_lading">Bill of Lading</SelectItem>
                  <SelectItem value="customs">Aduanas</SelectItem>
                  <SelectItem value="certificate">Certificado</SelectItem>
                  <SelectItem value="contract">Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Descripcion</Label>
              <Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="bg-secondary/50 border-input font-mono text-sm" data-testid="doc-description-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">URL del archivo</Label>
              <Input value={form.file_url} onChange={(e) => setForm({...form, file_url: e.target.value})} placeholder="https://..." className="bg-secondary/50 border-input font-mono text-sm" data-testid="doc-url-input" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1" data-testid="cancel-doc-btn">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] rounded-sm" data-testid="save-doc-btn">Crear</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
