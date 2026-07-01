import { useState, useEffect } from "react";
import { Plus, Download, Link2, AlertOctagon, Clock, CheckCircle2, AlertTriangle, Edit, Trash2, X, Wand2, Calendar, GitCommit } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function DependenciesView({ activeProject }: { activeProject: string }) {
  const [dbDependencies, setDbDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedDependency, setSelectedDependency] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    type: "Internal",
    depends_on: "",
    impact_of_delay: "",
    target_date: "",
    status: "Pending"
  });

  async function fetchDependencies() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dependencies')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching dependencies:", error);
    else if (data) setDbDependencies(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchDependencies();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `DEP-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      type: formData.type,
      depends_on: formData.depends_on,
      impact_of_delay: formData.impact_of_delay,
      target_date: formData.target_date || null,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('dependencies').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('dependencies').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving dependency:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchDependencies();
      if (isEditMode && selectedDependency) setSelectedDependency(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Dependency?")) return;
    setDbDependencies(dbDependencies.filter(d => d.id !== id));
    setSelectedDependency(null);
    const { error } = await supabase.from('dependencies').delete().eq('id', id);
    if (error) fetchDependencies();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbDependencies.map(item => ({
      "Dependency ID": item.id,
      "Title": item.title,
      "Type": item.type || "Internal",
      "Depends On (Blocker context)": item.depends_on || "N/A",
      "Impact of Delay": item.impact_of_delay || "N/A",
      "Target Date": item.target_date ? new Date(item.target_date).toLocaleDateString() : "TBD",
      "Status": item.status,
      "Date Logged": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 15 }, // Dependency ID
      { wch: 28 }, // Title
      { wch: 15 }, // Type
      { wch: 45 }, // Depends On
      { wch: 45 }, // Impact of Delay
      { wch: 15 }, // Target Date
      { wch: 12 }, // Status
      { wch: 15 }  // Date Logged
    ];

    exportToExcel(formattedRows, "Project Dependencies", `Dependencies_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbDependencies.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Dependency Type", value: item.type || "Internal", isMeta: true },
        { label: "Current Status", value: item.status, isMeta: true },
        { label: "Target Delivery Date", value: item.target_date ? new Date(item.target_date).toLocaleDateString() : "TBD", isMeta: true },
        { label: "Dependency Trigger (Waiting On)", value: item.depends_on || "None provided.", color: "1A5276" },
        { label: "Downstream Impact of Delay", value: item.impact_of_delay || "None provided.", color: "A93226" }
      ]
    }));

    exportToWordBrief("Project Critical Dependencies Registry", activeProject, structuredItems, `Dependencies_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      depends_on: "Waiting on [Team/Person/System] to deliver [Specific Artifact/Feature].",
      impact_of_delay: "If this is not delivered by the target date, [Feature X] cannot be tested, which will delay the Go-Live date by [Y days/weeks]."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", type: "Internal", depends_on: "", impact_of_delay: "", target_date: "", status: "Pending" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      type: item.type || "Internal",
      depends_on: item.depends_on || "",
      impact_of_delay: item.impact_of_delay || "",
      target_date: item.target_date || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedDependency(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Resolved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Blocked": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200"; // Pending
    }
  };

  const pendingCount = dbDependencies.filter(d => d.status === "Pending").length;
  const blockedCount = dbDependencies.filter(d => d.status === "Blocked").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Project Dependencies"
        sub={`Track external blockers and cross-team linkages for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Dependency
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Blocked Dependencies</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{blockedCount}</div>
          </div>
          <AlertOctagon className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Pending / Waiting</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingCount}</div>
          </div>
          <Clock className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Logged</div>
            <div className="text-2xl font-bold">{dbDependencies.length}</div>
          </div>
          <Link2 className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading dependencies...</div>
      ) : dbDependencies.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Link2 size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Dependencies Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Track cross-team linkages and external blockers.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Dependency</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbDependencies.map(dep => (
            <div 
              key={dep.id} 
              onClick={() => setSelectedDependency(dep)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
              style={{ borderLeftColor: dep.status === 'Resolved' ? '#10B981' : dep.status === 'Blocked' ? '#EF4444' : '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{dep.id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(dep.status))}>{dep.status}</Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{dep.title}</h3>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-4">
                <GitCommit size={12} className="text-primary" /> {dep.type} Dependency
              </div>
              
              {/* Visual Linkage */}
              <div className="bg-muted/30 border border-border/50 rounded-lg p-3 mb-4 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Waiting On:</div>
                <div className="text-xs text-foreground line-clamp-2">{dep.depends_on}</div>
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] font-medium pt-3 border-t border-border">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={12} /> Target: {dep.target_date ? new Date(dep.target_date).toLocaleDateString() : "TBD"}
                </span>
                {dep.status === "Blocked" && <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={10}/> Requires Attention</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedDependency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedDependency.id}</Badge>
                <Badge className={getStatusColor(selectedDependency.status)}>{selectedDependency.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedDependency, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedDependency.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedDependency(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-muted px-2 py-0.5 rounded text-xs flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Link2 size={12} /> {selectedDependency.type} Dependency
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedDependency.title}</h2>
                
                <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between max-w-xs">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required By Date</span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedDependency.target_date ? new Date(selectedDependency.target_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "Not Set"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/30 p-5 rounded-lg border border-border relative">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-foreground">
                    <Clock size={14} className="text-blue-500" /> What are we waiting for? (The Block)
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedDependency.depends_on}
                  </div>
                </section>

                <section className="bg-red-50 dark:bg-red-900/10 p-5 rounded-lg border border-red-200 dark:border-red-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-red-700 dark:text-red-400">
                    <AlertOctagon size={14} /> Impact of Delay
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedDependency.impact_of_delay || <span className="text-muted-foreground italic">No impact defined.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedDependency.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedDependency(null)}>Close</Btn>
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
                <Link2 size={18} className="text-blue-500" /> {isEditMode ? "Edit Dependency" : "Log Dependency"}
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
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Dependency Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. HRIS API Endpoint Delivery" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                  <select 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Internal</option>
                    <option>External</option>
                    <option>Technical</option>
                    <option>Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Date</label>
                  <input 
                    type="date"
                    value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Pending</option>
                    <option>Resolved</option>
                    <option>Blocked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Depends On (What are we waiting for?)</label>
                <textarea 
                  required rows={3}
                  value={formData.depends_on} onChange={e => setFormData({...formData, depends_on: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium" 
                  placeholder="State exactly what team/system needs to deliver what artifact..." 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">Impact of Delay</label>
                <textarea 
                  required rows={3}
                  value={formData.impact_of_delay} onChange={e => setFormData({...formData, impact_of_delay: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="If this is late, how does it hurt our project?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Dependency")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}