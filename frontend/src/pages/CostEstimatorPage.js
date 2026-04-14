import React, { useState } from "react";
import { apiClient } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calculator, ArrowRight, TrendingUp, Info } from "lucide-react";

const CostEstimatorPage = () => {
  const [form, setForm] = useState({
    product_value: 0, freight_cost: 0, insurance_cost: 0,
    tariff_rate: 0, vat_rate: 21, other_costs: 0, margin_percent: 0
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const u = (key, val) => setForm(prev => ({ ...prev, [key]: Number(val) || 0 }));

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/cost-estimator", form);
      setResult(res.data);
    } catch { toast.error("Error calculando costes"); }
    finally { setLoading(false); }
  };

  const Field = ({ label, field, suffix, info }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        {label} {info && <span title={info}><Info size={10} className="text-muted-foreground" /></span>}
      </label>
      <div className="relative">
        <Input type="number" step="0.01" value={form[field]} onChange={e => u(field, e.target.value)} className="bg-secondary/50 border-input font-mono text-sm pr-12" data-testid={`cost-${field}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  const ResultRow = ({ label, value, highlight, bold }) => (
    <div className={`flex justify-between items-center py-1.5 ${bold ? "border-t border-border pt-2 mt-1" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono text-sm ${highlight ? "text-primary font-bold" : bold ? "font-bold text-foreground" : "text-foreground"}`}>
        {typeof value === "number" ? value.toLocaleString("es-ES", { minimumFractionDigits: 2 }) : value} EUR
      </span>
    </div>
  );

  return (
    <div data-testid="cost-estimator-page" className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-barlow text-2xl md:text-3xl font-bold uppercase tracking-tight">Estimador de Costes</h1>
        <p className="text-sm text-muted-foreground mt-1">Calcula el coste total de una importacion desde China</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border border-border/50 rounded-sm bg-card p-6 space-y-4">
          <h3 className="font-barlow text-sm font-bold uppercase tracking-tight flex items-center gap-2">
            <Calculator size={16} className="text-primary" /> Datos de entrada
          </h3>
          <Separator className="bg-border/30" />
          <Field label="Valor del producto (FOB/CIF)" field="product_value" suffix="EUR" info="Valor de la mercancia en origen" />
          <Field label="Coste de flete" field="freight_cost" suffix="EUR" info="Transporte maritimo/aereo" />
          <Field label="Seguro" field="insurance_cost" suffix="EUR" />
          <Separator className="bg-border/30" />
          <Field label="Tipo arancelario" field="tariff_rate" suffix="%" info="Consulta el codigo HS/TARIC" />
          <Field label="Tipo IVA" field="vat_rate" suffix="%" />
          <Field label="Otros costes" field="other_costs" suffix="EUR" info="Gastos de aduana, almacenaje, etc." />
          <Separator className="bg-border/30" />
          <Field label="Margen de beneficio" field="margin_percent" suffix="%" />

          <Button onClick={calculate} disabled={loading} className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wide hover:opacity-90 rounded-sm mt-4" data-testid="calculate-cost-btn">
            {loading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><Calculator size={16} className="mr-2" /> Calcular</>}
          </Button>
        </div>

        {/* Result */}
        <div className="border border-border/50 rounded-sm bg-card p-6 space-y-4">
          <h3 className="font-barlow text-sm font-bold uppercase tracking-tight flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Desglose de costes
          </h3>
          <Separator className="bg-border/30" />
          {result ? (
            <div className="space-y-1">
              <ResultRow label="Valor del producto" value={result.product_value} />
              <ResultRow label="Flete" value={result.freight_cost} />
              <ResultRow label="Seguro" value={result.insurance_cost} />
              <ResultRow label="Valor CIF" value={result.cif_value} bold />
              <div className="h-2" />
              <ResultRow label={`Aranceles (${result.tariff_rate}%)`} value={result.customs_duties} />
              <ResultRow label="Otros costes" value={result.other_costs} />
              <ResultRow label="Base imponible" value={result.taxable_base} bold />
              <div className="h-2" />
              <ResultRow label={`IVA (${result.vat_rate}%)`} value={result.vat_amount} />
              <ResultRow label="Coste total" value={result.total_cost} bold />
              <div className="h-2" />
              {result.margin_percent > 0 && <ResultRow label={`Margen (${result.margin_percent}%)`} value={result.margin_amount} />}
              <div className="bg-primary/10 border border-primary/20 rounded-sm p-3 mt-3">
                <ResultRow label="PRECIO FINAL" value={result.final_price} highlight bold />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calculator size={32} className="mb-3" />
              <p className="text-sm">Introduce los datos y pulsa calcular</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostEstimatorPage;
