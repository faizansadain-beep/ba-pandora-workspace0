import { useState, useEffect } from "react";
import { Plus, Download, BarChart, TrendingUp, Calculator, AlertTriangle, CheckCircle2, ListOrdered, Edit, Trash2, X, Star, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function FeaturePrioritizationView({ activeProject }: { activeProject: string }) {
  const [dbScores, setDbScores] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedScore, setSelectedScore] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    score_id: "",
    feature_reference: "",
    moscow_category: "Must Have",
    reach: 1000,
    impact: 3,
    confidence: 80,
    effort: 2,
    justification: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [scoresRes, featuresRes] = await Promise.all([
        supabase.from('feature_prioritization').select('*').eq('project_name', activeProject).order('rice_score', { ascending: false }), // Sorted by highest score
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (scoresRes.data) setDbScores(scoresRes.data);
      if (featuresRes.data) setDbFeatures(featuresRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // Live RICE Calculation
  const calculateRice = (r: number, i: number, c: number, e: number) => {
    if (e === 0) return 0;
    return Math.round((r * i * (c / 100)) / e);
  };

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const calculatedScore = calculateRice(formData.reach, formData.impact, formData.confidence, formData.effort);

    const payload = {
      id: isEditMode ? formData.id : `PRI-${Math.floor(Math.random() * 90000)}`,
      score_id: formData.score_id,
      feature_reference: formData.feature_reference,
      moscow_category: formData.moscow_category,
      reach: formData.reach,
      impact: formData.impact,
      confidence: formData.confidence,
      effort: formData.effort,
      rice_score: calculatedScore,
      justification: formData.justification,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('feature_prioritization').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('feature_prioritization').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving score:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedScore) setSelectedScore(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this prioritization score?")) return;
    setDbScores(dbScores.filter(s => s.id !== id));
    setSelectedScore(null);
    const { error } = await supabase.from('feature_prioritization').delete().eq('id', id);
    if (error) fetchData();
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbScores.length + 101;
    setFormData({ id: "", score_id: `RICE-${nextNum}`, feature_reference: "", moscow_category: "Must Have", reach: 1000, impact: 2, confidence: 80, effort: 3, justification: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedScore(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // Visual Helpers
  const getMoscowStyles = (category: string) => {
    switch(category) {
      case "Must Have": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-900/50";
      case "Should Have": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-900/50";
      case "Could Have": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-900/50";
      case "Won't Have": return "bg-slate-100 text-slate-500 border-slate-200 line-through dark:bg-slate-800 dark:border-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getImpactLabel = (val: number) => {
    if (val == 3) return "Massive (3x)";
    if (val == 2) return "High (2x)";
    if (val == 1) return "Medium (1x)";
    if (val == 0.5) return "Low (0.5x)";
    return "Minimal (0.25x)";
  };

  const mustHaveCount = dbScores.filter(s => s.moscow_category === 'Must Have').length;
  const topScore = dbScores.length > 0 ? dbScores[0].rice_score : 0;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Feature Prioritization Matrix"
        sub={`RICE scoring and MoSCoW mapping for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Rankings</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Score Feature
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Critical (Must Haves)</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{mustHaveCount}</div>
          </div>
          <AlertTriangle className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Scored Features</div>
            <div className="text-2xl font-bold">{dbScores.length}</div>
          </div>
          <Calculator className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Highest RICE Score</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{topScore.toLocaleString()}</div>
          </div>
          <TrendingUp className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Calculating rankings...</div>
      ) : dbScores.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <BarChart size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Features Scored</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Rank your features objectively using RICE and MoSCoW methodologies.</p>
          <Btn variant="secondary" onClick={openNewForm}>Score First Feature</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="bg-muted/50 p-3 border-b border-border flex text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-12 text-center">Rank</div>
            <div className="flex-1">Target Feature</div>
            <div className="w-32 hidden md:block">MoSCoW</div>
            <div className="w-48 hidden lg:block text-center">R / I / C / E</div>
            <div className="w-24 text-right pr-4">RICE Score</div>
          </div>
          <div className="divide-y divide-border">
            {dbScores.map((score, index) => (
              <div 
                key={score.id} 
                onClick={() => setSelectedScore(score)}
                className="p-3 bg-card hover:bg-muted/30 transition-colors flex items-center cursor-pointer group"
              >
                {/* Rank */}
                <div className="w-12 text-center font-bold text-lg text-muted-foreground">
                  #{index + 1}
                </div>

                {/* Feature Title */}
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-bold text-foreground truncate">{score.feature_reference.split(' - ')[1] || score.feature_reference}</h4>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{score.feature_reference.split(' - ')[0]}</div>
                </div>

                {/* MoSCoW */}
                <div className="w-32 hidden md:block">
                  <Badge className={cn("text-[10px] px-2 py-0.5", getMoscowStyles(score.moscow_category))}>
                    {score.moscow_category}
                  </Badge>
                </div>

                {/* RICE Breakdown */}
                <div className="w-48 hidden lg:flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span title="Reach">{score.reach}</span>/
                  <span title={`Impact (${getImpactLabel(score.impact)})`}>{score.impact}</span>/
                  <span title="Confidence">{score.confidence}%</span>/
                  <span title="Effort">{score.effort}</span>
                </div>

                {/* Final Score */}
                <div className="w-24 flex flex-col items-end justify-center pr-2">
                  <div className="text-lg font-bold text-primary">{Number(score.rice_score).toLocaleString()}</div>
                  
                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4">
                    <button onClick={(e) => openEditForm(score, e)} className="p-1.5 bg-background border border-border shadow-sm text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                    <button onClick={(e) => handleDelete(score.id, e)} className="p-1.5 bg-background border border-border shadow-sm text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedScore.score_id}</Badge>
                <Badge className={cn("px-2 font-bold", getMoscowStyles(selectedScore.moscow_category))}>
                  {selectedScore.moscow_category}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedScore, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedScore.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedScore(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Star size={14} /> Linked Feature
                </div>
                <h2 className="text-xl font-bold text-foreground mb-4 leading-tight">{selectedScore.feature_reference}</h2>
              </div>

              {/* RICE Breakdown Visualizer */}
              <div className="bg-muted/20 border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                    <Calculator size={16} /> R.I.C.E Score Equation
                  </h3>
                  <div className="text-2xl font-bold text-primary">{Number(selectedScore.rice_score).toLocaleString()}</div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center divide-x divide-border">
                  <div className="flex flex-col gap-1 px-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reach</span>
                    <span className="text-lg font-mono font-bold text-foreground">{Number(selectedScore.reach).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1 px-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Impact</span>
                    <span className="text-lg font-mono font-bold text-foreground">{selectedScore.impact}x</span>
                  </div>
                  <div className="flex flex-col gap-1 px-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confidence</span>
                    <span className="text-lg font-mono font-bold text-foreground">{selectedScore.confidence}%</span>
                  </div>
                  <div className="flex flex-col gap-1 px-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Effort</span>
                    <span className="text-lg font-mono font-bold text-red-500">{selectedScore.effort}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                    <ListOrdered size={14} /> Scoring Justification
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedScore.justification || <span className="italic text-muted-foreground">No justification written.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedScore.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedScore(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart size={18} className="text-blue-500" /> {isEditMode ? "Edit Feature Score" : "Prioritize Feature"}
              </h2>
              <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Score ID</label>
                    <input 
                      required 
                      value={formData.score_id} onChange={e => setFormData({...formData, score_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Star size={12}/> Target Feature</label>
                    <select 
                      required autoFocus
                      value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- Select Feature to Prioritize --</option>
                      {dbFeatures.map(f => (
                        <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* MoSCoW & Live Score Banner */}
                <div className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-xl bg-muted/10 items-center">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">MoSCoW Delivery Bucket</label>
                    <select 
                      value={formData.moscow_category} onChange={e => setFormData({...formData, moscow_category: e.target.value})} 
                      className={cn("w-full px-3 py-2 text-sm font-bold border rounded-md focus:outline-none focus:ring-1", 
                        formData.moscow_category === 'Must Have' ? "bg-red-50 text-red-700 border-red-200 focus:ring-red-500" :
                        formData.moscow_category === 'Should Have' ? "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500" :
                        formData.moscow_category === 'Could Have' ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500" :
                        "bg-slate-50 text-slate-500 border-slate-200 focus:ring-slate-500"
                      )}
                    >
                      <option>Must Have</option>
                      <option>Should Have</option>
                      <option>Could Have</option>
                      <option>Won't Have</option>
                    </select>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-card border border-border shadow-sm rounded-lg py-2 px-6 w-full md:w-auto shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Live RICE Score</span>
                    <span className="text-2xl font-black text-primary font-mono">{calculateRice(formData.reach, formData.impact, formData.confidence, formData.effort).toLocaleString()}</span>
                  </div>
                </div>

                {/* RICE Input Grid */}
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">RICE Parameters</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5" title="Number of users/events per time period">Reach (Volume)</label>
                      <input 
                        type="number" min="1" required
                        value={formData.reach} onChange={e => setFormData({...formData, reach: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Impact (Multiplier)</label>
                      <select 
                        value={formData.impact} onChange={e => setFormData({...formData, impact: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value={3}>3.0 - Massive</option>
                        <option value={2}>2.0 - High</option>
                        <option value={1}>1.0 - Medium</option>
                        <option value={0.5}>0.5 - Low</option>
                        <option value={0.25}>0.25 - Minimal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confidence (%)</label>
                      <input 
                        type="number" min="1" max="100" required
                        value={formData.confidence} onChange={e => setFormData({...formData, confidence: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Effort (Time/Cost)</label>
                      <input 
                        type="number" min="0.1" step="0.1" required
                        value={formData.effort} onChange={e => setFormData({...formData, effort: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scoring Justification</label>
                  <textarea 
                    rows={3}
                    value={formData.justification} onChange={e => setFormData({...formData, justification: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="Briefly explain why you assigned these specific numbers..." 
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Update Score" : "Lock Framework Score")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}