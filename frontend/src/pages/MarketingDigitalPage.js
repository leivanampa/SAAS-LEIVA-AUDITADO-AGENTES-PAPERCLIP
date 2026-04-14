import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Bot, Mic, FileText, BarChart3,
  Star as StarIcon, Mail, MessageSquare, Share2, ThumbsUp,
  Megaphone, PhoneIncoming, PhoneOutgoing, Globe, FormInput,
  CalendarDays, UserSearch, GraduationCap, Users, Send,
  ChevronRight, Zap, Brain, Palette
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_china-trade/artifacts/je15mcr1_image.png";

const ServiceCard = ({ icon: Icon, name, desc }) => (
  <div className="group border border-zinc-800 rounded-lg p-5 hover:border-[#00ff84]/30 transition-all bg-zinc-900/40 hover:bg-zinc-900/70">
    <div className="w-9 h-9 rounded-lg bg-[#00ff84]/10 flex items-center justify-center mb-3 group-hover:bg-[#00ff84]/20 transition-colors">
      <Icon size={16} className="text-[#00ff84]" />
    </div>
    <h4 className="font-barlow text-sm font-bold uppercase tracking-tight text-white">{name}</h4>
    <p className="text-xs text-zinc-500 mt-2 font-instrument leading-relaxed">{desc}</p>
  </div>
);

const MarketingContactForm = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Rellena nombre, email y mensaje"); return; }
    setSending(true);
    try {
      await axios.post(`${API}/contact-form`, { ...form, source: "marketing-digital" });
      toast.success("Mensaje enviado. Te contactaremos pronto.");
      setSent(true);
    } catch { toast.error("Error al enviar. Intentalo de nuevo."); }
    finally { setSending(false); }
  };

  if (sent) return (
    <div className="text-center py-8" data-testid="marketing-form-success">
      <div className="w-12 h-12 rounded-full bg-[#00ff84]/10 flex items-center justify-center mx-auto mb-3"><Send size={20} className="text-[#00ff84]" /></div>
      <p className="text-white font-barlow font-bold uppercase">Mensaje Enviado</p>
      <p className="text-xs text-zinc-500 font-instrument mt-1">Te responderemos en menos de 24h</p>
      <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", service: "", message: "" }); }} className="text-xs text-[#00ff84] mt-3 hover:underline font-instrument">Enviar otro mensaje</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="marketing-contact-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Nombre *</label>
          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Tu nombre" className="bg-zinc-900 border-zinc-800 text-white font-instrument" required data-testid="mkt-contact-name" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Email *</label>
          <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="tu@email.com" className="bg-zinc-900 border-zinc-800 text-white font-mono" required data-testid="mkt-contact-email" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Telefono</label>
          <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+34 600 000 000" className="bg-zinc-900 border-zinc-800 text-white font-mono" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Servicio de interes</label>
          <select value={form.service} onChange={e => setForm({...form, service: e.target.value})} className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-md px-3 text-sm text-white font-instrument" data-testid="mkt-contact-service">
            <option value="">Selecciona un servicio</option>
            <option value="crm-pipelines">CRM y gestion de pipelines</option>
            <option value="automatizacion">Automatizacion de flujos</option>
            <option value="email-marketing">Email marketing</option>
            <option value="redes-sociales">Gestion de redes sociales</option>
            <option value="conversation-ai">Conversation AI</option>
            <option value="voice-ai">Voice AI</option>
            <option value="web-funnels">Web y funnels de ventas</option>
            <option value="cursos">Plataforma de cursos</option>
            <option value="paquete-completo">Paquete completo</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-instrument">Mensaje *</label>
        <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Cuentanos que necesitas..." className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white font-instrument h-24 resize-none" required data-testid="mkt-contact-message" />
      </div>
      <Button type="submit" disabled={sending} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-sm uppercase tracking-wider px-8 h-11" data-testid="mkt-contact-submit">
        {sending ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send size={16} className="mr-2" /> Enviar Consulta</>}
      </Button>
    </form>
  );
};

const MarketingDigitalPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="marketing-page">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={LOGO_URL} alt="Leiva's Import" className="w-9 h-9 rounded-lg object-contain" />
            <span className="font-barlow text-base font-bold uppercase tracking-tight">Leiva's Import</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-instrument text-zinc-400">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1"><ArrowLeft size={12} /> Inicio</Link>
            <a href="#services" className="hover:text-white transition-colors">Servicios</a>
            <a href="#contact" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <Button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-xs uppercase tracking-wider px-5" data-testid="mkt-cta-top">
            Consultanos
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 0h40v40H0z%22 fill=%22none%22/%3E%3Cpath d=%22M0 0h1v40H0zM40 0h1v40h-1z%22 fill=%22%23ffffff05%22/%3E%3Cpath d=%22M0 0v1h40V0zM0 40v1h40v-1z%22 fill=%22%23ffffff05%22/%3E%3C/svg%3E')] opacity-40" />
        <div className="max-w-7xl mx-auto relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#00ff84]/10 border border-[#00ff84]/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles size={12} className="text-[#00ff84]" />
            <span className="text-[#00ff84] text-xs font-instrument font-medium tracking-wide">Nuevo servicio &mdash; Proximamente disponible &middot; Consultanos ya</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight max-w-4xl">
            <span className="font-barlow uppercase">Marketing Digital</span><br />
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">para tu negocio</span>
          </h1>
          <p className="text-base text-zinc-400 mt-6 max-w-2xl leading-relaxed font-instrument">
            Automatizacion, inteligencia artificial, gestion de redes sociales, email marketing, creacion de webs y mucho mas. Servicios disenados para hacer crecer tu empresa con tecnologia de vanguardia.
          </p>
          <div className="flex items-center gap-4 mt-8">
            <Button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="bg-[#00ff84] text-black hover:bg-[#33ff9d] font-barlow font-bold text-sm uppercase tracking-wider px-8 h-12">
              Solicitar Informacion <ChevronRight size={16} className="ml-2" />
            </Button>
            <Link to="/">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-12 px-6 text-sm font-instrument">
                <ArrowLeft size={14} className="mr-2" /> Volver a Inicio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-14">

          {/* Automatizacion & CRM */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Zap size={18} className="text-blue-400" /></div>
              <div>
                <h2 className="font-barlow text-xl font-bold uppercase tracking-tight">Automatizacion y CRM</h2>
                <p className="text-xs text-zinc-500 font-instrument">Organiza, automatiza y escala tu negocio</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ServiceCard icon={BarChart3} name="CRM y Gestion de Pipelines" desc="Gestiona tus contactos, oportunidades y pipelines de venta en un solo lugar. Seguimiento visual de cada cliente." />
              <ServiceCard icon={Zap} name="Automatizacion de Flujos" desc="Automatiza tareas repetitivas: seguimientos, emails, asignaciones y recordatorios. Ahorra tiempo y evita errores." />
              <ServiceCard icon={BarChart3} name="Dashboards y Reportes" desc="Visualiza el rendimiento de tu negocio con dashboards personalizados y reportes automaticos." />
              <ServiceCard icon={FileText} name="Facturacion y Cobros Online" desc="Genera facturas profesionales, programa cobros recurrentes y acepta pagos online." />
            </div>
          </div>

          {/* Comunicacion & Marketing */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Megaphone size={18} className="text-purple-400" /></div>
              <div>
                <h2 className="font-barlow text-xl font-bold uppercase tracking-tight">Comunicacion y Marketing</h2>
                <p className="text-xs text-zinc-500 font-instrument">Conecta con tus clientes en todos los canales</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <ServiceCard icon={Mail} name="Email Marketing + SMS" desc="Campanas segmentadas por email y SMS con automatizaciones, plantillas y analitica avanzada." />
              <ServiceCard icon={Share2} name="Gestion de Redes Sociales" desc="Publica, programa y analiza contenido en todas tus redes desde una sola plataforma." />
              <ServiceCard icon={ThumbsUp} name="Reputacion Online" desc="Monitoriza y gestiona resenas en Google, TripAdvisor y otras plataformas automaticamente." />
              <ServiceCard icon={Megaphone} name="Ad Manager" desc="Gestion profesional de campanas publicitarias en Google Ads, Facebook Ads e Instagram." />
              <ServiceCard icon={PhoneIncoming} name="Llamadas Entrantes y Salientes" desc="Sistema de gestion de llamadas integrado para tu equipo comercial y de soporte." />
            </div>
          </div>

          {/* Inteligencia Artificial */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Brain size={18} className="text-amber-400" /></div>
              <div>
                <h2 className="font-barlow text-xl font-bold uppercase tracking-tight">Inteligencia Artificial</h2>
                <p className="text-xs text-zinc-500 font-instrument">Potencia tu negocio con IA de ultima generacion</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <ServiceCard icon={Bot} name="Conversation AI" desc="Chatbot inteligente que atiende a tus clientes 24/7, responde preguntas y capta leads automaticamente." />
              <ServiceCard icon={Mic} name="Voice AI" desc="Atencion por voz automatizada. Tu asistente virtual atiende llamadas y gestiona consultas." />
              <ServiceCard icon={Palette} name="Content AI" desc="Genera contenido profesional para redes sociales, blog y email marketing con inteligencia artificial." />
              <ServiceCard icon={BarChart3} name="Funnel AI" desc="Optimizacion automatica de tus embudos de venta con IA que analiza y mejora la conversion." />
              <ServiceCard icon={StarIcon} name="Reviews AI" desc="Gestion automatizada de resenas: respuestas inteligentes y analisis de sentimiento de tus clientes." />
            </div>
          </div>

          {/* Web & Captacion */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Globe size={18} className="text-cyan-400" /></div>
              <div>
                <h2 className="font-barlow text-xl font-bold uppercase tracking-tight">Web y Captacion</h2>
                <p className="text-xs text-zinc-500 font-instrument">Presencia digital que convierte visitantes en clientes</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ServiceCard icon={Globe} name="Webs y Funnels de Ventas" desc="Creacion de paginas web profesionales y embudos de venta optimizados para convertir." />
              <ServiceCard icon={FormInput} name="Formularios y Encuestas" desc="Formularios inteligentes, encuestas y quizzes para captar y cualificar leads." />
              <ServiceCard icon={CalendarDays} name="Calendarios de Reservas" desc="Sistema de citas y reservas online integrado con tu agenda y recordatorios automaticos." />
              <ServiceCard icon={UserSearch} name="Prospeccion de Clientes" desc="Herramienta de busqueda y captacion de clientes potenciales con datos enriquecidos." />
            </div>
          </div>

          {/* Formacion & Comunidad */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><GraduationCap size={18} className="text-green-400" /></div>
              <div>
                <h2 className="font-barlow text-xl font-bold uppercase tracking-tight">Formacion y Comunidad</h2>
                <p className="text-xs text-zinc-500 font-instrument">Comparte conocimiento y crea comunidad</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <ServiceCard icon={GraduationCap} name="Plataforma de Cursos Online" desc="Crea y vende cursos online con tu propia plataforma de formacion. Videos, modulos y certificados." />
              <ServiceCard icon={Users} name="Comunidades Digitales" desc="Crea comunidades privadas para tus clientes o alumnos. Foro, contenido exclusivo y networking." />
            </div>
          </div>
        </div>
      </section>

      {/* CTA + Contact Form */}
      <section id="contact" className="py-20 px-6 bg-zinc-900/20 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-instrument font-semibold uppercase tracking-widest text-[#00ff84]/70">Te interesa?</span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold">
              <span className="font-barlow uppercase">Escribenos y </span>
              <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[#00ff84] italic font-normal">te informamos</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-3 font-instrument max-w-lg mx-auto">
              Te interesa alguno de estos servicios? Escribenos y te informamos sin compromiso. Respondemos en menos de 24 horas.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-6 md:p-8 bg-zinc-900/40">
            <MarketingContactForm />
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
            <Link to="/" className="hover:text-zinc-400 transition-colors">Inicio</Link>
            <a href="#services" className="hover:text-zinc-400 transition-colors">Servicios</a>
            <a href="#contact" className="hover:text-zinc-400 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingDigitalPage;
