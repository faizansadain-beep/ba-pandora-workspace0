import { useState, useEffect } from "react";
import { Plus, Download, Flag, Target, Layers, Edit, Trash2, X, Wand2, Star, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function EpicsView({ activeProject }: { activeProject: string }) {
  const [dbEpics, setDbEpics] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedEpic, setSelectedEpic] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    epic_id: "",
    title: "",
    feature_reference: "",
    description: "",
    business_outcome: "",
    priority: "Medium",
    status: "To Do"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [epicsRes, featuresRes] = await Promise.all([
        supabase.from('product_epics').select('*').eq('project_name', activeProject).order('epic_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (epicsRes.data) setDbEpics(epicsRes.data);
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
      id: isEditMode ? formData.id : `EPC-${Math.floor(Math.random() * 90000)}`,
      epic_id: formData.epic_id,
      title: formData.title,
      feature_reference: formData.feature_reference,
      description: formData.description,
      business_outcome: formData.business_outcome,
      priority: formData.priority,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('product_epics').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('product_epics').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving epic:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedEpic) setSelectedEpic(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this Epic from the backlog?")) return;
    setDbEpics(dbEpics.filter(ep => ep.id !== id));
    setSelectedEpic(null);
    const { error } = await supabase.from('product_epics').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Scope Overview: Broadly define what this Epic covers across multiple sprints.\n\nOut of Scope: What will NOT be handled in this Epic?",
      business_outcome: "Expected Result: When all stories in this Epic are closed, the system will be able to..."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbEpics.length + 101;
    setFormData({ id: "", epic_id: `EPC-${nextNum}`, title: "", feature_reference: "", description: "", business_outcome: "", priority: "Medium", status: "To Do" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedEpic(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Done": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "In Progress": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: PlayCircle, border: "#3B82F6" };
      case "Cancelled": return { color: "bg-slate-100 text-slate-500 border-slate-200 line-through", icon: X, border: "#94A3B8" };
      default: return { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, border: "#F59E0B" }; // To Do
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "High": return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "Low": return "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
      default: return "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30"; // Medium
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Agile Epics"
        sub={`Large bodies of work mapping features to execution for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Epics</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Draft Epic
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Epics</div>
            <div className="text-2xl font-bold">{dbEpics.length}</div>
          </div>
          <Flag className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">In Active Sprints</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbEpics.filter(e => e.status === 'In Progress').length}
            </div>
          </div>
          <PlayCircle className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Completed Epics</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbEpics.filter(e => e.status === 'Done').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading epic backlog...</div>
      ) : dbEpics.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Flag size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Epics Drafted</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Break your product features down into deliverable chunks of work.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Epic</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbEpics.map(epic => {
            const visuals = getStatusVisuals(epic.status);

            return (
              <div 
                key={epic.id} 
                onClick={() => setSelectedEpic(epic)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20 flex items-center gap-1">
                      <Flag size={10} /> {epic.epic_id}
                    </Badge>
                    <Badge className={cn("text-[9px] px-1.5 py-0 border-none", getPriorityColor(epic.priority))}>
                      {epic.priority}
                    </Badge>
                  </div>
                  <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                    {(() => {
                      const Icon = visuals.icon;
                      return <Icon size={10} />;
                    })()} 
                    {epic.status}
                  </Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-2">{epic.title}</h3>
                
                {epic.feature_reference && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-3">
                    <Star size={12} className="text-primary/70" /> {epic.feature_reference.split(' - ')[0]}
                  </div>
                )}
                
                <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 mb-3 font-medium leading-relaxed flex-1 line-clamp-3">
                  {epic.description}
                </div>
                
                <div className="mt-auto text-[10px] pt-3 border-t border-border flex items-start gap-2">
                  <Target size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground line-clamp-1 italic">"{epic.business_outcome || "Outcome pending."}"</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedEpic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20 flex items-center gap-1">
                  <Flag size={12} /> {selectedEpic.epic_id}
                </Badge>
                <Badge className={cn("gap-1", getStatusVisuals(selectedEpic.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedEpic.status).icon;
                    return <Icon size={12} />;
                  })()} 
                  {selectedEpic.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedEpic, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedEpic.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedEpic(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedEpic.title}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <Target className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Execution Priority</div>
                      <div className="text-sm font-bold text-foreground">{selectedEpic.priority}</div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <Star className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Parent Feature Link</div>
                      <div className="text-sm font-bold text-foreground truncate">{selectedEpic.feature_reference || "Unassigned"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                    <Layers size={14} /> Epic Scope & Details
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedEpic.description}
                  </div>
                </section>

                <section className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-2">
                    <CheckCircle2 size={14} /> Desired Business Outcome
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedEpic.business_outcome || <span className="italic text-muted-foreground">No outcome specified.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedEpic.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedEpic(null)}>Close</Btn>
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
                <Flag size={18} className="text-blue-500" /> {isEditMode ? "Edit Epic" : "Draft New Epic"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load BA Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Epic ID</label>
                    <input 
                      required 
                      value={formData.epic_id} onChange={e => setFormData({...formData, epic_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Epic Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Implement SAML Auth Flow" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {/* DYNAMIC AUTO-FETCHED DROPDOWN FOR FEATURES */}
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Star size={12}/> Parent Feature</label>
                    <select 
                      value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- Assign to Feature --</option>
                      {dbFeatures.map(f => (
                        <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                      <select 
                        value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} 
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sprint Status</label>
                      <select 
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option>To Do</option>
                        <option>In Progress</option>
                        <option>Done</option>
                        <option>Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scope & Description</label>
                  <textarea 
                    required rows={4}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="Describe the overarching body of work this Epic represents..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1"><CheckCircle2 size={12}/> Desired Business Outcome</label>
                  <textarea 
                    rows={3}
                    value={formData.business_outcome} onChange={e => setFormData({...formData, business_outcome: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium" 
                    placeholder="What is the definition of done for this entire Epic?" 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Create Epic")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}