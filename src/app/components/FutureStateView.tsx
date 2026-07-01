import { useState, useEffect } from "react";
import { Plus, Download, GitMerge, CheckCircle2, ArrowRightLeft, Edit, Trash2, X, User, ArrowDown, Wand2, Lightbulb, Zap, AlertTriangle, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function FutureStateView({ activeProject }: { activeProject: string }) {
  const [dbFuture, setDbFuture] = useState<any[]>([]);
  const [dbAsIs, setDbAsIs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedProcess, setSelectedProcess] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    as_is_id: "",
    expected_benefits: "",
    recommendations: "",
    status: "Proposed",
    steps: [] as { id: string, name: string, actor: string, description: string, is_improvement: boolean }[]
  });

  async function fetchData() {
    setLoading(true);
    // Fetch BOTH tables so we can link them
    const [futureRes, asIsRes] = await Promise.all([
      supabase.from('future_state').select('*').eq('project_name', activeProject).order('created_at', { ascending: false }),
      supabase.from('current_state').select('*').eq('project_name', activeProject)
    ]);

    if (futureRes.data) setDbFuture(futureRes.data);
    if (asIsRes.data) setDbAsIs(asIsRes.data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `TOBE-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      as_is_id: formData.as_is_id || null,
      expected_benefits: formData.expected_benefits,
      recommendations: formData.recommendations,
      status: formData.status,
      steps: formData.steps,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('future_state').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('future_state').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving process:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedProcess) setSelectedProcess(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this Future State Process?")) return;
    setDbFuture(dbFuture.filter(p => p.id !== id));
    setSelectedProcess(null);
    const { error } = await supabase.from('future_state').delete().eq('id', id);
    if (error) fetchData();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows: any[] = [];

    dbFuture.forEach(proc => {
      const linkedAsIs = dbAsIs.find(a => a.id === proc.as_is_id);
      const stepsList = proc.steps || [];

      if (stepsList.length === 0) {
        formattedRows.push({
          "To-Be ID": proc.id,
          "Future State Title": proc.title,
          "Baseline ID (As-Is)": linkedAsIs ? linkedAsIs.id : "N/A",
          "Baseline Name": linkedAsIs ? linkedAsIs.title : "N/A",
          "Expected Benefits & ROI": proc.expected_benefits || "N/A",
          "Key Recommendations": proc.recommendations || "N/A",
          "Status": proc.status,
          "Step Sequence": "N/A",
          "Optimized Step Name": "No steps mapped.",
          "Responsible Actor / System": "N/A",
          "Step Details": "N/A",
          "Is Highlighted Optimization?": "N/A"
        });
      } else {
        stepsList.forEach((step: any, index: number) => {
          formattedRows.push({
            "To-Be ID": proc.id,
            "Future State Title": proc.title,
            "Baseline ID (As-Is)": linkedAsIs ? linkedAsIs.id : "N/A",
            "Baseline Name": linkedAsIs ? linkedAsIs.title : "N/A",
            "Expected Benefits & ROI": proc.expected_benefits || "N/A",
            "Key Recommendations": proc.recommendations || "N/A",
            "Status": proc.status,
            "Step Sequence": index + 1,
            "Optimized Step Name": step.name || "Unnamed Step",
            "Responsible Actor / System": step.actor || "N/A",
            "Step Details": step.description || "N/A",
            "Is Highlighted Optimization?": step.is_improvement ? "YES" : "NO"
          });
        });
      }
    });

    const columnWidths = [
      { wch: 12 }, // To-Be ID
      { wch: 25 }, // Future State Title
      { wch: 18 }, // Baseline ID
      { wch: 25 }, // Baseline Name
      { wch: 35 }, // Expected Benefits
      { wch: 35 }, // Key Recommendations
      { wch: 12 }, // Status
      { wch: 12 }, // Step Sequence
      { wch: 25 }, // Step Name
      { wch: 20 }, // Actor / System
      { wch: 35 }, // Step Details
      { wch: 22 }  // Is Optimization
    ];

    exportToExcel(formattedRows, "Future State Designs", `Future_State_ToBe_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbFuture.map(proc => {
      const linkedAsIs = dbAsIs.find(a => a.id === proc.as_is_id);
      const stepsText = (proc.steps || []).map((s: any, idx: number) => 
        `[Optimized Step ${idx + 1}] ${s.name || "Unnamed Step"}\n• Target Actor/System: ${s.actor || "Unknown"}\n• Design Details: ${s.description || "No specific details."}${s.is_improvement ? "\n⭐ KEY EFFICIENCY OPTIMIZATION" : ""}`
      ).join("\n\n");

      return {
        id: proc.id,
        title: proc.title,
        details: [
          { label: "Design Status", value: proc.status, isMeta: true },
          { label: "Linked As-Is Baseline", value: linkedAsIs ? `${linkedAsIs.title} (${linkedAsIs.id})` : "None baseline mapped.", isMeta: true },
          { label: "Expected Benefits & ROI Analysis", value: proc.expected_benefits || "None documented.", color: "117A43" },
          { label: "Key Architectural Recommendations", value: proc.recommendations || "None documented.", color: "1A5276" },
          { label: "Proposed Future Process Workflow Layout", value: stepsText || "No future state workflow steps built yet." }
        ]
      };
    });

    exportToWordBrief("Future State Solution Design Brief", activeProject, structuredItems, `Future_State_Design_Brief_${activeProject}`);
  }

  // --- BA Tool: Clone As-Is Baseline ---
  function loadFromAsIs() {
    if (!formData.as_is_id) {
      alert("Please select a Baseline As-Is Process first!");
      return;
    }
    const baseline = dbAsIs.find(a => a.id === formData.as_is_id);
    if (baseline && baseline.steps) {
      // Map pain points to standard steps so the BA can optimize them
      const clonedSteps = baseline.steps.map((s: any) => ({
        ...s,
        id: `tobe-${s.id}`,
        is_improvement: false // reset this flag for the future state
      }));
      setFormData({ ...formData, steps: clonedSteps });
    }
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      expected_benefits: "Quantify the ROI: e.g. 'Reduces processing time by 80%, saves $45k annually, eliminates manual data entry.'",
      recommendations: "1. Automate Step X using API.\n2. Bypass legacy server Y.\n3. Add validation at Step Z."
    });
  }

  // --- Dynamic Step Management ---
  const addStep = () => setFormData({ ...formData, steps: [...formData.steps, { id: `ts${Date.now()}`, name: "", actor: "", description: "", is_improvement: false }] });
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
    setFormData({ id: "", title: "", as_is_id: "", expected_benefits: "", recommendations: "", status: "Proposed", steps: [] });
    setIsFormOpen(true);
  }
  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      as_is_id: item.as_is_id || "",
      expected_benefits: item.expected_benefits || "",
      recommendations: item.recommendations || "",
      status: item.status,
      steps: item.steps || []
    });
    setIsFormOpen(true);
    setSelectedProcess(null);
  }
  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Proposed": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Future State (To-Be)"
        sub={`Optimized workflows and solution designs for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Design Future State
            </Btn>
          </div>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading future states...</div>
      ) : dbFuture.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Wand2 size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No To-Be flows designed</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Design optimized workflows to replace current bottlenecks.</p>
          <Btn variant="secondary" onClick={openNewForm}>Design First Process</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbFuture.map(proc => {
            const linkedAsIs = dbAsIs.find(a => a.id === proc.as_is_id);
            const improvementCount = proc.steps ? proc.steps.filter((s:any) => s.is_improvement).length : 0;
            
            return (
              <div 
                key={proc.id} 
                onClick={() => setSelectedProcess(proc)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">{proc.id}</Badge>
                  <Badge className={getStatusColor(proc.status)}>{proc.status}</Badge>
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-1 leading-tight">{proc.title}</h3>
                
                {linkedAsIs ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 bg-muted/50 w-fit px-2 py-1 rounded border border-border">
                    <ArrowRightLeft size={12} /> Resolves: {linkedAsIs.title} ({linkedAsIs.id})
                  </div>
                ) : (
                  <div className="mb-4 text-xs text-muted-foreground italic">No baseline linked.</div>
                )}
                
                <div className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {proc.expected_benefits || "No benefits documented."}
                </div>
                
                <div className="pt-3 border-t border-border mt-auto flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {proc.steps ? proc.steps.length : 0} Steps mapped
                  </div>
                  {improvementCount > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 text-[10px]">
                       {improvementCount} Optimizations
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* READ: SIDE-BY-SIDE VISUAL COMPARISON MODAL */}
      {selectedProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-6xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedProcess.id}</Badge>
                <Badge className={getStatusColor(selectedProcess.status)}>{selectedProcess.status}</Badge>
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

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Header Info */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedProcess.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1"><Zap size={14}/> Expected Benefits & ROI</h3>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedProcess.expected_benefits || <span className="italic opacity-50">Not defined.</span>}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1"><Lightbulb size={14}/> Key Recommendations</h3>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedProcess.recommendations || <span className="italic opacity-50">Not defined.</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* AUTOMATIC SIDE-BY-SIDE VISUAL FLOWCHART */}
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-8">
                  
                  {/* LEFT: Current State (As-Is) */}
                  <div>
                    <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-muted-foreground">
                      <GitMerge size={16} /> Baseline (As-Is)
                    </h3>
                    
                    {(() => {
                      const linkedAsIs = dbAsIs.find(a => a.id === selectedProcess.as_is_id);
                      if (!linkedAsIs) return <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg">No baseline process linked.</div>;
                      if (!linkedAsIs.steps || linkedAsIs.steps.length === 0) return <div className="text-sm text-muted-foreground italic">Linked process has no steps.</div>;
                      
                      return (
                        <div className="relative pl-6 space-y-6 opacity-70">
                          <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border z-0" />
                          {linkedAsIs.steps.map((step: any, idx: number) => (
                            <div key={idx} className="relative z-10 flex gap-4">
                              <div className="flex flex-col items-center mt-1.5">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-bold bg-card", step.is_pain_point ? "border-red-500 text-red-500" : "border-muted-foreground text-muted-foreground")}>{idx + 1}</div>
                              </div>
                              <div className={cn("flex-1 border rounded-lg p-3 shadow-sm", step.is_pain_point ? "bg-red-50/50 dark:bg-red-900/10 border-red-200" : "bg-card border-border")}>
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-semibold text-foreground text-sm">{step.name}</h4>
                                  {step.is_pain_point && <Badge className="bg-red-100 text-red-700 text-[9px]"><AlertTriangle size={10} className="mr-1"/> Bottleneck</Badge>}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><User size={10} /> {step.actor}</div>
                                {step.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{step.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* RIGHT: Future State (To-Be) */}
                  <div>
                    <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-primary">
                      <Wand2 size={16} /> Optimized Flow (To-Be)
                    </h3>
                    
                    {(!selectedProcess.steps || selectedProcess.steps.length === 0) ? (
                      <div className="text-sm text-muted-foreground italic">No steps mapped for future state.</div>
                    ) : (
                      <div className="relative pl-6 space-y-6">
                        <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border z-0" />
                        {selectedProcess.steps.map((step: any, idx: number) => (
                          <div key={idx} className="relative z-10 flex gap-4">
                            <div className="flex flex-col items-center mt-1.5">
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-bold bg-card", step.is_improvement ? "border-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "border-primary text-primary")}>{idx + 1}</div>
                            </div>
                            <div className={cn("flex-1 border rounded-lg p-3 shadow-sm", step.is_improvement ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50" : "bg-card border-border")}>
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-foreground text-sm">{step.name}</h4>
                                {step.is_improvement && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px]"><CheckCircle2 size={10} className="mr-1"/> Optimized</Badge>}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><User size={10} /> {step.actor}</div>
                              {step.description && <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-1.5 rounded border border-border/50">{step.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10 shrink-0 flex justify-end">
              <Btn variant="secondary" onClick={() => setSelectedProcess(null)}>Close Comparison</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 size={18} className="text-blue-500" /> {isEditMode ? "Edit Future State" : "Design Future State"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <FileText size={12} /> Load Details Template
                  </button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Meta Data */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Future State Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Modern SSO Authentication" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>Draft</option>
                      <option>Proposed</option>
                      <option>Approved</option>
                    </select>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link to Baseline (As-Is Process)</label>
                    <select 
                      value={formData.as_is_id} onChange={e => setFormData({...formData, as_is_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- Select an As-Is Process --</option>
                      {dbAsIs.map(a => <option key={a.id} value={a.id}>{a.title} ({a.id})</option>)}
                    </select>
                  </div>
                  <Btn type="button" variant="secondary" onClick={loadFromAsIs} className="whitespace-nowrap bg-background">
                    <ArrowRightLeft size={13} className="mr-1"/> Clone Steps from Baseline
                  </Btn>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Expected Benefits / ROI</label>
                    <textarea 
                      rows={3}
                      value={formData.expected_benefits} onChange={e => setFormData({...formData, expected_benefits: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Key Recommendations</label>
                    <textarea 
                      rows={3}
                      value={formData.recommendations} onChange={e => setFormData({...formData, recommendations: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                </div>

                {/* Dynamic Steps Builder */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Future Process Steps Builder</h3>
                    <Btn type="button" variant="secondary" onClick={addStep}><Plus size={12}/> Add Step</Btn>
                  </div>
                  
                  {formData.steps.length === 0 ? (
                    <div className="text-center p-6 bg-muted/30 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                      No steps added. Build from scratch or select an As-Is baseline and click "Clone Steps".
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
                                placeholder="Actor / System"
                                value={step.actor} onChange={e => updateStep(index, "actor", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" 
                              />
                            </div>
                            <input 
                              placeholder="Description of the optimized action..."
                              value={step.description} onChange={e => updateStep(index, "description", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" 
                            />
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" id={`opt-${step.id}`}
                                checked={step.is_improvement} onChange={e => updateStep(index, "is_improvement", e.target.checked)}
                                className="w-3.5 h-3.5 accent-emerald-500 rounded border-emerald-300 cursor-pointer"
                              />
                              <label htmlFor={`opt-${step.id}`} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer flex items-center gap-1">
                                <CheckCircle2 size={12} /> Highlight as Optimization / Improvement
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
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Future State")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}