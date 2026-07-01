import { useState, useEffect } from "react";
import { Plus, Download, Radio, ShieldCheck, AlertOctagon, Info, Edit, Trash2, X, Wand2, Milestone, ShieldAlert, UserCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function GoNoGoView({ activeProject }: { activeProject: string }) {
  const [dbVotes, setDbVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedVote, setSelectedVote] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    decision_id: "",
    release_version: "",
    qa_status: "Passed",
    uat_signoff_status: "Approved",
    open_blocker_count: 0,
    decision_vote: "Go",
    voted_by: "",
    justification: ""
  });

  async function fetchVotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('testing_gonogo')
        .select('*')
        .eq('project_name', activeProject)
        .order('decision_id', { ascending: true });

      if (error) console.error("Error fetching release ledger:", error);
      else if (data) setDbVotes(data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchVotes();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `GNG-${Math.floor(Math.random() * 90000)}`,
      decision_id: formData.decision_id,
      release_version: formData.release_version,
      qa_status: formData.qa_status,
      uat_signoff_status: formData.uat_signoff_status,
      open_blocker_count: Number(formData.open_blocker_count),
      decision_vote: formData.decision_vote,
      voted_by: formData.voted_by,
      justification: formData.justification,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_gonogo').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_gonogo').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving sign-off decision:", error);
      alert(`Failed to save! Database error: ${error.message}`);
    } else {
      closeForm();
      fetchVotes();
      if (isEditMode && selectedVote) setSelectedVote(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this release readiness ballot?")) return;
    setDbVotes(dbVotes.filter(v => v.id !== id));
    setSelectedVote(null);
    const { error } = await supabase.from('testing_gonogo').delete().eq('id', id);
    if (error) fetchVotes();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      justification: "QA Verification: 100% test scenario regression runs complete.\nUAT Standing: Formally baselined and signed off by client proxy.\nRisk Profile: Operational support paths verified. Low migration volatility risk."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbVotes.length + 101;
    setFormData({ id: "", decision_id: `GNG-${nextNum}`, release_version: "", qa_status: "Passed", uat_signoff_status: "Approved", open_blocker_count: 0, decision_vote: "Go", voted_by: "", justification: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedVote(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getVoteBadge = (vote: string) => {
    switch (vote) {
      case "Go": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "No-Go": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200"; // Conditional Go
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Go / No-Go Sign-off Board"
        sub={`Final release readiness assessments, deployment authority voting, and delivery gates for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Ledger</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Cast Readiness Ballot
            </Btn>
          </>
        }
      />

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved Releasable Verticals</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {dbVotes.filter(v => v.decision_vote === 'Go').length}
            </div>
          </div>
          <ShieldCheck className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Active Deployment Halts</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbVotes.filter(v => v.decision_vote === 'No-Go').length}
            </div>
          </div>
          <AlertOctagon className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Audited Releases</div>
            <div className="text-2xl font-bold">{dbVotes.length}</div>
          </div>
          <Radio className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading release gates board...</div>
      ) : dbVotes.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Radio size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Readiness Board Clear</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Baseline formal production gate evaluations prior to staging deployment code execution plans.</p>
          <Btn variant="secondary" onClick={openNewForm}>Cast First Release Ballot</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbVotes.map(vote => (
            <div 
              key={vote.id} 
              onClick={() => setSelectedVote(vote)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
              style={{ borderLeftColor: vote.decision_vote === 'Go' ? '#10B981' : vote.decision_vote === 'No-Go' ? '#EF4444' : '#F59E0B' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{vote.decision_id}</Badge>
                <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border-none", getVoteBadge(vote.decision_vote))}>
                  Decision: {vote.decision_vote}
                </Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-1 truncate">{vote.release_version}</h3>
              
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-3 pt-1">
                <UserCheck size={13} className="text-primary shrink-0" />
                <span>Authority: {vote.voted_by}</span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-muted/30 border p-2 rounded-md mb-3 font-semibold text-muted-foreground">
                <div>QA: <span className={vote.qa_status === 'Passed' ? 'text-emerald-600' : 'text-red-500'}>{vote.qa_status}</span></div>
                <div>UAT: <span className={vote.uat_signoff_status === 'Approved' ? 'text-emerald-600' : 'text-amber-600'}>{vote.uat_signoff_status}</span></div>
                <div>Blockers: <span className={vote.open_blocker_count === 0 ? 'text-emerald-600' : 'text-red-500'}>{vote.open_blocker_count}</span></div>
              </div>

              {vote.justification && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed mt-auto border-t border-border/50 pt-2.5">
                  "{vote.justification}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* READ MODAL */}
      {selectedVote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedVote.decision_id}</Badge>
                <Badge className={cn("font-bold px-2.5 border-none", getVoteBadge(selectedVote.decision_vote))}>Readiness Verdict: {selectedVote.decision_vote}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedVote, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedVote.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedVote(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Deployment Baseline Target</span>
                <h2 className="text-lg font-bold text-foreground">{selectedVote.release_version}</h2>
                <div className="text-xs text-muted-foreground font-semibold mt-0.5">Casted By Authority Signee: {selectedVote.voted_by}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs border bg-muted/10 p-3 rounded-xl font-bold">
                <div className="p-2 bg-background border rounded-lg shadow-sm">
                  <span className="text-[9px] uppercase block text-muted-foreground font-semibold mb-0.5">QA Audit Quality</span>
                  <span className={selectedVote.qa_status === 'Passed' ? 'text-emerald-600' : 'text-red-500'}>{selectedVote.qa_status}</span>
                </div>
                <div className="p-2 bg-background border rounded-lg shadow-sm">
                  <span className="text-[9px] uppercase block text-muted-foreground font-semibold mb-0.5">UAT Gate Scope</span>
                  <span className={selectedVote.uat_signoff_status === 'Approved' ? 'text-emerald-600' : 'text-amber-600'}>{selectedVote.uat_signoff_status}</span>
                </div>
                <div className="p-2 bg-background border rounded-lg shadow-sm">
                  <span className="text-[9px] uppercase block text-muted-foreground font-semibold mb-0.5">Open Defect Count</span>
                  <span className={selectedVote.open_blocker_count === 0 ? 'text-emerald-600' : 'text-red-500'}>{selectedVote.open_blocker_count} Active</span>
                </div>
              </div>

              <section className="bg-muted/10 p-4 border rounded-lg shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Info size={14}/> Risk Analysis & Justification</h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">{selectedVote.justification}</div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedVote(null)}>Close Gate</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Radio size={18} className="text-blue-500" /> Log Readiness Assessment</h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded"><Wand2 size={12} /> Load Audit Block</button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ballot ID</label>
                    <input required value={formData.decision_id} onChange={e => setFormData({...formData, decision_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Release Version / Build tag</label>
                    <input required autoFocus value={formData.release_version} onChange={e => setFormData({...formData, release_version: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" placeholder="e.g. v3.0-Production Rollout" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">QA Status</label>
                    <select value={formData.qa_status} onChange={e => setFormData({...formData, qa_status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none">
                      <option>Passed</option>
                      <option>Concerns</option>
                      <option>Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">UAT Gate Status</label>
                    <select value={formData.uat_signoff_status} onChange={e => setFormData({...formData, uat_signoff_status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none">
                      <option>Approved</option>
                      <option>Pending</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Active Blocker count</label>
                    <input type="number" required value={formData.open_blocker_count} onChange={e => setFormData({...formData, open_blocker_count: Number(e.target.value)})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 border rounded-xl bg-muted/20">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Authority Signee Voter Name</label>
                    <input required value={formData.voted_by} onChange={e => setFormData({...formData, voted_by: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none" placeholder="e.g. David Wallace (Sponsor)" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Final Release Verdict</label>
                    <select value={formData.decision_vote} onChange={e => setFormData({...formData, decision_vote: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold focus:outline-none">
                      <option value="Go">✓ Go (Release Instantly)</option>
                      <option value="No-Go">⊘ No-Go (Halt Release Run)</option>
                      <option value="Conditional Go">⚡ Conditional Go (Deploy with Caveats)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Justification, Risk Analysis & Closeout Notes</label>
                  <textarea required rows={5} value={formData.justification} onChange={e => setFormData({...formData, justification: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed focus:outline-none" placeholder="Provide the empirical breakdown, qualitative justifications, or tracking conditions mandated for this build environment target..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Locking Gate..." : "Lock Gate Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}