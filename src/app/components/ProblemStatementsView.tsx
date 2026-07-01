import { useState, useEffect } from "react";
import { Plus, Download, AlertCircle, Target, TrendingDown, Edit, Trash2, X, Wand2, Lightbulb, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge, PriorityDot } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function ProblemStatementsView({ activeProject }: { activeProject: string }) {
  const [dbStatements, setDbStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedStatement, setSelectedStatement] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    background: "",
    current_impact: "",
    desired_outcome: "",
    priority: "Medium",
    status: "Draft"
  });

  async function fetchStatements() {
    setLoading(true);
    const { data, error } = await supabase
      .from('problem_statements')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching problem statements:", error);
    else if (data) setDbStatements(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchStatements();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    // OPTION B: Map frontend state to existing database schema columns
    const payload = {
      id: isEditMode ? formData.id : `PS-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      problem_description: formData.background,       // mapped from background
      affected_users: formData.current_impact,         // mapped from current_impact
      proposed_value: formData.desired_outcome,        // mapped from desired_outcome
      impact_level: formData.priority,                 // mapped from priority
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('problem_statements').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('problem_statements').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving statement:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchStatements();
      if (isEditMode && selectedStatement) setSelectedStatement(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this Problem Statement?")) return;
    setDbStatements(dbStatements.filter(s => s.id !== id));
    setSelectedStatement(null);
    const { error } = await supabase.from('problem_statements').delete().eq('id', id);
    if (error) fetchStatements();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbStatements.map(item => ({
      "Problem ID": item.id,
      "Title": item.title,
      "Background Context": item.problem_description || "N/A",
      "Current Impact (Pain)": item.affected_users || "N/A",
      "Desired Outcome": item.proposed_value || "N/A",
      "Priority Level": item.impact_level || "Medium",
      "Status": item.status,
      "Date Created": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 12 }, // Problem ID
      { wch: 30 }, // Title
      { wch: 45 }, // Background Context
      { wch: 45 }, // Current Impact
      { wch: 45 }, // Desired Outcome
      { wch: 15 }, // Priority Level
      { wch: 12 }, // Status
      { wch: 15 }  // Date Created
    ];

    exportToExcel(formattedRows, "Problem Statements", `Problem_Statements_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbStatements.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Priority", value: item.impact_level || "Medium", isMeta: true },
        { label: "Status", value: item.status, isMeta: true },
        { label: "Background Context", value: item.problem_description || "None provided." },
        { label: "Current Impact (The Pain)", value: item.affected_users || "None provided.", color: "BA1A1A" },
        { label: "Desired Outcome", value: item.proposed_value || "None provided.", color: "117A43" }
      ]
    }));

    exportToWordBrief("Problem Statements Analysis Report", activeProject, structuredItems, `Problem_Statements_Brief_${activeProject}`);
  }

  // --- Helpers & Templates ---
  function loadTemplate() {
    setFormData({
      ...formData,
      background: "Describe the context: How does the process work today? Who are the users involved?",
      current_impact: "Quantify the pain: e.g., 'This manual process takes 5 hours per week, leading to a 15% error rate and $50k in lost revenue annually.'",
      desired_outcome: "What does success look like? State the measurable future state (e.g., 'Reduce processing time to under 5 minutes with 0% error rate')."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", background: "", current_impact: "", desired_outcome: "", priority: "Medium", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      background: item.problem_description || "",
      current_impact: item.affected_users || "",
      desired_outcome: item.proposed_value || "",
      priority: item.impact_level || "Medium",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedStatement(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Validated": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Addressed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  const criticalCount = dbStatements.filter(s => s.impact_level === "Critical" || s.impact_level === "High").length;
  const validatedCount = dbStatements.filter(s => s.status === "Validated").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Problem Statements"
        sub={`Root cause analysis and pain points for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} /> Log Problem
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Logged</div>
            <div className="text-2xl font-bold">{dbStatements.length}</div>
          </div>
          <FileText className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">High/Critical Priority</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{criticalCount}</div>
          </div>
          <AlertCircle className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Validated</div>
            <div className="text-2xl font-bold text-blue-600">{validatedCount}</div>
          </div>
          <CheckCircle2 className="text-blue-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading problem statements...</div>
      ) : dbStatements.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <AlertCircle size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Problem Statements logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Identify pain points to drive meaningful requirements.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Problem</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbStatements.map(ps => (
            <div 
              key={ps.id} 
              onClick={() => setSelectedStatement(ps)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">{ps.id}</Badge>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(ps.status)}>{ps.status}</Badge>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">{ps.title}</h3>
              
              <div className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 border-l-2 border-red-200 dark:border-red-900/50 pl-3">
                <span className="font-semibold text-foreground text-xs block mb-1">Current Impact:</span>
                {ps.affected_users || "No impact defined."}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <PriorityDot priority={ps.impact_level || "Medium"} /> {ps.impact_level || "Medium"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(ps.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono px-2">{selectedStatement.id}</Badge>
                <Badge className={getStatusColor(selectedStatement.status)}>{selectedStatement.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(selectedStatement)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedStatement.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedStatement(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedStatement.title}</h2>
                <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <PriorityDot priority={selectedStatement.impact_level || selectedStatement.priority || "Medium"} /> 
                    Priority: {selectedStatement.impact_level || selectedStatement.priority || "Medium"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-foreground">
                    <FileText size={16} className="text-blue-500" /> Background Context
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedStatement.problem_description || selectedStatement.background || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-red-700 dark:text-red-400">
                    <TrendingDown size={16} /> Current Impact (The Pain)
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedStatement.affected_users || selectedStatement.current_impact || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-emerald-700 dark:text-emerald-400">
                    <Target size={16} /> Desired Outcome
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedStatement.proposed_value || selectedStatement.desired_outcome || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-end items-center rounded-b-xl">
              <Btn variant="secondary" onClick={() => setSelectedStatement(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb size={18} className="text-blue-500" /> {isEditMode ? "Edit Problem Statement" : "Log Problem Statement"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load BA Template
                  </button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Problem Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. High Volume of Password Resets" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Draft</option>
                    <option>Validated</option>
                    <option>Addressed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Background Context</label>
                <textarea 
                  rows={2}
                  value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">Current Impact (The Pain)</label>
                <textarea 
                  required rows={3}
                  value={formData.current_impact} onChange={e => setFormData({...formData, current_impact: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Quantify the cost, time lost, or error rate..." 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Desired Outcome</label>
                <textarea 
                  required rows={2}
                  value={formData.desired_outcome} onChange={e => setFormData({...formData, desired_outcome: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="What does measurable success look like?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Problem")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}