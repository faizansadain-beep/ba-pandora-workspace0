import { useState, useEffect } from "react";
import { Plus, Download, FileSignature, CheckCircle2, XCircle, AlertCircle, Clock, UserCheck, Edit, Trash2, X, Wand2, Link2, MessageSquare } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ApprovalsView({ activeProject }: { activeProject: string }) {
  const [dbApprovals, setDbApprovals] = useState<any[]>([]);
  const [dbHistory, setDbHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    approval_id: "",
    title: "",
    artifact_reference: "",
    approver_name: "",
    approver_role: "",
    status: "Pending",
    comments: ""
  });

  async function fetchApprovals() {
    setLoading(true);
    try {
      const [appRes, historyRes] = await Promise.all([
        supabase.from('approvals').select('*').eq('project_name', activeProject).order('approval_id', { ascending: true }),
        supabase.from('version_history').select('id, document_name, version_number').eq('project_name', activeProject).order('created_at', { ascending: false })
      ]);

      if (appRes.data) setDbApprovals(appRes.data);
      if (historyRes.data) setDbHistory(historyRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchApprovals();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `APP-${Math.floor(Math.random() * 90000)}`,
      approval_id: formData.approval_id,
      title: formData.title,
      artifact_reference: formData.artifact_reference,
      approver_name: formData.approver_name,
      approver_role: formData.approver_role,
      status: formData.status,
      comments: formData.comments,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('approvals').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('approvals').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving approval:", error);
      alert("Failed to save approval record!");
    } else {
      closeForm();
      fetchApprovals();
      if (isEditMode && selectedApproval) setSelectedApproval(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this approval record?")) return;
    setDbApprovals(dbApprovals.filter(a => a.id !== id));
    setSelectedApproval(null);
    const { error } = await supabase.from('approvals').delete().eq('id', id);
    if (error) fetchApprovals();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      comments: "Approval is contingent upon the following conditions being met before production deployment:\n1. \n2. "
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbApprovals.length + 101;
    setFormData({ id: "", approval_id: `APP-${nextNum}`, title: "", artifact_reference: "", approver_name: "", approver_role: "", status: "Pending", comments: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      approval_id: item.approval_id,
      title: item.title,
      artifact_reference: item.artifact_reference || "",
      approver_name: item.approver_name,
      approver_role: item.approver_role || "",
      status: item.status,
      comments: item.comments || ""
    });
    setIsFormOpen(true);
    setSelectedApproval(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Approved": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "Conditional": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle, border: "#F59E0B" };
      case "Rejected": return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, border: "#EF4444" };
      default: return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock, border: "#3B82F6" }; // Pending
    }
  };

  const pendingCount = dbApprovals.filter(a => a.status === "Pending").length;
  const approvedCount = dbApprovals.filter(a => a.status === "Approved").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Stakeholder Approvals"
        sub={`Sign-offs, baseline agreements, and conditional constraints for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Ledger</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Request Sign-off
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Pending Sign-offs</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{pendingCount}</div>
          </div>
          <Clock className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Fully Approved</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Requests Logged</div>
            <div className="text-2xl font-bold">{dbApprovals.length}</div>
          </div>
          <FileSignature className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading approval ledger...</div>
      ) : dbApprovals.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <FileSignature size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Sign-offs Requested</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Track formal approvals for your baselined documents and phases.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create Approval Request</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbApprovals.map(app => {
            const visuals = getStatusVisuals(app.status);

            return (
              <div 
                key={app.id} 
                onClick={() => setSelectedApproval(app)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{app.approval_id}</Badge>
                  <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                    {(() => {
                      const Icon = visuals.icon;
                      return <Icon size={10} />;
                    })()} 
                    {app.status}
                  </Badge>
                </div>
                
                <h3 className="text-sm font-bold text-foreground leading-tight mb-3">{app.title}</h3>
                
                <div className="flex flex-col gap-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <UserCheck size={14} className="text-muted-foreground shrink-0" />
                    <span className="font-semibold text-foreground">{app.approver_name}</span>
                    <span className="text-muted-foreground truncate border-l border-border pl-2">{app.approver_role}</span>
                  </div>
                  {app.artifact_reference && (
                    <div className="flex items-center gap-2 text-xs">
                      <Link2 size={14} className="text-primary shrink-0" />
                      <span className="text-primary font-medium truncate">{app.artifact_reference}</span>
                    </div>
                  )}
                </div>
                
                {app.comments && (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-2 italic mb-3">
                    "{app.comments}"
                  </div>
                )}
                
                <div className="mt-auto text-[9px] text-muted-foreground pt-3 border-t border-border flex justify-between">
                  <span>Logged: {new Date(app.created_at).toLocaleDateString()}</span>
                  <span className="font-mono">{app.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedApproval.approval_id}</Badge>
                <Badge className={cn("gap-1", getStatusVisuals(selectedApproval.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedApproval.status).icon;
                    return <Icon size={12} />;
                  })()} 
                  {selectedApproval.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedApproval, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedApproval.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedApproval(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedApproval.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-4 rounded-lg flex items-start gap-3">
                    <UserCheck className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Authorizing Stakeholder</div>
                      <div className="text-sm font-bold text-foreground">{selectedApproval.approver_name}</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5">{selectedApproval.approver_role || "Role not specified"}</div>
                    </div>
                  </div>
                  
                  {selectedApproval.artifact_reference ? (
                    <div className="bg-card border border-border p-4 rounded-lg flex items-start gap-3">
                      <Link2 className="text-primary mt-0.5 shrink-0" size={18} />
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Linked Target Artifact</div>
                        <div className="text-sm font-medium text-foreground">{selectedApproval.artifact_reference}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/30 border border-dashed border-border p-4 rounded-lg flex items-center justify-center text-xs text-muted-foreground italic">
                      No artifact explicitly linked.
                    </div>
                  )}
                </div>
              </div>

              {selectedApproval.comments && (
                <section className={cn("p-5 rounded-lg border", selectedApproval.status === 'Conditional' || selectedApproval.status === 'Rejected' ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/50" : "bg-muted/10 border-border")}>
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-muted-foreground">
                    <MessageSquare size={14} /> Stakeholder Comments & Conditions
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedApproval.comments}
                  </div>
                </section>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedApproval.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedApproval(null)}>Close</Btn>
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
                <FileSignature size={18} className="text-blue-500" /> {isEditMode ? "Edit Approval Record" : "Log Stakeholder Approval"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Add Condition Block
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Record ID</label>
                  <input 
                    required 
                    value={formData.approval_id} onChange={e => setFormData({...formData, approval_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign-off Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Core BRD Baseline Sign-off" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Approver Name</label>
                  <input 
                    required 
                    value={formData.approver_name} onChange={e => setFormData({...formData, approver_name: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Jane Doe" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Approver Role / Title</label>
                  <input 
                    value={formData.approver_role} onChange={e => setFormData({...formData, approver_role: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Project Sponsor" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> Artifact / Target Document</label>
                  <input 
                    list="historyDocs"
                    value={formData.artifact_reference} onChange={e => setFormData({...formData, artifact_reference: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. BRD v1.0" 
                  />
                  <datalist id="historyDocs">
                    {dbHistory.map(h => <option key={h.id} value={`${h.document_name} v${h.version_number}`} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign-off Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Conditional</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Stakeholder Comments / Conditions</label>
                <textarea 
                  rows={4}
                  value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Note any reasons for rejection or conditions for approval here..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Lock Approval Entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}