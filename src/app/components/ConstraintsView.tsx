import { useState, useEffect } from "react";
import { Plus, Download, Lock, DollarSign, Clock, ShieldAlert, Server, Scale, AlertTriangle, Edit, Trash2, X, Wand2, FileWarning, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function ConstraintsView({ activeProject }: { activeProject: string }) {
  const [dbConstraints, setDbConstraints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedConstraint, setSelectedConstraint] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    category: "Technology",
    description: "",
    impact: "Medium",
    mitigation: "",
    status: "Active"
  });

  async function fetchConstraints() {
    setLoading(true);
    const { data, error } = await supabase
      .from('constraints')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching constraints:", error);
    else if (data) setDbConstraints(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchConstraints();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `CON-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      category: formData.category,
      description: formData.description,
      impact: formData.impact,
      mitigation: formData.mitigation,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('constraints').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('constraints').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving constraint:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchConstraints();
      if (isEditMode && selectedConstraint) setSelectedConstraint(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this constraint?")) return;
    setDbConstraints(dbConstraints.filter(c => c.id !== id));
    setSelectedConstraint(null);
    const { error } = await supabase.from('constraints').delete().eq('id', id);
    if (error) fetchConstraints();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbConstraints.map(item => ({
      "Constraint ID": item.id,
      "Title": item.title,
      "Category": item.category || "Technology",
      "Limitation / Boundary Description": item.description || "N/A",
      "Impact Level": item.impact || "Medium",
      "Mitigation / Workaround Strategy": item.mitigation || "N/A",
      "Status": item.status,
      "Date Logged": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 15 }, // Constraint ID
      { wch: 28 }, // Title
      { wch: 18 }, // Category
      { wch: 50 }, // Description
      { wch: 15 }, // Impact Level
      { wch: 45 }, // Mitigation Strategy
      { wch: 12 }, // Status
      { wch: 15 }  // Date Logged
    ];

    exportToExcel(formattedRows, "Project Constraints", `Constraints_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbConstraints.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Category", value: item.category || "Technology", isMeta: true },
        { label: "Impact Window", value: item.impact || "Medium", isMeta: true },
        { label: "Current Status", value: item.status, isMeta: true },
        { label: "The Limitation Bound", value: item.description || "None provided.", color: "A93226" },
        { label: "Mitigation & Adaptive Workaround Strategy", value: item.mitigation || "None provided.", color: "117A43" }
      ]
    }));

    exportToWordBrief("Project Constraints & Architectural Boundaries Log", activeProject, structuredItems, `Constraints_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Define the limitation: [e.g., The system must be built using existing legacy hardware].\n\nSource: Who or what mandates this? (e.g., Budget committee, Legal team).",
      mitigation: "How will we design the solution to work within this boundary? \n\nAction: [e.g., Defer features X and Y to stay within budget, or add a middleware translation layer]."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", category: "Technology", description: "", impact: "Medium", mitigation: "", status: "Active" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      category: item.category || "Technology",
      description: item.description || "",
      impact: item.impact || "Medium",
      mitigation: item.mitigation || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedConstraint(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Mitigated": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200"; // Active
    }
  };

  const getImpactColor = (impact: string) => {
    switch(impact) {
      case "Critical": return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200";
      case "High": return "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-200";
      case "Medium": return "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200";
      default: return "text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "Budget": return <DollarSign size={14} className="text-emerald-600" />;
      case "Time / Schedule": return <Clock size={14} className="text-blue-600" />;
      case "Technology": return <Server size={14} className="text-violet-600" />;
      case "Regulatory": return <Scale size={14} className="text-amber-600" />;
      default: return <ShieldAlert size={14} className="text-slate-600" />;
    }
  };

  const activeCount = dbConstraints.filter(c => c.status === "Active").length;
  const criticalCount = dbConstraints.filter(c => c.status === "Active" && (c.impact === "Critical" || c.impact === "High")).length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Project Constraints"
        sub={`Document project boundaries and limitations for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Constraint
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Active Constraints</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{activeCount}</div>
          </div>
          <Lock className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">High/Critical Impact</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount}</div>
          </div>
          <AlertTriangle className="text-red-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Logged</div>
            <div className="text-2xl font-bold">{dbConstraints.length}</div>
          </div>
          <FileWarning className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading constraints...</div>
      ) : dbConstraints.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Lock size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Constraints Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define the budget, timeline, and technology boundaries of your project.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Constraint</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbConstraints.map(con => (
            <div 
              key={con.id} 
              onClick={() => setSelectedConstraint(con)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
              style={{ borderLeftColor: con.status === 'Mitigated' ? '#10B981' : '#F59E0B' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{con.id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(con.status))}>{con.status}</Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{con.title}</h3>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-3">
                {getCategoryIcon(con.category)} {con.category} Constraint
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed">
                {con.description}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-border">
                <Badge className={cn("text-[9px] px-1.5 py-0", getImpactColor(con.impact))}>
                  Impact: {con.impact}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedConstraint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedConstraint.id}</Badge>
                <Badge className={getStatusColor(selectedConstraint.status)}>{selectedConstraint.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedConstraint, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedConstraint.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedConstraint(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-muted px-2 py-0.5 rounded text-xs flex items-center gap-1.5 font-medium text-muted-foreground">
                    {getCategoryIcon(selectedConstraint.category)} {selectedConstraint.category} Boundary
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedConstraint.title}</h2>
                
                <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between max-w-xs">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Constraint Impact</span>
                  <Badge className={cn("text-xs py-0.5", getImpactColor(selectedConstraint.impact))}>
                    {selectedConstraint.impact}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-lg border border-amber-200 dark:border-amber-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-amber-700 dark:text-amber-400">
                    <Lock size={14} /> The Limitation
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedConstraint.description}
                  </div>
                </section>

                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={14} /> Mitigation / Workaround Strategy
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedConstraint.mitigation || <span className="text-muted-foreground italic">No workaround defined.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedConstraint.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedConstraint(null)}>Close</Btn>
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
                <Lock size={18} className="text-blue-500" /> {isEditMode ? "Edit Constraint" : "Log Constraint"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load BA Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Constraint Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Fixed Q3 Budget" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Budget</option>
                    <option>Time / Schedule</option>
                    <option>Technology</option>
                    <option>Regulatory</option>
                    <option>Resource</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Impact</label>
                  <select 
                    value={formData.impact} onChange={e => setFormData({...formData, impact: e.target.value})} 
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
                    <option>Active</option>
                    <option>Mitigated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">The Limitation / Boundary</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium" 
                  placeholder="What is restricting the project? Why does this exist?" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Mitigation / Workaround</label>
                <textarea 
                  rows={3}
                  value={formData.mitigation} onChange={e => setFormData({...formData, mitigation: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="How will we adapt our solution to work within this constraint?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Constraint")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}