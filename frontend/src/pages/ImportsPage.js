import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Factory, Package, Handshake, FlaskConical, ClipboardList, Cog,
  Ship, Building2, CheckCircle2, Plus, Search, Lock, Unlock,
  ChevronLeft, ChevronRight, FileDown, Mail, Trash2, Save,
  X, Paperclip, MoreVertical, ArrowRight, Eye, ChevronDown, Upload
} from "lucide-react";

const STAGES = [
  { num: 1, name: "Proveedor", icon: Factory },
  { num: 2, name: "Producto", icon: Package },
  { num: 3, name: "Negociacion", icon: Handshake },
  { num: 4, name: "Muestras", icon: FlaskConical },
  { num: 5, name: "Pedido", icon: ClipboardList },
  { num: 6, name: "Produccion", icon: Cog },
  { num: 7, name: "Logistica", icon: Ship },
  { num: 8, name: "Aduana", icon: Building2 },
  { num: 9, name: "Entrega Final", icon: CheckCircle2 },
];

// ===== HELPERS =====
const FF = ({ label, value = "", onChange, type = "text", placeholder, disabled, className = "", testId }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
    <Input type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="bg-secondary/50 border-input font-mono text-sm" disabled={disabled} data-testid={testId} placeholder={placeholder} />
  </div>
);

