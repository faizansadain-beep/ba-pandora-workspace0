import { useState, useEffect } from "react";
import { Plus, Download, CheckCircle2, Clock, XCircle, AlertCircle, Edit, Trash2, X, Wand2, Scale, FileSignature, UserCheck, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function DecisionLogView({ activeProject }: { activeProject: string }) {
  const [dbDecisions, setDbDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    context: "",
    decision: "",
    alternatives_considered: "",
    approved_by: "",
    status: "Proposed"
  });

  async function fetchDecisions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('decision_log')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching decisions:", error);
    else if (data) setDbDecisions(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchDecisions();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `DEC-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      context: formData.context,
      decision: formData.decision,
      alternatives_considered: formData.alternatives_considered,
      approved_by: formData.approved_by,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('decision_log').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('decision_log').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving decision:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchDecisions();
      if (isEditMode && selectedDecision) setSelectedDecision(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this decision from the log?")) return;
    setDbDecisions(dbDecisions.filter(d => d.id !== id));
    setSelectedDecision(null);
    const { error } = await supabase.from('decision_log').delete().eq('id', id);
    if (error) fetchDecisions();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbDecisions.map(dec => ({
      "Decision ID": dec.id,
      "Title / Focus": dec.title,
      "Lifecycle Status": dec.status,
      "Responsible Party": dec.approved_by || "Unassigned",
      "Background Context": dec.context || "",
      "Resolution Outcome Choice": dec.decision || "",
      "Alternatives Evaluated": dec.alternatives_considered || "",
      "Logged Date": dec.created_at ? new Date(dec.created_at).toLocaleDateString() : ""
    }));

    const columnWidths = [
      { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 20 },
      { wch: 45 }, { wch: 45 }, { wch: 45 }, { wch: 15 }
    ];

    exportToExcel(formattedRows, "Project Architecture Decision Log", `Decision_Registry_Log_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbDecisions.map(dec => ({
      id: dec.id,
      title: dec.title,
      details: [
        { label: "Governance Status", value: dec.status, isMeta: true },
        { label: "Responsible Party", value: dec.approved_by || "Unassigned", isMeta: true },
        { label: "Background Driving Context", value: dec.context || "No context specified." },
        { label: "The Decision Outcome", value: dec.decision || "No final resolution declared.", color: "2E86C1" },
        { label: "Alternatives Considered & Rejected", value: dec.alternatives_considered || "No historical alternatives logged." }
      ]
    }));

    exportToWordBrief("Project Architectural & Governance Decision Log Brief", activeProject, structuredItems, `Decision_Log_Executive_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      context: "Why are we making this decision? What is the business driver or constraint?",
      decision: "We have decided to...",
      alternatives_considered: "1. [Alternative A] - Rejected because [Reason].\n2. [Alternative B] - Rejected because [Reason]."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", context: "", decision: "", alternatives_considered: "", approved_by: "", status: "Proposed" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      context: item.context || "",
      decision: item.decision || "",
      alternatives_considered: item.alternatives_considered || "",
      approved_by: item.approved_by || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedDecision(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Approved": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Approved By" };
      case "Rejected": return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Rejected By" };
      case "Deferred": return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock, label: "Deferred By" };
      default: return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle, label: "Proposed By" };
    }
  };

  const approvedCount = dbDecisions.filter(d => d.status === "Approved").length;
  const proposedCount = dbDecisions.filter(d => d.status === "Proposed").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Decision Log"
        sub={`Record project decisions, rationales, and approvals for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><Download size={13} /> Word Brief</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Decision
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Proposed / Pending</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{proposedCount}</div>
          </div>
          <AlertCircle className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved Decisions</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Logged</div>
            <div className="text-2xl font-bold">{dbDecisions.length}</div>
          </div>
          <BookOpen className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading decision log...</div>
      ) : dbDecisions.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Scale size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Decisions Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Record architectural, scope, and process decisions to maintain a historical record.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Decision</Btn>
        </Card>
      ) : (
        <div className="space-y-4">
          {dbDecisions.map(dec => {
            const visuals = getStatusVisuals(dec.status);
            const StatusIcon = visuals.icon;

            return (
              <div 
                key={dec.id} 
                onClick={() => setSelectedDecision(dec)}
                className="bg-card border border-border p-5 rounded-xl hover:shadow-md transition-shadow cursor-pointer flex flex-col md:flex-row gap-5 border-l-4"
                style={{ borderLeftColor: dec.status === 'Approved' ? '#10B981' : dec.status === 'Proposed' ? '#3B82F6' : dec.status === 'Rejected' ? '#EF4444' : '#94A3B8' }}
              >
                {/* Meta & Title */}
                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{dec.id}</Badge>
                      <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                        <StatusIcon size={10} /> {dec.status}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1.5 leading-tight">{dec.title}</h3>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-4">
                    Logged: {new Date(dec.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* The Decision & Reactive Stakeholder Attribution */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">The Decision</div>
                    <div className="text-xs text-foreground line-clamp-3 font-medium leading-relaxed">{dec.decision || "Pending description..."}</div>
                  </div>
                  
                  {/* Updated Footer String to dynamically change context based on actual lifecycle values */}
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileSignature size={12} className="text-primary" /> 
                    <span>{visuals.label}: <span className="text-foreground font-semibold">{dec.approved_by || "Pending Assignment"}</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedDecision.id}</Badge>
                <Badge className={cn("gap-1", getStatusVisuals(selectedDecision.status).color)}>
                  {selectedDecision.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedDecision, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedDecision.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedDecision(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedDecision.title}</h2>
                <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between max-w-sm">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={14}/> {getStatusVisuals(selectedDecision.status).label}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedDecision.approved_by || <span className="italic opacity-50 text-xs">Unassigned</span>}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/30 p-5 rounded-lg border border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-muted-foreground">
                    <BookOpen size={14} /> Background Context
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedDecision.context || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-blue-700 dark:text-blue-400">
                    <CheckCircle2 size={14} /> The Decision
                  </h3>
                  <div className="text-sm font-bold text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedDecision.decision || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-muted-foreground">
                    <Scale size={14} /> Alternatives Considered & Rejected
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedDecision.alternatives_considered || <span className="text-muted-foreground italic">No alternatives documented.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedDecision.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedDecision(null)}>Close</Btn>
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
                <Scale size={18} className="text-blue-500" /> {isEditMode ? "Edit Decision" : "Log New Decision"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load BA Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Decision Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" 
                  placeholder="e.g. Use SAML for Legacy AD Integration" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none"
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Deferred">Deferred</option>
                  </select>
                </div>
                <div>
                  {/* Dynamic Form Text Box Labeling Interface */}
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {getStatusVisuals(formData.status).label}
                  </label>
                  <input 
                    value={formData.approved_by} onChange={e => setFormData({...formData, approved_by: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" 
                    placeholder={formData.status === "Approved" ? "e.g. Steering Committee, Sponsor" : "e.g. Rejecting/Deferring Entity"} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Background / Context</label>
                <textarea 
                  required rows={3}
                  value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" 
                  placeholder="Why are we making this decision?" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">The Decision Made</label>
                <textarea 
                  required rows={3}
                  value={formData.decision} onChange={e => setFormData({...formData, decision: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-md focus:outline-none font-medium" 
                  placeholder="What is the final choice?" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Alternatives Considered & Rejected</label>
                <textarea 
                  rows={3}
                  value={formData.alternatives_considered} onChange={e => setFormData({...formData, alternatives_considered: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" 
                  placeholder="What else did we look at, and why didn't we choose it?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Decision")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}