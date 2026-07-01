import { useState, useEffect } from "react";
import { Plus, Download, Map, Calendar, Target, AlertTriangle, CheckCircle2, Clock, Edit, Trash2, X, Star, Wand2, Compass } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ProductRoadmapView({ activeProject }: { activeProject: string }) {
  const [dbRoadmap, setDbRoadmap] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedInitiative, setSelectedInitiative] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    roadmap_id: "",
    title: "",
    timeframe: "Q1 2026",
    theme: "Growth",
    feature_reference: "",
    description: "",
    status: "Planned"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [roadmapRes, featuresRes] = await Promise.all([
        supabase.from('product_roadmap').select('*').eq('project_name', activeProject).order('created_at', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (roadmapRes.data) setDbRoadmap(roadmapRes.data);
      if (featuresRes.data) setDbFeatures(featuresRes.data);
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
      id: isEditMode ? formData.id : `RMP-${Math.floor(Math.random() * 90000)}`,
      roadmap_id: formData.roadmap_id,
      title: formData.title,
      timeframe: formData.timeframe,
      theme: formData.theme,
      feature_reference: formData.feature_reference,
      description: formData.description,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('product_roadmap').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('product_roadmap').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving roadmap item:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedInitiative) setSelectedInitiative(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this initiative from the roadmap?")) return;
    setDbRoadmap(dbRoadmap.filter(r => r.id !== id));
    setSelectedInitiative(null);
    const { error } = await supabase.from('product_roadmap').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Strategic Objective: What high-level business goal does this timeline item achieve?\n\nKey Milestones:\n- Milestone 1\n- Milestone 2"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbRoadmap.length + 101;
    setFormData({ id: "", roadmap_id: `RMP-${nextNum}`, title: "", timeframe: "Q1 2026", theme: "Growth", feature_reference: "", description: "", status: "Planned" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedInitiative(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "On Track": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "At Risk": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle, border: "#F59E0B" };
      case "Delayed": return { color: "bg-red-100 text-red-700 border-red-200", icon: X, border: "#EF4444" };
      case "Completed": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2, border: "#3B82F6" };
      default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock, border: "#94A3B8" }; // Planned
    }
  };

  const getThemeColor = (theme: string) => {
    switch(theme) {
      case "Security": return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "Tech Debt": return "text-slate-700 dark:text-slate-400 bg-slate-200 dark:bg-slate-800";
      case "Compliance": return "text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30";
      case "User Experience": return "text-pink-700 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30";
      default: return "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"; // Growth
    }
  };

  // Group roadmap items by timeframe for the visual layout
  const groupedRoadmap = dbRoadmap.reduce((acc, curr) => {
    if (!acc[curr.timeframe]) acc[curr.timeframe] = [];
    acc[curr.timeframe].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  // Custom sort to somewhat order Q1, Q2, H1, H2 intuitively
  const sortedTimeframes = Object.keys(groupedRoadmap).sort((a, b) => {
    if (a.includes('Q') && b.includes('Q')) return a.localeCompare(b);
    return 0; // fallback
  });

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Product Roadmap"
        sub={`Strategic timeline and initiative tracking for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Timeline</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Initiative
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Initiatives</div>
            <div className="text-2xl font-bold">{dbRoadmap.length}</div>
          </div>
          <Map className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">On Track / Completed</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {dbRoadmap.filter(r => r.status === 'On Track' || r.status === 'Completed').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">At Risk or Delayed</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {dbRoadmap.filter(r => r.status === 'At Risk' || r.status === 'Delayed').length}
            </div>
          </div>
          <AlertTriangle className="text-amber-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading strategic timeline...</div>
      ) : dbRoadmap.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Map size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Roadmap is Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Plot out your high-level features and epics across quarters.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Initiative</Btn>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedTimeframes.map(timeframe => (
            <div key={timeframe} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                <Calendar size={16} className="text-primary"/> {timeframe} Target
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedRoadmap[timeframe].map(item => {
                  const visuals = getStatusVisuals(item.status);

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedInitiative(item)}
                      className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
                      style={{ borderTopColor: visuals.border }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{item.roadmap_id}</Badge>
                        <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                          {(() => {
                            const Icon = visuals.icon;
                            return <Icon size={10} />;
                          })()} 
                          {item.status}
                        </Badge>
                      </div>
                      
                      <h4 className="text-base font-bold text-foreground leading-tight mb-2">{item.title}</h4>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <Badge className={cn("text-[9px] px-1.5 py-0 border-none flex items-center gap-1", getThemeColor(item.theme))}>
                          <Compass size={10} /> {item.theme}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 mb-3 font-medium leading-relaxed flex-1 line-clamp-3">
                        {item.description}
                      </div>
                      
                      <div className="mt-auto text-[10px] pt-3 border-t border-border flex items-start gap-1.5">
                        <Star size={14} className="text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground truncate">{item.feature_reference ? item.feature_reference.split(' - ')[1] || item.feature_reference : "No explicit feature linked"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedInitiative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedInitiative.roadmap_id}</Badge>
                <Badge className={cn("gap-1 font-bold", getStatusVisuals(selectedInitiative.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedInitiative.status).icon;
                    return <Icon size={12} />;
                  })()} 
                  {selectedInitiative.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedInitiative, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedInitiative.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedInitiative(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedInitiative.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Target Timeframe</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Calendar size={14}/> {selectedInitiative.timeframe}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Strategic Theme</span>
                    <span className={cn("text-sm font-bold flex items-center gap-1.5", getThemeColor(selectedInitiative.theme).split(' ')[0])}>
                      <Compass size={14}/> {selectedInitiative.theme}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center col-span-2 md:col-span-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Linked Feature</span>
                    <span className="text-sm font-bold text-foreground truncate">{selectedInitiative.feature_reference ? selectedInitiative.feature_reference.split(' - ')[0] : "Unlinked"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                    <Target size={14} /> Initiative Scope & Objectives
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedInitiative.description}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedInitiative.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedInitiative(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Map size={18} className="text-blue-500" /> {isEditMode ? "Edit Roadmap Item" : "Plot New Initiative"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Strategy Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Map ID</label>
                  <input 
                    required 
                    value={formData.roadmap_id} onChange={e => setFormData({...formData, roadmap_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Initiative Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Enterprise Identity Rollout" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Timeframe</label>
                  <input 
                    required list="timeframes"
                    value={formData.timeframe} onChange={e => setFormData({...formData, timeframe: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Q1 2026"
                  />
                  <datalist id="timeframes">
                    <option value="Q1 2026" />
                    <option value="Q2 2026" />
                    <option value="Q3 2026" />
                    <option value="Q4 2026" />
                    <option value="H1 2027" />
                    <option value="H2 2027" />
                    <option value="Future" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Strategic Theme</label>
                  <select 
                    value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Growth</option>
                    <option>Tech Debt</option>
                    <option>Security</option>
                    <option>Compliance</option>
                    <option>User Experience</option>
                    <option>Infrastructure</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Star size={12}/> Parent Feature Link</label>
                  <select 
                    value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">-- No Specific Feature Linked --</option>
                    {dbFeatures.map(f => (
                      <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Delivery Status</label>
                <select 
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                  className={cn("w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 font-bold", 
                    formData.status === 'On Track' || formData.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500" : 
                    formData.status === 'At Risk' ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500" : 
                    formData.status === 'Delayed' ? "bg-red-50 text-red-700 border-red-200 focus:ring-red-500" : 
                    "bg-slate-50 text-slate-700 border-slate-200 focus:ring-slate-500"
                  )}
                >
                  <option>Planned</option>
                  <option>On Track</option>
                  <option>At Risk</option>
                  <option>Delayed</option>
                  <option>Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description & Key Milestones</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Describe the objective and major delivery milestones for this timeframe..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Plot on Roadmap")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}