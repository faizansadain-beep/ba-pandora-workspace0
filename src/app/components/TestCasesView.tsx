import { useState, useEffect } from "react";
import { Plus, Download, Beaker, ShieldCheck, Clock, ArrowRight, Edit, Trash2, X, Wand2, Star, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TestCasesView({ activeProject }: { activeProject: string }) {
  const [dbTests, setDbTests] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    test_id: "",
    title: "",
    feature_reference: "",
    test_type: "Functional",
    pre_conditions: "",
    steps: "",
    expected_result: "",
    status: "Ready to Test"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [testRes, featRes] = await Promise.all([
        supabase.from('testing_cases').select('*').eq('project_name', activeProject).order('test_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (testRes.data) setDbTests(testRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- Dynamic Lifecycle Mover ---
  async function advanceStatus(item: any, e: React.MouseEvent) {
    e.stopPropagation();
    const statusOrder = ["Ready to Test", "In Progress", "Passed"];
    const nextIdx = (statusOrder.indexOf(item.status) + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIdx];

    setDbTests(dbTests.map(t => t.id === item.id ? { ...t, status: nextStatus } : t));
    await supabase.from('testing_cases').update({ status: nextStatus }).eq('id', item.id);
  }

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `TST-${Math.floor(Math.random() * 90000)}`,
      test_id: formData.test_id,
      title: formData.title,
      feature_reference: formData.feature_reference,
      test_type: formData.test_type,
      pre_conditions: formData.pre_conditions,
      steps: formData.steps,
      expected_result: formData.expected_result,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_cases').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_cases').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving test case:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedTest) setSelectedTest(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this test case from the matrix?")) return;
    setDbTests(dbTests.filter(t => t.id !== id));
    setSelectedTest(null);
    const { error } = await supabase.from('testing_cases').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      pre_conditions: "Verify that user session is active and role contains administrative execution permissions.",
      steps: "1. Navigate to target workspace portal.\n2. Click execution command.\n3. Verify payload response.",
      expected_result: "System returns success callback array; logs transaction context securely."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbTests.length + 101;
    setFormData({ id: "", test_id: `TC-${nextNum}`, title: "", feature_reference: "", test_type: "Functional", pre_conditions: "", steps: "", expected_result: "", status: "Ready to Test" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedTest(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusStyle = (status: string) => {
    switch(status) {
      case "Passed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Failed": return "bg-red-100 text-red-700 border-red-200";
      case "In Progress": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Functional Test Cases"
        sub={`Verify software requirements, system validations, and trace paths for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Run Suite</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Create Test Case
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Cases</div>
            <div className="text-2xl font-bold">{dbTests.length}</div>
          </div>
          <Beaker className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 font-medium mb-1">Passed Run</div>
            <div className="text-2xl font-bold text-emerald-700">{dbTests.filter(t => t.status === 'Passed').length}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 font-medium mb-1">Failed Blockers</div>
            <div className="text-2xl font-bold text-red-700">{dbTests.filter(t => t.status === 'Failed').length}</div>
          </div>
          <XCircleFallback className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 font-medium mb-1">In Progress Run</div>
            <div className="text-2xl font-bold text-amber-700">{dbTests.filter(t => t.status === 'In Progress').length}</div>
          </div>
          <Clock className="text-amber-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading test suite...</div>
      ) : dbTests.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Beaker size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Suite Is Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Start drafting explicit test conditions with expected outcomes.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Test Case</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="divide-y divide-border">
            {dbTests.map(test => (
              <div 
                key={test.id} 
                onClick={() => setSelectedTest(test)}
                className="p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:w-44 shrink-0">
                  <div className="p-2 rounded-md bg-muted text-muted-foreground"><Beaker size={16} /></div>
                  <div>
                    <div className="text-xs font-mono font-bold text-foreground">{test.test_id}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{test.test_type}</div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">{test.title}</h4>
                  {test.feature_reference && (
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1"><Star size={10} className="text-primary/60"/> {test.feature_reference.split(' - ')[0]}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:w-52 justify-end">
                  <Badge className={cn("text-[10px] font-bold px-2 py-0.5", getStatusStyle(test.status))}>{test.status}</Badge>
                  
                  <div className="flex items-center gap-1">
                    {test.status !== "Failed" && (
                      <button onClick={(e) => advanceStatus(test, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded bg-muted/40 hover:bg-muted" title="Cycle Status Step"><ChevronRight size={14}/></button>
                    )}
                    <button onClick={(e) => openEditForm(test, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                    <button onClick={(e) => handleDelete(test.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
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
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedTest.test_id}</Badge>
                <Badge className={cn("font-bold px-2", getStatusStyle(selectedTest.status))}>{selectedTest.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedTest, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedReview.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedTest(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Target Linked Component: {selectedTest.feature_reference || "Unassigned"}</span>
                <h2 className="text-xl font-bold text-foreground leading-snug">{selectedTest.title}</h2>
              </div>

              {selectedTest.pre_conditions && (
                <section className="bg-muted/20 border p-3.5 rounded-lg text-xs">
                  <div className="font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> Pre-Conditions Block</div>
                  <div className="text-foreground font-medium font-mono">{selectedTest.pre_conditions}</div>
                </section>
              )}

              <section className="bg-blue-50/20 border border-blue-200 p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-2 flex items-center gap-1"><ArrowRight size={14}/> Execution Steps Run</h3>
                <div className="text-sm font-medium text-foreground font-mono whitespace-pre-wrap leading-relaxed">{selectedTest.steps}</div>
              </section>

              <section className="bg-emerald-50/20 border border-emerald-200 p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-emerald-700 tracking-wider mb-2 flex items-center gap-1"><ShieldCheck size={14}/> Explicit Expected Outcome</h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">{selectedTest.expected_result}</div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedTest(null)}>Close Suite</Btn>
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
              <h2 className="text-lg font-semibold flex items-center gap-2"><Beaker size={18} className="text-blue-500" /> {isEditMode ? "Edit Test Verification Vector" : "Build Verification Vector"}</h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded"><Wand2 size={12} /> Load Frame Block</button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">TC Ref ID</label>
                    <input required value={formData.test_id} onChange={e => setFormData({...formData, test_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Test Objective Title</label>
                    <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="e.g. Verify SAML Assertion Signature Parsing" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Trace Component</label>
                    <select value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md">
                      <option value="">-- No Map Bound --</option>
                      {dbFeatures.map(f => <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vector Classification</label>
                    <select value={formData.test_type} onChange={e => setFormData({...formData, test_type: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md">
                      <option>Functional</option>
                      <option>Regression</option>
                      <option>Integration</option>
                      <option>Smoke</option>
                      <option>Security</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lifecycle Stage</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                      <option>Ready to Test</option>
                      <option>In Progress</option>
                      <option>Passed</option>
                      <option>Failed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pre-Conditions Setup</label>
                  <input value={formData.pre_conditions} onChange={e => setFormData({...formData, pre_conditions: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" placeholder="State system states, environments, or parameters required prior to run..." />
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1.5">Actionable Execution Steps</label>
                  <textarea required rows={4} value={formData.steps} onChange={e => setFormData({...formData, steps: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" placeholder="1. Enter query&#10;2. Click validation node...&#10;3. Inspect assertion array response..." />
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-700 mb-1.5">Explicit Expected Result Baseline</label>
                  <textarea required rows={3} value={formData.expected_result} onChange={e => setFormData({...formData, expected_result: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="Describe the precise qualitative or algorithmic success markers..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Locking Vector..." : "Lock Vector Suite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback image handling framework element
function XCircleFallback({ className, size }: { className?: string, size?: number }) {
  return <HelpCircle className={className} size={size} />;
}