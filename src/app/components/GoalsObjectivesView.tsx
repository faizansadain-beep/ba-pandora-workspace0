import { useState, useEffect } from "react";
import { Plus, Download, Target, CheckCircle2, AlertTriangle, Edit, Trash2, X, Wand2, Flag, TrendingUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function GoalsObjectivesView({ activeProject }: { activeProject: string }) {
  const [dbGoals, setDbGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    type: "Objective",
    description: "",
    success_criteria: "",
    status: "On Track"
  });

  async function fetchGoals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals_objectives')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching goals:", error);
    else if (data) setDbGoals(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchGoals();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `GOAL-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      success_criteria: formData.success_criteria,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('goals_objectives').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('goals_objectives').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving goal:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchGoals();
      if (isEditMode && selectedGoal) setSelectedGoal(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this Goal/Objective?")) return;
    setDbGoals(dbGoals.filter(g => g.id !== id));
    setSelectedGoal(null);
    const { error } = await supabase.from('goals_objectives').delete().eq('id', id);
    if (error) fetchGoals();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbGoals.map(item => ({
      "Goal ID": item.id,
      "Title": item.title,
      "Type": item.type || "Objective",
      "Description": item.description || "N/A",
      "Measurable Success Criteria": item.success_criteria || "N/A",
      "Status": item.status,
      "Date Created": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 15 }, // Goal ID
      { wch: 30 }, // Title
      { wch: 18 }, // Type
      { wch: 45 }, // Description
      { wch: 45 }, // Success Criteria
      { wch: 12 }, // Status
      { wch: 15 }  // Date Created
    ];

    exportToExcel(formattedRows, "Goals & Objectives", `Goals_Objectives_${activeProject}`, columnWidths);
  }

  type GoalDetailField = { label: string; value: string; isMeta?: boolean; color?: string };

  function handleWordExport() {
    const structuredItems = dbGoals.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Type", value: item.type || "Objective", isMeta: true },
        { label: "Status", value: item.status, isMeta: true },
        { label: "Goal Description", value: item.description || "None provided." },
        { label: "Measurable Success Criteria", value: item.success_criteria || "None provided.", color: "117A43" }
      ] as GoalDetailField[]
    }));

    exportToWordBrief("Strategic Goals & Objectives Brief", activeProject, structuredItems, `Goals_Objectives_Brief_${activeProject}`);
  }

  // --- Helpers & Templates ---
  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Specific: State exactly what you want to accomplish.\nRelevant: Why does this matter to the business?",
      success_criteria: "Measurable: How will you track progress? (e.g., 'Increase X by Y%').\nAchievable: Is it realistic?\nTime-bound: By when will this be achieved? (e.g., 'By Q3 2026')."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", type: "Objective", description: "", success_criteria: "", status: "On Track" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      type: item.type,
      description: item.description || "",
      success_criteria: item.success_criteria || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedGoal(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Achieved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "At Risk": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Missed": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200"; // On Track
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "Strategic Goal": return <Flag size={14} className="text-violet-500" />;
      case "Business Outcome": return <TrendingUp size={14} className="text-emerald-500" />;
      default: return <Target size={14} className="text-blue-500" />; // Objective
    }
  };

  const achievedCount = dbGoals.filter(g => g.status === "Achieved").length;
  const atRiskCount = dbGoals.filter(g => g.status === "At Risk" || g.status === "Missed").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Goals & Objectives"
        sub={`Strategic alignment and targets for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Goal
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Goals</div>
            <div className="text-2xl font-bold">{dbGoals.length}</div>
          </div>
          <Target className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Achieved</div>
            <div className="text-2xl font-bold text-emerald-600">{achievedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">At Risk / Missed</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{atRiskCount}</div>
          </div>
          <AlertTriangle className="text-amber-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading goals...</div>
      ) : dbGoals.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Target size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Goals Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define measurable targets to align your requirements.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Goal</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbGoals.map(goal => (
            <div 
              key={goal.id} 
              onClick={() => setSelectedGoal(goal)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-muted text-muted-foreground font-mono text-xs">{goal.id}</Badge>
                <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">{goal.title}</h3>
              
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-4">
                {getTypeIcon(goal.type)}
                {goal.type}
              </div>
              
              <div className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                {goal.description || "No description provided."}
              </div>
              
              <div className="pt-3 border-t border-border mt-auto">
                <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Success Criteria
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {goal.success_criteria || "None defined."}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedGoal.id}</Badge>
                <Badge className={getStatusColor(selectedGoal.status)}>{selectedGoal.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(selectedGoal)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedGoal.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedGoal(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedGoal.title}</h2>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="bg-muted px-2 py-1 rounded flex items-center gap-1.5">
                    {getTypeIcon(selectedGoal.type)} {selectedGoal.type}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-foreground">
                    <Flag size={16} className="text-blue-500" /> Goal Description
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedGoal.description || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> Measurable Success Criteria
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedGoal.success_criteria || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Project: {selectedGoal.project_name}</span>
              <Btn variant="secondary" onClick={() => setSelectedGoal(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target size={18} className="text-blue-500" /> {isEditMode ? "Edit Goal" : "Add Goal/Objective"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> SMART Template
                  </button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Reduce Login Friction" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                  <select 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Strategic Goal</option>
                    <option>Objective</option>
                    <option>Business Outcome</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>On Track</option>
                    <option>At Risk</option>
                    <option>Achieved</option>
                    <option>Missed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea 
                  rows={3}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="What is the context and relevance of this goal?" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Measurable Success Criteria</label>
                <textarea 
                  required rows={3}
                  value={formData.success_criteria} onChange={e => setFormData({...formData, success_criteria: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="How will we measure success? (Quantifiable metric & timeframe)" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Goal")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}