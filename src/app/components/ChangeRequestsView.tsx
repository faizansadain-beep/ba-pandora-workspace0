import { useState, useEffect } from "react";
import { Plus, Download, GitPullRequest, ArrowRight, ArrowLeft, AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Search, Layers, User, CalendarClock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ChangeRequestsView({ activeProject }: { activeProject: string }) {
  const [dbCRs, setDbCRs] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    cr_id: "",
    title: "",
    description: "",
    business_justification: "",
    impact_level: "Medium",
    impacted_feature: "",
    requested_by: "", // <-- NEW: Audit Trail
    status: "Logged"
  });

  async function fetchChangeWorkspace() {
    setLoading(true);
    try {
      const [crRes, featRes] = await Promise.all([
        supabase.from('delivery_change_requests').select('*').eq('project_name', activeProject).order('created_at', { ascending: false }),
        supabase.from('product_features').select('feature_id, title').eq('project_name', activeProject)
      ]);

      if (crRes.data) setDbCRs(crRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
    } catch (err) {
      console.error("CR fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchChangeWorkspace();
  }, [activeProject]);

  // --- Dynamic Pipeline Mover ---
  const COLUMNS = ["Logged", "Analyzing Impact", "Pending CAB", "Approved", "Rejected"];

  async function moveCR(crId: string, currentStatus: string, direction: 'forward' | 'backward' | 'reject') {
    let newStatus = currentStatus;
    
    if (direction === 'reject') {
      newStatus = "Rejected";
    } else {
      const currentIndex = COLUMNS.indexOf(currentStatus);
      const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < COLUMNS.length - 1) {
        newStatus = COLUMNS[nextIndex];
      }
    }

    setDbCRs(prev => prev.map(cr => cr.id === crId ? { ...cr, status: newStatus } : cr));
    const { error } = await supabase.from('delivery_change_requests').update({ status: newStatus }).eq('id', crId);
    if (error) fetchChangeWorkspace();
  }

  async function handleCreateCR(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: `CR-${Math.floor(Math.random() * 90000)}`,
      cr_id: formData.cr_id,
      title: formData.title,
      description: formData.description,
      business_justification: formData.business_justification,
      impact_level: formData.impact_level,
      impacted_feature: formData.impacted_feature,
      requested_by: formData.requested_by, // <-- NEW: Audit Trail
      status: "Logged",
      project_name: activeProject
    };

    const { error } = await supabase.from('delivery_change_requests').insert([payload]);

    if (error) alert(`Error saving CR: ${error.message}`);
    else {
      setIsFormOpen(false);
      fetchChangeWorkspace();
    }
    setIsSubmitting(false);
  }

  function openNewForm() {
    const nextNum = dbCRs.length + 101;
    setFormData({ cr_id: `CR-${nextNum}`, title: "", description: "", business_justification: "", impact_level: "Medium", impacted_feature: "", requested_by: "", status: "Logged" });
    setIsFormOpen(true);
  }

  const getImpactColor = (level: string) => {
    switch(level) {
      case 'High': return "text-red-600 bg-red-100";
      case 'Medium': return "text-amber-600 bg-amber-100";
      case 'Low': return "text-emerald-600 bg-emerald-100";
      default: return "text-slate-600 bg-slate-100";
    }
  };

  const activeColumns = [
    { id: "Logged", label: "New CR Logged", color: "border-slate-200 bg-slate-50/50 dark:bg-slate-900/20" },
    { id: "Analyzing Impact", label: "Impact Analysis", color: "border-blue-200 bg-blue-50/30 dark:bg-blue-900/10" },
    { id: "Pending CAB", label: "CAB Approval", color: "border-amber-200 bg-amber-50/30 dark:bg-amber-900/10" },
    { id: "Approved", label: "Approved (Queued)", color: "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10" }
  ];

  const rejectedCRs = dbCRs.filter(cr => cr.status === "Rejected");

  // Format the Database Timestamp securely
  const formatDate = (isoString: string) => {
    if (!isoString) return "Just now";
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <SectionHeader
        title="Change Advisory Board (CAB) Pipeline"
        sub={`Assess change impact, audit stakeholder requests, and push scopes through the approval gates for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={openNewForm}>
            <Plus size={13} /> Raise New Change
          </Btn>
        }
      />

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Loading CAB pipeline...</div>
      ) : dbCRs.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed">
          <GitPullRequest size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Change Requests Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Scope is currently perfectly aligned with the baseline.</p>
          <Btn variant="secondary" onClick={openNewForm}>Raise First CR</Btn>
        </Card>
      ) : (
        <>
          {/* KANBAN PIPELINE */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0 overflow-x-auto pb-4">
            {activeColumns.map(col => {
              const colCRs = dbCRs.filter(cr => cr.status === col.id);
              return (
                <div key={col.id} className={cn("flex flex-col rounded-xl border border-border bg-muted/10 h-full max-h-full overflow-hidden", col.color)}>
                  <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{col.label}</h3>
                    <Badge className="bg-background border-border text-foreground text-[10px] px-1.5 font-mono">{colCRs.length}</Badge>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                    {colCRs.length === 0 ? (
                      <div className="text-center p-4 text-[11px] font-medium text-muted-foreground italic opacity-50">Empty</div>
                    ) : (
                      colCRs.map(cr => (
                        <div key={cr.id} className="bg-card border border-border/80 p-3 rounded-lg shadow-sm group flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-2">
                            <Badge className="bg-primary/10 text-primary text-[9px] font-mono border-none px-1.5 py-0 shrink-0">{cr.cr_id}</Badge>
                            <Badge className={cn("text-[9px] font-bold border-none px-1.5 py-0 shrink-0", getImpactColor(cr.impact_level))}>{cr.impact_level} Impact</Badge>
                          </div>
                          
                          <h4 className="text-xs font-bold text-foreground leading-snug">{cr.title}</h4>
                          
                          {/* Audit Meta Data */}
                          <div className="flex flex-col gap-1 mt-1 border-t border-border/40 pt-2">
                            {cr.impacted_feature && (
                              <div className="text-[9px] text-muted-foreground font-mono bg-muted/50 p-1 rounded truncate flex items-center gap-1">
                                <Layers size={10}/> {cr.impacted_feature}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1" title="Requestor">
                                <User size={10}/> {cr.requested_by || "Unknown"}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1" title="Date Logged">
                                <CalendarClock size={10}/> {formatDate(cr.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Pipeline Controls */}
                          <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => moveCR(cr.id, col.id, 'backward')}
                                disabled={col.id === "Logged"}
                                className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded disabled:opacity-20 transition-colors"
                              >
                                <ArrowLeft size={13} />
                              </button>
                              <button 
                                onClick={() => moveCR(cr.id, col.id, 'forward')}
                                disabled={col.id === "Approved"}
                                className="p-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-20 transition-colors"
                              >
                                <ArrowRight size={13} />
                              </button>
                            </div>
                            
                            {col.id !== "Approved" && (
                              <button 
                                onClick={() => moveCR(cr.id, col.id, 'reject')}
                                className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                              >
                                <XCircle size={12}/> Reject
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* REJECTED TRAY */}
          {rejectedCRs.length > 0 && (
            <div className="shrink-0 bg-red-50/20 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 p-3 rounded-xl flex items-center gap-4 overflow-x-auto">
              <span className="text-xs font-bold uppercase text-red-700 dark:text-red-400 shrink-0 flex items-center gap-1.5 pl-2"><XCircle size={14}/> Rejected Scopes</span>
              <div className="w-px h-6 bg-red-200 dark:bg-red-900/50 shrink-0"/>
              {rejectedCRs.map(cr => (
                <Badge key={cr.id} className="bg-background border-red-200 text-red-700 shrink-0 text-[10px]">
                  <span className="font-mono mr-1 opacity-60">{cr.cr_id}</span> {cr.title}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-xl border border-border p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
              <h3 className="font-bold text-foreground flex items-center gap-2"><GitPullRequest size={16} className="text-blue-500" /> Raise Change Request</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateCR} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">CR ID</label>
                  <input required value={formData.cr_id} onChange={e => setFormData({...formData, cr_id: e.target.value})} className="w-full bg-muted border p-2 text-xs font-mono rounded focus:outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Change Scope Title</label>
                  <input required autoFocus placeholder="e.g. Add biometric lock to mobile flow" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border p-3 rounded-xl bg-muted/20">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><User size={12}/> Requested By</label>
                  <input required placeholder="Stakeholder Name or Role..." value={formData.requested_by} onChange={e => setFormData({...formData, requested_by: e.target.value})} className="w-full bg-background border p-2 text-sm rounded focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><ShieldAlert size={12}/> Assessed Impact</label>
                  <select value={formData.impact_level} onChange={e => setFormData({...formData, impact_level: e.target.value})} className="w-full bg-background border p-2 text-sm rounded font-bold">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Layers size={12}/> Impacted Feature Link</label>
                <select value={formData.impacted_feature} onChange={e => setFormData({...formData, impacted_feature: e.target.value})} className="w-full bg-background border p-2 text-xs rounded">
                  <option value="">-- General Change (Unlinked) --</option>
                  {dbFeatures.map(f => (
                    <option key={f.feature_id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Functional Change Description</label>
                <textarea required rows={3} placeholder="Describe exactly what requires modification from the baselined scope..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border p-2 text-sm rounded leading-relaxed focus:outline-none" />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-primary uppercase mb-1">Business Justification & ROI</label>
                <textarea required rows={2} placeholder="Why are we absorbing this scope change now? (e.g. Compliance mandate, critical UX flaw)" value={formData.business_justification} onChange={e => setFormData({...formData, business_justification: e.target.value})} className="w-full bg-blue-50/20 border border-blue-100 p-2 text-sm rounded leading-relaxed focus:outline-none" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
                <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Inject into Pipeline</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}