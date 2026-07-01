import { useState, useEffect } from "react";
import { Plus, Download, ListTodo, Bug, Zap, CheckSquare, Wrench, Edit, Trash2, X, Wand2, Flag, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function BacklogView({ activeProject }: { activeProject: string }) {
  const [dbBacklog, setDbBacklog] = useState<any[]>([]);
  const [dbEpics, setDbEpics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedPbi, setSelectedPbi] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    pbi_id: "",
    title: "",
    item_type: "Story",
    epic_reference: "",
    description: "",
    story_points: "Unestimated",
    priority: "Medium",
    status: "New"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [backlogRes, epicsRes] = await Promise.all([
        supabase.from('product_backlog').select('*').eq('project_name', activeProject).order('pbi_id', { ascending: true }),
        supabase.from('product_epics').select('id, epic_id, title').eq('project_name', activeProject).order('epic_id', { ascending: true })
      ]);

      if (backlogRes.data) setDbBacklog(backlogRes.data);
      if (epicsRes.data) setDbEpics(epicsRes.data);
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
      id: isEditMode ? formData.id : `PBI-${Math.floor(Math.random() * 90000)}`,
      pbi_id: formData.pbi_id,
      title: formData.title,
      item_type: formData.item_type,
      epic_reference: formData.epic_reference,
      description: formData.description,
      story_points: formData.story_points,
      priority: formData.priority,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('product_backlog').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('product_backlog').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving PBI:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedPbi) setSelectedPbi(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this item from the product backlog?")) return;
    setDbBacklog(dbBacklog.filter(pbi => pbi.id !== id));
    setSelectedPbi(null);
    const { error } = await supabase.from('product_backlog').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "As a [User Role], I want to [Action/Goal], so that [Business Value/Reason].\n\nAcceptance Criteria:\n1. Verify that...\n2. Ensure..."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbBacklog.length + 101;
    setFormData({ id: "", pbi_id: `PBI-${nextNum}`, title: "", item_type: "Story", epic_reference: "", description: "", story_points: "Unestimated", priority: "Medium", status: "New" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedPbi(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // Visual Helpers
  const getTypeVisuals = (type: string) => {
    switch(type) {
      case "Bug": return { color: "text-red-500 bg-red-50 dark:bg-red-900/10", icon: Bug };
      case "Spike": return { color: "text-violet-500 bg-violet-50 dark:bg-violet-900/10", icon: Zap };
      case "Tech Debt": return { color: "text-amber-500 bg-amber-50 dark:bg-amber-900/10", icon: Wrench };
      case "Task": return { color: "text-slate-500 bg-slate-50 dark:bg-slate-800/50", icon: CheckSquare };
      default: return { color: "text-blue-500 bg-blue-50 dark:bg-blue-900/10", icon: ListTodo }; // Story
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Done": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Sprint": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Ready": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Refined": return "bg-violet-100 text-violet-700 border-violet-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // New
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "High": return "text-red-600";
      case "Low": return "text-blue-600";
      default: return "text-amber-600"; // Medium
    }
  };

  const totalPoints = dbBacklog.reduce((acc, curr) => {
    const pts = parseInt(curr.story_points);
    return !isNaN(pts) ? acc + pts : acc;
  }, 0);

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Product Backlog"
        sub={`Groom, estimate, and prioritize granular work items for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Backlog</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Create PBI
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Backlog Items</div>
            <div className="text-2xl font-bold">{dbBacklog.length}</div>
          </div>
          <ListTodo className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-indigo-200 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-900">
          <div>
            <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mb-1">Ready for Sprint</div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {dbBacklog.filter(b => b.status === 'Ready').length}
            </div>
          </div>
          <CheckCircle2 className="text-indigo-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Story Points</div>
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{totalPoints}</div>
          </div>
          <Zap className="text-violet-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading backlog items...</div>
      ) : dbBacklog.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ListTodo size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Backlog is Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Start drafting User Stories, Bugs, and Tech Debt items.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Backlog Item</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="divide-y divide-border">
            {dbBacklog.map(pbi => {
              const typeVis = getTypeVisuals(pbi.item_type);
              const TypeIcon = typeVis.icon;

              return (
                <div 
                  key={pbi.id} 
                  onClick={() => setSelectedPbi(pbi)}
                  className="p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group"
                >
                  {/* Left Column: ID & Type */}
                  <div className="flex items-center gap-3 sm:w-48 shrink-0">
                    <div className={cn("p-2 rounded-md", typeVis.color)} title={pbi.item_type}>
                      <TypeIcon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-foreground">{pbi.pbi_id}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{pbi.item_type}</div>
                    </div>
                  </div>

                  {/* Middle Column: Title & Epic Link */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate mb-1">{pbi.title}</h4>
                    <div className="flex items-center gap-2 text-[10px]">
                      <Badge className={cn("px-1.5 py-0 border-none font-bold", getStatusBadge(pbi.status))}>
                        {pbi.status}
                      </Badge>
                      {pbi.epic_reference && (
                        <span className="text-muted-foreground truncate flex items-center gap-1">
                          <Flag size={10} className="text-primary/60"/> {pbi.epic_reference.split(' - ')[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Meta & Actions */}
                  <div className="flex items-center gap-4 shrink-0 sm:w-48 justify-end">
                    <div className="flex flex-col items-end">
                      <div className={cn("text-xs font-bold", getPriorityColor(pbi.priority))}>{pbi.priority}</div>
                      <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Badge className="bg-muted text-muted-foreground font-mono text-[10px] px-1.5 py-0">
                          {pbi.story_points} {pbi.story_points !== 'Unestimated' ? 'pts' : ''}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => openEditForm(pbi, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                      <button onClick={(e) => handleDelete(pbi.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedPbi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedPbi.pbi_id}</Badge>
                <Badge className={cn("px-2 font-bold", getStatusBadge(selectedPbi.status))}>
                  {selectedPbi.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedPbi, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedPbi.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedPbi(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {(() => {
                    const TypeIcon = getTypeVisuals(selectedPbi.item_type).icon;
                    return <TypeIcon size={14} className={getTypeVisuals(selectedPbi.item_type).color.split(' ')[0]} />;
                  })()}
                  {selectedPbi.item_type}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedPbi.title}</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Priority</span>
                    <span className={cn("text-sm font-bold", getPriorityColor(selectedPbi.priority))}>{selectedPbi.priority}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Story Points</span>
                    <span className="text-sm font-mono font-bold text-primary">{selectedPbi.story_points}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Parent Epic Link</span>
                    <span className="text-sm font-bold text-foreground truncate">{selectedPbi.epic_reference ? selectedPbi.epic_reference.split(' - ')[0] : "Unassigned"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                    <ListTodo size={14} /> Backlog Item Description
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedPbi.description}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedPbi.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedPbi(null)}>Close</Btn>
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
                <ListTodo size={18} className="text-blue-500" /> {isEditMode ? "Edit Backlog Item" : "Create Backlog Item"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load User Story Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">PBI ID</label>
                    <input 
                      required 
                      value={formData.pbi_id} onChange={e => setFormData({...formData, pbi_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Item Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Map SAML claims to user profile table" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Item Type</label>
                    <select 
                      value={formData.item_type} onChange={e => setFormData({...formData, item_type: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium"
                    >
                      <option>Story</option>
                      <option>Bug</option>
                      <option>Task</option>
                      <option>Tech Debt</option>
                      <option>Spike</option>
                    </select>
                  </div>
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
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Story Points</label>
                    <select 
                      value={formData.story_points} onChange={e => setFormData({...formData, story_points: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>Unestimated</option>
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                      <option>5</option>
                      <option>8</option>
                      <option>13</option>
                      <option>21</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Backlog Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                    >
                      <option>New</option>
                      <option>Refined</option>
                      <option>Ready</option>
                      <option>In Sprint</option>
                      <option>Done</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Flag size={12}/> Parent Epic Link</label>
                  <select 
                    value={formData.epic_reference} onChange={e => setFormData({...formData, epic_reference: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">-- No Epic Assigned --</option>
                    {dbEpics.map(ep => (
                      <option key={ep.id} value={`${ep.epic_id} - ${ep.title}`}>{ep.epic_id} - {ep.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description & Acceptance Criteria</label>
                  <textarea 
                    required rows={6}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="Provide full context, technical notes, or acceptance criteria..." 
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Backlog Item")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}