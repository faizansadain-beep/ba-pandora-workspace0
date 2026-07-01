import { useState, useEffect } from "react";
import { Plus, Download, PlayCircle, CheckCircle2, XCircle, AlertCircle, Calendar, User, Edit, Trash2, X, Beaker } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TestExecutionView({ activeProject }: { activeProject: string }) {
  const [dbRuns, setDbRuns] = useState<any[]>([]);
  const [dbCases, setDbCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    run_id: "",
    test_case_reference: "",
    tester_name: "",
    actual_result: "",
    status: "Passed",
    environment: "Staging"
  });

  async function fetchExecutions() {
    setLoading(true);
    try {
      const [runRes, caseRes] = await Promise.all([
        supabase.from('testing_execution').select('*').eq('project_name', activeProject).order('executed_at', { ascending: false }),
        supabase.from('testing_cases').select('id, test_id, title').eq('project_name', activeProject).order('test_id', { ascending: true })
      ]);

      if (runRes.data) setDbRuns(runRes.data);
      if (caseRes.data) setDbCases(caseRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchExecutions();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `RUN-${Math.floor(Math.random() * 90000)}`,
      run_id: formData.run_id,
      test_case_reference: formData.test_case_reference,
      tester_name: formData.tester_name,
      actual_result: formData.actual_result,
      status: formData.status,
      environment: formData.environment,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_execution').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_execution').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving run log:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchExecutions();
      if (isEditMode && selectedRun) setSelectedRun(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this test execution log from records?")) return;
    setDbRuns(dbRuns.filter(r => r.id !== id));
    setSelectedRun(null);
    const { error } = await supabase.from('testing_execution').delete().eq('id', id);
    if (error) fetchExecutions();
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbRuns.length + 101;
    setFormData({ id: "", run_id: `RUN-${nextNum}`, test_case_reference: "", tester_name: "", actual_result: "", status: "Passed", environment: "Staging" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedRun(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Passed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Failed": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200"; // Blocked
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Test Execution Logs"
        sub={`Historical runs, environments staging validation records, and verification passes for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Run Log</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Execution Run
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Passed Runs</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbRuns.filter(r => r.status === 'Passed').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Failed Runs</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbRuns.filter(r => r.status === 'Failed').length}
            </div>
          </div>
          <XCircle className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Executed Passes</div>
            <div className="text-2xl font-bold">{dbRuns.length}</div>
          </div>
          <PlayCircle className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading logs...</div>
      ) : dbRuns.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <PlayCircle size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Run Logs Recorded</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Execute test case workflows and record validation results.</p>
          <Btn variant="secondary" onClick={openNewForm}>Record First Run</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="divide-y divide-border">
            {dbRuns.map(run => (
              <div 
                key={run.id} 
                onClick={() => setSelectedRun(run)}
                className="p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:w-40 shrink-0">
                  <PlayCircle className="text-primary/70" size={16} />
                  <div>
                    <div className="text-xs font-mono font-bold text-foreground">{run.run_id}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold">Env: {run.environment}</div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">{run.test_case_reference}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <User size={10} /> <span>Tester: {run.tester_name}</span>
                    {run.executed_at && (
                      <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(run.executed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:w-36 justify-end">
                  <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border-none", getStatusBadge(run.status))}>{run.status}</Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditForm(run, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                    <button onClick={(e) => handleDelete(run.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
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
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedRun.run_id}</Badge>
                <Badge className={cn("font-bold px-2", getStatusBadge(selectedRun.status))}>{selectedRun.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedRun, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedRun.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedRun(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Executed Vector Reference</span>
                <h2 className="text-lg font-bold text-foreground leading-snug">{selectedRun.test_case_reference}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 border p-3 rounded-lg">
                <div className="flex items-center gap-2 font-medium text-foreground"><User size={14} className="text-muted-foreground"/> Tester: {selectedRun.tester_name}</div>
                <div className="flex items-center gap-2 font-medium text-foreground"><Calendar size={14} className="text-muted-foreground"/> Date: {selectedRun.executed_at ? new Date(selectedRun.executed_at).toLocaleDateString() : 'TBD'}</div>
              </div>

              <section className={cn("p-4 rounded-lg border", selectedRun.status === 'Failed' ? "bg-red-50/20 border-red-200" : "bg-emerald-50/20 border-emerald-200")}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  {selectedRun.status === 'Failed' ? <AlertCircle size={14} className="text-red-600"/> : <CheckCircle2 size={14} className="text-emerald-600"/>}
                  Actual Execution Result
                </h3>
                <div className="text-sm font-mono font-medium text-foreground whitespace-pre-wrap leading-relaxed">{selectedRun.actual_result}</div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedRun(null)}>Close</Btn>
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
              <h2 className="text-lg font-semibold flex items-center gap-2"><PlayCircle size={18} className="text-blue-500" /> Log Execution Run</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Run ID</label>
                    <input required value={formData.run_id} onChange={e => setFormData({...formData, run_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tester Name</label>
                    <input required autoFocus value={formData.tester_name} onChange={e => setFormData({...formData, tester_name: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="e.g. Dwight Schrute" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Test Case</label>
                    <select required value={formData.test_case_reference} onChange={e => setFormData({...formData, test_case_reference: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md">
                      <option value="">-- Choose Base Test Case --</option>
                      {dbCases.map(c => <option key={c.id} value={`${c.test_id} - ${c.title}`}>{c.test_id} - {c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Environment</label>
                    <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md">
                      <option>Dev</option>
                      <option>QA</option>
                      <option>Staging</option>
                      <option>Production</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Execution Result Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Actual Result Logs / Observations</label>
                  <textarea required rows={4} value={formData.actual_result} onChange={e => setFormData({...formData, actual_result: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed font-mono" placeholder="Paste actual response payloads, system behaviors, or error stack logs here..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Logging..." : "Log Execution Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}