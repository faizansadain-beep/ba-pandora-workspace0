import { useState, useEffect } from "react";
import { Plus, Download, Rows3, UserCircle, Layers, Edit, Trash2, X, Wand2, ArrowRight, GitCommit, CheckCircle2, Archive, ListTree } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function SwimlanesView({ activeProject }: { activeProject: string }) {
  const [dbSwimlanes, setDbSwimlanes] = useState<any[]>([]);
  const [dbProcesses, setDbProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedSwimlane, setSelectedSwimlane] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    swimlane_id: "",
    title: "",
    process_reference: "",
    actors: "",
    flow_data: "",
    status: "Draft"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [swimRes, procRes] = await Promise.all([
        supabase.from('process_swimlanes').select('*').eq('project_name', activeProject).order('swimlane_id', { ascending: true }),
        supabase.from('process_maps').select('id, map_id, title').eq('project_name', activeProject).order('map_id', { ascending: true })
      ]);

      if (swimRes.data) setDbSwimlanes(swimRes.data);
      if (procRes.data) setDbProcesses(procRes.data);
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
      id: isEditMode ? formData.id : `SWL-${Math.floor(Math.random() * 90000)}`,
      swimlane_id: formData.swimlane_id,
      title: formData.title,
      process_reference: formData.process_reference,
      actors: formData.actors,
      flow_data: formData.flow_data,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('process_swimlanes').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('process_swimlanes').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving swimlane:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedSwimlane) setSelectedSwimlane(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this swimlane sequence?")) return;
    setDbSwimlanes(dbSwimlanes.filter(s => s.id !== id));
    setSelectedSwimlane(null);
    const { error } = await supabase.from('process_swimlanes').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      actors: "End User, Frontend Client, API Gateway, Database",
      flow_data: "[End User] Initiates action on screen.\n[Frontend Client] Validates input and sends POST request.\n[API Gateway] Authenticates token and routes request.\n[Database] Updates record state to 'Processed'.\n[Frontend Client] Displays success toast to user."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbSwimlanes.length + 101;
    setFormData({ id: "", swimlane_id: `SWL-${nextNum}`, title: "", process_reference: "", actors: "", flow_data: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedSwimlane(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Active": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "Archived": return { color: "bg-slate-200 text-slate-600 border-slate-300", icon: Archive, border: "#94A3B8" };
      default: return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Edit, border: "#3B82F6" }; // Draft
    }
  };

  // Parses "[Actor Name] Action string" into stylized UI blocks
  const parseFlowData = (text: string) => {
    return text.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
      const match = line.match(/^\[(.*?)\]\s*(.*)/);
      if (match) {
        return { actor: match[1], action: match[2], isParsed: true, key: idx };
      }
      return { actor: "System", action: line, isParsed: false, key: idx };
    });
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Cross-Functional Swimlanes"
        sub={`Actor-based interaction sequences and data handoffs for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Swimlanes</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Map Swimlane
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Active Sequences</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbSwimlanes.filter(s => s.status === 'Active').length}
            </div>
          </div>
          <Rows3 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Draft Sequences</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dbSwimlanes.filter(s => s.status === 'Draft').length}
            </div>
          </div>
          <Edit className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-slate-200 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Archived (Legacy)</div>
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
              {dbSwimlanes.filter(s => s.status === 'Archived').length}
            </div>
          </div>
          <Archive className="text-slate-500 opacity-60" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading interaction timelines...</div>
      ) : dbSwimlanes.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Rows3 size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Swimlanes Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Map out exact interactions between users, frontends, and backend services.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Swimlane</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbSwimlanes.map(swim => {
            const visuals = getStatusVisuals(swim.status);
            const actorsList = swim.actors.split(',').map((a: string) => a.trim());

            return (
              <div 
                key={swim.id} 
                onClick={() => setSelectedSwimlane(swim)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{swim.swimlane_id}</Badge>
                  <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                    {(() => {
                      const Icon = visuals.icon;
                      return <Icon size={10} />;
                    })()} 
                    {swim.status}
                  </Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-2">{swim.title}</h3>
                
                {swim.process_reference && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-4">
                    <ListTree size={12} className="text-primary/70" /> Parent Process: {swim.process_reference.split(' - ')[0]}
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <UserCircle size={12}/> Interacting Actors / Systems
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {actorsList.slice(0, 4).map((actor: string, i: number) => (
                      <Badge key={i} className="bg-muted text-muted-foreground border-none text-[9px] font-medium px-1.5 py-0.5">{actor}</Badge>
                    ))}
                    {actorsList.length > 4 && (
                      <Badge className="bg-muted text-muted-foreground border-none text-[9px] font-medium px-1.5 py-0.5">+{actorsList.length - 4} more</Badge>
                    )}
                  </div>
                </div>
                
                <div className="mt-auto flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground pt-3 border-t border-border">
                  <GitCommit size={12} /> {swim.flow_data.split('\n').filter((s: string) => s.trim() !== '').length} Interaction Steps
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL (WITH ACTOR VISUALIZER)
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedSwimlane && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedSwimlane.swimlane_id}</Badge>
                <Badge className={cn("font-bold gap-1", getStatusVisuals(selectedSwimlane.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedSwimlane.status).icon;
                    return <Icon size={14} />;
                  })()} 
                  {selectedSwimlane.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedSwimlane, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedSwimlane.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedSwimlane(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedSwimlane.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Involved Actors & Systems</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSwimlane.actors.split(',').map((a: string, i: number) => (
                        <Badge key={i} className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 text-[10px]">{a.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Parent Process Mapping</span>
                    <span className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                      <ListTree size={14} className="text-primary"/> {selectedSwimlane.process_reference || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Elevated UX: Step Sequence Actor Visualizer */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary mb-4 bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <ArrowRight size={16} /> Chronological Interaction Flow
                </h3>
                
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                  {parseFlowData(selectedSwimlane.flow_data).map((step) => (
                    <div key={step.key} className="relative flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-background bg-blue-100 text-blue-700 shadow shrink-0 z-10 text-xs font-bold">
                        {step.key + 1}
                      </div>
                      
                      <div className="flex-1 bg-card border border-border p-3 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                        <div className="w-full md:w-40 shrink-0">
                          <Badge className="bg-muted text-muted-foreground font-mono text-[10px] w-full justify-center py-1">
                            {step.actor.length > 20 ? step.actor.substring(0, 20) + "..." : step.actor}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {step.action}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedSwimlane.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedSwimlane(null)}>Close</Btn>
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
                <Rows3 size={18} className="text-blue-500" /> {isEditMode ? "Edit Swimlane" : "Draft Swimlane Sequence"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load [Actor] Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Swimlane ID</label>
                    <input 
                      required 
                      value={formData.swimlane_id} onChange={e => setFormData({...formData, swimlane_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Interaction Sequence Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. SSO Handshake Sequence" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><ListTree size={12}/> Parent Process Mapping</label>
                    <select 
                      value={formData.process_reference} onChange={e => setFormData({...formData, process_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- Unassigned --</option>
                      {dbProcesses.map(p => (
                        <option key={p.id} value={`${p.map_id} - ${p.title}`}>{p.map_id} - {p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lifecycle Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                    >
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Interacting Actors & Systems (Comma Separated)</label>
                  <input 
                    required 
                    value={formData.actors} onChange={e => setFormData({...formData, actors: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. End User, Frontend Client, Auth Provider, Database..." 
                  />
                </div>

                <div className="bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                    <Layers size={14}/> Actor Sequence Format
                  </label>
                  <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                    Type your steps sequentially. For maximum visual impact, place the actor in brackets at the start of the line like this: <br/>
                    <strong className="font-mono bg-card px-1 rounded text-foreground">{"[User] Clicks submit"}</strong>
                  </p>
                  <textarea 
                    required rows={8}
                    value={formData.flow_data} onChange={e => setFormData({...formData, flow_data: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed" 
                    placeholder="[End User] Initiates login...&#10;[API Gateway] Validates token..." 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Edits" : "Draft Swimlane")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}