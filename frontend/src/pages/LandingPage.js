import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  Ship, ArrowRight, Globe, ChevronRight, Phone, Mail,
  ChevronDown, Package, Truck, Search, Shield, FileCheck,
  ClipboardCheck, Factory, Award, Star, MapPin, Sparkles,
  Send, User, MessageSquare
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_china-trade/artifacts/je15mcr1_image.png";

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left group">
        <span className="text-sm font-instrument text-white group-hover:text-[#00ff84] transition-colors pr-4">{q}</span>
        <ChevronDown size={16} className={`text-zinc-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-[#00ff84]" : ""}`} />
      </button>
      {open && <p className="text-xs text-zinc-400 font-instrument leading-relaxed pb-4 pr-8">{a}</p>}
    </div>
  );
};

const ContactForm = ({ source = "landing" }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Rellena nombre, email y mensaje"); return; }
    setSending(true);
    try {
      await axios.post(`${API}/contact-form`, { ...form, source });
      toast.success("Mensaje enviado. Te contactaremos pronto.");
      setSent(true);
    } catch { toast.error("Error al enviar. Intentalo de nuevo."); }
    finally { setSending(false); }
  };

  if (sent) return (
    <div className="text-center py-8" data-testid="contact-form-success">
      <div className="w-12 h-12 rounded-full bg-[#00ff84]/10 flex items-center justify-center mx-auto mb-3"><Send size={20} className="text-[#00ff84]" /></div>
      <p className="text-white font-barlow font-bold uppercase">Mensaje Enviado</p>
      <p className="text-xs text-zinc-500 font-instrument mt-1">Te responderemos en menos de 24h</p>
      <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", service: "", message: "" }); }} className="text-xs text-[#00ff84] mt-3 hover:underline font-instrument">Enviar otro mensaje</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="contact-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Nombre *</label>
          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Tu nombre" className="bg-zinc-900 border-zinc-800 text-white font-instrument" required data-testid="contact-name" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Email *</label>
          <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="tu@email.com" className="bg-zinc-900 border-zinc-800 text-white font-mono" required data-testid="contact-email" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Telefono</label>
          <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+34 600 000 000" className="bg-zinc-900 border-zinc-800 text-white font-mono" data-testid="contact-phone" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Servicio de interes</label>
          <select value={form.service} onChange={e => setForm({...form, service: e.target.value})} className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-md px-3 text-sm text-white font-instrument" data-testid="contact-service">
            <option value="">Selecciona un servicio</option>
            <option value="logistica">Logistica y Transporte</option>
            <option value="inspeccion">Inspeccion y Control de Calidad</option>
            <option value="auditoria">Auditorias de Fabrica</option>
            <option value="certificaciones">Certificaciones y Compliance</option>
            <option value="sourcing">Sourcing y Fulfillment</option>
            <option value="360">Proyecto Integral 360</option>
            <option value="marketing">Marketing Digital</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Mensaje *</label>
        <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Cuentanos tu proyecto o tu consulta..." className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white font-instrument h-24 resize-none" required data-testid="contact-message" />
      </div>
      <Button type="submit" disabled={sending} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-sm uppercase tracking-wider px-8 h-11" data-testid="contact-submit">
        {sending ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send size={16} className="mr-2" /> Enviar Mensaje</>}
      </Button>
    </form>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();

    // SEO: Set dynamic meta tags for landing page
    useEffect(() => {
          document.title = "Importar desde China sin complicaciones | Leiva's Import";
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
                  metaDesc.setAttribute('content', 'Agencia especializada en importacion desde China: logistica internacional, control de calidad, auditorias de fabrica y certificaciones europeas. Solicita tu presupuesto sin compromiso. Respuesta en 24h.');
          }
          return () => {
                  document.title = "Leiva's Import";
          };
    }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="landing-page">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Leiva's Import" className="w-9 h-9 rounded-lg object-contain" />
            <span className="font-barlow text-base font-bold uppercase tracking-tight">Leiva's Import</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-instrument text-zinc-400">
            <a href="#about" className="hover:text-white transition-colors">Nosotros</a>
            <a href="#services" className="hover:text-white transition-colors">Servicios</a>
            <Link to="/marketing-digital" className="hover:text-[#00ff84] transition-colors flex items-center gap-1">Marketing <Sparkles size={11} className="text-[#00ff84]" /></Link>
            <a href="#process" className="hover:text-white transition-colors">Proceso</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")} className="text-sm text-zinc-400 hover:text-white font-instrument" data-testid="landing-login-btn">Acceder</Button>
            <Button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-xs uppercase tracking-wider px-5" data-testid="landing-cta-btn">Contactar</Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 0h40v40H0z%22 fill=%22none%22/%3E%3Cpath d=%22M0 0h1v40H0zM40 0h1v40h-1z%22 fill=%22%23ffffff05%22/%3E%3Cpath d=%22M0 0v1h40V0zM0 40v1h40v-1z%22 fill=%22%23ffffff05%22/%3E%3C/svg%3E')] opacity-40" />
        <div className="max-w-7xl mx-auto relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#00ff84]/10 border border-[#00ff84]/20 rounded-full px-4 py-1.5 mb-6">
              <Globe size={12} className="text-[#00ff84]" />
              <span className="text-[#00ff84] text-xs font-instrument font-medium tracking-wide">Especializados en China &middot; Operando Globalmente</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              <span className="font-barlow uppercase">Importa desde China</span><br />
              <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">sin complicaciones</span>
            </h1>
            <p className="text-base text-zinc-400 mt-6 max-w-xl leading-relaxed font-instrument">
              Gestionamos todo el proceso: logistica internacional, control de calidad, auditorias de fabrica y certificaciones europeas. Un solo equipo, cero sorpresas.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <Button onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-sm uppercase tracking-wider px-8 h-12">
                Ver Servicios <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button variant="outline" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-12 px-6 text-sm font-instrument">
                Solicitar Presupuesto
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-6 mt-14 pt-8 border-t border-zinc-800/60">
              {[
                { val: "5+", label: "Servicios Especializados" },
                { val: "360\u00b0", label: "Gestion Integral" },
                { val: "24h", label: "Respuesta Garantizada" },
                { val: "100%", label: "Comprometidos" }
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-barlow font-bold text-[#00ff84]">{s.val}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 font-instrument uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="aspect-[4/3] rounded-xl border border-zinc-800 overflow-hidden relative">
              <img src="https://images.pexels.com/photos/14020705/pexels-photo-14020705.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Puerto logistico al amanecer" className="w-full h-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Marketing Digital Banner */}
      <section className="px-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <Link to="/marketing-digital" className="block group">
            <div className="relative overflow-hidden rounded-xl border border-[#00ff84]/30 bg-gradient-to-r from-[#00ff84]/5 to-transparent p-5 flex items-center justify-between hover:border-[#00ff84]/60 transition-all" data-testid="marketing-banner">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00ff84]/10 flex items-center justify-center"><Sparkles size={20} className="text-[#00ff84]" /></div>
                <div>
                  <span className="text-[10px] font-barlow font-bold uppercase tracking-widest text-[#00ff84]">Nuevo servicio</span>
                  <p className="text-sm font-instrument text-white">Proximamente disponible &middot; <strong className="text-[#00ff84]">Consultanos ya</strong></p>
                </div>
              </div>
              <ArrowRight size={18} className="text-[#00ff84] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[10px] font-instrument font-semibold uppercase tracking-widest text-[#00ff84]/70">Quienes Somos</span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold leading-tight">
              <span className="font-barlow uppercase">Tu socio </span>
              <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">de confianza</span>
              <span className="font-barlow uppercase"> en China</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-5 leading-relaxed font-instrument">
              Somos una consultora especializada en importacion desde China, con experiencia directa en el mercado asiatico y amplio conocimiento de la normativa europea. Acompanamos a empresas y emprendedores en todo el proceso: desde encontrar al proveedor adecuado hasta recibir la mercancia en tu almacen.
            </p>
            <ul className="mt-6 space-y-3">
              {["Conocimiento profundo del mercado chino y sus proveedores","Red de inspectores y auditores locales en China","Especialistas en normativa aduanera y certificaciones europeas","Gestion integral: un solo interlocutor para todo el proceso","Tarifas claras y transparentes, sin costes ocultos"].map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300 font-instrument"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff84] mt-1.5 shrink-0" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <img src="https://images.pexels.com/photos/1624695/pexels-photo-1624695.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Puerto de contenedores" className="w-full h-full object-cover opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES - Detailed without prices */}
      <section id="services" className="py-20 px-6 bg-zinc-900/20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-[10px] font-instrument font-semibold uppercase tracking-widest text-[#00ff84]/70">Lo que hacemos</span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold">
              <span className="font-barlow uppercase">Servicios </span>
              <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">Especializados</span>
            </h2>
            <p className="text-sm text-zinc-500 mt-3 font-instrument max-w-lg mx-auto">Cubrimos todo el ciclo de importacion desde China con equipos especializados en cada area.</p>
          </div>

          {/* Logistica */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5"><span className="font-barlow text-3xl font-bold text-zinc-800">01</span><h3 className="font-barlow text-lg font-bold uppercase tracking-tight">Servicios Logisticos</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Ship, name: "Gestion Completa FCL", desc: "Contenedor completo con documentacion aduanera y entrega final puerta a puerta desde fabrica en China hasta tu almacen." },
                { icon: Package, name: "Gestion Completa LCL", desc: "Logistica puerta a puerta para cargas parciales. Ideal si no llenas un contenedor completo." },
                { icon: Truck, name: "Courier Internacional Express", desc: "Envios urgentes con DHL, FedEx o UPS, incluyendo despacho aduanero y seguimiento en tiempo real." },
                { icon: Package, name: "Consolidacion de Carga", desc: "Agrupacion de mercancias de distintos proveedores en almacen China para optimizar costes." },
                { icon: Truck, name: "Transporte por Carretera Europa", desc: "Carga completa, grupaje o con control de temperatura para distribucion en Europa." }
              ].map((s, i) => (
                <div key={i} className="group border border-zinc-800 rounded-lg p-5 hover:border-[#00ff84]/30 transition-all bg-zinc-900/40 hover:bg-zinc-900/70">
                  <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center mb-3 group-hover:bg-[#00ff84]/20 transition-colors"><s.icon size={16} className="text-[#00ff84]" /></div>
                  <h4 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">{s.name}</h4>
                  <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Inspeccion */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5"><span className="font-barlow text-3xl font-bold text-zinc-800">02</span><h3 className="font-barlow text-lg font-bold uppercase tracking-tight">Inspeccion y Control de Calidad</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Search, name: "Inspeccion de Calidad Fisica", desc: "Revision completa del producto antes del envio segun tus especificaciones." },
                { icon: ClipboardCheck, name: "Verificacion Preembarque", desc: "Control previo para asegurar que el lote es conforme y esta listo para enviar." },
                { icon: Search, name: "Verificacion de Muestra", desc: "Revision de muestras en China antes de produccion masiva para garantizar estandares." },
                { icon: Shield, name: "Control de Carga", desc: "Supervision durante la carga en contenedor: embalaje, manipulacion y documentacion." }
              ].map((s, i) => (
                <div key={i} className="group border border-zinc-800 rounded-lg p-5 hover:border-[#00ff84]/30 transition-all bg-zinc-900/40 hover:bg-zinc-900/70">
                  <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center mb-3 group-hover:bg-[#00ff84]/20 transition-colors"><s.icon size={16} className="text-[#00ff84]" /></div>
                  <h4 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">{s.name}</h4>
                  <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auditorias */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5"><span className="font-barlow text-3xl font-bold text-zinc-800">03</span><h3 className="font-barlow text-lg font-bold uppercase tracking-tight">Auditorias de Fabrica</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              {[
                { icon: Factory, name: "Auditoria Avanzada", desc: "Visita in-situ con fotografias, analisis de procesos, revision de certificaciones y verificacion completa de la capacidad productiva." },
                { icon: FileCheck, name: "Auditoria Basica", desc: "Verificacion de existencia legal, fiabilidad comercial y capacidad productiva basica del proveedor." }
              ].map((s, i) => (
                <div key={i} className="group border border-zinc-800 rounded-lg p-5 hover:border-[#00ff84]/30 transition-all bg-zinc-900/40 hover:bg-zinc-900/70">
                  <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center mb-3 group-hover:bg-[#00ff84]/20 transition-colors"><s.icon size={16} className="text-[#00ff84]" /></div>
                  <h4 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">{s.name}</h4>
                  <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Certificaciones */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5"><span className="font-barlow text-3xl font-bold text-zinc-800">04</span><h3 className="font-barlow text-lg font-bold uppercase tracking-tight">Certificaciones y Compliance</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Award, name: "Certificacion Alimentaria", desc: "Cumplimiento de requisitos sanitarios segun normativa europea para productos alimenticios." },
                { icon: Award, name: "Certificacion Juguetes EN71", desc: "Normativas europeas de calidad y seguridad infantil para juguetes y articulos para ninos." },
                { icon: Award, name: "Certificacion RoHS / EMC", desc: "Cumplimiento europeo para productos electronicos y electricos." },
                { icon: FileCheck, name: "Consultoria Aduanera", desc: "Aranceles, HS Code, codigo TARIC y toda la documentacion necesaria para importar." }
              ].map((s, i) => (
                <div key={i} className="group border border-zinc-800 rounded-lg p-5 hover:border-[#00ff84]/30 transition-all bg-zinc-900/40 hover:bg-zinc-900/70">
                  <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center mb-3 group-hover:bg-[#00ff84]/20 transition-colors"><s.icon size={16} className="text-[#00ff84]" /></div>
                  <h4 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">{s.name}</h4>
                  <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5"><span className="font-barlow text-3xl font-bold text-zinc-800">05</span><h3 className="font-barlow text-lg font-bold uppercase tracking-tight">Sourcing y Fulfillment</h3></div>
            <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-900/40 max-w-lg">
              <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center mb-3"><Package size={16} className="text-[#00ff84]" /></div>
              <h4 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">Busqueda y Gestion de Proveedores</h4>
              <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">Busqueda de proveedores verificados, almacenamiento en Espana, intermediacion bajo tu marca y gestion completa de fulfillment.</p>
            </div>
          </div>

          {/* Star Service */}
          <div className="border border-[#00ff84]/30 rounded-xl p-6 bg-[#00ff84]/5">
            <div className="flex items-center gap-2 mb-4"><Star size={14} className="text-[#00ff84]" /><span className="text-[10px] font-barlow font-bold uppercase tracking-widest text-[#00ff84]">Servicio Estrella</span></div>
            <h3 className="font-barlow font-bold text-lg uppercase tracking-tight">Proyecto Integral 360&deg;</h3>
            <p className="text-sm text-zinc-400 mt-2 font-instrument leading-relaxed max-w-2xl">
              Servicio llave en mano: busqueda de proveedor, auditoria, logistica, aduanas, control de calidad y entrega final.
              Tu te despreocupas, nosotros lo gestionamos todo. <strong className="text-white">Presupuesto personalizado segun proyecto.</strong>
            </p>
            <Button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-xs uppercase tracking-wider mt-4 px-6">
              Solicitar presupuesto
            </Button>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-[10px] font-instrument font-semibold uppercase tracking-widest text-[#00ff84]/70">El proceso</span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold">
              <span className="font-barlow uppercase">Como </span><span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">Trabajamos</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: "01", title: "Consulta Inicial", desc: "Nos cuentas tu proyecto: producto, volumen, plazos. Te respondemos en menos de 24h con propuesta personalizada sin compromiso.", icon: Mail },
              { num: "02", title: "Sourcing y Auditoria", desc: "Localizamos el proveedor, verificamos su fiabilidad in-situ y negociamos las mejores condiciones de precio y calidad.", icon: Search },
              { num: "03", title: "Control de Calidad", desc: "Inspeccionamos muestras, verificamos el preembarque y supervisamos la carga. Nada sale de China sin tu aprobacion.", icon: ClipboardCheck },
              { num: "04", title: "Logistica y Entrega", desc: "Gestionamos el transporte, el despacho aduanero y la entrega final. Tu mercancia en tu almacen, en tiempo y forma.", icon: Truck }
            ].map(s => (
              <div key={s.num} className="relative border border-zinc-800 rounded-xl p-6 hover:border-[#00ff84]/20 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#00ff84]/10 flex items-center justify-center"><span className="text-xs font-barlow font-bold text-[#00ff84]">{s.num}</span></div>
                  <s.icon size={16} className="text-zinc-600" />
                </div>
                <h3 className="font-barlow font-bold text-sm uppercase tracking-tight">{s.title}</h3>
                <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-zinc-900/20 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-instrument font-semibold uppercase tracking-widest text-[#00ff84]/70">Resolvemos tus dudas</span>
            <h2 className="mt-3 text-3xl font-bold font-barlow uppercase">Preguntas Frecuentes</h2>
          </div>
          <div data-testid="faq-section">
            <FAQItem q="Que necesito para empezar a importar desde China?" a="Solo necesitas saber que producto quieres importar. Nosotros nos encargamos de todo lo demas: buscamos el proveedor, gestionamos la logistica, tramitamos la aduana y te entregamos la mercancia en tu puerta." />
            <FAQItem q="Trabajais con empresas pequenas o solo con grandes volumenes?" a="Trabajamos con todo tipo de empresas, desde autonomos y pymes hasta grandes corporaciones. Adaptamos cada solucion al volumen y presupuesto de tu proyecto." />
            <FAQItem q="Como se que el proveedor chino es de confianza?" a="Realizamos auditorias de fabrica in-situ con verificacion legal, analisis de capacidad productiva y revision de certificaciones. No trabajamos con proveedores que no pasen nuestros filtros." />
            <FAQItem q="Que pasa si la mercancia llega en mal estado o no cumple las especificaciones?" a="Por eso existe nuestro servicio de control de calidad en origen. Inspeccionamos el producto antes de que salga de China, evitando sorpresas costosas cuando ya es demasiado tarde." />
            <FAQItem q="Gestionais el despacho de aduanas?" a="Si. Determinamos el codigo TARIC, calculamos los aranceles aplicables y preparamos toda la documentacion necesaria para que la mercancia entre en la UE sin incidencias." />
            <FAQItem q="Mi producto necesita alguna certificacion europea?" a="Depende del tipo de producto. Alimentacion, juguetes, electronica y muchas otras categorias requieren certificaciones especificas para poder comercializarse en Europa. Te asesoramos desde el primer momento para evitar bloqueos en aduana." />
            <FAQItem q="Cuanto tiempo tarda un envio desde China?" a="Por via maritima entre 25 y 40 dias aproximadamente. Por courier express entre 5 y 10 dias. Te recomendamos la mejor opcion segun tu urgencia y presupuesto." />
            <FAQItem q="Puedo importar bajo mi propia marca?" a="Si, ofrecemos servicio de marca blanca. Gestionamos todo el proceso de importacion y logistica bajo tu marca, de forma completamente transparente para tu cliente final." />
            <FAQItem q="Que es el servicio llave en mano?" a="Es nuestra solucion mas completa: busqueda de proveedor, control de calidad, logistica internacional, despacho aduanero y entrega final. Tu te despreocupas, nosotros lo gestionamos todo." />
            <FAQItem q="Como puedo solicitar un presupuesto?" a="Rellena el formulario de contacto contandonos tu proyecto. Te respondemos en menos de 24 horas con una propuesta personalizada y sin compromiso." />
          </div>
          <div className="mt-8 text-center">
            <Button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-sm uppercase tracking-wider px-8 h-11" data-testid="faq-contact-btn">
              <MessageSquare size={16} className="mr-2" /> Contactar ahora
            </Button>
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-instrument font-semibold uppercase tracking-widest text-[#00ff84]/70">Hablemos</span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold">
              <span className="font-barlow uppercase">Solicita tu </span><span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">presupuesto</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-3 font-instrument">Cuentanos tu proyecto y te preparamos una propuesta a medida. Sin compromiso.</p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-6 md:p-8 bg-zinc-900/40">
            <ContactForm source="landing" />
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-8 text-xs text-zinc-500 font-instrument">
            <div className="flex items-center gap-2"><Mail size={12} className="text-[#00ff84]" /> info@leivasimport.com</div>
            <div className="flex items-center gap-2"><Phone size={12} className="text-[#00ff84]" /> +34 968 80 90 78</div>
            <div className="flex items-center gap-2"><MapPin size={12} className="text-[#00ff84]" /> Espana &middot; China &middot; Europa</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600 font-instrument">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Leiva's Import" className="w-6 h-6 rounded object-contain opacity-50" />
            <span>Leiva's Import Consulting {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#about" className="hover:text-zinc-400 transition-colors">Nosotros</a>
            <a href="#services" className="hover:text-zinc-400 transition-colors">Servicios</a>
            <Link to="/marketing-digital" className="hover:text-[#00ff84] transition-colors">Marketing Digital</Link>
            <a href="#faq" className="hover:text-zinc-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-zinc-400 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
