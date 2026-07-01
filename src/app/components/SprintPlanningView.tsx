import { useState, useEffect } from "react";
import { Plus, Download, Calendar, Target, ArrowRight, ArrowLeft, Layers, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function SprintPlanningView({ activeProject }: { activeProject: string }) {
  const [dbSprints, setDbSprints] = useState<any[]>([]);
  const [backlogStories, setBacklogStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active planning target selection
  const [activeSprintId, setActiveSprintId] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newSprint, setNewSprint] = useState({
    sprint_id: "",
    title: "",
    start_date: "",
    end_date: "",
    target_velocity: 40,
    sprint_goal: ""
  });

  async function fetchPlanningWorkspace() {
    setLoading(true);
    try {
      const sprintsRes = await supabase.from('delivery_sprints').select('*').eq('project_name', activeProject).order('sprint_id', { ascending: false });
      const backlogRes = await supabase.from('product_backlog').select('*').eq('project_name', activeProject);

      if (sprintsRes.data) {
        setDbSprints(sprintsRes.data);
        if (sprintsRes.data.length > 0 && !activeSprintId) {
          setActiveSprintId(sprintsRes.data[0].sprint_id);
        }
      }
      if (backlogRes.data) setBacklogStories(backlogRes.data);
    } catch (err) {
      console.error("Workspace fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlanningWorkspace();
  }, [activeProject]);

  // --- Dynamic Story Assigners ---
  async function moveStoryToSprint(storyId: string, sprintId: string | null) {
    setBacklogStories(prev => prev.map(s => s.id === storyId ? { ...s, sprint_id: sprintId } : s));
    const { error } = await supabase.from('product_backlog').update({ sprint_id: sprintId }).eq('id', storyId);
    if (error) {
      console.error("Database save failed:", error);
      fetchPlanningWorkspace();
    }
  }

  async function handleCreateSprint(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      id: `SPR-${Math.floor(Math.random() * 90000)}`,
      sprint_id: newSprint.sprint_id,
      title: newSprint.title,
      start_date: newSprint.start_date,
      end_date: newSprint.end_date,
      target_velocity: Number(newSprint.target_velocity),
      committed_points: 0,
      team_capacity_hours: 240,
      sprint_goal: newSprint.sprint_goal,
      status: "Planning",
      project_name: activeProject
    };

    const { error } = await supabase.from('delivery_sprints').insert([payload]);
    if (error) alert(`Error initializing sprint: ${error.message}`);
    else {
      setIsFormOpen(false);
      setActiveSprintId(newSprint.sprint_id);
      fetchPlanningWorkspace();
    }
    setIsSubmitting(false);
  }

  const selectedSprintDetails = dbSprints.find(s => s.sprint_id === activeSprintId);
  const unassignedBacklog = backlogStories.filter(s => !s.sprint_id || s.sprint_id === "");
  const assignedToCurrentSprint = backlogStories.filter(s => s.sprint_id === activeSprintId);

  const totalAllocatedPoints = assignedToCurrentSprint.reduce((sum, item) => sum + (Number(item.story_points) || 0), 0);
  const velocityTarget = selectedSprintDetails ? selectedSprintDetails.target_velocity : 40;
  const allocationPercent = velocityTarget > 0 ? Math.round((totalAllocatedPoints / velocityTarget) * 100) : 0;
  const isOvercommitted = totalAllocatedPoints > velocityTarget;

  return (
    <div className="p-6 space-y-6 relative max-w-7xl mx-auto">
      <SectionHeader
        title="Agile Planning Workspace"
        sub="Plan delivery scopes, set velocity gates, and drag requirements into execution loops."
        actions={
          <Btn variant="primary" onClick={() => {
            const nextNum = dbSprints.length + 25;
            const today = new Date().toISOString().split('T')[0];
            setNewSprint({ sprint_id: `SPR-0${nextNum}`, title: `Sprint ${nextNum}: [Goal Domain]`, start_date: today, end_date: today, target_velocity: 45, sprint_goal: "" });
            setIsFormOpen(true);
          }}>
            <Plus size={14} /> Initialize Sprint Iteration
          </Btn>
        }
      />

      <div className="bg-card border border-border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Planning Target Sprint:</label>
          <select 
            value={activeSprintId} 
            onChange={(e) => setActiveSprintId(e.target.value)}
            className="bg-muted px-3 py-1.5 rounded-lg text-sm font-bold border border-border focus:outline-none"
          >
            {dbSprints.map(s => (
              <option key={s.id} value={s.sprint_id}>{s.sprint_id} - {s.title} ({s.status})</option>
            ))}
          </select>
        </div>

        {selectedSprintDetails && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <span className="text-muted-foreground">Timeline: <strong>{selectedSprintDetails.start_date} to {selectedSprintDetails.end_date}</strong></span>
            <span className="w-px h-3 bg-border" />
            <span className={cn("font-bold px-2 py-0.5 rounded", isOvercommitted ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50")}>
              Commitment Capacity: {totalAllocatedPoints} / {velocityTarget} Story Points ({allocationPercent}%)
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm font-medium">Re-computing backlog matrix traces...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* LEFT COLUMN: THE AVAILABLE PRODUCT BACKLOG */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers size={14}/> Backlog Pool ({unassignedBacklog.length})
              </h3>
            </div>

            <Card className="p-3 bg-muted/20 border border-border space-y-3 max-h-[60vh] overflow-y-auto">
              {unassignedBacklog.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium italic">Backlog pool is clean or fully assigned. Ensure you have stories saved in your User Stories module!</div>
              ) : (
                unassignedBacklog.map(story => (
                  <div key={story.id} className="bg-card border border-border p-3 rounded-lg shadow-sm flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/5 text-primary text-[9px] font-mono border-primary/10 px-1 py-0">{story.story_id || 'US-ID'}</Badge>
                        <Badge className="bg-slate-100 text-slate-700 text-[9px] px-1 py-0 border-none font-mono font-bold">{story.story_points || 0} SP</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug truncate">{story.title}</h4>
                    </div>
                    <button 
                      onClick={() => moveStoryToSprint(story.id, activeSprintId)}
                      className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground rounded-md transition-colors shadow-sm"
                      title="Move into current sprint bucket"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN: ACTIVE TARGET SPRINT BUCKET */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Target size={14} className="text-blue-500"/> {activeSprintId} Commitments ({assignedToCurrentSprint.length})
              </h3>
            </div>

            <Card className={cn("p-3 border space-y-3 max-h-[60vh] overflow-y-auto min-h-[150px] transition-colors", 
              isOvercommitted ? "bg-red-50/20 border-red-200" : "bg-blue-50/10 border-blue-100"
            )}>
              {assignedToCurrentSprint.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground font-medium italic flex flex-col items-center justify-center gap-1.5">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>Sprint bucket is blank. Pull requirements from the left column pane.</span>
                </div>
              ) : (
                assignedToCurrentSprint.map(story => (
                  <div key={story.id} className="bg-card border border-border/80 p-3 rounded-lg shadow-sm flex items-center justify-between gap-3 group">
                    <button 
                      onClick={() => moveStoryToSprint(story.id, null)}
                      className="p-1.5 bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/5 text-primary text-[9px] font-mono px-1 py-0">{story.story_id}</Badge>
                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 font-mono font-bold">{story.story_points || 0} SP</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug truncate">{story.title}</h4>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Calendar size={16} className="text-blue-500" /> Initialize Agile Iteration</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Sprint Code</label>
                  <input required placeholder="SPR-25" value={newSprint.sprint_id} onChange={e => setNewSprint({...newSprint, sprint_id: e.target.value})} className="w-full bg-muted border p-2 text-xs font-mono rounded" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Iteration Name</label>
                  <input required value={newSprint.title} onChange={e => setNewSprint({...newSprint, title: e.target.value})} className="w-full bg-muted border p-2 text-xs rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input type="date" required value={newSprint.start_date} onChange={e => setNewSprint({...newSprint, start_date: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">End Date</label>
                  <input type="date" required value={newSprint.end_date} onChange={e => setNewSprint({...newSprint, end_date: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Target Velocity (Story Points Baseline)</label>
                <input type="number" required value={newSprint.target_velocity} onChange={e => setNewSprint({...newSprint, target_velocity: Number(e.target.value)})} className="w-full bg-background border p-2 text-xs rounded" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Lock Iteration</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}