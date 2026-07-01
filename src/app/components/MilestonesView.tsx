import { useState, useEffect } from "react";
import { Plus, Download, Flag, CheckCircle2, Clock, AlertTriangle, Edit, Trash2, X, Calendar } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function MilestonesView({ activeProject }: { activeProject: string }) {
  const [dbMilestones, setDbMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    target_date: "",
    status: "Pending",
    description: ""
  });

  async function fetchMilestones() {
    setLoading(true);
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_name', activeProject)
      .order('target_date', { ascending: true }); // Order chronologically

    if (error) console.error("Error fetching milestones:", error);
    else if (data) setDbMilestones(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchMilestones();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSaveMilestone(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `MS-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      target_date: formData.target_date || null,
      status: formData.status,
      description: formData.description,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('milestones').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('milestones').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving milestone:", error);
      alert("Failed to save milestone!");
    } else {
      closeForm();
      fetchMilestones();
      if (isEditMode && selectedMilestone) setSelectedMilestone(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;
    
    setDbMilestones(dbMilestones.filter(m => m.id !== id));
    setSelectedMilestone(null);
    
    const { error } = await supabase.from('milestones').delete().eq('id', id);
    if (error) fetchMilestones();
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", target_date: "", status: "Pending", description: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any) {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      target_date: item.target_date || "",
      status: item.status,
      description: item.description || ""
    });
    setIsFormOpen(true);
    setSelectedMilestone(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Achieved": return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200", icon: CheckCircle2 };
      case "Missed": return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-200", icon: AlertTriangle };
      default: return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200", icon: Clock }; // Pending
    }
  };

  const achievedCount = dbMilestones.filter(m => m.status === "Achieved").length;
  const pendingCount = dbMilestones.filter(m => m.status === "Pending").length;

  return (
    <div className="p-6 space-y-5 relative max-w-5xl mx-auto">
      <SectionHeader
        title="Project Milestones"
        sub={`Key phase gates and deliverables for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />New Milestone
            </Btn>
          </>
        }
      />
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Milestones</div>
            <div className="text-2xl font-bold">{dbMilestones.length}</div>
          </div>
          <Flag className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Achieved</div>
            <div className="text-2xl font-bold text-emerald-600">{achievedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Upcoming / Pending</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{pendingCount}</div>
          </div>
          <Clock className="text-blue-500" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading milestones...</div>
      ) : dbMilestones.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Flag size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No milestones set</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define major dates and deliverables.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Milestone</Btn>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="relative border-l-2 border-border ml-6 space-y-8 py-4">
            {dbMilestones.map((m, index) => {
              const visuals = getStatusVisuals(m.status);
              const Icon = visuals.icon;
              
              return (
                <div key={m.id} className="relative pl-8">
                  {/* Timeline Dot */}
                  <div className={cn("absolute -left-[17px] top-1 w-8 h-8 rounded-full border-4 border-card flex items-center justify-center shadow-sm", visuals.bg, visuals.text)}>
                    <Icon size={14} />
                  </div>
                  
                  {/* Milestone Card */}
                  <div 
                    onClick={() => setSelectedMilestone(m)}
                    className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {m.title}
                      </div>
                      <Badge className={cn(visuals.bg, visuals.text, visuals.border)}>{m.status}</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {m.description || "No description provided."}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={13} />
                        {m.target_date ? new Date(m.target_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : "TBD"}
                      </div>
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {m.id}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: MILESTONE DETAILS MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Badge className="font-mono text-xs px-2 py-0.5 bg-muted text-muted-foreground">{selectedMilestone.id}</Badge>
                <Badge className={cn(getStatusVisuals(selectedMilestone.status).bg, getStatusVisuals(selectedMilestone.status).text)}>
                  {selectedMilestone.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(selectedMilestone)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedMilestone.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedMilestone(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2 leading-tight">{selectedMilestone.title}</h2>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar size={14} className="text-primary" />
                  Target: {selectedMilestone.target_date ? new Date(selectedMilestone.target_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description / Success Criteria</h3>
                <div className="text-sm text-foreground bg-muted/30 p-4 rounded-lg border border-border whitespace-pre-wrap leading-relaxed">
                  {selectedMilestone.description || <span className="text-muted-foreground italic">No details provided.</span>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Project: {selectedMilestone.project_name}</span>
              <Btn variant="secondary" onClick={() => setSelectedMilestone(null)}>Close</Btn>
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
                <Flag size={18} className="text-blue-500" /> {isEditMode ? "Edit Milestone" : "Add Milestone"}
              </h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSaveMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Milestone Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. UAT Sign-off" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Date</label>
                  <input 
                    required type="date"
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
                    <option>Achieved</option>
                    <option>Missed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description / Success Criteria</label>
                <textarea 
                  rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="What signifies that this milestone is complete?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Create Milestone")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}