import { useState, useEffect } from "react";
import { Plus, Download, Edit, Trash2, X, Check, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TraceabilityMatrixView({ activeProject }: { activeProject: string }) {
  const [dbTrace, setDbTrace] = useState<any[]>([]);
  const [dbCases, setDbCases] = useState<any[]>([]);
  const [dbReqs, setDbReqs] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    business_need_id: "",
    business_need_title: "",
    requirement_id: "",
    feature_id: "",
    story_id: "",
    design_id: "",
    test_scenario_id: "",
    defect_id: "✓",
    release_version: "v3.0",
    status: "Covered"
  });

  async function fetchMatrixData() {
    setLoading(true);
    try {
      // Fetch core RTM data and safely attempt to fetch dependencies for auto-suggest
      const [traceRes, reqsRes, storiesRes] = await Promise.all([
        supabase.from('traceability_matrix').select('*').eq('project_name', activeProject).order('business_need_id', { ascending: true }),
        supabase.from('all_requirements').select('*').eq('project_name', activeProject),
        supabase.from('user_stories').select('*').eq('project_name', activeProject)
      ]);

      // Handle Business Cases safely in case the table doesn't exist yet
      const { data: casesData } = await supabase.from('business_cases').select('*').eq('project_name', activeProject).catch(() => ({ data: [] }));

      if (traceRes.error) console.error("RTM Error:", traceRes.error);

      if (traceRes.data) setDbTrace(traceRes.data);
      if (casesData) setDbCases(casesData);
      if (reqsRes.data) setDbReqs(reqsRes.data);
      if (storiesRes.data) setDbStories(storiesRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMatrixData();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `TRC-${Math.floor(Math.random() * 90000)}`,
      business_need_id: formData.business_need_id || "-",
      business_need_title: formData.business_need_title || "Manual Entry",
      requirement_id: formData.requirement_id || "-",
      feature_id: formData.feature_id || "-",
      story_id: formData.story_id || "-",
      design_id: formData.design_id || "-",
      test_scenario_id: formData.test_scenario_id || "-",
      defect_id: formData.defect_id || "✓",
      release_version: formData.release_version || "-",
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('traceability_matrix').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('traceability_matrix').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving trace path:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchMatrixData();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this matrix row?")) return;
    const { error } = await supabase.from('traceability_matrix').delete().eq('id', id);
    if (!error) fetchMatrixData();
  }

  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", business_need_id: "", business_need_title: "", requirement_id: "", feature_id: "", story_id: "", design_id: "", test_scenario_id: "", defect_id: "✓", release_version: "v3.0", status: "Covered" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Covered": return "bg-emerald-100 text-emerald-700";
      case "At Risk": return "bg-amber-100 text-amber-700";
      case "In Progress": return "bg-blue-100 text-blue-700";
      case "Gap": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-[1400px] mx-auto">
      <SectionHeader
        title="Requirement Traceability Matrix"
        sub={`End-to-end traceability for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export RTM</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />New Mapping
            </Btn>
          </>
        }
      />

      {/* Legend */}
      <div className="flex gap-4 text-xs font-semibold mb-2">
        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Covered</span>
        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">At Risk</span>
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">In Progress</span>
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">Gap</span>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading matrix data...</div>
      ) : dbTrace.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <AlertCircle size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Mappings Found for this Project</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            If you expected data here, ensure your active project name matches <strong>BA's Pandora Platform v3.0</strong>.
          </p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Mapping</Btn>
        </Card>
      ) : (
        <Card className="overflow-x-auto border border-border shadow-sm rounded-lg">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Business Need</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">User Story</th>
                <th className="px-4 py-3">Design</th>
                <th className="px-4 py-3">Test Scenario</th>
                <th className="px-4 py-3">Defect</th>
                <th className="px-4 py-3">Release</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dbTrace.map(row => (
                <tr key={row.id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-xs">{row.business_need_id}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{row.business_need_title}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.requirement_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.feature_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.story_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.design_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.test_scenario_id}</td>
                  <td className="px-4 py-3">
                    {row.defect_id === '✓' ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : row.defect_id === '-' ? (
                      <span className="text-muted-foreground font-mono text-xs">-</span>
                    ) : (
                      <span className="font-mono text-xs font-bold text-red-500">{row.defect_id}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.release_version}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-[10px] rounded px-2 font-bold border-none", getStatusBadge(row.status))}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-50 hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditForm(row)} className="p-1 hover:text-primary rounded"><Edit size={14}/></button>
                      <button onClick={() => handleDelete(row.id)} className="p-1 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          DYNAMIC FORM MODAL
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold">{isEditMode ? "Edit Mapping" : "New RTM Mapping"}</h2>
              <button onClick={closeForm} type="button" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              {/* Business Need */}
              <div className="grid grid-cols-2 gap-4 bg-muted/10 p-4 border border-border rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Need ID</label>
                  <input 
                    list="casesList" required autoFocus
                    value={formData.business_need_id} onChange={e => setFormData({...formData, business_need_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="e.g. BN-001"
                  />
                  <datalist id="casesList">
                    {dbCases.map(c => <option key={c.id} value={c.case_id || c.id}>{c.title}</option>)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Need Title</label>
                  <input 
                    required value={formData.business_need_title} onChange={e => setFormData({...formData, business_need_title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Secure Access Control"
                  />
                </div>
              </div>

              {/* Dynamic Artifacts */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Requirement ID</label>
                  <input 
                    list="reqsList" value={formData.requirement_id} onChange={e => setFormData({...formData, requirement_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="e.g. BR-001"
                  />
                  <datalist id="reqsList">{dbReqs.map(r => <option key={r.id} value={r.req_id || r.id}>{r.title}</option>)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Feature ID</label>
                  <input 
                    value={formData.feature_id} onChange={e => setFormData({...formData, feature_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="e.g. FEA-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">User Story ID</label>
                  <input 
                    list="storiesList" value={formData.story_id} onChange={e => setFormData({...formData, story_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="e.g. US-062"
                  />
                  <datalist id="storiesList">{dbStories.map(s => <option key={s.id} value={s.story_id || s.id}>{s.title}</option>)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Design ID</label>
                  <input 
                    value={formData.design_id} onChange={e => setFormData({...formData, design_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="e.g. WF-012"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Test Scenario ID</label>
                  <input 
                    value={formData.test_scenario_id} onChange={e => setFormData({...formData, test_scenario_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="e.g. TS-042"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Defect ID (or ✓)</label>
                  <input 
                    value={formData.defect_id} onChange={e => setFormData({...formData, defect_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="✓ or DEF-001"
                  />
                </div>
              </div>

              {/* Status & Release */}
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Release Version</label>
                  <input 
                    value={formData.release_version} onChange={e => setFormData({...formData, release_version: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-md" placeholder="e.g. v3.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Overall Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  >
                    <option>Covered</option>
                    <option>At Risk</option>
                    <option>In Progress</option>
                    <option>Gap</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}