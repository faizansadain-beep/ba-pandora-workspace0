import { useState, useEffect } from "react";
import { Plus, Download, GitCommit, GitMerge, AlertTriangle, Edit, Trash2, X, User, ArrowDown, Settings, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function CurrentStateView({ activeProject }: { activeProject: string }) {
  const [dbProcesses, setDbProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedProcess, setSelectedProcess] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    type: "Process Flow",
    pain_points: "",
    steps: [] as { id: string, name: string, actor: string, description: string, is_pain_point: boolean }[]
  });

  async function fetchProcesses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('current_state')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching as-is processes:", error);
    else if (data) setDbProcesses(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchProcesses();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `ASIS-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      type: formData.type,
      pain_points: formData.pain_points,
      steps: formData.steps,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('current_state').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('current_state').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving process:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchProcesses();
      if (isEditMode && selectedProcess) setSelectedProcess(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this As-Is Process?")) return;
    setDbProcesses(dbProcesses.filter(p => p.id !== id));
    setSelectedProcess(null);
    const { error } = await supabase.from('current_state').delete().eq('id', id);
    if (error) fetchProcesses();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows: any[] = [];

    // Flatten processes and their child steps into rows
    dbProcesses.forEach(proc => {
      const stepsList = proc.steps || [];
      if (stepsList.length === 0) {
        formattedRows.push({
          "Process ID": proc.id,
          "Process Name": proc.title,
          "Type": proc.type,
          "Overall Pain Points": proc.pain_points || "N/A",
          "Step Number": "N/A",
          "Step Name": "No steps mapped.",
          "Actor / System": "N/A",
          "Step Description": "N/A",
          "Is Bottleneck?": "N/A"
        });
      } else {
        stepsList.forEach((step: any, index: number) => {
          formattedRows.push({
            "Process ID": proc.id,
            "Process Name": proc.title,
            "Type": proc.type,
            "Overall Pain Points": proc.pain_points || "N/A",
            "Step Number": index + 1,
            "Step Name": step.name || "Unnamed Step",
            "Actor / System": step.actor || "N/A",
            "Step Description": step.description || "N/A",
            "Is Bottleneck?": step.is_pain_point ? "YES" : "NO"
          });
        });
      }
    });

    const columnWidths = [
      { wch: 12 }, // Process ID
      { wch: 25 }, // Process Name
      { wch: 15 }, // Type
      { wch: 35 }, // Overall Pain Points
      { wch: 12 }, // Step Number
      { wch: 25 }, // Step Name
      { wch: 20 }, // Actor / System
      { wch: 35 }, // Step Description
      { wch: 15 }  // Is Bottleneck
    ];

    exportToExcel(formattedRows, "Current State Flows", `Current_State_AsIs_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbProcesses.map(proc => {
      const stepsText = (proc.steps || []).map((s: any, idx: number) => 
        `[Step ${idx + 1}] ${s.name || "Unnamed Step"}\n• Actor/System: ${s.actor || "Unknown"}\n• Description: ${s.description || "No description."}${s.is_pain_point ? "\n⚠️ CRITICAL BOTTLENECK" : ""}`
      ).join("\n\n");

      return {
        id: proc.id,
        title: proc.title,
        details: [
          { label: "Flow Type", value: proc.type, isMeta: true },
          { label: "Total Steps", value: String(proc.steps ? proc.steps.length : 0), isMeta: true },
          { label: "Overall Pain Points / Root Cause Hypothesis", value: proc.pain_points || "None provided.", color: "A93226" },
          { label: "Sequential Step Details", value: stepsText || "No workflow steps mapped." }
        ]
      };
    });

    exportToWordBrief("Current State Discovery Analysis Report", activeProject, structuredItems, `Current_State_Brief_${activeProject}`);
  }

  // --- Dynamic Step Management ---
  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { id: `s${Date.now()}`, name: "", actor: "", description: "", is_pain_point: false }]
    });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = [...formData.steps];
    newSteps.splice(index, 1);
    setFormData({ ...formData, steps: newSteps });
  };

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", type: "Process Flow", pain_points: "", steps: [] });
    setIsFormOpen(true);
  }

  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      type: item.type,
      pain_points: item.pain_points || "",
      steps: item.steps || []
    });
    setIsFormOpen(true);
    setSelectedProcess(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "Data Flow": return <Layers size={14} className="text-violet-500" />;
      case "Architecture": return <Settings size={14} className="text-emerald-500" />;
      default: return <GitMerge size={14} className="text-blue-500" />; // Process
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Current State (As-Is)"
        sub={`Process discovery and bottleneck identification for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Map Process
            </Btn>
          </div>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading processes...</div>
      ) : dbProcesses.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <GitCommit size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No As-Is flows mapped</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Map out current workflows to identify pain points and bottlenecks.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Process</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbProcesses.map(proc => {
            const painPointCount = proc.steps ? proc.steps.filter((s:any) => s.is_pain_point).length : 0;
            
            return (
              <div 
                key={proc.id} 
                onClick={() => setSelectedProcess(proc)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">{proc.id}</Badge>
                  {painPointCount > 0 && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 flex gap-1">
                      <AlertTriangle size={10} /> {painPointCount} Bottlenecks
                    </Badge>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">{proc.title}</h3>
                
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-4">
                  {getTypeIcon(proc.type)} {proc.type}
                </div>
                
                <div className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {proc.pain_points || "No overall pain points defined."}
                </div>
                
                <div className="pt-3 border-t border-border mt-auto flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {proc.steps ? proc.steps.length : 0} Total Steps mapped
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* READ: VISUAL FLOWCHART MODAL */}
      {selectedProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedProcess.id}</Badge>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {getTypeIcon(selectedProcess.type)} {selectedProcess.type}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(selectedProcess)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedProcess.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedProcess(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedProcess.title}</h2>
                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Overall Pain Points / Root Cause Hypothesis</h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedProcess.pain_points || <span className="italic opacity-50">Not defined.</span>}
                  </div>
                </div>
              </div>

              {/* AUTOMATIC VISUAL FLOWCHART */}
              <div className="pt-4">
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                  <GitMerge size={16} className="text-primary" /> Visual Process Map
                </h3>
                
                {(!selectedProcess.steps || selectedProcess.steps.length === 0) ? (
                  <div className="text-sm text-muted-foreground italic">No steps have been mapped for this process yet.</div>
                ) : (
                  <div className="relative pl-6 space-y-6">
                    {/* The vertical connector line */}
                    <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border z-0" />
                    
                    {selectedProcess.steps.map((step: any, idx: number) => (
                      <div key={step.id || idx} className="relative z-10 flex gap-4">
                        {/* Flow Node */}
                        <div className="flex flex-col items-center mt-1.5">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-bold bg-card",
                            step.is_pain_point ? "border-red-500 text-red-500" : "border-primary text-primary"
                          )}>
                            {idx + 1}
                          </div>
                        </div>
                        
                        {/* Flow Content Card */}
                        <div className={cn(
                          "flex-1 border rounded-lg p-4 shadow-sm",
                          step.is_pain_point ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50" : "bg-card border-border"
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-foreground text-sm">{step.name || "Unnamed Step"}</h4>
                            {step.is_pain_point && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 text-[10px]"><AlertTriangle size={10} className="mr-1"/> Bottleneck</Badge>}
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <User size={12} /> Actor/System: <span className="font-medium text-foreground">{step.actor || "Unknown"}</span>
                          </div>
                          
                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-2 bg-background/50 p-2 rounded border border-border/50">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Generated automatically from step data.</span>
              <Btn variant="secondary" onClick={() => setSelectedProcess(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL (DYNAMIC STEPS) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitCommit size={18} className="text-blue-500" /> {isEditMode ? "Edit As-Is Process" : "Map New As-Is Process"}
              </h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Meta Data */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Process / Flow Name</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Legacy User Authentication" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                    <select 
                      value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>Process Flow</option>
                      <option>Architecture</option>
                      <option>Data Flow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Overall Pain Points (Optional)</label>
                  <textarea 
                    rows={2}
                    value={formData.pain_points} onChange={e => setFormData({...formData, pain_points: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="Summary of why this process is broken..." 
                  />
                </div>

                {/* Dynamic Steps Builder */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Process Steps Builder</h3>
                    <Btn type="button" variant="secondary" onClick={addStep}><Plus size={12}/> Add Step</Btn>
                  </div>
                  
                  {formData.steps.length === 0 ? (
                    <div className="text-center p-6 bg-muted/30 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                      No steps added. Click "Add Step" to start building your flow.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.steps.map((step, index) => (
                        <div key={step.id} className="bg-muted/20 border border-border rounded-lg p-3 relative flex gap-3 group">
                          <div className="flex flex-col items-center justify-center px-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                              {index + 1}
                            </span>
                            {index < formData.steps.length - 1 && <ArrowDown size={12} className="text-muted-foreground mt-2 opacity-50" />}
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input 
                                required placeholder="Action / Event Name"
                                value={step.name} onChange={e => updateStep(index, "name", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" 
                              />
                              <input 
                                placeholder="Actor / System (e.g. End User)"
                                value={step.actor} onChange={e => updateStep(index, "actor", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" 
                              />
                            </div>
                            <input 
                              placeholder="Additional details or description..."
                              value={step.description} onChange={e => updateStep(index, "description", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" 
                            />
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" id={`pain-${step.id}`}
                                checked={step.is_pain_point} onChange={e => updateStep(index, "is_pain_point", e.target.checked)}
                                className="w-3.5 h-3.5 accent-red-500 rounded border-red-300"
                              />
                              <label htmlFor={`pain-${step.id}`} className="text-xs text-red-600 dark:text-red-400 font-medium cursor-pointer flex items-center gap-1">
                                <AlertTriangle size={12} /> Mark as Bottleneck / Pain Point
                              </label>
                            </div>
                          </div>

                          <button 
                            type="button" onClick={() => removeStep(index)}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Generate Process Map")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}