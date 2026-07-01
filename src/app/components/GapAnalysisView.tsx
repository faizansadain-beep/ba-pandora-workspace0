import { useState, useEffect } from "react";
import { Plus, Download, GitPullRequest, ArrowRight, CheckCircle2, AlertCircle, Edit, Trash2, X, Wand2, Layers, Cpu, Users, ClipboardList } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function GapAnalysisView({ activeProject }: { activeProject: string }) {
  const [dbGaps, setDbGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedGap, setSelectedGap] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    category: "Technology",
    current_state: "",
    target_state: "",
    gap_description: "",
    action_plan: "",
    status: "Open"
  });

  async function fetchGaps() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gap_analysis')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching gaps:", error);
    else if (data) setDbGaps(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchGaps();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `GAP-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      category: formData.category,
      current_state: formData.current_state,
      target_state: formData.target_state,
      gap_description: formData.gap_description,
      action_plan: formData.action_plan,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('gap_analysis').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('gap_analysis').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving gap:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchGaps();
      if (isEditMode && selectedGap) setSelectedGap(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Gap Analysis?")) return;
    setDbGaps(dbGaps.filter(g => g.id !== id));
    setSelectedGap(null);
    const { error } = await supabase.from('gap_analysis').delete().eq('id', id);
    if (error) fetchGaps();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbGaps.map(item => ({
      "Gap ID": item.id,
      "Analysis Title": item.title,
      "Category": item.category || "Technology",
      "Current State (As-Is)": item.current_state || "N/A",
      "Target State (To-Be)": item.target_state || "N/A",
      "Gap Description": item.gap_description || "N/A",
      "Action Plan / Remediation": item.action_plan || "N/A",
      "Status": item.status,
      "Date Created": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 12 }, // Gap ID
      { wch: 30 }, // Title
      { wch: 18 }, // Category
      { wch: 45 }, // Current State
      { wch: 45 }, // Target State
      { wch: 45 }, // Gap Description
      { wch: 45 }, // Action Plan
      { wch: 12 }, // Status
      { wch: 15 }  // Date Created
    ];

    exportToExcel(formattedRows, "Gap Analysis Matricies", `Gap_Analysis_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbGaps.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Category", value: item.category || "Technology", isMeta: true },
        { label: "Status", value: item.status, isMeta: true },
        { label: "Current State (As-Is Baseline)", value: item.current_state || "None documented." },
        { label: "Target State (Optimized Architecture)", value: item.target_state || "None documented." },
        { label: "Identified Gap (Missing Capability)", value: item.gap_description || "None documented.", color: "A93226" },
        { label: "Strategic Action Plan / Remediation Roadmap", value: item.action_plan || "None documented.", color: "1A5276" }
      ]
    }));

    exportToWordBrief("Gap Analysis & Strategic Remediation Report", activeProject, structuredItems, `Gap_Analysis_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      current_state: "Describe how this works today without the solution.",
      target_state: "Describe the optimal future state once implemented.",
      gap_description: "What exactly is missing? (e.g., Lack of API integration, missing skillsets, outdated hardware).",
      action_plan: "1. Phase 1 action...\n2. Phase 2 action...\n3. Required resources..."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", category: "Technology", current_state: "", target_state: "", gap_description: "", action_plan: "", status: "Open" });
    setIsFormOpen(true);
  }

  // Adjusted signature slightly to match component parameters
  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      category: item.category || "Technology",
      current_state: item.current_state || "",
      target_state: item.target_state || "",
      gap_description: item.gap_description || "",
      action_plan: item.action_plan || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedGap(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Closed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Progress": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200"; // Open
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "Technology": return <Cpu size={14} className="text-blue-500" />;
      case "Process": return <GitPullRequest size={14} className="text-violet-500" />;
      case "People": return <Users size={14} className="text-amber-500" />;
      default: return <Layers size={14} className="text-slate-500" />;
    }
  };

  const openCount = dbGaps.filter(g => g.status === "Open").length;
  const inProgressCount = dbGaps.filter(g => g.status === "In Progress").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Gap Analysis"
        sub={`Identifying capability gaps and action plans for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Identify Gap
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Open Gaps</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{openCount}</div>
          </div>
          <AlertCircle className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Bridging In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
          </div>
          <GitPullRequest className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Logged</div>
            <div className="text-2xl font-bold">{dbGaps.length}</div>
          </div>
          <ClipboardList className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading gaps...</div>
      ) : dbGaps.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <GitPullRequest size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Gaps Identified</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Compare As-Is and To-Be states to map out missing capabilities.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Gap Analysis</Btn>
        </Card>
      ) : (
        <div className="space-y-4">
          {dbGaps.map(gap => (
            <div 
              key={gap.id} 
              onClick={() => setSelectedGap(gap)}
              className="bg-card border border-border p-5 rounded-xl hover:shadow-md transition-shadow cursor-pointer border-l-4"
              style={{ borderLeftColor: gap.status === 'Closed' ? '#10B981' : gap.status === 'In Progress' ? '#3B82F6' : '#F59E0B' }}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                {/* Meta & Title */}
                <div className="w-full md:w-1/4 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{gap.id}</Badge>
                    <Badge className={getStatusColor(gap.status)}>{gap.status}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5 leading-tight">{gap.title}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    {getCategoryIcon(gap.category)} {gap.category}
                  </div>
                </div>

                {/* Visual Bridge: Current -> Target */}
                <div className="flex-1 flex flex-col md:flex-row items-center gap-3 w-full">
                  <div className="flex-1 w-full bg-muted/30 border border-border p-3 rounded-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current State</div>
                    <div className="text-xs text-foreground line-clamp-2">{gap.current_state || "Not defined"}</div>
                  </div>
                  
                  <div className="flex items-center justify-center text-muted-foreground/50 py-2 md:py-0">
                    <ArrowRight size={20} className="hidden md:block" />
                    <ArrowRight size={20} className="block md:hidden rotate-90" />
                  </div>
                  
                  <div className="flex-1 w-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-500 mb-1">Target State</div>
                    <div className="text-xs text-foreground line-clamp-2">{gap.target_state || "Not defined"}</div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedGap.id}</Badge>
                <Badge className={getStatusColor(selectedGap.status)}>{selectedGap.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedGap, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedGap.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedGap(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedGap.title}</h2>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="bg-muted px-2 py-1 rounded flex items-center gap-1.5">
                    {getCategoryIcon(selectedGap.category)} {selectedGap.category}
                  </span>
                </div>
              </div>

              {/* Current vs Target Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold mb-2 text-foreground">Current State</h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedGap.current_state || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>
                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                  <h3 className="text-sm font-semibold mb-2 text-emerald-700 dark:text-emerald-400">Target State</h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedGap.target_state || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-red-700 dark:text-red-400">
                    <AlertCircle size={16} /> The Gap Description
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedGap.gap_description || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-blue-700 dark:text-blue-400">
                    <ClipboardList size={16} /> Action Plan to Bridge the Gap
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedGap.action_plan || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
              <span className="text-xs text-muted-foreground">Project: {selectedGap.project_name}</span>
              <Btn variant="secondary" onClick={() => setSelectedGap(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitPullRequest size={18} className="text-blue-500" /> {isEditMode ? "Edit Gap Analysis" : "New Gap Analysis"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Framework
                  </button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Analysis Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Authentication Infrastructure Gap" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Technology</option>
                    <option>Process</option>
                    <option>People</option>
                    <option>Data</option>
                    <option>Regulatory/Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current State</label>
                  <textarea 
                    required rows={3}
                    value={formData.current_state} onChange={e => setFormData({...formData, current_state: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Target State</label>
                  <textarea 
                    required rows={3}
                    value={formData.target_state} onChange={e => setFormData({...formData, target_state: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">Gap Description (What is missing?)</label>
                <textarea 
                  required rows={2}
                  value={formData.gap_description} onChange={e => setFormData({...formData, gap_description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Action Plan (How to bridge the gap?)</label>
                <textarea 
                  required rows={3}
                  value={formData.action_plan} onChange={e => setFormData({...formData, action_plan: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Gap Analysis")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}