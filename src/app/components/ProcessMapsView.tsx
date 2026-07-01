import { useState, useEffect } from "react";
import { Plus, Download, Workflow, GitMerge, CheckCircle2, Clock, Edit, Trash2, X, Wand2, ArrowRight, GitCommit } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ProcessMapsView({ activeProject }: { activeProject: string }) {
  const [dbMaps, setDbMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedMap, setSelectedMap] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    map_id: "",
    title: "",
    process_type: "To-Be (Future State)",
    complexity: "Medium",
    description: "",
    step_sequence: "",
    status: "Draft"
  });

  async function fetchMaps() {
    setLoading(true);
    const { data, error } = await supabase
      .from('process_maps')
      .select('*')
      .eq('project_name', activeProject)
      .order('map_id', { ascending: true });

    if (error) console.error("Error fetching process maps:", error);
    else if (data) setDbMaps(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchMaps();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `MAP-${Math.floor(Math.random() * 90000)}`,
      map_id: formData.map_id,
      title: formData.title,
      process_type: formData.process_type,
      complexity: formData.complexity,
      description: formData.description,
      step_sequence: formData.step_sequence,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('process_maps').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('process_maps').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving map:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchMaps();
      if (isEditMode && selectedMap) setSelectedMap(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this process map?")) return;
    setDbMaps(dbMaps.filter(m => m.id !== id));
    setSelectedMap(null);
    const { error } = await supabase.from('process_maps').delete().eq('id', id);
    if (error) fetchMaps();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Provide a high-level summary of the process trigger and its final end state.",
      step_sequence: "1. Trigger event occurs.\n2. System validates payload.\n3. If valid -> Proceed to Step 4. If invalid -> Return error.\n4. Database is updated.\n5. Process ends."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbMaps.length + 101;
    setFormData({ id: "", map_id: `PRC-${nextNum}`, title: "", process_type: "To-Be (Future State)", complexity: "Medium", description: "", step_sequence: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedMap(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Review": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  const getTypeColor = (type: string) => {
    if (type.includes('To-Be')) return "text-violet-700 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30";
    return "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30"; // As-Is
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Business Process Maps"
        sub={`Sequential operational workflows (As-Is & To-Be) for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Processes</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Map New Process
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Mapped Flows</div>
            <div className="text-2xl font-bold">{dbMaps.length}</div>
          </div>
          <Workflow className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-violet-200 bg-violet-50 dark:bg-violet-900/10 dark:border-violet-900">
          <div>
            <div className="text-xs text-violet-700 dark:text-violet-400 font-medium mb-1">Future State (To-Be)</div>
            <div className="text-2xl font-bold text-violet-700 dark:text-violet-400">
              {dbMaps.filter(m => m.process_type.includes('To-Be')).length}
            </div>
          </div>
          <GitMerge className="text-violet-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved Processes</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbMaps.filter(m => m.status === 'Approved').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading workflow matrices...</div>
      ) : dbMaps.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Workflow size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Process Maps Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Document sequential business steps to align engineering with operations.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Process</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbMaps.map(map => (
            <div 
              key={map.id} 
              onClick={() => setSelectedMap(map)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: map.status === 'Approved' ? '#10B981' : map.status === 'In Review' ? '#3B82F6' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{map.map_id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(map.status))}>{map.status}</Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{map.title}</h3>
              
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge className={cn("text-[9px] px-1.5 py-0.5 border-none", getTypeColor(map.process_type))}>
                  {map.process_type}
                </Badge>
                <Badge className="bg-muted text-muted-foreground border-none text-[9px] px-1.5 py-0.5">
                  Complexity: {map.complexity}
                </Badge>
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                {map.description}
              </div>
              
              <div className="mt-auto flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground pt-3 border-t border-border">
                <GitCommit size={12} /> {map.step_sequence.split('\n').filter((s: string) => s.trim() !== '').length} Distinct Steps
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL (WITH STEP VISUALIZER)
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedMap.map_id}</Badge>
                <Badge className={cn("font-bold", getStatusColor(selectedMap.status))}>{selectedMap.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedMap, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedMap.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedMap(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedMap.title}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">State Definition</span>
                    <span className={cn("text-sm font-bold flex items-center gap-1.5", selectedMap.process_type.includes('To-Be') ? "text-violet-600" : "text-amber-600")}>
                      <Workflow size={14}/> {selectedMap.process_type}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Execution Complexity</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Clock size={14} className="text-muted-foreground"/> {selectedMap.complexity}
                    </span>
                  </div>
                </div>
              </div>

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                  <GitMerge size={14} /> Process Overview
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedMap.description}
                </div>
              </section>

              {/* Step Sequence Visualizer */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary mb-4">
                  <ArrowRight size={14} /> Sequence Flow Steps
                </h3>
                <div className="space-y-2 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                  {selectedMap.step_sequence.split('\n').filter((s: string) => s.trim() !== '').map((step: string, index: number) => {
                    const isConditional = step.toLowerCase().includes('if ');
                    return (
                      <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xs font-bold", isConditional ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                          {index + 1}
                        </div>
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-card border border-border p-3 rounded-lg shadow-sm text-sm font-medium">
                          {/* Strip numbering if user included it like "1. Step" for clean UI */}
                          {step.replace(/^[0-9]+[\.\-)]\s*/, '')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedMap.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedMap(null)}>Close</Btn>
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
                <Workflow size={18} className="text-blue-500" /> {isEditMode ? "Edit Process Map" : "Draft Process Flow"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Flow Frame
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
                    value={formData.map_id} onChange={e => setFormData({...formData, map_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Process Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. New User SSO Onboarding" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">State Type</label>
                  <select 
                    value={formData.process_type} onChange={e => setFormData({...formData, process_type: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium"
                  >
                    <option>As-Is (Current State)</option>
                    <option>To-Be (Future State)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Complexity</label>
                  <select 
                    value={formData.complexity} onChange={e => setFormData({...formData, complexity: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                  >
                    <option>Draft</option>
                    <option>In Review</option>
                    <option>Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">High-Level Process Description</label>
                <textarea 
                  required rows={3}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Summarize the intent and boundaries of this workflow..." 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1"><GitCommit size={12}/> Sequential Flow Steps</label>
                <textarea 
                  required rows={8}
                  value={formData.step_sequence} onChange={e => setFormData({...formData, step_sequence: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-mono bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                  placeholder="Enter each step on a new line.&#10;1. User logs in.&#10;2. System validates...&#10;3. Data is saved." 
                />
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2 mt-2 rounded-b-xl">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Edits" : "Generate Process Flow")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}