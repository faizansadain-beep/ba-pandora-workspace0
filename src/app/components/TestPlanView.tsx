import { useState, useEffect } from "react";
import { Plus, Download, ClipboardList, Calendar, User, ShieldAlert, Edit, Trash2, X, Wand2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TestPlanView({ activeProject }: { activeProject: string }) {
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    plan_id: "",
    title: "",
    cycle_type: "Sprint QA",
    start_date: "",
    end_date: "",
    owner: "",
    regression_risk: "Medium",
    scope_summary: "",
    status: "Draft"
  });

  async function fetchPlans() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('testing_plans')
        .select('*')
        .eq('project_name', activeProject)
        .order('plan_id', { ascending: true });

      if (error) console.error("Error fetching test plans:", error);
      else if (data) setDbPlans(data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlans();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `PLN-${Math.floor(Math.random() * 90000)}`,
      plan_id: formData.plan_id,
      title: formData.title,
      cycle_type: formData.cycle_type,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      owner: formData.owner,
      regression_risk: formData.regression_risk,
      scope_summary: formData.scope_summary,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_plans').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_plans').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving plan:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchPlans();
      if (isEditMode && selectedPlan) setSelectedPlan(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this operational test plan?")) return;
    setDbPlans(dbPlans.filter(p => p.id !== id));
    setSelectedPlan(null);
    const { error } = await supabase.from('testing_plans').delete().eq('id', id);
    if (error) fetchPlans();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      scope_summary: "In-Scope Items:\n- Feature X validation path.\n- Integration vector Y boundaries.\n\nOut-of-Scope:\n- Performance/Load spike validations for this cycle."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbPlans.length + 101;
    const today = new Date().toISOString().split('T')[0];
    setFormData({ id: "", plan_id: `PLAN-${nextNum}`, title: "", cycle_type: "Sprint QA", start_date: today, end_date: today, owner: "", regression_risk: "Medium", scope_summary: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedPlan(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High": return "text-red-600 font-bold";
      case "Low": return "text-emerald-600 font-bold";
      default: return "text-amber-600 font-bold";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Completed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Execution Test Plans"
        sub={`Operational testing cycle boundaries, risk baselines, and logistical timelines for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Schedules</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Create Plan
            </Btn>
          </>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading plans...</div>
      ) : dbPlans.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ClipboardList size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Test Plans Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Draft your upcoming sprint QA or client UAT validation logs.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create Test Plan</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbPlans.map(plan => (
            <div 
              key={plan.id} 
              onClick={() => setSelectedPlan(plan)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: plan.status === 'Active' ? '#3B82F6' : plan.status === 'Completed' ? '#10B981' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{plan.plan_id}</Badge>
                <Badge className={cn("text-[10px] font-bold", getStatusBadge(plan.status))}>{plan.status}</Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-2">{plan.title}</h3>
              
              <div className="text-xs text-muted-foreground mb-4 font-semibold uppercase tracking-wider">
                Cycle: {plan.cycle_type}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded border border-border/50 mb-1">
                <div className="flex items-center gap-1.5 truncate"><User size={12} className="text-muted-foreground"/> Admin: {plan.owner}</div>
                <div className="flex items-center gap-1.5"><ShieldAlert size={12} className="text-muted-foreground"/> Risk: <span className={getRiskColor(plan.regression_risk)}>{plan.regression_risk}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedPlan.plan_id}</Badge>
                <Badge className={cn("font-bold", getStatusBadge(selectedPlan.status))}>{selectedPlan.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedPlan, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedPlan.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedPlan(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">{selectedPlan.title}</h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-card border border-border p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Execution Owner</span>
                    <span className="text-xs font-bold text-foreground">{selectedPlan.owner}</span>
                  </div>
                  <div className="bg-card border border-border p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Timeline Window</span>
                    <span className="text-xs font-bold text-foreground flex items-center justify-center gap-1"><Calendar size={12}/> {selectedPlan.start_date || 'TBD'}</span>
                  </div>
                  <div className="bg-card border border-border p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Regression Risk</span>
                    <span className={cn("text-xs font-bold", getRiskColor(selectedPlan.regression_risk))}>{selectedPlan.regression_risk}</span>
                  </div>
                </div>
              </div>

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                  <ClipboardList size={14} /> Functional Plan Scope Bound
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedPlan.scope_summary}
                </div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedPlan(null)}>Close</Btn>
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
                <ClipboardList size={18} className="text-blue-500" /> {isEditMode ? "Edit Test Plan Cycle" : "Log Test Cycle Plan"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Scope Layout
                  </button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Plan ID</label>
                    <input required value={formData.plan_id} onChange={e => setFormData({...formData, plan_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cycle Name Title</label>
                    <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="e.g. Sprint 14 Core Functional Run" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cycle Tier</label>
                    <select value={formData.cycle_type} onChange={e => setFormData({...formData, cycle_type: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md">
                      <option>Sprint QA</option>
                      <option>UAT</option>
                      <option>Regression</option>
                      <option>Smoke Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">QA Lead / Owner</label>
                    <input required value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" placeholder="e.g. Jim Halpert" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Regression Risk</label>
                    <select value={formData.regression_risk} onChange={e => setFormData({...formData, regression_risk: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Execution Date</label>
                    <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target End Date</label>
                    <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lifecycle Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                    <option>Draft</option>
                    <option>Active</option>
                    <option>Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scope Boundaries & Parameters</label>
                  <textarea required rows={4} value={formData.scope_summary} onChange={e => setFormData({...formData, scope_summary: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed" placeholder="Clearly trace what targets are covered in this plan, and what items are excluded..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Lock Cycle Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}