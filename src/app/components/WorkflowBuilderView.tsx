import { useState, useEffect } from "react";
import { Plus, Download, GitBranch, Play, StopCircle, Edit, Trash2, X, Wand2, Power, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function WorkflowBuilderView({ activeProject }: { activeProject: string }) {
  const [dbWorkflows, setDbWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    workflow_id: "",
    title: "",
    trigger_event: "",
    steps: [] as any[],
    status: "Draft"
  });

  async function fetchWorkflows() {
    setLoading(true);
    const { data, error } = await supabase
      .from('process_workflows')
      .select('*')
      .eq('project_name', activeProject)
      .order('workflow_id', { ascending: true });

    if (error) console.error("Error fetching workflows:", error);
    else if (data) setDbWorkflows(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchWorkflows();
  }, [activeProject]);

  // --- Dynamic Builder Logic ---
  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { id: `step-${Date.now()}`, type: "Action", description: "", condition: "", truePath: "", falsePath: "", outcome: "" }]
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      newSteps.splice(index, 1);
      return { ...prev, steps: newSteps };
    });
  };

  const updateStep = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return { ...prev, steps: newSteps };
    });
  };

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `WFB-${Math.floor(Math.random() * 90000)}`,
      workflow_id: formData.workflow_id,
      title: formData.title,
      trigger_event: formData.trigger_event,
      steps: formData.steps, // Supabase client auto-handles JSONB mapping
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('process_workflows').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('process_workflows').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving workflow:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchWorkflows();
      if (isEditMode && selectedWorkflow) setSelectedWorkflow(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this logical workflow?")) return;
    setDbWorkflows(dbWorkflows.filter(w => w.id !== id));
    setSelectedWorkflow(null);
    const { error } = await supabase.from('process_workflows').delete().eq('id', id);
    if (error) fetchWorkflows();
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbWorkflows.length + 101;
    setFormData({ 
      id: "", workflow_id: `WF-${nextNum}`, title: "", trigger_event: "", status: "Draft",
      steps: [
        { id: `step-1`, type: "Action", description: "", condition: "", truePath: "", falsePath: "", outcome: "" }
      ] 
    });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedWorkflow(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // --- Visuals ---
  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Archived": return "bg-slate-200 text-slate-600 border-slate-300";
      default: return "bg-blue-100 text-blue-700 border-blue-200"; // Draft
    }
  };

  const getNodeVisual = (type: string) => {
    switch(type) {
      case "Decision": return { color: "text-amber-600 bg-amber-100 border-amber-200", icon: GitBranch };
      case "End": return { color: "text-red-600 bg-red-100 border-red-200", icon: StopCircle };
      default: return { color: "text-blue-600 bg-blue-100 border-blue-200", icon: Play }; // Action
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Logical Workflow Builder"
        sub={`Conditional node logic and trigger definitions for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Logic</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Build Workflow
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Active Workflows</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbWorkflows.filter(w => w.status === 'Active').length}
            </div>
          </div>
          <Activity className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Logic Nodes Defined</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dbWorkflows.reduce((acc, curr) => acc + (curr.steps?.length || 0), 0)}
            </div>
          </div>
          <GitBranch className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Workflows in Draft</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbWorkflows.filter(w => w.status === 'Draft').length}
            </div>
          </div>
          <Edit className="text-blue-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading workflow schemas...</div>
      ) : dbWorkflows.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <GitBranch size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Logical Workflows Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define strict logic paths, decisions, and system triggers.</p>
          <Btn variant="secondary" onClick={openNewForm}>Build First Workflow</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbWorkflows.map(wf => (
            <div 
              key={wf.id} 
              onClick={() => setSelectedWorkflow(wf)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: wf.status === 'Active' ? '#10B981' : wf.status === 'Archived' ? '#94A3B8' : '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{wf.workflow_id}</Badge>
                <Badge className={cn("text-[10px] font-bold", getStatusColor(wf.status))}>{wf.status}</Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-3">{wf.title}</h3>
              
              <div className="text-xs text-foreground bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 mb-4 flex gap-2 items-start">
                <Power size={14} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Trigger Condition</div>
                  <div className="font-medium text-foreground">{wf.trigger_event}</div>
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center text-[10px] font-mono text-muted-foreground pt-3 border-t border-border">
                <span className="flex items-center gap-1.5"><GitBranch size={12}/> {wf.steps?.length || 0} Logic Nodes</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL LOGICAL TREE MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedWorkflow.workflow_id}</Badge>
                <Badge className={cn("font-bold", getStatusColor(selectedWorkflow.status))}>{selectedWorkflow.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedWorkflow, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedWorkflow.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedWorkflow(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedWorkflow.title}</h2>
                <div className="bg-card border border-border p-4 rounded-lg flex items-center gap-3">
                  <Power className="text-primary shrink-0" size={20} />
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Workflow Trigger Event</div>
                    <div className="text-sm font-bold text-foreground">{selectedWorkflow.trigger_event}</div>
                  </div>
                </div>
              </div>

              {/* LOGICAL TREE VISUALIZER */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary mb-4 bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <GitBranch size={16} /> Workflow Logic Path
                </h3>
                
                <div className="pl-2 space-y-0 relative before:absolute before:inset-0 before:ml-[23px] before:mt-4 before:h-[calc(100%-2rem)] before:w-0.5 before:bg-border">
                  {selectedWorkflow.steps?.map((step: any, index: number) => {
                    const viz = getNodeVisual(step.type);
                    const NodeIcon = viz.icon;

                    return (
                      <div key={index} className="relative flex items-start gap-4 pb-6">
                        <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shadow shrink-0 z-10 text-xs font-bold mt-1", viz.color)}>
                          <NodeIcon size={14} />
                        </div>
                        
                        <div className="flex-1 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                          <div className={cn("px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider", viz.color.replace('bg-', 'bg-opacity-20 bg-').replace('border-', 'border-opacity-50 border-'))}>
                            Node {index + 1}: {step.type}
                          </div>
                          
                          <div className="p-3 text-sm font-medium">
                            {step.type === "Action" && <span className="text-foreground">{step.description}</span>}
                            {step.type === "End" && <span className="text-foreground">{step.outcome}</span>}
                            
                            {step.type === "Decision" && (
                              <div className="space-y-3">
                                <div className="font-bold text-foreground">"{step.condition}"</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 p-2 rounded">
                                    <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle2 size={10}/> IF TRUE</div>
                                    <div className="text-foreground">{step.truePath}</div>
                                  </div>
                                  <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 p-2 rounded">
                                    <div className="font-bold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1"><X size={10}/> IF FALSE</div>
                                    <div className="text-foreground">{step.falsePath}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedWorkflow.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedWorkflow(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE LOGICAL BUILDER FORM
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-4xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitBranch size={18} className="text-blue-500" /> {isEditMode ? "Edit Workflow Logic" : "Build Logical Workflow"}
              </h2>
              <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5">
                
                {/* Meta Settings */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Workflow ID</label>
                      <input 
                        required 
                        value={formData.workflow_id} onChange={e => setFormData({...formData, workflow_id: e.target.value})} 
                        className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
                      <input 
                        required autoFocus 
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                        placeholder="e.g. Automated Password Reset" 
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                      <select 
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option>Draft</option>
                        <option>Active</option>
                        <option>Archived</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1"><Power size={12}/> System Trigger Event</label>
                    <input 
                      required 
                      value={formData.trigger_event} onChange={e => setFormData({...formData, trigger_event: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-medium bg-background border border-primary/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. User clicks 'Forgot Password' on login screen." 
                    />
                  </div>
                </div>

                {/* LOGICAL NODE BUILDER */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Logic Nodes</h3>
                  
                  {formData.steps.map((step, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-lg shadow-sm p-4 relative flex gap-4 items-start">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center">
                          <select 
                            value={step.type} onChange={e => updateStep(idx, "type", e.target.value)}
                            className={cn("px-2 py-1 text-xs font-bold border rounded-md focus:outline-none uppercase tracking-wider", 
                              step.type === 'Decision' ? "bg-amber-50 text-amber-700 border-amber-200" :
                              step.type === 'End' ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            <option>Action</option>
                            <option>Decision</option>
                            <option>End</option>
                          </select>
                          <button type="button" onClick={() => removeStep(idx)} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={14}/></button>
                        </div>

                        {/* Conditional Form Rendering based on Node Type */}
                        {step.type === "Action" && (
                          <input 
                            required value={step.description} onChange={e => updateStep(idx, "description", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none" placeholder="Describe the action (e.g. System queries database)..." 
                          />
                        )}
                        {step.type === "End" && (
                          <input 
                            required value={step.outcome} onChange={e => updateStep(idx, "outcome", e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none" placeholder="State final outcome (e.g. Workflow Terminates: Email Sent)..." 
                          />
                        )}
                        {step.type === "Decision" && (
                          <div className="space-y-2 bg-muted/20 p-3 rounded-md border border-border/50">
                            <input 
                              required value={step.condition} onChange={e => updateStep(idx, "condition", e.target.value)}
                              className="w-full px-3 py-2 text-sm font-medium bg-background border border-border rounded-md mb-2" placeholder="Condition Rule (e.g. Does user exist in database?)" 
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">If True (Then Path)</label>
                                <input required value={step.truePath} onChange={e => updateStep(idx, "truePath", e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" placeholder="e.g. Send JWT token" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-red-600 uppercase mb-1 block">If False (Else Path)</label>
                                <input required value={step.falsePath} onChange={e => updateStep(idx, "falsePath", e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" placeholder="e.g. Fail silently" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={addStep} className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16} /> Add Next Logic Node
                  </button>
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Update Logic Tree" : "Save Workflow Builder")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}