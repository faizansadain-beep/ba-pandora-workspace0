import { useState, useEffect } from "react";
import { Plus, Download, MessageSquare, AlertTriangle, Eye, ShieldAlert, Edit, Trash2, X, Wand2, CheckCircle2, HelpCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function UXFeedbackView({ activeProject }: { activeProject: string }) {
  const [dbFeedback, setDbFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    feedback_id: "",
    title: "",
    source: "QA Tester",
    severity: "Medium",
    description: "",
    proposed_fix: "",
    status: "Open"
  });

  async function fetchFeedback() {
    setLoading(true);
    const { data, error } = await supabase
      .from('design_ux_feedback')
      .select('*')
      .eq('project_name', activeProject)
      .order('feedback_id', { ascending: true });

    if (error) console.error("Error fetching UX feedback:", error);
    else if (data) setDbFeedback(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchFeedback();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `FBK-${Math.floor(Math.random() * 90000)}`,
      feedback_id: formData.feedback_id,
      title: formData.title,
      source: formData.source,
      severity: formData.severity,
      description: formData.description,
      proposed_fix: formData.proposed_fix,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('design_ux_feedback').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('design_ux_feedback').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving feedback:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchFeedback();
      if (isEditMode && selectedFeedback) setSelectedFeedback(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this UX feedback entry?")) return;
    setDbFeedback(dbFeedback.filter(f => f.id !== id));
    setSelectedFeedback(null);
    const { error } = await supabase.from('design_ux_feedback').delete().eq('id', id);
    if (error) fetchFeedback();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "User Action: What was the user trying to accomplish?\nObserved Friction: What specific UI issue hindered completion?\nFrequency: Does this occur consistently or intermittently?",
      proposed_fix: "UX Recommendation: Change component state from [X] to [Y] or introduce helper tooltips."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbFeedback.length + 101;
    setFormData({ id: "", feedback_id: `UX-${nextNum}`, title: "", source: "QA Tester", severity: "Medium", description: "", proposed_fix: "", status: "Open" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedFeedback(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getSeverityStyles = (severity: string) => {
    switch(severity) {
      case "Critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "High": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Low": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"; // Medium
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Resolved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Closed": return "bg-slate-200 text-slate-600 border-slate-300 line-through";
      case "Investigating": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-red-100 text-red-700 border-red-200"; // Open
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="UX Usability Feedback"
        sub={`Track design flaws, accessibility debt, and enhancement requests for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Log</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Usability Item
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Critical UX Blockers</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbFeedback.filter(f => f.severity === 'Critical' && f.status !== 'Closed').length}
            </div>
          </div>
          <ShieldAlert className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Active Issues</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dbFeedback.filter(f => f.status === 'Open' || f.status === 'Investigating').length}
            </div>
          </div>
          <HelpCircle className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Resolved Enhancements</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbFeedback.filter(f => f.status === 'Resolved').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading usability tracker...</div>
      ) : dbFeedback.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <MessageSquare size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">UX Feedback Log is Clean</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">No active user friction or usability issues are cataloged.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Defect</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="divide-y divide-border">
            {dbFeedback.map(fbk => (
              <div 
                key={fbk.id} 
                onClick={() => setSelectedFeedback(fbk)}
                className="p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group"
              >
                {/* ID & Source */}
                <div className="flex items-center gap-3 sm:w-44 shrink-0">
                  <div className="font-mono text-xs font-bold text-foreground">{fbk.feedback_id}</div>
                  <div className="text-[10px] text-muted-foreground border-l border-border pl-2 font-medium truncate max-w-[100px]">{fbk.source}</div>
                </div>

                {/* Title & Status */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">{fbk.title}</h4>
                  <div className="flex items-center gap-2 text-[10px]">
                    <Badge className={cn("px-1.5 py-0 border-none font-bold", getStatusBadge(fbk.status))}>
                      {fbk.status}
                    </Badge>
                  </div>
                </div>

                {/* Severity & Actions */}
                <div className="flex items-center gap-4 shrink-0 sm:w-44 justify-end">
                  <Badge className={cn("text-[9px] px-2 py-0.5 border-none font-bold", getSeverityStyles(fbk.severity))}>
                    {fbk.severity} Severity
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditForm(fbk, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                    <button onClick={(e) => handleDelete(fbk.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
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
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedFeedback.feedback_id}</Badge>
                <Badge className={cn("px-2 font-bold", getStatusBadge(selectedFeedback.status))}>
                  {selectedFeedback.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedFeedback, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedFeedback.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedFeedback(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedFeedback.title}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Reported Vector Source</span>
                    <span className="text-sm font-bold text-foreground">{selectedFeedback.source}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Defect Severity</span>
                    <span className={cn("text-sm font-bold", selectedFeedback.severity === 'Critical' || selectedFeedback.severity === 'High' ? "text-red-600" : "text-blue-600")}>
                      {selectedFeedback.severity}
                    </span>
                  </div>
                </div>
              </div>

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                  <MessageSquare size={14} /> Usability Issue / Friction Node Context
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedFeedback.description}
                </div>
              </section>

              {selectedFeedback.proposed_fix && (
                <section className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 relative shadow-sm">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-2">
                    <AlertTriangle size={14} /> Proposed UX Remediation
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedFeedback.proposed_fix}
                  </div>
                </section>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedFeedback.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedFeedback(null)}>Close</Btn>
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
                <MessageSquare size={18} className="text-blue-500" /> {isEditMode ? "Edit Usability Item" : "Log Usability Feedback"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load UX Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">UX ID</label>
                    <input 
                      required 
                      value={formData.feedback_id} onChange={e => setFormData({...formData, feedback_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Feedback / Issue Summary</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Confusing Report Filter Dropdown Labels" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Feedback Source</label>
                    <select 
                      value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>QA Tester</option>
                      <option>Beta User</option>
                      <option>Stakeholder</option>
                      <option>Internal Product Team</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Severity</label>
                    <select 
                      value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                    >
                      <option>Open</option>
                      <option>Investigating</option>
                      <option>Resolved</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Issue Description & Usability Breakdown</label>
                  <textarea 
                    required rows={4}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                    placeholder="Describe the context, user friction, and system state when the problem occurred..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Proposed Fix / Design Recommendation</label>
                  <textarea 
                    rows={3}
                    value={formData.proposed_fix} onChange={e => setFormData({...formData, proposed_fix: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                    placeholder="Provide recommendations for fixing the UI flaw or introducing layout enhancements..." 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Log Feedback Entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}