import React, { useState, useEffect, useCallback } from "react";
import { apiClient, useAuth } from "@/App";
import { t } from "@/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Inbox, Mail, Phone, Clock, CheckCircle2,
  Search, ChevronDown, Sparkles, User
} from "lucide-react";

const InboxPage = () => {
  const { lang } = useAuth();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const STATUS_MAP = {
    new: { label: lang === 'en' ? "New" : "Nueva", color: "text-blue-400 bg-blue-400/10" },
    in_progress: { label: t('in_progress', lang), color: "text-amber-400 bg-amber-400/10" },
    resolved: { label: t('resolved', lang), color: "text-[#00ff84] bg-[#00ff84]/10" }
  };

  const SOURCE_MAP = {
    landing: t('source_landing', lang),
    "marketing-digital": t('source_marketing', lang),
    web: "Web"
  };

  const fetchForms = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      const res = await apiClient.get(`/contact-forms?${params.toString()}`);
      setForms(res.data);
    } catch { toast.error(lang === 'en' ? "Error loading inquiries" : "Error cargando consultas"); }
    finally { setLoading(false); }
  }, [filter, search, lang]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const updateStatus = async (id, status) => {
    try {
      await apiClient.put(`/contact-forms/${id}`, { status });
      toast.success(t('status_updated', lang));
      fetchForms();
    } catch { toast.error("Error"); }
  };

  const newCount = forms.filter(f => f.status === "new").length;

  return (
    <div data-testid="inbox-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight">{t('inbox_title', lang)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('inbox_subtitle', lang)}</p>
        </div>
        {newCount > 0 && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-sm px-3 py-1.5">
            <Inbox size={14} className="text-blue-400" />
            <span className="text-xs font-barlow font-bold text-blue-400">{newCount} {lang === 'en' ? 'new' : 'nuevas'}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === 'en' ? "Search by name, email, service..." : "Buscar por nombre, email, servicio..."} className="pl-9 bg-secondary/50" data-testid="inbox-search" />
        </div>
        <div className="flex gap-1">
          {[
            { val: "all", labelKey: "all" },
            { val: "new", labelKey: "new_status" },
            { val: "in_progress", labelKey: "in_progress" },
            { val: "resolved", labelKey: "resolved" }
          ].map(f => (
            <Button key={f.val} variant={filter === f.val ? "default" : "ghost"} size="sm" onClick={() => setFilter(f.val)}
              className={`text-xs ${filter === f.val ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid={`inbox-filter-${f.val}`}>
              {t(f.labelKey, lang)}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16"><Inbox size={48} className="mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{t('no_results', lang)}</p></div>
      ) : (
        <div className="space-y-2">
          {forms.map(f => {
            const st = STATUS_MAP[f.status] || STATUS_MAP.new;
            const isExpanded = expanded === f.id;
            return (
              <div key={f.id} className={`border rounded-sm transition-all ${isExpanded ? "border-primary/30 bg-secondary/10" : "border-border/50 hover:border-border"}`} data-testid={`inbox-item-${f.id}`}>
                <button onClick={() => setExpanded(isExpanded ? null : f.id)} className="w-full flex items-center gap-3 p-3 text-left">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${f.status === "new" ? "bg-blue-400" : f.status === "in_progress" ? "bg-amber-400" : "bg-[#00ff84]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
                      <span className={`text-[9px] font-barlow font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                      {f.source && f.source !== "web" && (
                        <span className="text-[9px] font-instrument text-zinc-500 bg-zinc-500/10 px-1.5 py-0.5 rounded">{SOURCE_MAP[f.source] || f.source}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{f.service ? `[${f.service}] ` : ""}{f.message}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">{f.created_at ? new Date(f.created_at).toLocaleDateString(lang === 'en' ? "en-US" : "es-ES") : ""}</span>
                  <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-400"><User size={12} />{f.name}</div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400"><Mail size={12} /><a href={`mailto:${f.email}`} className="text-primary hover:underline">{f.email}</a></div>
                      {f.phone && <div className="flex items-center gap-2 text-xs text-zinc-400"><Phone size={12} /><a href={`tel:${f.phone}`} className="hover:underline">{f.phone}</a></div>}
                    </div>
                    {f.service && <div className="flex items-center gap-2 text-xs text-zinc-400"><Sparkles size={12} />{t('service', lang)}: <strong className="text-foreground">{f.service}</strong></div>}
                    <div className="bg-secondary/30 rounded-sm p-3"><p className="text-sm text-foreground font-instrument leading-relaxed">{f.message}</p></div>
                    <div className="flex items-center gap-2">
                      {f.status !== "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(f.id, "in_progress")} className="text-xs text-amber-400 border-amber-400/30 hover:bg-amber-400/10" data-testid={`inbox-mark-progress-${f.id}`}>
                          <Clock size={12} className="mr-1" /> {t('mark_in_progress', lang)}
                        </Button>
                      )}
                      {f.status !== "resolved" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(f.id, "resolved")} className="text-xs text-[#00ff84] border-[#00ff84]/30 hover:bg-[#00ff84]/10" data-testid={`inbox-mark-resolved-${f.id}`}>
                          <CheckCircle2 size={12} className="mr-1" /> {t('mark_resolved', lang)}
                        </Button>
                      )}
                      {f.email && (
                        <a href={`mailto:${f.email}?subject=Re: Consulta Leiva's Import - ${f.service || 'General'}`}>
                          <Button size="sm" className="text-xs bg-primary text-primary-foreground"><Mail size={12} className="mr-1" /> {t('respond', lang)}</Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InboxPage;
