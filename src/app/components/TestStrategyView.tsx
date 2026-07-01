import { useState, useEffect } from "react";
import { Plus, Download, ShieldCheck, Server, AlertCircle, FileText, CheckCircle2, Edit, Trash2, X, Wand2, Star, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TestStrategyView({ activeProject }: { activeProject: string }) {
  const [dbStrategies, setDbStrategies] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedStrategy, setSelectedStrategy] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    strategy_id: "",
    title: "",
    feature_reference: "",
    testing_types: "",
    environments: "Staging",
    governance_rules: "",
    status: "Draft"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [stratRes, featRes] = await Promise.all([
        supabase.from('testing_strategy').select('*').eq('project_name', activeProject).order('strategy_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (stratRes.data) setDbStrategies(stratRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `STR-${Math.floor(Math.random() * 90000)}`,
      strategy_id: formData.strategy_id,
      title: formData.title,
      feature_reference: formData.feature_reference,
      testing_types: formData.testing_types,
      environments: formData.environments,
      governance_rules: formData.governance_rules,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_strategy').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_strategy').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving strategy:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedStrategy) setSelectedStrategy(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this testing strategy baseline?")) return;
    setDbStrategies(dbStrategies.filter(s => s.id !== id));
    setSelectedStrategy(null);
    const { error } = await supabase.from('testing_strategy').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      testing_types: "Functional Testing, User Acceptance Testing (UAT), Regression Testing",
      governance_rules: "Entry Criteria:\n- Core feature requirements signed off by Product Owner.\n- Staging deployment build is stable.\n\nExit Criteria:\n- 100% of critical test paths pass.\n- Zero high-priority open defects remain."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbStrategies.length + 101;
    setFormData({ id: "", strategy_id: `STR-${nextNum}`, title: "", feature_reference: "", testing_types: "", environments: "Staging", governance_rules: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedStrategy(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Testing Strategies"
        sub={`Strategic validation frameworks, entry/exit gates, and scope alignments for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Strategies</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />New Strategy
            </Btn>
          </>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading strategies...</div>
      ) : dbStrategies.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ShieldCheck size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Test Strategies Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Baseline your validation parameters to align QA with product targets.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create Strategy</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbStrategies.map(strat => (
            <div 
              key={strat.id} 
              onClick={() => setSelectedStrategy(strat)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: strat.status === 'Baselined' ? '#10B981' : '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{strat.strategy_id}</Badge>
                <Badge className={cn("text-[10px] font-bold", strat.status === 'Baselined' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{strat.status}</Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-2">{strat.title}</h3>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                <Badge className="bg-muted text-muted-foreground border-none text-[9px] font-medium flex items-center gap-1"><Server size={10}/> Env: {strat.environments}</Badge>
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 line-clamp-3 mb-3 leading-relaxed flex-1 font-medium">
                {strat.testing_types}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedStrategy.strategy_id}</Badge>
                <Badge className={selectedStrategy.status === 'Baselined' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>{selectedStrategy.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedStrategy, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedStrategy.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedStrategy(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">{selectedStrategy.title}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5 block">Target Environments</span>
                    <span className="text-sm font-bold text-foreground">{selectedStrategy.environments}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5 block">Linked Feature</span>
                    <span className="text-sm font-bold text-foreground truncate block">{selectedStrategy.feature_reference || "Unassigned"}</span>
                  </div>
                </div>
              </div>

              <section className="bg-muted/10 p-4 border border-border rounded-lg">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Layers size={14}/> Testing Scope Scope</h3>
                <div className="text-sm font-medium text-foreground">{selectedStrategy.testing_types}</div>
              </section>

              <section className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 relative shadow-sm">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-lg" />
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-700 dark:text-blue-400 mb-3">
                  <ShieldCheck size={14} /> Governance, Entry & Exit Quality Gates
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed font-mono bg-background/50 p-3 rounded border border-border/50">
                  {selectedStrategy.governance_rules}
                </div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedStrategy(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-500" /> {isEditMode ? "Edit Test Strategy" : "Define Test Strategy"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Framework Base
                  </button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Strategy ID</label>
                    <input required value={formData.strategy_id} onChange={e => setFormData({...formData, strategy_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Strategy Title</label>
                    <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="e.g. Identity Rollout Validation Plan" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link to Feature</label>
                    <select value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md">
                      <option value="">-- No Map Linked --</option>
                      {dbFeatures.map(f => <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Environment</label>
                      <input value={formData.environments} onChange={e => setFormData({...formData, environments: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" placeholder="QA, Staging" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                        <option>Draft</option>
                        <option>Under Review</option>
                        <option>Baselined</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scope / Testing Types (Comma Separated)</label>
                  <input required value={formData.testing_types} onChange={e => setFormData({...formData, testing_types: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" placeholder="e.g. Functional Testing, Load Testing, Regression" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-600 mb-1.5">Entry & Exit Governance Gates</label>
                  <textarea required rows={5} value={formData.governance_rules} onChange={e => setFormData({...formData, governance_rules: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md font-mono" placeholder="Define the strict qualitative conditions required to begin and terminate testing phases..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Lock Strategy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}