import { useState, useEffect } from "react";
import { Plus, Download, HelpCircle, CheckCircle2, XCircle, AlertTriangle, Edit, Trash2, X, Wand2, User } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function AssumptionsView({ activeProject }: { activeProject: string }) {
  const [dbAssumptions, setDbAssumptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedAssumption, setSelectedAssumption] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    impact_if_false: "Medium",
    validation_status: "Unvalidated",
    owner: ""
  });

  async function fetchAssumptions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('assumptions')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching assumptions:", error);
    else if (data) setDbAssumptions(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchAssumptions();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `ASM-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      description: formData.description,
      impact_if_false: formData.impact_if_false,
      validation_status: formData.validation_status,
      owner: formData.owner,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('assumptions').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('assumptions').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving assumption:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchAssumptions();
      if (isEditMode && selectedAssumption) setSelectedAssumption(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Assumption?")) return;
    setDbAssumptions(dbAssumptions.filter(a => a.id !== id));
    setSelectedAssumption(null);
    const { error } = await supabase.from('assumptions').delete().eq('id', id);
    if (error) fetchAssumptions();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbAssumptions.map(item => ({
      "Assumption ID": item.id,
      "Title": item.title,
      "Assumption & Consequence": item.description || "N/A",
      "Impact If False": item.impact_if_false || "Medium",
      "Validation Status": item.validation_status || "Unvalidated",
      "Assigned Owner": item.owner || "Unassigned",
      "Date Logged": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 15 }, // Assumption ID
      { wch: 30 }, // Title
      { wch: 55 }, // Description
      { wch: 18 }, // Impact If False
      { wch: 20 }, // Validation Status
      { wch: 22 }, // Assigned Owner
      { wch: 15 }  // Date Logged
    ];

    exportToExcel(formattedRows, "Project Assumptions", `Assumptions_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbAssumptions.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Validation Status", value: item.validation_status || "Unvalidated", isMeta: true },
        { label: "Impact If Proven False", value: item.impact_if_false || "Medium", isMeta: true },
        { label: "Assigned Validation Owner", value: item.owner || "Unassigned", isMeta: true },
        { label: "Hypothesis Context & Impact Statement", value: item.description || "None provided.", color: "A93226" }
      ]
    }));

    exportToWordBrief("Project Assumptions Validation Matrix Brief", activeProject, structuredItems, `Assumptions_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      description: "We assume that [State the condition believed to be true].\n\nIF FALSE: If this assumption proves to be incorrect, the impact will be [Describe the consequence, risk, or delay]."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", description: "", impact_if_false: "Medium", validation_status: "Unvalidated", owner: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      description: item.description || "",
      impact_if_false: item.impact_if_false || "Medium",
      validation_status: item.validation_status || "Unvalidated",
      owner: item.owner || ""
    });
    setIsFormOpen(true);
    setSelectedAssumption(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Validated": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
      case "Invalidated": return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle };
      default: return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: HelpCircle }; // Unvalidated
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

  const unvalidatedCount = dbAssumptions.filter(a => a.validation_status === "Unvalidated").length;
  const criticalCount = dbAssumptions.filter(a => a.impact_if_false === "Critical" || a.impact_if_false === "High").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Project Assumptions"
        sub={`Document and validate hypotheses for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Assumption
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Unvalidated Assumptions</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{unvalidatedCount}</div>
          </div>
          <HelpCircle className="text-amber-500 opacity-80" size={32} />
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
            <div className="text-2xl font-bold">{dbAssumptions.length}</div>
          </div>
          <CheckCircle2 className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading assumptions...</div>
      ) : dbAssumptions.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <HelpCircle size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Assumptions Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Document beliefs that need to be validated to avoid project risk.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Assumption</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbAssumptions.map(asm => {
            const visuals = getStatusVisuals(asm.validation_status);
            const StatusIcon = visuals.icon;
            
            return (
              <div 
                key={asm.id} 
                onClick={() => setSelectedAssumption(asm)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: asm.validation_status === 'Validated' ? '#10B981' : asm.validation_status === 'Invalidated' ? '#EF4444' : '#F59E0B' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{asm.id}</Badge>
                  <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                    <StatusIcon size={10} /> {asm.validation_status}
                  </Badge>
                </div>
                
                <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{asm.title}</h3>
                
                <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed">
                  {asm.description}
                </div>
                
                <div className="mt-auto flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-border">
                  <span className="flex items-center gap-1"><User size={10} /> {asm.owner || "Unassigned"}</span>
                  <Badge className={cn("text-[9px] px-1.5 py-0", getImpactColor(asm.impact_if_false))}>
                    If False: {asm.impact_if_false}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedAssumption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedAssumption.id}</Badge>
                <Badge className={cn("gap-1", getStatusVisuals(selectedAssumption.validation_status).color)}>
                  {selectedAssumption.validation_status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedAssumption, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedAssumption.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedAssumption(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedAssumption.title}</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impact if False</span>
                    <Badge className={cn("text-xs py-0.5", getImpactColor(selectedAssumption.impact_if_false))}>
                      {selectedAssumption.impact_if_false}
                    </Badge>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner to Validate</span>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <User size={14} className="text-muted-foreground" /> {selectedAssumption.owner || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-lg border border-amber-200 dark:border-amber-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-amber-700 dark:text-amber-400">
                    <HelpCircle size={14} /> The Assumption
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedAssumption.description}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedAssumption.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedAssumption(null)}>Close</Btn>
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
                <HelpCircle size={18} className="text-blue-500" /> {isEditMode ? "Edit Assumption" : "Log Assumption"}
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
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Assumption Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Users Have Smartphones" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Validation Status</label>
                  <select 
                    value={formData.validation_status} onChange={e => setFormData({...formData, validation_status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Unvalidated</option>
                    <option>Validated</option>
                    <option>Invalidated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Impact If False</label>
                  <select 
                    value={formData.impact_if_false} onChange={e => setFormData({...formData, impact_if_false: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">The Assumption & Impact</label>
                <textarea 
                  required rows={5}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium" 
                  placeholder="What are we assuming? What happens if we are wrong?" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Owner (Who validates this?)</label>
                <input 
                  value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. InfoSec Team, John Doe" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Assumption")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}