import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../App";
import {
  Factory, Package, Handshake, FlaskConical, ClipboardList, Cog,
  Ship, Building2, CheckCircle2, Clock, MapPin, Truck
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const STAGES = [
  { num: 1, name: "Proveedor", icon: Factory },
  { num: 2, name: "Producto", icon: Package },
  { num: 3, name: "Negociacion", icon: Handshake },
  { num: 4, name: "Muestras", icon: FlaskConical },
  { num: 5, name: "Pedido", icon: ClipboardList },
  { num: 6, name: "Produccion", icon: Cog },
  { num: 7, name: "Logistica", icon: Ship },
  { num: 8, name: "Aduana", icon: Building2 },
  { num: 9, name: "Entrega", icon: Truck }
];

const ClientPortalPage = () => {
  const [imports, setImports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchImports = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/client/imports`, authHeaders());
      setImports(res.data);
    } catch { toast.error("Error cargando datos"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchImports(); }, [fetchImports]);

  const loadDetail = async (id) => {
    try {
      const res = await axios.get(`${API}/client/imports/${id}`, authHeaders());
      setDetail(res.data);
      setSelected(id);
    } catch { toast.error("Error cargando detalle"); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-background"><div className="w-8 h-8 border-2 border-[#00ff84] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background" data-testid="client-portal">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00ff84]/20 flex items-center justify-center">
              <MapPin size={16} className="text-[#00ff84]" />
            </div>
            <div>
              <h1 className="font-barlow text-lg font-bold uppercase tracking-tight">Portal de Seguimiento</h1>
              <p className="text-[10px] text-muted-foreground">Leiva's Import Consulting</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium">{user?.name || user?.email}</p>
            <p className="text-[10px] text-muted-foreground">{user?.company || "Cliente"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {imports.length === 0 ? (
          <div className="text-center py-20">
            <Ship size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">No tienes importaciones asignadas</h2>
            <p className="text-sm text-muted-foreground mt-1">Contacta con tu gestor para mas informacion</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="font-barlow text-2xl font-bold uppercase tracking-tight">Tus Importaciones</h2>
            <div className="grid gap-4">
              {imports.map(imp => {
                const progress = Math.round(((imp.current_stage - 1) / 9) * 100);
                const isSelected = selected === imp.id;
                return (
                  <div key={imp.id} className="bg-card border border-border rounded-lg overflow-hidden" data-testid={`client-import-${imp.id}`}>
                    <button onClick={() => isSelected ? setSelected(null) : loadDetail(imp.id)} className="w-full p-5 text-left hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{imp.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{imp.reference}</p>
                        </div>
                        <Badge className="bg-[#00ff84]/20 text-[#00ff84] text-xs">
                          Etapa {imp.current_stage}/9
                        </Badge>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 mb-4">
                        <div className="bg-[#00ff84] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="grid grid-cols-9 gap-1">
                        {STAGES.map(s => {
                          const active = s.num === imp.current_stage;
                          const done = s.num < imp.current_stage;
                          const Icon = s.icon;
                          return (
                            <div key={s.num} className={`flex flex-col items-center p-1.5 rounded text-center ${active ? "bg-[#00ff84]/10" : done ? "bg-emerald-500/5" : "opacity-40"}`}>
                              <Icon size={14} className={active ? "text-[#00ff84]" : done ? "text-emerald-500" : "text-muted-foreground"} />
                              <span className={`text-[8px] mt-0.5 ${active ? "text-[#00ff84] font-bold" : "text-muted-foreground"}`}>{s.name}</span>
                              {done && <CheckCircle2 size={8} className="text-emerald-500 mt-0.5" />}
                              {active && <Clock size={8} className="text-[#00ff84] mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    </button>

                    {isSelected && detail && (
                      <div className="border-t border-border p-5 bg-secondary/10">
                        <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Detalle por etapas</h4>
                        <div className="space-y-3">
                          {STAGES.map(s => {
                            const sData = detail.stages?.[String(s.num)] || {};
                            const done = s.num < detail.current_stage;
                            const active = s.num === detail.current_stage;
                            const Icon = s.icon;
                            const keyFields = Object.entries(sData).filter(([k, v]) => k !== "completed" && k !== "documents" && v && typeof v !== "object").slice(0, 4);
                            return (
                              <div key={s.num} className={`flex items-start gap-3 p-3 rounded-lg ${active ? "bg-[#00ff84]/5 border border-[#00ff84]/20" : done ? "bg-secondary/20" : "opacity-40"}`}>
                                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${done ? "bg-emerald-500/20" : active ? "bg-[#00ff84]/20" : "bg-secondary"}`}>
                                  {done ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Icon size={14} className={active ? "text-[#00ff84]" : "text-muted-foreground"} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold ${active ? "text-[#00ff84]" : ""}`}>Etapa {s.num}: {s.name}</p>
                                  {keyFields.length > 0 ? (
                                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                                      {keyFields.map(([k, v]) => (
                                        <p key={k} className="text-[10px] text-muted-foreground truncate">
                                          <span className="font-medium">{k.replace(/_/g, " ")}:</span> {String(v)}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{done ? "Completada" : active ? "En progreso" : "Pendiente"}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientPortalPage;
