import { useState, useEffect } from "react";
import { Plus, Download, List, Edit, Trash2, X, Wand2, CheckCircle2, AlertTriangle, FileText, Target, Layers, Filter, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function AllRequirementsView({ activeProject }: { activeProject: string }) {
  const [dbRequirements, setDbRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  
  // 💡 FIXED: Restored missing initialization of accordion visibility state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Functional", "Non-Functional", "Business", "UI/UX"]));

  // View & Form States
  const [selectedRequirement, setSelectedRequirement] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    req_id: "",
    title: "",
    type: "Functional",
    description: "",
    priority: "Must Have",
    status: "Draft"
  });

  async function fetchRequirements() {
    setLoading(true);
    const { data, error } = await supabase
      .from('all_requirements')
      .select('*')
      .eq('project_name', activeProject)
      .order('req_id', { ascending: true });

    if (error) console.error("Error fetching requirements:", error);
    else if (data) setDbRequirements(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchRequirements();
  }, [activeProject]);

  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  };

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `REQ-SYS-${Math.floor(Math.random() * 90000)}`,
      req_id: formData.req_id,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('all_requirements').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('all_requirements').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving requirement:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchRequirements();
      if (isEditMode && selectedRequirement) setSelectedRequirement(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this requirement?")) return;
    setDbRequirements(dbRequirements.filter(r => r.id !== id));
    setSelectedRequirement(null);
    const { error } = await supabase.from('all_requirements').delete().eq('id', id);
    if (error) fetchRequirements();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = filteredRequirements.map(req => ({
      "Requirement ID": req.req_id,
      "Title": req.title,
      "Classification Type": req.type || "Functional",
      "MoSCoW Priority": req.priority || "Must Have",
      "Lifecycle Status": req.status || "Draft",
      "Requirement Definition / Specification": req.description || ""
    }));

    const columnWidths = [
      { wch: 18 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 60 }
    ];

    exportToExcel(formattedRows, "Master Requirements Registry", `Master_Requirements_Log_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = filteredRequirements.map(req => {
      const priorityColor = req.priority === "Must Have" ? "C0392B" : req.priority === "Should Have" ? "D35400" : "2E86C1";
      
      return {
        id: req.req_id,
        title: req.title,
        details: [
          { label: "Classification Type", value: req.type, isMeta: true },
          { label: "Current Review Status", value: req.status, isMeta: true },
          { label: "MoSCoW Priority Matrix", value: req.priority, color: priorityColor },
          { label: "Requirement Definition Specification", value: req.description || "No qualitative specifications defined." }
        ]
      };
    });

    exportToWordBrief("Master Business & Functional Requirements Specifications Baseline", activeProject, structuredItems, `Master_Requirements_Specification_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      description: "The system shall [perform what action/behavior] for [which user/actor] when [what trigger condition occurs]."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbRequirements.length + 1;
    const nextReqId = `REQ-${nextNum.toString().padStart(3, '0')}`;
    
    setFormData({ id: "", req_id: nextReqId, title: "", type: "Functional", description: "", priority: "Must Have", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      req_id: item.req_id,
      title: item.title,
      type: item.type || "Functional",
      description: item.description || "",
      priority: item.priority || "Must Have",
      status: item.status || "Draft"
    });
    setIsFormOpen(true);
    setSelectedRequirement(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "Must Have": return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200";
      case "Should Have": return "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200";
      case "Could Have": return "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200";
      default: return "text-slate-700 bg-slate-100 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Implemented": return "bg-violet-100 text-violet-700 border-violet-200";
      case "In Review": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filteredRequirements = dbRequirements.filter(req => {
    const matchType = filterType === "All" || req.type === filterType;
    const matchPriority = filterPriority === "All" || req.priority === filterPriority;
    return matchType && matchPriority;
  });

  const uniqueTypes = ["Functional", "Non-Functional", "Business", "UI/UX"];
  const mustHaveCount = dbRequirements.filter(r => r.priority === "Must Have").length;
  const approvedCount = dbRequirements.filter(r => r.status === "Approved" || r.status === "Implemented").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Master Requirements List"
        sub={`Consolidated functional and non-functional requirements for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><Download size={13} /> Word Baseline</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Requirement
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Must Haves (MVP Scope)</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{mustHaveCount}</div>
          </div>
          <Target className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Documented</div>
            <div className="text-2xl font-bold">{dbRequirements.length}</div>
          </div>
          <List className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved / Baseline</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {/* FILTERS */}
      <Card className="p-3 bg-muted/40 border border-border flex flex-wrap gap-6 items-center shadow-xs shrink-0 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1.5">
          <Filter size={13} /> Grid Matrices Filters:
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Type:</span>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-background border border-border/80 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
          >
            <option value="All">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">MoSCoW Matrix:</span>
          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-background border border-border/80 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
          >
            <option value="All">All Priorities</option>
            <option value="Must Have">Must Have</option>
            <option value="Should Have">Should Have</option>
            <option value="Could Have">Could Have</option>
            <option value="Won't Have">Won't Have</option>
          </select>
        </div>

        {(filterType !== "All" || filterPriority !== "All") && (
          <button 
            onClick={() => { setFilterType("All"); setFilterPriority("All"); }}
            className="text-[10px] font-bold uppercase text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded transition-colors ml-auto"
          >
            Reset Filters
          </button>
        )}
      </Card>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading requirements...</div>
      ) : filteredRequirements.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <List size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Requirements Match Filters</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Try relaxing your dropdown filter matrices combinations.</p>
          <Btn variant="secondary" onClick={() => { setFilterType("All"); setFilterPriority("All"); }}>Clear Active Criteria</Btn>
        </Card>
      ) : (
        <div className="space-y-3">
          {uniqueTypes.map(type => {
            const requirementsInGroup = filteredRequirements.filter(r => r.type === type);
            if (filterType !== "All" && filterType !== type) return null;
            if (requirementsInGroup.length === 0) return null;

            const isOpen = expandedGroups.has(type);

            return (
              <div key={type} className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleGroup(type)}
                  className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors select-none text-left"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                    <span className="text-sm font-bold text-foreground">{type} Specifications</span>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] px-2 font-mono">{requirementsInGroup.length}</Badge>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 bg-background/30 divide-y divide-border/60">
                    {requirementsInGroup.map(req => (
                      <div 
                        key={req.id}
                        onClick={() => setSelectedRequirement(req)}
                        className="py-3.5 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 px-2 rounded-lg transition-colors group"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <Badge className="bg-primary/10 text-primary font-mono text-[10px] mt-0.5 border-primary/20 shrink-0">{req.req_id}</Badge>
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{req.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1 pr-4">{req.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 flex-wrap md:flex-nowrap justify-end">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                            <Clock size={11} />
                            <span>Mod: {new Date(req.updated_at || req.created_at).toLocaleDateString(undefined, {month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <Badge className={cn("text-[9px] px-1.5 py-0 border-none font-bold shrink-0", getPriorityColor(req.priority))}>{req.priority}</Badge>
                          <Badge className={cn("text-[9px] px-1.5 py-0 border-none shrink-0", getStatusBadge(req.status))}>{req.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedRequirement.req_id}</Badge>
                <Badge className={getStatusBadge(selectedRequirement.status)}>{selectedRequirement.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedRequirement, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedRequirement.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete"><Trash2 size={16} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedRequirement(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedRequirement.title}</h2>
                <div className="flex items-center gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between max-w-[200px] w-full">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</span>
                    <Badge className={cn("text-[10px]", getPriorityColor(selectedRequirement.priority))}>{selectedRequirement.priority}</Badge>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between max-w-[200px] w-full">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
                    <span className="text-sm font-medium text-foreground">{selectedRequirement.type}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-blue-700 dark:text-blue-400"><FileText size={14} /> Requirement Definition</h3>
                  <div className="text-base font-medium text-foreground whitespace-pre-wrap leading-relaxed">{selectedRequirement.description}</div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedRequirement.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedRequirement(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><List size={18} className="text-blue-500" /> {isEditMode ? "Edit Requirement" : "Add Requirement"}</h2>
              <div className="flex items-center gap-3">
                {!isEditMode && <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded"><Wand2 size={12} /> Load Syntax Template</button>}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Req ID</label>
                  <input required value={formData.req_id} onChange={e => setFormData({...formData, req_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
                  <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none" placeholder="e.g. SSO Authentication" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none">
                    <option>Functional</option>
                    <option>Non-Functional</option>
                    <option>Business</option>
                    <option>UI/UX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">MoSCoW Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none">
                    <option>Must Have</option>
                    <option>Should Have</option>
                    <option>Could Have</option>
                    <option>Won't Have</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none">
                    <option>Draft</option>
                    <option>In Review</option>
                    <option>Approved</option>
                    <option>Implemented</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Requirement Definition</label>
                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 text-sm bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-md focus:outline-none font-medium" placeholder="The system shall..." />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Requirement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}