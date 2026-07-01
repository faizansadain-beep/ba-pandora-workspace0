import { useState, useEffect } from "react";
import { Plus, Download, Briefcase, FileText, CheckCircle2, FileSignature, Edit, Trash2, X, Wand2, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function BusinessCaseView({ activeProject }: { activeProject: string }) {
  const [dbCases, setDbCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    executive_summary: "",
    business_problem: "",
    proposed_solution: "",
    financials: "",
    status: "Draft"
  });

  async function fetchCases() {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_cases')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching business cases:", error);
    else if (data) setDbCases(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchCases();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `BC-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      executive_summary: formData.executive_summary,
      business_problem: formData.business_problem,
      proposed_solution: formData.proposed_solution,
      financials: formData.financials,
      status: formData.status,
      author: "Current User", // In a real app, pull from session
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('business_cases').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('business_cases').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving business case:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchCases();
      if (isEditMode && selectedCase) setSelectedCase(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this Business Case? This cannot be undone.")) return;
    setDbCases(dbCases.filter(c => c.id !== id));
    setSelectedCase(null);
    const { error } = await supabase.from('business_cases').delete().eq('id', id);
    if (error) fetchCases();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbCases.map(item => ({
      "Case ID": item.id,
      "Title": item.title,
      "Executive Summary": item.executive_summary || "N/A",
      "Business Problem": item.business_problem || "N/A",
      "Proposed Solution": item.proposed_solution || "N/A",
      "Financial Analysis & ROI": item.financials || "N/A",
      "Status": item.status,
      "Author": item.author || "N/A",
      "Date Created": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 12 }, // Case ID
      { wch: 25 }, // Title
      { wch: 45 }, // Executive Summary
      { wch: 45 }, // Business Problem
      { wch: 45 }, // Proposed Solution
      { wch: 35 }, // Financials
      { wch: 12 }, // Status
      { wch: 15 }, // Author
      { wch: 15 }  // Date Created
    ];

    exportToExcel(formattedRows, "Business Cases", `Business_Cases_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbCases.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Author", value: item.author || "N/A", isMeta: true },
        { label: "Status", value: item.status, isMeta: true },
        { label: "Executive Summary", value: item.executive_summary || "None provided." },
        { label: "Business Problem", value: item.business_problem || "None provided.", color: "A93226" },
        { label: "Proposed Solution", value: item.proposed_solution || "None provided.", color: "1A5276" },
        { label: "Financial Analysis & ROI", value: item.financials || "None provided." }
      ]
    }));

    exportToWordBrief("Business Case Proposal Document", activeProject, structuredItems, `Business_Cases_Brief_${activeProject}`);
  }

  // --- Helpers & Templates ---
  function loadTemplate() {
    setFormData({
      ...formData,
      executive_summary: "Provide a high-level overview of the project, its strategic alignment, and expected outcomes.",
      business_problem: "Describe the current pain points, operational inefficiencies, or missed market opportunities. What happens if we do nothing?",
      proposed_solution: "Detail the recommended approach, core deliverables, and why this is the optimal choice over alternatives.",
      financials: "Estimated Cost: $X\nExpected Benefit: $Y per year\nROI: Z%\nPayback Period: N months"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", executive_summary: "", business_problem: "", proposed_solution: "", financials: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      executive_summary: item.executive_summary || "",
      business_problem: item.business_problem || "",
      proposed_solution: item.proposed_solution || "",
      financials: item.financials || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedCase(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Review": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Business Cases"
        sub={`Project justification and ROI for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Draft Business Case
            </Btn>
          </div>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading business cases...</div>
      ) : dbCases.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Briefcase size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Business Cases found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define the problem, solution, and ROI to get approval.</p>
          <Btn variant="secondary" onClick={openNewForm}>Draft First Case</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbCases.map(bc => (
            <div 
              key={bc.id} 
              onClick={() => setSelectedCase(bc)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">{bc.id}</Badge>
                <Badge className={getStatusColor(bc.status)}>{bc.status}</Badge>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">{bc.title}</h3>
              
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                {bc.executive_summary || "No executive summary provided."}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileSignature size={12} /> {bc.author}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(bc.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono px-2">{selectedCase.id}</Badge>
                <Badge className={getStatusColor(selectedCase.status)}>{selectedCase.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(selectedCase)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedCase.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedCase(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">{selectedCase.title}</h2>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Prepared by: {selectedCase.author}</span>
                  <span>•</span>
                  <span>{new Date(selectedCase.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-primary border-b border-border pb-1">
                    <FileText size={14} /> Executive Summary
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedCase.executive_summary || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-primary border-b border-border pb-1">
                    <AlertTriangle size={14} /> Business Problem
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedCase.business_problem || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-primary border-b border-border pb-1">
                    <CheckCircle2 size={14} /> Proposed Solution
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedCase.proposed_solution || <span className="text-muted-foreground italic">Not provided.</span>}
                  </div>
                </section>

                <section className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold mb-2 text-foreground">Financial Analysis & ROI</h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                    {selectedCase.financials || <span className="text-muted-foreground italic">No financial data provided.</span>}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Project: {selectedCase.project_name}</span>
              <Btn variant="secondary" onClick={() => setSelectedCase(null)}>Close</Btn>
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
                <Briefcase size={18} className="text-blue-500" /> {isEditMode ? "Edit Business Case" : "Draft Business Case"}
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
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Identity Management Overhaul" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Draft</option>
                    <option>In Review</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Executive Summary</label>
                <textarea 
                  required rows={3}
                  value={formData.executive_summary} onChange={e => setFormData({...formData, executive_summary: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Problem</label>
                  <textarea 
                    rows={4}
                    value={formData.business_problem} onChange={e => setFormData({...formData, business_problem: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Proposed Solution</label>
                  <textarea 
                    rows={4}
                    value={formData.proposed_solution} onChange={e => setFormData({...formData, proposed_solution: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Financials & ROI</label>
                <textarea 
                  rows={3}
                  value={formData.financials} onChange={e => setFormData({...formData, financials: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Cost, Benefits, ROI..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Business Case")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}