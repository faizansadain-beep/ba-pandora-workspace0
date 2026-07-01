import { useState, useEffect } from "react";
import { Plus, Download, ThumbsUp, CheckCircle2, AlertTriangle, XCircle, User, Star, Edit, Trash2, X, Wand2, ShieldAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function UatView({ activeProject }: { activeProject: string }) {
  const [dbUat, setDbUat] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedUat, setSelectedUat] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    uat_id: "",
    title: "",
    feature_reference: "",
    tester_name: "",
    tester_role: "Business User",
    feedback_notes: "",
    status: "Pending"
  });

  async function fetchUatData() {
    setLoading(true);
    try {
      const [uatRes, featRes] = await Promise.all([
        supabase.from('testing_uat').select('*').eq('project_name', activeProject).order('uat_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (uatRes.data) setDbUat(uatRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUatData();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `UAT-${Math.floor(Math.random() * 90000)}`,
      uat_id: formData.uat_id,
      title: formData.title,
      feature_reference: formData.feature_reference,
      tester_name: formData.tester_name,
      tester_role: formData.tester_role,
      feedback_notes: formData.feedback_notes,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_uat').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_uat').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving UAT record:", error);
      alert(`Failed to save! Database error: ${error.message}`);
    } else {
      closeForm();
      fetchUatData();
      if (isEditMode && selectedUat) setSelectedUat(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this stakeholder UAT record entirely?")) return;
    setDbUat(dbUat.filter(u => u.id !== id));
    setSelectedUat(null);
    const { error } = await supabase.from('testing_uat').delete().eq('id', id);
    if (error) fetchUatData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      feedback_notes: "Business Workflow Evaluation:\n[Describe user experience walkthrough steps]\n\nObserved Anomalies/Gaps:\n- None / Mention any cosmetic mismatch\n\nFinal Recommendation:\n- Fit for business release approval orientation."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbUat.length + 101;
    setFormData({ id: "", uat_id: `UAT-${nextNum}`, title: "", feature_reference: "", tester_name: "", tester_role: "Business User", feedback_notes: "", status: "Pending" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedUat(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Accepted": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Accepted with Caveats": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Pending
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="User Acceptance Testing (UAT)"
        sub={`Track business stakeholder validation runs, operational feedback, and release gates for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Sign-offs</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log UAT Session
            </Btn>
          </>
        }
      />

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved & Baselined</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {dbUat.filter(u => u.status === 'Accepted').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Conditional Caveat Exceptions</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbUat.filter(u => u.status === 'Accepted with Caveats').length}
            </div>
          </div>
          <AlertTriangle className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Rejected Business Blocks</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbUat.filter(u => u.status === 'Rejected').length}
            </div>
          </div>
          <ShieldAlert className="text-red-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading acceptance logs...</div>
      ) : dbUat.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ThumbsUp size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Stakeholder Walkthroughs Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Baseline stakeholder execution sign-offs before launching core code arrays.</p>
          <Btn variant="secondary" onClick={openNewForm}>Record First UAT Sign-off</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbUat.map(uat => (
            <div 
              key={uat.id} 
              onClick={() => setSelectedUat(uat)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: uat.status === 'Accepted' ? '#10B981' : uat.status === 'Rejected' ? '#EF4444' : uat.status === 'Accepted with Caveats' ? '#F59E0B' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{uat.uat_id}</Badge>
                <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border-none", getStatusStyle(uat.status))}>{uat.status}</Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-2">{uat.title}</h3>
              
              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mb-3">
                <Star size={10} className="text-primary/60"/> Scope: {uat.feature_reference.split(' - ')[0]}
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-foreground bg-muted/40 border p-2 rounded-lg mb-3">
                <User size={13} className="text-muted-foreground" />
                <span>{uat.tester_name}</span>
                <span className="text-muted-foreground font-medium border-l border-border pl-2 truncate">{uat.tester_role}</span>
              </div>

              {uat.feedback_notes && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed bg-muted/10 p-2 rounded border border-border/40">
                  "{uat.feedback_notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* READ MODAL */}
      {selectedUat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedUat.uat_id}</Badge>
                <Badge className={cn("font-bold px-2 border-none", getStatusStyle(selectedUat.status))}>{selectedUat.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedUat, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedUat.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedUat(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Target Requirements Scope Reference</span>
                <h2 className="text-lg font-bold text-foreground leading-snug">{selectedUat.title}</h2>
                <div className="text-xs font-mono text-muted-foreground font-bold mt-1">{selectedUat.feature_reference}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/40 border p-3 rounded-lg">
                <div className="flex items-center gap-2 font-semibold text-foreground"><User size={14} className="text-muted-foreground"/> Signee Authority: {selectedUat.tester_name}</div>
                <div className="flex items-center gap-2 font-semibold text-foreground"><ThumbsUp size={14} className="text-muted-foreground"/> Domain Alignment: {selectedUat.tester_role}</div>
              </div>

              <section className="bg-muted/10 border p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">Acceptance Evaluation Feedback & Operational Notes</h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">{selectedUat.feedback_notes || "No log notes recorded."}</div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedUat(null)}>Close View</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ThumbsUp size={18} className="text-blue-500" /> Log Stakeholder UAT Sign-off</h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded"><Wand2 size={12} /> Load Matrix Block</button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">UAT Ref ID</label>
                    <input required value={formData.uat_id} onChange={e => setFormData({...formData, uat_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign-off Cycle Title</label>
                    <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" placeholder="e.g. Executive SAML Deployment Acceptance" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Feature Scope</label>
                    <select required value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none">
                      <option value="">-- Choose Target Feature Component Scope --</option>
                      {dbFeatures.map(f => <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Stakeholder Authority Name</label>
                    <input required value={formData.tester_name} onChange={e => setFormData({...formData, tester_name: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none" placeholder="e.g. Angela Martin" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Authority Persona / Role</label>
                    <select value={formData.tester_role} onChange={e => setFormData({...formData, tester_role: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none">
                      <option>Business User</option>
                      <option>Client Sponsor</option>
                      <option>Domain Expert</option>
                      <option>Product Owner</option>
                    </select>
                  </div>
                </div>

                <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">UAT Gate Status Decision</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold focus:outline-none">
                  <option value="Pending">🕒 Pending Walkthrough Audit</option>
                  <option value="Accepted">✓ Accepted (Full Release Ready)</option>
                  <option value="Accepted with Caveats">⚡ Accepted with Caveats (Minor Bugs)</option>
                  <option value="Rejected">⊘ Rejected (Deploy Blocked)</option>
                </select>
              </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Acceptance Evaluation Feedback & Verification Logs</label>
                  <textarea required rows={5} value={formData.feedback_notes} onChange={e => setFormData({...formData, feedback_notes: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed focus:outline-none" placeholder="Log details regarding business testing flows, observations, and any visual or logical exceptions raised..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Locking..." : "Lock Acceptance Sign-off"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
