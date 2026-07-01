import { useState, useEffect } from "react";
import { Plus, Download, BarChart3, CheckCircle2, AlertTriangle, ShieldX, Milestone, Edit, Trash2, X, Star, ListTree, CheckSquare, Square } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TestCoverageView({ activeProject }: { activeProject: string }) {
  const [dbCoverage, setDbCoverage] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [dbTestCases, setDbTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedCov, setSelectedCov] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    coverage_id: "",
    feature_reference: "",
    linked_test_cases: [] as string[], // Changed to array for checkbox tracking
    coverage_status: "Uncovered"
  });

  async function fetchCoverageData() {
    setLoading(true);
    try {
      const [covRes, featRes, testRes] = await Promise.all([
        supabase.from('testing_coverage').select('*').eq('project_name', activeProject).order('coverage_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true }),
        supabase.from('testing_cases').select('id, test_id, title').eq('project_name', activeProject).order('test_id', { ascending: true })
      ]);

      if (covRes.data) setDbCoverage(covRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
      if (testRes.data) setDbTestCases(testRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCoverageData();
  }, [activeProject]);

  // --- Checkbox Selection Handler ---
  const toggleTestCaseSelection = (testId: string) => {
    setFormData(prev => {
      const current = [...prev.linked_test_cases];
      const idx = current.indexOf(testId);
      if (idx > -1) {
        current.splice(idx, 1); // remove if checked
      } else {
        current.push(testId); // add if unchecked
      }
      return { ...prev, linked_test_cases: current };
    });
  };

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    // Save as a clean comma-separated string in the DB text column
    const payload = {
      id: isEditMode ? formData.id : `COV-${Math.floor(Math.random() * 90000)}`,
      coverage_id: formData.coverage_id,
      feature_reference: formData.feature_reference,
      linked_test_cases: formData.linked_test_cases.join(", "),
      coverage_status: formData.coverage_status,
      last_tested_at: formData.coverage_status !== 'Uncovered' ? new Date().toISOString() : null,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_coverage').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_coverage').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving coverage data:", error);
      alert(`Failed to save! Database error: ${error.message}`);
    } else {
      closeForm();
      fetchCoverageData();
      if (isEditMode && selectedCov) setSelectedCov(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this trace mapping rule?")) return;
    setDbCoverage(dbCoverage.filter(c => c.id !== id));
    setSelectedCov(null);
    const { error } = await supabase.from('testing_coverage').delete().eq('id', id);
    if (error) fetchCoverageData();
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbCoverage.length + 101;
    setFormData({ id: "", coverage_id: `COV-${nextNum}`, feature_reference: "", linked_test_cases: [], coverage_status: "Uncovered" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    // Parse the comma-separated string back into an array for the checkboxes
    const caseArray = item.linked_test_cases ? item.linked_test_cases.split(", ").map((s: string) => s.trim()) : [];
    setFormData({ ...item, linked_test_cases: caseArray });
    setIsFormOpen(true);
    setSelectedCov(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // --- Calculations ---
  const totalFeatures = dbCoverage.length;
  const fullyCovered = dbCoverage.filter(c => c.coverage_status === 'Fully Covered').length;
  const coveragePercent = totalFeatures > 0 ? Math.round((fullyCovered / totalFeatures) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Fully Covered": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Partially Covered": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-red-100 text-red-700 border-red-200";
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Requirements Test Coverage"
        sub={`Trace functional feature scopes against active validation coverage arrays for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Audit Matrix</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Map Trace Link
            </Btn>
          </>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Global Coverage Score</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{coveragePercent}%</div>
          </div>
          <BarChart3 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Partial Gaps</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbCoverage.filter(c => c.coverage_status === 'Partially Covered').length}
            </div>
          </div>
          <AlertTriangle className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Blind Spot Deliverables</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbCoverage.filter(c => c.coverage_status === 'Uncovered').length}
            </div>
          </div>
          <ShieldX className="text-red-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading coverage matrix...</div>
      ) : dbCoverage.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <BarChart3 size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Trace Matrix is Clean</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Map product features directly to functional execution runs.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Feature</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="bg-muted/50 p-3 border-b border-border flex text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-24">Trace ID</div>
            <div className="flex-1">Target Feature Scope</div>
            <div className="w-48 hidden sm:block">Linked Verification Case</div>
            <div className="w-32 text-right pr-4">Status</div>
          </div>
          <div className="divide-y divide-border">
            {dbCoverage.map(cov => (
              <div 
                key={cov.id} 
                onClick={() => setSelectedCov(cov)}
                className="p-3.5 bg-card hover:bg-muted/30 transition-colors flex items-center cursor-pointer group relative"
              >
                <div className="w-24 font-mono text-xs font-bold text-foreground">{cov.coverage_id}</div>
                
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-bold text-foreground truncate">{cov.feature_reference.split(' - ')[1] || cov.feature_reference}</h4>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{cov.feature_reference.split(' - ')[0]}</div>
                </div>

                <div className="w-48 hidden sm:block font-mono text-xs text-muted-foreground truncate">
                  {cov.linked_test_cases ? cov.linked_test_cases : <span className="italic text-red-500 font-sans">None Bound</span>}
                </div>

                <div className="w-32 flex items-center justify-end gap-2 pr-2">
                  <Badge className={cn("text-[9px] px-2 py-0.5 font-bold border-none", getStatusBadge(cov.coverage_status))}>
                    {cov.coverage_status}
                  </Badge>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bg-card pl-2">
                    <button onClick={(e) => openEditForm(cov, e)} className="p-1 text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                    <button onClick={(e) => handleDelete(cov.id, e)} className="p-1 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* READ MODAL */}
      {selectedCov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedCov.coverage_id}</Badge>
                <Badge className={cn("font-bold px-2", getStatusBadge(selectedCov.coverage_status))}>{selectedCov.coverage_status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedCov, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedCov.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedCov(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Traceability Alignment Mapping</span>
                <h2 className="text-base font-bold text-foreground leading-snug">{selectedCov.feature_reference}</h2>
              </div>

              <section className="bg-muted/10 p-4 border rounded-lg">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ListTree size={14}/> Bound Verification Vectors</h3>
                <div className="text-sm font-mono font-medium text-primary">
                  {selectedCov.linked_test_cases ? selectedCov.linked_test_cases : <span className="italic text-red-500 font-sans">No test cases bound to this feature block yet.</span>}
                </div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedCov(null)}>Close Matrix</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL (WITH CHECKBOX SELECTOR) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-lg border border-border flex flex-col p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Milestone size={18} className="text-blue-500" /> Map Coverage Link</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Trace ID</label>
                  <input required value={formData.coverage_id} onChange={e => setFormData({...formData, coverage_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Star size={12}/> Target Feature Scope</label>
                  <select required value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none">
                    <option value="">-- Choose Target Component Scope --</option>
                    {dbFeatures.map(f => (
                      <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DYNAMIC CHECKBOX SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-primary" /> Select Associated Test Cases
                </label>
                
                {dbTestCases.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground p-3 border border-border rounded bg-muted/20">
                    No test cases found in database. Create them in the Test Cases module first.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border bg-muted/10">
                    {dbTestCases.map(tc => {
                      const isChecked = formData.linked_test_cases.includes(tc.test_id);
                      return (
                        <div 
                          key={tc.id} 
                          onClick={() => toggleTestCaseSelection(tc.test_id)}
                          className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer text-xs transition-colors"
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-primary shrink-0" />
                          ) : (
                            <Square size={16} className="text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-foreground mr-2">{tc.test_id}</span>
                            <span className="text-muted-foreground truncate">{tc.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Coverage State Status</label>
                <select value={formData.coverage_status} onChange={e => setFormData({...formData, coverage_status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold focus:outline-none">
                  <option value="Uncovered">⊘ Uncovered (Blind Spot)</option>
                  <option value="Partially Covered">⚡ Partially Covered</option>
                  <option value="Fully Covered">✓ Fully Covered</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSubmitting ? "Locking..." : "Lock Trace Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}