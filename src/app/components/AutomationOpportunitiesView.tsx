import { useState, useEffect } from "react";
import { Plus, Download, Bot, Zap, Clock, TrendingDown, Edit, Trash2, X, Wand2, GitMerge, Cpu, CheckCircle2, Search, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function AutomationOpportunitiesView({ activeProject }: { activeProject: string }) {
  const [dbAuto, setDbAuto] = useState<any[]>([]);
  const [dbProcesses, setDbProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedAuto, setSelectedAuto] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    auto_id: "",
    title: "",
    process_reference: "",
    automation_type: "API Integration",
    manual_effort: "",
    estimated_roi: "",
    complexity: "Medium",
    status: "Identified",
    description: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [autoRes, procRes] = await Promise.all([
        supabase.from('automation_opportunities').select('*').eq('project_name', activeProject).order('auto_id', { ascending: true }),
        supabase.from('process_maps').select('id, map_id, title').eq('project_name', activeProject).order('map_id', { ascending: true })
      ]);

      if (autoRes.data) setDbAuto(autoRes.data);
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
      id: isEditMode ? formData.id : `AUT-${Math.floor(Math.random() * 90000)}`,
      auto_id: formData.auto_id,
      title: formData.title,
      process_reference: formData.process_reference,
      automation_type: formData.automation_type,
      manual_effort: formData.manual_effort,
      estimated_roi: formData.estimated_roi,
      complexity: formData.complexity,
      status: formData.status,
      description: formData.description,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('automation_opportunities').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('automation_opportunities').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving opportunity:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedAuto) setSelectedAuto(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this automation opportunity?")) return;
    setDbAuto(dbAuto.filter(a => a.id !== id));
    setSelectedAuto(null);
    const { error } = await supabase.from('automation_opportunities').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      manual_effort: "e.g., 20 hours/week of manual data entry.",
      estimated_roi: "e.g., Eliminates data entry errors, saves $30k/yr.",
      description: "Current Pain Point: [Describe the manual bottleneck].\n\nProposed Automation: [Describe how technology will solve this without human intervention]."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbAuto.length + 101;
    setFormData({ id: "", auto_id: `AUTO-${nextNum}`, title: "", process_reference: "", automation_type: "API Integration", manual_effort: "", estimated_roi: "", complexity: "Medium", status: "Identified", description: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedAuto(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Implemented": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Approved": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Investigating": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Identified
    }
  };

  const getTypeVisual = (type: string) => {
    switch(type) {
      case "RPA (Robotic Process Automation)": return { icon: Bot, color: "text-purple-600 bg-purple-100 border-purple-200" };
      case "AI / ML": return { icon: Cpu, color: "text-emerald-600 bg-emerald-100 border-emerald-200" };
      case "Batch Script / Cron": return { icon: Clock, color: "text-amber-600 bg-amber-100 border-amber-200" };
      default: return { icon: Zap, color: "text-blue-600 bg-blue-100 border-blue-200" }; // API / System
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Automation Opportunities"
        sub={`Identify, calculate ROI, and propose system automations for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Proposals</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Propose Automation
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Identified Opportunities</div>
            <div className="text-2xl font-bold">{dbAuto.length}</div>
          </div>
          <Search className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Approved & Active</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbAuto.filter(a => a.status === 'Approved' || a.status === 'Implemented').length}
            </div>
          </div>
          <CheckCircle2 className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">AI & RPA Targets</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbAuto.filter(a => a.automation_type.includes('AI') || a.automation_type.includes('RPA')).length}
            </div>
          </div>
          <Bot className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Scanning automation targets...</div>
      ) : dbAuto.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Bot size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Automations Proposed</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Identify manual bottlenecks and propose systemic efficiency solutions.</p>
          <Btn variant="secondary" onClick={openNewForm}>Propose First Automation</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbAuto.map(auto => {
            const viz = getTypeVisual(auto.automation_type);
            const TypeIcon = viz.icon;

            return (
              <div 
                key={auto.id} 
                onClick={() => setSelectedAuto(auto)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
                style={{ borderTopColor: auto.status === 'Implemented' ? '#10B981' : auto.status === 'Approved' ? '#3B82F6' : '#F59E0B' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{auto.auto_id}</Badge>
                  <Badge className={cn("text-[10px] font-bold", getStatusColor(auto.status))}>{auto.status}</Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-2">{auto.title}</h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={cn("text-[9px] px-1.5 py-0.5 border flex items-center gap-1", viz.color)}>
                    <TypeIcon size={10} /> {auto.automation_type}
                  </Badge>
                  {auto.process_reference && (
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 truncate">
                      <GitMerge size={10}/> {auto.process_reference.split(' - ')[0]}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/30 text-xs">
                    <div className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Clock size={10}/> Manual Effort</div>
                    <div className="text-foreground font-medium truncate">{auto.manual_effort || "Unknown"}</div>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100 dark:border-emerald-900/30 text-xs">
                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><TrendingDown size={10}/> Est. ROI / Gain</div>
                    <div className="text-foreground font-medium truncate">{auto.estimated_roi || "TBD"}</div>
                  </div>
                </div>
                
                <div className="text-xs text-foreground line-clamp-2 leading-relaxed flex-1 opacity-80">
                  {auto.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedAuto.auto_id}</Badge>
                <Badge className={cn("font-bold", getStatusColor(selectedAuto.status))}>{selectedAuto.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedAuto, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedAuto.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedAuto(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedAuto.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Technology Type</span>
                    <span className={cn("text-sm font-bold flex items-center gap-1.5", getTypeVisual(selectedAuto.automation_type).color.split(' ')[0])}>
                      {(() => {
                        const Icon = getTypeVisual(selectedAuto.automation_type).icon;
                        return <Icon size={14} />;
                      })()} 
                      {selectedAuto.automation_type}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Execution Complexity</span>
                    <span className="text-sm font-bold text-foreground">{selectedAuto.complexity}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center col-span-2 md:col-span-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Linked Parent Process</span>
                    <span className="text-sm font-bold text-foreground truncate">{selectedAuto.process_reference ? selectedAuto.process_reference.split(' - ')[0] : "Unlinked"}</span>
                  </div>
                </div>
              </div>

              {/* ROI Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50/30 dark:bg-red-900/5 border border-red-200 dark:border-red-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                    <AlertCircle size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Current Manual Pain</h3>
                  </div>
                  <div className="text-sm text-foreground font-medium">{selectedAuto.manual_effort || "No manual metric provided."}</div>
                </div>
                
                <div className="bg-emerald-50/30 dark:bg-emerald-900/5 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
                    <TrendingDown size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Estimated Gain / ROI</h3>
                  </div>
                  <div className="text-sm text-foreground font-medium">{selectedAuto.estimated_roi || "No ROI calculated."}</div>
                </div>
              </div>

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                  <Bot size={14} /> Proposed Automation Solution
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedAuto.description}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedAuto.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedAuto(null)}>Close</Btn>
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
                <Bot size={18} className="text-blue-500" /> {isEditMode ? "Edit Proposal" : "Draft Automation Opportunity"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load BA Pitch Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ID Ref</label>
                    <input 
                      required 
                      value={formData.auto_id} onChange={e => setFormData({...formData, auto_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Automation Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Automate Jira Ticket Creation" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><GitMerge size={12}/> Map to Existing Process</label>
                    <select 
                      value={formData.process_reference} onChange={e => setFormData({...formData, process_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- No Map Linked --</option>
                      {dbProcesses.map(p => (
                        <option key={p.id} value={`${p.map_id} - ${p.title}`}>{p.map_id} - {p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tech Vector</label>
                    <select 
                      value={formData.automation_type} onChange={e => setFormData({...formData, automation_type: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>API Integration</option>
                      <option>RPA (Robotic Process Automation)</option>
                      <option>Batch Script / Cron</option>
                      <option>AI / ML</option>
                      <option>System Trigger</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                    >
                      <option>Identified</option>
                      <option>Investigating</option>
                      <option>Approved</option>
                      <option>Implemented</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                  <div>
                    <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1"><Clock size={12}/> Current Manual Effort</label>
                    <input 
                      required 
                      value={formData.manual_effort} onChange={e => setFormData({...formData, manual_effort: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. 15 hours/week of data entry" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1"><TrendingDown size={12}/> Estimated ROI / Value</label>
                    <input 
                      required 
                      value={formData.estimated_roi} onChange={e => setFormData({...formData, estimated_roi: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. $25k/yr saved, 100% accuracy" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Solution Description & Feasibility</label>
                  <textarea 
                    required rows={5}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="Describe exactly how this automation will be achieved architecturally..." 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Propose Opportunity")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}