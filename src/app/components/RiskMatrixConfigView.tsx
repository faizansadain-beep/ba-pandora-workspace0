import { useState, useEffect } from "react";
import { Sliders, ShieldAlert, Grid, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function RiskMatrixConfigView() {
  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  async function fetchMatrixWeights() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_risk_matrix')
        .select('*')
        .order('dimension', { ascending: false })
        .order('numeric_weight', { ascending: true });
      if (error) throw error;
      if (data) setWeights(data);
    } catch (err) {
      console.error("Matrix weight config error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMatrixWeights();
  }, []);

  async function handleWeightChange(id: string, newVal: number) {
    setIsUpdating(id);
    setWeights(prev => prev.map(w => w.id === id ? { ...w, numeric_weight: newVal } : w));
    await supabase.from('admin_risk_matrix').update({ numeric_weight: newVal }).eq('id', id);
    setIsUpdating(null);
  }

  // Helper variables to parse data out for the live calculation matrix
  const getWeightByLabel = (dim: string, label: string) => {
    return weights.find(w => w.dimension === dim && w.label === label)?.numeric_weight || 1;
  };

  const impLow = getWeightByLabel("Impact", "Low");
  const impMed = getWeightByLabel("Impact", "Medium");
  const impHigh = getWeightByLabel("Impact", "High");

  const probLow = getWeightByLabel("Probability", "Low");
  const probMed = getWeightByLabel("Probability", "Medium");
  const probHigh = getWeightByLabel("Probability", "High");

  const getCellColor = (score: number) => {
    if (score >= 6) return "bg-red-500/10 border-red-500/30 text-red-500";
    if (score >= 3) return "bg-amber-500/10 border-amber-500/30 text-amber-500";
    return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Risk Severity Matrix Settings"
        sub="Configure the mathematical scoring variables and multi-tier thresholds used to calculate governance exposure."
      />

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT PANEL: Weight Configuration Form */}
        <Card className="w-full lg:w-[480px] shrink-0 border-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2 text-sm font-bold text-foreground">
            <Sliders size={16} className="text-primary"/> Mathematical Mappings
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto space-y-6 custom-scrollbar">
            {loading ? (
              <div className="text-sm text-muted-foreground italic font-medium">Reading system matrix...</div>
            ) : (
              ["Impact", "Probability"].map(dim => (
                <div key={dim} className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-1.5">{dim} Modifiers</h3>
                  {weights.filter(w => w.dimension === dim).map(w => (
                    <div key={w.id} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground">{w.label} {dim}</div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">{w.description}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={w.numeric_weight}
                          disabled={isUpdating === w.id}
                          onChange={(e) => handleWeightChange(w.id, Number(e.target.value))}
                          className="w-14 bg-background border border-border p-1 text-center text-xs font-bold font-mono rounded focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* RIGHT PANEL: Live Heatmap Calculator */}
        <Card className="flex-1 border-border shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 flex flex-col">
          <div className="p-4 border-b border-border bg-background flex items-center gap-2 text-sm font-bold text-foreground shrink-0">
            <Grid size={16} className="text-primary"/> Live Calculations Matrix Preview
          </div>
          
          <div className="flex-1 p-8 flex flex-col justify-center items-center">
            <div className="w-full max-w-md grid grid-cols-4 gap-1 text-xs font-bold text-center">
              
              {/* Table Headers */}
              <div className="col-span-1 flex items-end justify-center pb-2 opacity-40 uppercase text-[10px] tracking-wider -rotate-90 origin-bottom">Impact Multiplier</div>
              <div className="pb-2 text-muted-foreground text-[10px] uppercase tracking-wider">Low ({probLow})</div>
              <div className="pb-2 text-muted-foreground text-[10px] uppercase tracking-wider">Med ({probMed})</div>
              <div className="pb-2 text-muted-foreground text-[10px] uppercase tracking-wider">High ({probHigh})</div>

              {/* HIGH Impact Row */}
              <div className="flex items-center justify-end pr-3 text-muted-foreground uppercase text-[10px] tracking-wider">High ({impHigh})</div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impHigh * probLow))}>
                {impHigh * probLow} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impHigh * probMed))}>
                {impHigh * probMed} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impHigh * probHigh))}>
                {impHigh * probHigh} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Critical</span>
              </div>

              {/* MED Impact Row */}
              <div className="flex items-center justify-end pr-3 text-muted-foreground uppercase text-[10px] tracking-wider">Med ({impMed})</div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impMed * probLow))}>
                {impMed * probLow} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impMed * probMed))}>
                {impMed * probMed} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impMed * probHigh))}>
                {impMed * probHigh} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>

              {/* LOW Impact Row */}
              <div className="flex items-center justify-end pr-3 text-muted-foreground uppercase text-[10px] tracking-wider">Low ({impLow})</div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impLow * probLow))}>
                {impLow * probLow} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impLow * probMed))}>
                {impLow * probMed} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>
              <div className={cn("p-6 rounded border font-mono font-black text-base flex flex-col", getCellColor(impLow * probHigh))}>
                {impLow * probHigh} <span className="text-[8px] font-sans font-bold uppercase tracking-wide opacity-80 mt-0.5">Score</span>
              </div>

            </div>

            {/* Threshold Legend Map */}
            <div className="mt-8 flex gap-6 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
               <div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Green (Low Risk)</div>
               <div className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Amber (Medium Risk)</div>
               <div className="flex items-center gap-1.5"><ShieldAlert size={14} className="text-red-500" /> Red (Critical Risk)</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}