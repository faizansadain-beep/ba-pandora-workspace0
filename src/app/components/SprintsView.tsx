import { useState, useEffect } from "react";
import { Plus, Download, Timer, FastForward, Edit, Trash2, X, Calendar, Activity, Target } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge, ProgressBar } from "./SharedUI";

export default function SprintsView({ activeProject }: { activeProject: string }) {
  const [dbSprints, setDbSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedSprint, setSelectedSprint] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    start_date: "",
    end_date: "",
    status: "Planning",
    capacity: 0
  });

  async function fetchSprints() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_name', activeProject)
      .order('start_date', { ascending: true });

    if (error) console.error("Error fetching sprints:", error);
    else if (data) setDbSprints(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchSprints();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSaveSprint(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const sprintPayload = {
      id: isEditMode ? formData.id : `SPR-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status,
      capacity: Number(formData.capacity),
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('sprints').update(sprintPayload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('sprints').insert([sprintPayload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving sprint:", error);
      alert("Failed to save sprint!");
    } else {
      closeForm();
      fetchSprints();
      if (isEditMode && selectedSprint) setSelectedSprint(sprintPayload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this sprint? This cannot be undone.")) return;
    
    setDbSprints(dbSprints.filter(s => s.id !== id));
    setSelectedSprint(null);
    
    const { error } = await supabase.from('sprints').delete().eq('id', id);
    if (error) fetchSprints();
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", start_date: "", end_date: "", status: "Planning", capacity: 40 });
    setIsFormOpen(true);
  }

  function openEditForm(sprint: any) {
    setIsEditMode(true);
    setFormData({
      id: sprint.id,
      title: sprint.title,
      start_date: sprint.start_date || "",
      end_date: sprint.end_date || "",
      status: sprint.status,
      capacity: sprint.capacity
    });
    setIsFormOpen(true);
    setSelectedSprint(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "Completed": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Planning": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // KPI Calculations
  const activeSprint = dbSprints.find(s => s.status === "Active");
  const avgCapacity = dbSprints.length > 0 ? Math.round(dbSprints.reduce((acc, curr) => acc + curr.capacity, 0) / dbSprints.length) : 0;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Sprint Planning"
        sub={`Manage iterations and capacity for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary" onClick={() => alert("Exporting Sprint Data to CSV...")}><Download size={13} />Export</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />New Sprint
            </Btn>
          </>
        }
      />
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Active Sprint</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400 truncate max-w-[150px]">
              {activeSprint ? activeSprint.title : "None"}
            </div>
          </div>
          <Timer className="text-blue-500" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Average Velocity</div>
            <div className="text-2xl font-bold text-foreground">{avgCapacity} <span className="text-sm font-normal text-muted-foreground">pts</span></div>
          </div>
          <Activity className="text-muted-foreground opacity-30" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Iterations</div>
            <div className="text-2xl font-bold">{dbSprints.length}</div>
          </div>
          <FastForward className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {/* Visual Timeline / Gantt List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm">Sprint Timeline & Capacity</h3>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading sprints...</div>
        ) : dbSprints.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No sprints created yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {dbSprints.map(sprint => {
              // Calculate rough visual progress for "Active" sprints based on date
              let timeProgress = 0;
              if (sprint.status === "Completed") timeProgress = 100;
              else if (sprint.status === "Active" && sprint.start_date && sprint.end_date) {
                const start = new Date(sprint.start_date).getTime();
                const end = new Date(sprint.end_date).getTime();
                const now = new Date().getTime();
                if (now > end) timeProgress = 100;
                else if (now < start) timeProgress = 0;
                else timeProgress = Math.round(((now - start) / (end - start)) * 100);
              }

              return (
                <div 
                  key={sprint.id} 
                  onClick={() => setSelectedSprint(sprint)}
                  className={cn(
                    "p-4 hover:bg-muted/40 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center gap-4",
                    sprint.status === "Active" && "bg-blue-50/50 dark:bg-blue-900/5"
                  )}
                >
                  <div className="w-full md:w-1/3 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{sprint.id}</span>
                      <Badge className={getStatusColor(sprint.status)}>{sprint.status}</Badge>
                    </div>
                    <div className="font-semibold text-sm text-foreground truncate">{sprint.title}</div>
                  </div>
                  
                  <div className="w-full md:w-1/3 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <Calendar size={12} />
                      {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : "TBD"} 
                      {" - "} 
                      {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : "TBD"}
                    </div>
                    {sprint.status === "Active" ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><ProgressBar value={timeProgress} color="blue" /></div>
                        <span className="text-[10px] text-muted-foreground w-8">{timeProgress}%</span>
                      </div>
                    ) : (
                      <div className="h-1.5 rounded-full bg-muted w-full overflow-hidden">
                         <div className={cn("h-full", sprint.status === "Completed" ? "bg-emerald-500 w-full" : "w-0")} />
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-auto ml-auto flex items-center justify-end gap-3 text-sm">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 justify-end"><Target size={12}/> Capacity</div>
                      <div className="font-bold text-foreground">{sprint.capacity} <span className="font-normal text-muted-foreground text-xs">pts</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────────────
          READ: SPRINT DETAILS MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs px-2 py-0.5">{selectedSprint.id}</Badge>
                <Badge className={getStatusColor(selectedSprint.status)}>{selectedSprint.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(selectedSprint)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit Sprint">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedSprint.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Sprint">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedSprint(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">{selectedSprint.title}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedSprint.start_date ? new Date(selectedSprint.start_date).toLocaleDateString() : 'TBD'} to {selectedSprint.end_date ? new Date(selectedSprint.end_date).toLocaleDateString() : 'TBD'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg border border-border text-center">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><Target size={12}/> Planned Capacity</div>
                  <div className="text-2xl font-bold text-foreground">{selectedSprint.capacity} <span className="text-sm font-normal text-muted-foreground">pts</span></div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg border border-border text-center flex flex-col justify-center items-center">
                  <Btn variant="secondary" onClick={() => {alert("Filtering Board view..."); setSelectedSprint(null);}}>View Board</Btn>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Created {new Date(selectedSprint.created_at).toLocaleDateString()}</span>
              <Btn variant="secondary" onClick={() => setSelectedSprint(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6 max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Timer size={18} className="text-blue-500" /> {isEditMode ? "Edit Sprint" : "Plan New Sprint"}
              </h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSaveSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sprint Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Sprint 26: Analytics" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
                  <input 
                    required type="date"
                    value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
                  <input 
                    required type="date"
                    value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sprint Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Planning</option>
                    <option>Active</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Capacity (Story Points)</label>
                  <input 
                    type="number" min="0"
                    value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Create Sprint")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}