const SF = ({ label, value = "", onChange, options = [], placeholder = "Seleccionar", testId }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="bg-secondary/50 border-input text-sm" data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

const TF = ({ label, value = "", onChange, placeholder, rows = 3 }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
    <Textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="bg-secondary/50 border-input font-mono text-sm resize-none" />
  </div>
);

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem("token");

const Docs = ({ items = [], onUpdate, label = "Documentos adjuntos" }) => {
  const [uploading, setUploading] = React.useState(false);
  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const newItems = [...(items || [])];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/api/files/upload`, {
          method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd
        });
        const data = await res.json();
        newItems.push({ name: data.filename, url: `${API_BASE}/api/files/${data.id}`, file_id: data.id, size: data.size });
      }
      onUpdate(newItems);
      toast.success("Archivo(s) adjuntado(s)");
    } catch { toast.error("Error subiendo archivo"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  return (
    <div className="space-y-2 mt-4 p-3 border border-border/30 rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Paperclip size={10} /> {label}</span>
        <label className="flex items-center gap-1 h-6 px-2 text-[10px] text-primary cursor-pointer hover:bg-secondary/50 rounded">
          <Upload size={10} /> {uploading ? "Subiendo..." : "Subir archivo"}
          <input type="file" className="hidden" onChange={handleUpload} multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.csv,.eml,.zip" disabled={uploading} />
        </label>
      </div>
      {(items || []).map((d, i) => (
        <div key={i} className="flex gap-2 items-center bg-secondary/20 rounded px-2 py-1">
          <Paperclip size={10} className="text-muted-foreground shrink-0" />
          <span className="text-xs truncate flex-1">{d.name || "Sin nombre"}</span>
          {d.size && <span className="text-[9px] text-muted-foreground">{(d.size / 1024).toFixed(0)}KB</span>}
          {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px] shrink-0"><Eye size={10} /></a>}
          <Button type="button" variant="ghost" size="icon" onClick={() => onUpdate(items.filter((_, j) => j !== i))} className="h-5 w-5 text-muted-foreground hover:text-red-400 shrink-0"><X size={10} /></Button>
        </div>
      ))}
      {(!items || items.length === 0) && <p className="text-[10px] text-muted-foreground text-center py-1">Sin archivos adjuntos</p>}
    </div>
  );
};

// ===== STAGE 1: PROVEEDOR =====
const Stage1 = ({ data = {}, update }) => (
  <div className="space-y-4" data-testid="stage-1-form">
    <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Datos del Proveedor</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FF label="Empresa *" value={data.company_name} onChange={v => update("company_name", v)} testId="s1-company" />
      <FF label="Persona de contacto" value={data.contact_name} onChange={v => update("contact_name", v)} testId="s1-contact" />
      <FF label="Email" value={data.email} onChange={v => update("email", v)} type="email" testId="s1-email" />
      <FF label="Telefono" value={data.phone} onChange={v => update("phone", v)} testId="s1-phone" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <FF label="Direccion" value={data.address} onChange={v => update("address", v)} className="md:col-span-2" testId="s1-address" />
      <FF label="Codigo Postal" value={data.postal_code} onChange={v => update("postal_code", v)} testId="s1-postal" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <FF label="Ciudad" value={data.city} onChange={v => update("city", v)} testId="s1-city" />
      <FF label="Provincia" value={data.province} onChange={v => update("province", v)} testId="s1-province" />
      <FF label="Pais" value={data.country} onChange={v => update("country", v)} placeholder="China" testId="s1-country" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <FF label="NIF / Tax ID" value={data.tax_id} onChange={v => update("tax_id", v)} testId="s1-taxid" />
      <SF label="Verificacion" value={data.verification_status} onChange={v => update("verification_status", v)} options={[{value:"pending",label:"Pendiente"},{value:"verified",label:"Verificado"},{value:"rejected",label:"Rechazado"}]} testId="s1-verification" />
      <FF label="Web" value={data.website} onChange={v => update("website", v)} placeholder="https://" testId="s1-web" />
    </div>
    <TF label="Notas" value={data.notes} onChange={v => update("notes", v)} />
    <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    <Docs items={data.images} onUpdate={v => update("images", v)} label="Imagenes adjuntas" />
  </div>
);

// ===== STAGE 2: PRODUCTO =====
const Stage2 = ({ data = {}, update }) => {
  const products = data.products || [];
  const updateProduct = (i, key, val) => { const p = [...products]; p[i] = { ...p[i], [key]: val }; update("products", p); };
  const addProduct = () => update("products", [...products, { name: "", description: "", hs_code: "", taric_code: "", unit_price: 0, currency: "USD", quantity: 0, specifications: "", certifications: [], images: [] }]);
  const removeProduct = (i) => update("products", products.filter((_, j) => j !== i));
  const updateCert = (pi, ci, key, val) => {
    const p = [...products]; const certs = [...(p[pi].certifications || [])]; certs[ci] = { ...certs[ci], [key]: val }; p[pi] = { ...p[pi], certifications: certs }; update("products", p);
  };
  const addCert = (pi) => { const p = [...products]; p[pi] = { ...p[pi], certifications: [...(p[pi].certifications || []), { name: "", required_by: "", status: "pending" }] }; update("products", p); };
  const removeCert = (pi, ci) => { const p = [...products]; p[pi] = { ...p[pi], certifications: (p[pi].certifications || []).filter((_, j) => j !== ci) }; update("products", p); };

  return (
    <div className="space-y-4" data-testid="stage-2-form">
      <div className="flex items-center justify-between">
        <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Productos</h3>
        <Button variant="ghost" size="sm" onClick={addProduct} className="text-primary text-xs" data-testid="add-product"><Plus size={12} className="mr-1" /> Producto</Button>
      </div>
      {products.map((p, i) => (
        <div key={i} className="border border-border/50 rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Producto {i + 1}</span>
            <Button variant="ghost" size="icon" onClick={() => removeProduct(i)} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={12} /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FF label="Nombre *" value={p.name} onChange={v => updateProduct(i, "name", v)} />
            <FF label="Cantidad" value={p.quantity} onChange={v => updateProduct(i, "quantity", v)} type="number" />
          </div>
          <TF label="Descripcion tecnica" value={p.description} onChange={v => updateProduct(i, "description", v)} rows={2} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <FF label="Codigo HS" value={p.hs_code} onChange={v => updateProduct(i, "hs_code", v)} placeholder="8471.30" />
            <FF label="Codigo TARIC" value={p.taric_code} onChange={v => updateProduct(i, "taric_code", v)} />
            <FF label="Precio unitario" value={p.unit_price} onChange={v => updateProduct(i, "unit_price", v)} type="number" />
            <SF label="Moneda" value={p.currency} onChange={v => updateProduct(i, "currency", v)} options={[{value:"USD",label:"USD"},{value:"EUR",label:"EUR"},{value:"CNY",label:"CNY"}]} />
          </div>
          <TF label="Especificaciones" value={p.specifications} onChange={v => updateProduct(i, "specifications", v)} rows={2} />
          {/* Certifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Certificaciones requeridas</label>
              <Button variant="ghost" size="sm" onClick={() => addCert(i)} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Certificacion</Button>
            </div>
            {(p.certifications || []).map((c, ci) => (
              <div key={ci} className="flex gap-2 items-center">
                <Input value={c.name || ""} onChange={e => updateCert(i, ci, "name", e.target.value)} placeholder="Nombre (CE, ISO...)" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
                <Input value={c.required_by || ""} onChange={e => updateCert(i, ci, "required_by", e.target.value)} placeholder="Requerido por" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
                <Select value={c.status || "pending"} onValueChange={v => updateCert(i, ci, "status", v)}>
                  <SelectTrigger className="bg-secondary/30 border-0 text-xs h-7 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="obtained">Obtenida</SelectItem><SelectItem value="rejected">Rechazada</SelectItem></SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeCert(i, ci)} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
              </div>
            ))}
          </div>
          <Docs items={p.images} onUpdate={v => updateProduct(i, "images", v)} label="Imagenes del producto" />
        </div>
      ))}
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    </div>
  );
};

// ===== STAGE 3: NEGOCIACION =====
const Stage3 = ({ data = {}, update }) => {
  const contacts = data.contacts || [];
  const updateContact = (i, k, v) => { const c = [...contacts]; c[i] = { ...c[i], [k]: v }; update("contacts", c); };
  return (
    <div className="space-y-4" data-testid="stage-3-form">
      <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Negociacion</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SF label="Incoterm *" value={data.incoterm} onChange={v => update("incoterm", v)} options={["EXW","FCA","FOB","CFR","CIF","DAP","DDP"].map(v=>({value:v,label:v}))} />
        <FF label="Precio negociado" value={data.negotiated_price} onChange={v => update("negotiated_price", v)} type="number" />
        <SF label="Moneda" value={data.currency} onChange={v => update("currency", v)} options={[{value:"USD",label:"USD"},{value:"EUR",label:"EUR"},{value:"CNY",label:"CNY"}]} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FF label="MOQ" value={data.moq} onChange={v => update("moq", v)} type="number" />
        <FF label="Valor total" value={data.total_value} onChange={v => update("total_value", v)} type="number" />
        <SF label="Condiciones de pago" value={data.payment_terms} onChange={v => update("payment_terms", v)} options={[{value:"tt_advance",label:"T/T Anticipado"},{value:"tt_30_70",label:"T/T 30/70"},{value:"lc",label:"Carta de Credito"},{value:"dp",label:"D/P"},{value:"oa",label:"Open Account"},{value:"other",label:"Otro"}]} />
      </div>
      <TF label="Condiciones especiales" value={data.conditions} onChange={v => update("conditions", v)} rows={2} />
      {/* Contact persons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Personas de contacto</label>
          <Button variant="ghost" size="sm" onClick={() => update("contacts", [...contacts, {name:"",role:"BDM",email:"",phone:""}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Contacto</Button>
        </div>
        {contacts.map((c, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <Input value={c.name||""} onChange={e => updateContact(i,"name",e.target.value)} placeholder="Nombre" className="bg-secondary/30 border-0 text-xs h-7 flex-1 min-w-[120px]" />
            <Select value={c.role||"BDM"} onValueChange={v => updateContact(i,"role",v)}>
              <SelectTrigger className="bg-secondary/30 border-0 text-xs h-7 w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="BDM">BDM</SelectItem><SelectItem value="Sales">Sales</SelectItem><SelectItem value="Manager">Manager</SelectItem><SelectItem value="Other">Otro</SelectItem></SelectContent>
            </Select>
            <Input value={c.email||""} onChange={e => updateContact(i,"email",e.target.value)} placeholder="Email" className="bg-secondary/30 border-0 text-xs h-7 flex-1 min-w-[140px]" />
            <Input value={c.phone||""} onChange={e => updateContact(i,"phone",e.target.value)} placeholder="Telefono" className="bg-secondary/30 border-0 text-xs h-7 w-32" />
            <Button variant="ghost" size="icon" onClick={() => update("contacts", contacts.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
          </div>
        ))}
      </div>
      <TF label="Notas" value={data.notes} onChange={v => update("notes", v)} />
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    </div>
  );
};

// ===== STAGE 4: MUESTRAS =====
const Stage4 = ({ data = {}, update }) => {
  const tests = data.inspection_tests || [];
  const updateTest = (i, k, v) => { const t = [...tests]; t[i] = { ...t[i], [k]: v }; update("inspection_tests", t); };
  return (
    <div className="space-y-4" data-testid="stage-4-form">
      <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Muestras</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FF label="N. Tracking" value={data.tracking_number} onChange={v => update("tracking_number", v)} />
        <SF label="Courier" value={data.courier} onChange={v => update("courier", v)} options={[{value:"DHL",label:"DHL"},{value:"FedEx",label:"FedEx"},{value:"UPS",label:"UPS"},{value:"TNT",label:"TNT"},{value:"other",label:"Otro"}]} />
        <SF label="Resultado general" value={data.overall_result} onChange={v => update("overall_result", v)} options={[{value:"pending",label:"Pendiente"},{value:"approved",label:"Aprobado"},{value:"rejected",label:"Rechazado"},{value:"conditional",label:"Condicional"}]} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="Fecha de envio" value={data.sent_date} onChange={v => update("sent_date", v)} type="date" />
        <FF label="Fecha de recepcion" value={data.received_date} onChange={v => update("received_date", v)} type="date" />
      </div>
      {/* Inspection tests */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Pruebas de inspeccion</label>
          <Button variant="ghost" size="sm" onClick={() => update("inspection_tests", [...tests, {test_name:"",method:"",expected_result:"",actual_result:"",status:"pending",notes:""}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Prueba</Button>
        </div>
        {tests.map((t, i) => (
          <div key={i} className="border border-border/30 rounded-sm p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Prueba {i + 1}</span>
              <Button variant="ghost" size="icon" onClick={() => update("inspection_tests", tests.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input value={t.test_name||""} onChange={e => updateTest(i,"test_name",e.target.value)} placeholder="Nombre de la prueba" className="bg-secondary/30 border-0 text-xs h-7" />
              <Input value={t.method||""} onChange={e => updateTest(i,"method",e.target.value)} placeholder="Metodo" className="bg-secondary/30 border-0 text-xs h-7" />
              <Input value={t.expected_result||""} onChange={e => updateTest(i,"expected_result",e.target.value)} placeholder="Resultado esperado" className="bg-secondary/30 border-0 text-xs h-7" />
              <Input value={t.actual_result||""} onChange={e => updateTest(i,"actual_result",e.target.value)} placeholder="Resultado obtenido" className="bg-secondary/30 border-0 text-xs h-7" />
            </div>
            <div className="flex gap-2 items-center">
              <Select value={t.status||"pending"} onValueChange={v => updateTest(i,"status",v)}>
                <SelectTrigger className="bg-secondary/30 border-0 text-xs h-7 w-28"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="pass">Aprobado</SelectItem><SelectItem value="fail">Fallido</SelectItem></SelectContent>
              </Select>
              <Input value={t.notes||""} onChange={e => updateTest(i,"notes",e.target.value)} placeholder="Notas" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
            </div>
          </div>
        ))}
      </div>
      <TF label="Notas generales" value={data.notes} onChange={v => update("notes", v)} />
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
      <Docs items={data.images} onUpdate={v => update("images", v)} label="Imagenes de muestras" />
    </div>
  );
};

// ===== STAGE 5: PEDIDO =====
const Stage5 = ({ data = {}, update }) => {
  const advances = data.advances || [];
  const updateAdv = (i, k, v) => { const a = [...advances]; a[i] = { ...a[i], [k]: v }; update("advances", a); };
  return (
    <div className="space-y-4" data-testid="stage-5-form">
      <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Pedido</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="N. PO *" value={data.po_number} onChange={v => update("po_number", v)} />
        <FF label="N. Proforma Invoice" value={data.proforma_invoice} onChange={v => update("proforma_invoice", v)} />
        <FF label="Fecha del pedido" value={data.order_date} onChange={v => update("order_date", v)} type="date" />
        <FF label="Fecha de confirmacion" value={data.confirmation_date} onChange={v => update("confirmation_date", v)} type="date" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="Valor total del pedido" value={data.total_value} onChange={v => update("total_value", v)} type="number" />
        <SF label="Moneda" value={data.currency} onChange={v => update("currency", v)} options={[{value:"USD",label:"USD"},{value:"EUR",label:"EUR"},{value:"CNY",label:"CNY"}]} />
      </div>
      {/* Advances */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Anticipos / Pagos</label>
          <Button variant="ghost" size="sm" onClick={() => update("advances", [...advances, {amount:0,date:"",method:"",reference:"",notes:""}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Pago</Button>
        </div>
        {advances.map((a, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <Input value={a.amount||""} onChange={e => updateAdv(i,"amount",e.target.value)} placeholder="Importe" type="number" className="bg-secondary/30 border-0 text-xs h-7 w-24" />
            <Input value={a.date||""} onChange={e => updateAdv(i,"date",e.target.value)} type="date" className="bg-secondary/30 border-0 text-xs h-7 w-36" />
            <Input value={a.method||""} onChange={e => updateAdv(i,"method",e.target.value)} placeholder="Metodo" className="bg-secondary/30 border-0 text-xs h-7 w-28" />
            <Input value={a.reference||""} onChange={e => updateAdv(i,"reference",e.target.value)} placeholder="Referencia" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
            <Button variant="ghost" size="icon" onClick={() => update("advances", advances.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
          </div>
        ))}
      </div>
      <TF label="Notas" value={data.notes} onChange={v => update("notes", v)} />
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    </div>
  );
};

// ===== STAGE 6: PRODUCCION =====
const Stage6 = ({ data = {}, update }) => {
  const qcInspections = data.quality_inspections || [];
  const productStatus = data.product_status || [];
  const psi = data.pre_shipment_inspection || {};
  const updatePSI = (k, v) => update("pre_shipment_inspection", { ...psi, [k]: v });
  const updateQC = (i, k, v) => { const q = [...qcInspections]; q[i] = { ...q[i], [k]: v }; update("quality_inspections", q); };
  const updatePS = (i, k, v) => { const p = [...productStatus]; p[i] = { ...p[i], [k]: v }; update("product_status", p); };
  return (
    <div className="space-y-4" data-testid="stage-6-form">
      <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Produccion</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FF label="Lead time (dias)" value={data.lead_time_days} onChange={v => update("lead_time_days", v)} type="number" />
        <FF label="Inicio produccion" value={data.production_start} onChange={v => update("production_start", v)} type="date" />
        <FF label="Fin estimado" value={data.estimated_completion} onChange={v => update("estimated_completion", v)} type="date" />
      </div>
      {/* Pre-shipment inspection */}
      <div className="border border-border/30 rounded-sm p-3 space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Inspeccion pre-embarque</label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <SF label="Empresa" value={psi.company} onChange={v => updatePSI("company", v)} options={[{value:"SGS",label:"SGS"},{value:"BV",label:"Bureau Veritas"},{value:"QIMA",label:"QIMA"},{value:"other",label:"Otra"}]} />
          <FF label="Fecha" value={psi.date} onChange={v => updatePSI("date", v)} type="date" />
          <SF label="Resultado" value={psi.result} onChange={v => updatePSI("result", v)} options={[{value:"pending",label:"Pendiente"},{value:"pass",label:"Aprobado"},{value:"fail",label:"Fallido"},{value:"conditional",label:"Condicional"}]} />
          <FF label="URL Informe" value={psi.report_url} onChange={v => updatePSI("report_url", v)} placeholder="https://" />
        </div>
        <TF label="Notas" value={psi.notes} onChange={v => updatePSI("notes", v)} rows={2} />
      </div>
      {/* Additional QC inspections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Inspecciones de calidad adicionales</label>
          <Button variant="ghost" size="sm" onClick={() => update("quality_inspections", [...qcInspections, {type:"",company:"",date:"",result:"",notes:""}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Inspeccion</Button>
        </div>
        {qcInspections.map((q, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <Input value={q.type||""} onChange={e => updateQC(i,"type",e.target.value)} placeholder="Tipo" className="bg-secondary/30 border-0 text-xs h-7 w-28" />
            <Input value={q.company||""} onChange={e => updateQC(i,"company",e.target.value)} placeholder="Empresa" className="bg-secondary/30 border-0 text-xs h-7 w-28" />
            <Input value={q.date||""} onChange={e => updateQC(i,"date",e.target.value)} type="date" className="bg-secondary/30 border-0 text-xs h-7 w-36" />
            <Select value={q.result||""} onValueChange={v => updateQC(i,"result",v)}>
              <SelectTrigger className="bg-secondary/30 border-0 text-xs h-7 w-28"><SelectValue placeholder="Resultado" /></SelectTrigger>
              <SelectContent><SelectItem value="pass">Aprobado</SelectItem><SelectItem value="fail">Fallido</SelectItem><SelectItem value="pending">Pendiente</SelectItem></SelectContent>
            </Select>
            <Input value={q.notes||""} onChange={e => updateQC(i,"notes",e.target.value)} placeholder="Notas" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
            <Button variant="ghost" size="icon" onClick={() => update("quality_inspections", qcInspections.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
          </div>
        ))}
      </div>
      {/* Product status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Estado de produccion por producto</label>
          <Button variant="ghost" size="sm" onClick={() => update("product_status", [...productStatus, {product_name:"",status:"pending",qty_completed:0,qty_total:0,notes:""}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Producto</Button>
        </div>
        {productStatus.map((p, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <Input value={p.product_name||""} onChange={e => updatePS(i,"product_name",e.target.value)} placeholder="Producto" className="bg-secondary/30 border-0 text-xs h-7 flex-1 min-w-[120px]" />
            <Select value={p.status||"pending"} onValueChange={v => updatePS(i,"status",v)}>
              <SelectTrigger className="bg-secondary/30 border-0 text-xs h-7 w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="in_production">En produccion</SelectItem><SelectItem value="completed">Completado</SelectItem><SelectItem value="shipped">Enviado</SelectItem></SelectContent>
            </Select>
            <Input value={p.qty_completed||""} onChange={e => updatePS(i,"qty_completed",e.target.value)} placeholder="Hechos" type="number" className="bg-secondary/30 border-0 text-xs h-7 w-20" />
            <span className="text-xs text-muted-foreground">/</span>
            <Input value={p.qty_total||""} onChange={e => updatePS(i,"qty_total",e.target.value)} placeholder="Total" type="number" className="bg-secondary/30 border-0 text-xs h-7 w-20" />
            <Button variant="ghost" size="icon" onClick={() => update("product_status", productStatus.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
          </div>
        ))}
      </div>
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    </div>
  );
};

// ===== STAGE 7: LOGISTICA =====
const Stage7 = ({ data = {}, update }) => (
  <div className="space-y-4" data-testid="stage-7-form">
    <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Logistica</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <SF label="Metodo de envio" value={data.shipping_method} onChange={v => update("shipping_method", v)} options={[{value:"sea",label:"Maritimo"},{value:"air",label:"Aereo"},{value:"train",label:"Ferrocarril"},{value:"truck",label:"Terrestre"}]} />
      <SF label="Tipo contenedor" value={data.container_type} onChange={v => update("container_type", v)} options={[{value:"20GP",label:"20' GP"},{value:"40GP",label:"40' GP"},{value:"40HC",label:"40' HC"},{value:"LCL",label:"LCL (Grupaje)"},{value:"other",label:"Otro"}]} />
      <FF label="N. Contenedor" value={data.container_number} onChange={v => update("container_number", v)} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FF label="Bill of Lading (B/L)" value={data.bill_of_lading} onChange={v => update("bill_of_lading", v)} />
      <FF label="Linea naviera" value={data.shipping_line} onChange={v => update("shipping_line", v)} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <FF label="ETD (Salida estimada)" value={data.etd} onChange={v => update("etd", v)} type="date" />
      <FF label="ETA (Llegada estimada)" value={data.eta} onChange={v => update("eta", v)} type="date" />
      <FF label="Nombre del buque" value={data.vessel_name} onChange={v => update("vessel_name", v)} />
    </div>
    <Separator className="bg-border/30" />
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Transitario</label>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <FF label="Empresa transitario" value={data.freight_forwarder} onChange={v => update("freight_forwarder", v)} />
      <FF label="Contacto" value={data.ff_contact} onChange={v => update("ff_contact", v)} />
      <FF label="Telefono" value={data.ff_phone} onChange={v => update("ff_phone", v)} />
    </div>
    <FF label="Coste de flete" value={data.freight_cost} onChange={v => update("freight_cost", v)} type="number" />
    <TF label="Notas" value={data.notes} onChange={v => update("notes", v)} />
    <Docs items={data.documents} onUpdate={v => update("documents", v)} />
  </div>
);

// ===== STAGE 8: ADUANA =====
const Stage8 = ({ data = {}, update }) => {
  const tariffM = data.tariff_measures || [];
  const nonTariffM = data.non_tariff_measures || [];
  const updateTM = (i, k, v) => { const t = [...tariffM]; t[i] = { ...t[i], [k]: v }; update("tariff_measures", t); };
  const updateNTM = (i, k, v) => { const t = [...nonTariffM]; t[i] = { ...t[i], [k]: v }; update("non_tariff_measures", t); };
  return (
    <div className="space-y-4" data-testid="stage-8-form">
      <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Aduana</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SF label="Regimen aduanero *" value={data.customs_regime} onChange={v => update("customs_regime", v)} options={[{value:"4000",label:"4000 - Despacho a libre practica"},{value:"4200",label:"4200 - Libre practica + IVA diferido"},{value:"4051",label:"4051 - Importacion temporal"},{value:"5100",label:"5100 - Perfeccionamiento activo"},{value:"other",label:"Otro"}]} />
        <FF label="N. DUA" value={data.dua_number} onChange={v => update("dua_number", v)} />
        <FF label="MRN" value={data.mrn} onChange={v => update("mrn", v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FF label="Valor en aduana (EUR)" value={data.customs_value} onChange={v => update("customs_value", v)} type="number" />
        <FF label="Tipo arancelario (%)" value={data.tariff_rate} onChange={v => update("tariff_rate", v)} type="number" />
        <FF label="Tipo IVA (%)" value={data.vat_rate} onChange={v => update("vat_rate", v)} type="number" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FF label="Derechos arancelarios" value={data.duties_amount} onChange={v => update("duties_amount", v)} type="number" />
        <FF label="IVA importacion" value={data.vat_amount} onChange={v => update("vat_amount", v)} type="number" />
        <FF label="Coste total aduana" value={data.total_customs_cost} onChange={v => update("total_customs_cost", v)} type="number" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="Agente de aduanas" value={data.customs_agent} onChange={v => update("customs_agent", v)} />
        <FF label="Contacto agente" value={data.agent_contact} onChange={v => update("agent_contact", v)} />
      </div>
      {/* Tariff measures */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Medidas arancelarias</label>
          <Button variant="ghost" size="sm" onClick={() => update("tariff_measures", [...tariffM, {type:"arancelaria",description:"",rate:0,amount:0}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Medida</Button>
        </div>
        {tariffM.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={m.description||""} onChange={e => updateTM(i,"description",e.target.value)} placeholder="Descripcion" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
            <Input value={m.rate||""} onChange={e => updateTM(i,"rate",e.target.value)} placeholder="%" type="number" className="bg-secondary/30 border-0 text-xs h-7 w-16" />
            <Input value={m.amount||""} onChange={e => updateTM(i,"amount",e.target.value)} placeholder="EUR" type="number" className="bg-secondary/30 border-0 text-xs h-7 w-24" />
            <Button variant="ghost" size="icon" onClick={() => update("tariff_measures", tariffM.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
          </div>
        ))}
      </div>
      {/* Non-tariff measures */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Medidas no arancelarias</label>
          <Button variant="ghost" size="sm" onClick={() => update("non_tariff_measures", [...nonTariffM, {type:"",description:"",requirement:""}])} className="h-6 text-[10px] text-primary"><Plus size={10} className="mr-1" /> Medida</Button>
        </div>
        {nonTariffM.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={m.type||""} onChange={e => updateNTM(i,"type",e.target.value)} placeholder="Tipo" className="bg-secondary/30 border-0 text-xs h-7 w-32" />
            <Input value={m.description||""} onChange={e => updateNTM(i,"description",e.target.value)} placeholder="Descripcion" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
            <Input value={m.requirement||""} onChange={e => updateNTM(i,"requirement",e.target.value)} placeholder="Requisito" className="bg-secondary/30 border-0 text-xs h-7 flex-1" />
            <Button variant="ghost" size="icon" onClick={() => update("non_tariff_measures", nonTariffM.filter((_,j)=>j!==i))} className="h-6 w-6 text-muted-foreground hover:text-red-400"><X size={10} /></Button>
          </div>
        ))}
      </div>
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    </div>
  );
};

// ===== STAGE 9: ENTREGA FINAL =====
const Stage9 = ({ data = {}, update }) => {
  const lm = data.last_mile_transporter || {};
  const dest = data.destination || {};
  const updateLM = (k, v) => update("last_mile_transporter", { ...lm, [k]: v });
  const updateDest = (k, v) => update("destination", { ...dest, [k]: v });
  return (
    <div className="space-y-4" data-testid="stage-9-form">
      <h3 className="font-barlow text-base font-bold uppercase tracking-tight">Entrega Final</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="Fecha entrega prevista" value={data.delivery_date} onChange={v => update("delivery_date", v)} type="date" />
        <FF label="Fecha entrega real" value={data.actual_date} onChange={v => update("actual_date", v)} type="date" />
      </div>
      <Separator className="bg-border/30" />
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Transportista ultimo tramo</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="Empresa" value={lm.company} onChange={v => updateLM("company", v)} />
        <FF label="Contacto" value={lm.contact} onChange={v => updateLM("contact", v)} />
        <FF label="Telefono" value={lm.phone} onChange={v => updateLM("phone", v)} />
        <FF label="N. Tracking" value={lm.tracking} onChange={v => updateLM("tracking", v)} />
        <FF label="Coste transporte" value={lm.cost} onChange={v => updateLM("cost", v)} type="number" />
      </div>
      <Separator className="bg-border/30" />
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Destino final (Empresa / Almacen)</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FF label="Empresa/Almacen" value={dest.company} onChange={v => updateDest("company", v)} />
        <FF label="Contacto" value={dest.contact_name} onChange={v => updateDest("contact_name", v)} />
        <FF label="Direccion" value={dest.address} onChange={v => updateDest("address", v)} className="md:col-span-2" />
        <FF label="Ciudad" value={dest.city} onChange={v => updateDest("city", v)} />
        <FF label="Provincia" value={dest.province} onChange={v => updateDest("province", v)} />
        <FF label="Codigo Postal" value={dest.postal_code} onChange={v => updateDest("postal_code", v)} />
        <FF label="Telefono" value={dest.phone} onChange={v => updateDest("phone", v)} />
      </div>
      <Separator className="bg-border/30" />
      <FF label="Coste total real de la importacion (EUR)" value={data.total_real_cost} onChange={v => update("total_real_cost", v)} type="number" />
      <TF label="Lecciones aprendidas" value={data.lessons_learned} onChange={v => update("lessons_learned", v)} rows={3} />
      <TF label="Notas de entrega" value={data.delivery_notes} onChange={v => update("delivery_notes", v)} rows={2} />
      <Docs items={data.documents} onUpdate={v => update("documents", v)} />
    </div>
  );
};

const STAGE_COMPONENTS = { 1: Stage1, 2: Stage2, 3: Stage3, 4: Stage4, 5: Stage5, 6: Stage6, 7: Stage7, 8: Stage8, 9: Stage9 };

// ===== PDF GENERATION =====
const generatePDF = (imp, stageNum = null) => {
  const stageNames = { 1:"Proveedor",2:"Producto",3:"Negociacion",4:"Muestras",5:"Pedido",6:"Produccion",7:"Logistica",8:"Aduana",9:"Entrega Final" };
  let title = `Importacion ${imp.reference} - ${imp.name}`;
  if (stageNum) title += ` | Etapa ${stageNum}: ${stageNames[stageNum]}`;
  const renderValue = (key, value, depth = 0) => {
    if (key === "completed" || !value) return "";
    const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    if (Array.isArray(value) && value.length > 0) {
      if (typeof value[0] === "object") {
        const keys = Object.keys(value[0]).filter(k => k !== "completed");
        return `<div style="margin:8px 0"><div style="font-size:10px;color:#888;text-transform:uppercase">${label}</div>
          <table style="width:100%;border-collapse:collapse;margin-top:4px"><tr>${keys.map(k=>`<th style="border:1px solid #ddd;padding:4px 6px;font-size:10px;background:#f5f5f5;text-align:left">${k.replace(/_/g," ")}</th>`).join("")}</tr>
          ${value.map(item=>`<tr>${keys.map(k=>`<td style="border:1px solid #ddd;padding:4px 6px;font-size:11px">${item[k]||"-"}</td>`).join("")}</tr>`).join("")}</table></div>`;
      }
      return `<div style="margin:4px 0"><span style="font-size:10px;color:#888">${label}:</span> ${value.join(", ")}</div>`;
    }
    if (typeof value === "object") {
      return `<div style="margin:8px 0;padding:8px;border:1px solid #eee;border-radius:4px"><div style="font-size:10px;color:#888;text-transform:uppercase;margin-bottom:4px">${label}</div>${Object.entries(value).map(([k,v])=>renderValue(k,v,depth+1)).join("")}</div>`;
    }
    return `<div style="margin:${depth>0?2:4}px 0;display:inline-block;width:48%;vertical-align:top"><span style="font-size:10px;color:#888">${label}:</span> <span style="font-size:12px">${value}</span></div>`;
  };
  let body = "";
  const stages = stageNum ? {[stageNum]: imp.stages?.[String(stageNum)]} : imp.stages || {};
  Object.entries(stages).forEach(([num, data]) => {
    if (!data) return;
    body += `<div style="margin:24px 0;page-break-inside:avoid"><h2 style="font-size:14px;border-bottom:2px solid #00cc6a;padding-bottom:4px;margin-bottom:12px">Etapa ${num}: ${stageNames[num]||""}</h2>`;
    Object.entries(data).forEach(([k,v]) => { body += renderValue(k, v); });
    body += `</div>`;
  });
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}h1{font-size:18px;color:#111}@media print{body{padding:10px}}</style></head><body><h1>${title}</h1><p style="color:#888;font-size:12px">Generado: ${new Date().toLocaleString("es-ES")}</p>${body}</body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
};

// ===== MAIN PAGE =====
const ImportsPage = () => {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [currentImport, setCurrentImport] = useState(null);
  const [activeStage, setActiveStage] = useState(1);
  const [stageData, setStageData] = useState({});
  const [saving, setSaving] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [newRef, setNewRef] = useState("");
  const [newName, setNewName] = useState("");
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", body: "" });
  const [listOpen, setListOpen] = useState(true);

  const fetchImports = useCallback(async () => {
    try {
      const params = search ? { search } : {};
      const res = await apiClient.get("/imports", { params });
      setImports(res.data);
    } catch { toast.error("Error cargando importaciones"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchImports(); }, [fetchImports]);

  const loadImport = async (id) => {
    try {
      const res = await apiClient.get(`/imports/${id}`);
      setCurrentImport(res.data);
      const stage = res.data.current_stage || 1;
      setActiveStage(stage);
      setStageData(res.data.stages?.[String(stage)] || {});
      setSelectedId(id);
    } catch { toast.error("Error cargando importacion"); }
  };

  const switchStage = (num) => {
    if (currentImport) {
      setActiveStage(num);
      setStageData(currentImport.stages?.[String(num)] || {});
    }
  };

  const updateField = (key, value) => setStageData(prev => ({ ...prev, [key]: value }));

  const saveStage = async () => {
    if (!currentImport) return;
    setSaving(true);
    try {
      const res = await apiClient.put(`/imports/${currentImport.id}/stage/${activeStage}`, stageData);
      setCurrentImport(res.data);
      toast.success(`Etapa ${activeStage} guardada`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error guardando");
    } finally { setSaving(false); }
  };

  const advanceStage = async () => {
    if (!currentImport) return;
    try {
      await saveStage();
      const res = await apiClient.put(`/imports/${currentImport.id}/advance`);
      setCurrentImport(res.data);
      const next = res.data.current_stage;
      setActiveStage(next);
      setStageData(res.data.stages?.[String(next)] || {});
      toast.success(`Avanzado a etapa ${next}`);
      fetchImports();
    } catch (err) { toast.error(err.response?.data?.detail || "Error avanzando etapa"); }
  };

  const toggleLock = async () => {
    if (!currentImport) return;
    try {
      const res = await apiClient.put(`/imports/${currentImport.id}/lock`);
      setCurrentImport(prev => ({ ...prev, locked: res.data.locked }));
      toast.success(res.data.locked ? "Expediente bloqueado" : "Expediente desbloqueado");
      fetchImports();
    } catch { toast.error("Error cambiando bloqueo"); }
  };

  const createImport = async () => {
    try {
      const res = await apiClient.post("/imports", { reference: newRef, name: newName });
      setCreateDialog(false);
      setNewRef(""); setNewName("");
      toast.success("Importacion creada");
      fetchImports();
      loadImport(res.data.id);
    } catch (err) { toast.error(err.response?.data?.detail || "Error creando"); }
  };

  const deleteImport = async (id) => {
    try {
      await apiClient.delete(`/imports/${id}`);
      toast.success("Importacion eliminada");
      if (selectedId === id) { setSelectedId(null); setCurrentImport(null); }
      fetchImports();
    } catch { toast.error("Error eliminando"); }
  };

  const sendEmail = async () => {
    if (!currentImport) return;
    try {
      await apiClient.post(`/imports/${currentImport.id}/send-email`, emailForm);
      toast.success("Email registrado (integracion pendiente)");
      setEmailDialog(false);
      setEmailForm({ to: "", subject: "", body: "" });
    } catch { toast.error("Error enviando email"); }
  };

  const StageComponent = STAGE_COMPONENTS[activeStage];
  const progress = currentImport ? Math.round(((currentImport.current_stage - 1) / 9) * 100) : 0;

  return (
    <div data-testid="imports-page" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight">Importaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">{imports.length} expedientes</p>
        </div>
        <Button onClick={() => setCreateDialog(true)} className="bg-primary text-primary-foreground font-bold uppercase tracking-wide hover:opacity-90 rounded-sm" data-testid="create-import-btn">
          <Plus size={16} className="mr-2" /> Nueva Importacion
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Import list */}
        <div className={`${listOpen ? "w-full lg:w-80" : "w-full lg:w-12"} shrink-0 transition-all`}>
          <div className="border border-border/50 rounded-sm bg-card">
            <div className="p-3 border-b border-border/30 flex items-center justify-between">
              <button onClick={() => setListOpen(!listOpen)} className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
                {listOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                {listOpen && "Expedientes"}
              </button>
              {listOpen && (
                <div className="relative flex-1 ml-3">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-7 bg-secondary/30 border-0 text-xs h-7" data-testid="search-imports" />
                </div>
              )}
            </div>
            {listOpen && (
              <ScrollArea className="h-[60vh]">
                <div className="p-2 space-y-1">
                  {imports.map(imp => (
                    <button
                      key={imp.id}
                      onClick={() => loadImport(imp.id)}
                      className={`w-full text-left p-3 rounded-sm transition-colors group ${selectedId === imp.id ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"}`}
                      data-testid={`import-item-${imp.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">{imp.reference}</span>
                        <div className="flex items-center gap-1">
                          {imp.locked && <Lock size={10} className="text-amber-400" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100"><MoreVertical size={10} /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteImport(imp.id); }} className="text-red-400"><Trash2 size={12} className="mr-2" /> Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{imp.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round(((imp.current_stage - 1) / 9) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{imp.current_stage}/9</span>
                      </div>
                    </button>
                  ))}
                  {imports.length === 0 && !loading && (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin expedientes</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Right: Stage content */}
        <div className="flex-1 min-w-0">
          {currentImport ? (
            <div className="space-y-4">
              {/* Import header */}
              <div className="border border-border/50 rounded-sm bg-card p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-foreground">{currentImport.reference}</span>
                      {currentImport.locked && <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]">BLOQUEADO</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{currentImport.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={toggleLock} className="text-xs" data-testid="toggle-lock-btn">
                      {currentImport.locked ? <Unlock size={14} className="mr-1" /> : <Lock size={14} className="mr-1" />}
                      {currentImport.locked ? "Desbloquear" : "Bloquear"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEmailDialog(true)} className="text-xs" data-testid="send-email-btn">
                      <Mail size={14} className="mr-1" /> Email
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs" data-testid="export-pdf-btn"><FileDown size={14} className="mr-1" /> PDF</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => generatePDF(currentImport)}>Exportar completo</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generatePDF(currentImport, activeStage)}>Solo etapa {activeStage}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{progress}%</span>
                </div>
              </div>

              {/* Stage stepper */}
              <div className="border border-border/50 rounded-sm bg-card p-3 overflow-x-auto">
                <div className="flex gap-1 min-w-[700px]">
                  {STAGES.map((s) => {
                    const isCompleted = currentImport.stages?.[String(s.num)]?.completed;
                    const isCurrent = s.num === currentImport.current_stage;
                    const isActive = s.num === activeStage;
                    return (
                      <button
                        key={s.num}
                        onClick={() => switchStage(s.num)}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-sm transition-all text-center ${
                          isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"
                        }`}
                        data-testid={`stage-btn-${s.num}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted ? "bg-primary text-primary-foreground" : isCurrent ? "border-2 border-primary text-primary" : "bg-secondary text-muted-foreground"
                        }`}>
                          {isCompleted ? <CheckCircle2 size={14} /> : s.num}
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider leading-tight ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stage form */}
              <div className="border border-border/50 rounded-sm bg-card p-4 md:p-6">
                {StageComponent && <StageComponent data={stageData} update={updateField} />}

                {/* Action buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                  <div className="flex gap-2">
                    {activeStage > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => switchStage(activeStage - 1)} data-testid="prev-stage-btn">
                        <ChevronLeft size={14} className="mr-1" /> Anterior
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveStage} disabled={saving || currentImport.locked} data-testid="save-stage-btn">
                      <Save size={14} className="mr-1" /> {saving ? "Guardando..." : "Guardar"}
                    </Button>
                    {activeStage < 9 && activeStage === currentImport.current_stage && (
                      <Button size="sm" onClick={advanceStage} disabled={currentImport.locked} className="bg-primary text-primary-foreground font-bold" data-testid="advance-stage-btn">
                        Avanzar <ArrowRight size={14} className="ml-1" />
                      </Button>
                    )}
                    {activeStage < 9 && activeStage !== currentImport.current_stage && (
                      <Button variant="ghost" size="sm" onClick={() => switchStage(activeStage + 1)} data-testid="next-stage-btn">
                        Siguiente <ChevronRight size={14} className="ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border/50 rounded-sm bg-card flex flex-col items-center justify-center py-24">
              <Package size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">Selecciona una importacion o crea una nueva</p>
              <Button variant="ghost" className="mt-4 text-primary" onClick={() => setCreateDialog(true)} data-testid="create-import-empty">
                <Plus size={16} className="mr-2" /> Nueva Importacion
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-card border-border max-w-sm" data-testid="create-import-dialog">
          <DialogHeader><DialogTitle className="font-barlow text-lg uppercase tracking-tight">Nueva Importacion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FF label="Referencia *" value={newRef} onChange={setNewRef} placeholder="IMP-2024-001" testId="new-import-ref" />
            <FF label="Nombre" value={newName} onChange={setNewName} placeholder="Descripcion breve" testId="new-import-name" />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setCreateDialog(false)} className="flex-1">Cancelar</Button>
              <Button onClick={createImport} className="flex-1 bg-primary text-primary-foreground font-bold rounded-sm" data-testid="confirm-create-import">Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent className="bg-card border-border max-w-md" data-testid="email-dialog">
          <DialogHeader><DialogTitle className="font-barlow text-lg uppercase tracking-tight">Enviar Email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FF label="Para *" value={emailForm.to} onChange={v => setEmailForm({...emailForm, to: v})} type="email" testId="email-to" />
            <FF label="Asunto *" value={emailForm.subject} onChange={v => setEmailForm({...emailForm, subject: v})} testId="email-subject" />
            <TF label="Mensaje" value={emailForm.body} onChange={v => setEmailForm({...emailForm, body: v})} rows={4} />
            <p className="text-[10px] text-muted-foreground">* Integracion SendGrid pendiente. El email se registrara como notificacion.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setEmailDialog(false)} className="flex-1">Cancelar</Button>
              <Button onClick={sendEmail} className="flex-1 bg-primary text-primary-foreground font-bold rounded-sm" data-testid="send-email-confirm"><Mail size={14} className="mr-1" /> Enviar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportsPage;
