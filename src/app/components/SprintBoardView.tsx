import { useState, useEffect } from "react";
import { LayoutDashboard, ArrowRight, ArrowLeft, CheckCircle2, Clock, PlayCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Card, Badge } from "./SharedUI";

export default function SprintBoardView({ activeProject }: { activeProject: string }) {
  const [dbSprints, setDbSprints] = useState<any[]>([]);
  const [boardStories, setBoardStories] = useState<any[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function fetchBoardData() {
    setLoading(true);
    try {
      // 1. Fetch Sprints for the dropdown selector
      const sprintsRes = await supabase.from('delivery_sprints').select('*').eq('project_name', activeProject).order('sprint_id', { ascending: false });
      
      if (sprintsRes.data && sprintsRes.data.length > 0) {
        setDbSprints(sprintsRes.data);
        const targetSprint = activeSprintId || sprintsRes.data[0].sprint_id;
        if (!activeSprintId) setActiveSprintId(targetSprint);

        // 2. Fetch Stories specifically for the selected sprint
        const backlogRes = await supabase
          .from('product_backlog')
          .select('*')
          .eq('project_name', activeProject)
          .eq('sprint_id', targetSprint);

        if (backlogRes.data) setBoardStories(backlogRes.data);
      }
    } catch (err) {
      console.error("Board fetch exception:", err);
    }
    setLoading(false);
  }

  // Refetch when project or selected sprint changes
  useEffect(() => {
    fetchBoardData();
  }, [activeProject, activeSprintId]);

  // --- Dynamic Pipeline Mover ---
  const COLUMNS = ["To Do", "In Progress", "In Review", "Done"];

  async function moveCard(storyId: string, currentStatus: string, direction: 'forward' | 'backward') {
    const currentIndex = COLUMNS.indexOf(currentStatus || "To Do");
    let nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    
    // Boundary checks
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= COLUMNS.length) nextIndex = COLUMNS.length - 1;

    const newStatus = COLUMNS[nextIndex];

    // Optimistic UI Update
    setBoardStories(prev => prev.map(s => s.id === storyId ? { ...s, execution_status: newStatus } : s));

    // Database Sync
    const { error } = await supabase
      .from('product_backlog')
      .update({ execution_status: newStatus })
      .eq('id', storyId);

    if (error) {
      console.error("Error moving card:", error);
      fetchBoardData(); // Revert on failure
    }
  }

  // --- Board Columns Mapping ---
  const columnsData = [
    { id: "To Do", label: "To Do (Ready)", icon: <Clock size={14} className="text-slate-500"/>, color: "border-slate-200 bg-slate-50/50 dark:bg-slate-900/20" },
    { id: "In Progress", label: "In Progress", icon: <PlayCircle size={14} className="text-blue-500"/>, color: "border-blue-200 bg-blue-50/30 dark:bg-blue-900/10" },
    { id: "In Review", label: "QA / Review", icon: <AlertCircle size={14} className="text-amber-500"/>, color: "border-amber-200 bg-amber-50/30 dark:bg-amber-900/10" },
    { id: "Done", label: "Done (Shipped)", icon: <CheckCircle2 size={14} className="text-emerald-500"/>, color: "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10" }
  ];

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <SectionHeader
        title="Execution Sprint Board"
        sub={`Monitor active iteration progress, blockages, and QA velocity for ${activeProject}`}
      />

      {/* SPRINT SELECTOR */}
      <div className="bg-card border border-border p-3 rounded-xl flex items-center gap-4 shadow-sm shrink-0">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-2">Active Board View:</label>
        <select 
          value={activeSprintId} 
          onChange={(e) => setActiveSprintId(e.target.value)}
          className="bg-muted px-3 py-1.5 rounded-lg text-sm font-bold border border-border focus:outline-none min-w-[200px]"
        >
          {dbSprints.map(s => (
            <option key={s.id} value={s.sprint_id}>{s.sprint_id} - {s.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Loading execution board...</div>
      ) : dbSprints.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed">
          <LayoutDashboard size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Sprints Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">You need to initialize and plan a sprint before viewing the execution board.</p>
        </Card>
      ) : (
        /* KANBAN GRID */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0 overflow-x-auto pb-4">
          {columnsData.map(col => {
            const colStories = boardStories.filter(s => (s.execution_status || "To Do") === col.id);
            
            return (
              <div key={col.id} className={cn("flex flex-col rounded-xl border border-border bg-muted/10 h-full max-h-full overflow-hidden", col.color)}>
                {/* Column Header */}
                <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
                    {col.icon} {col.label}
                  </h3>
                  <Badge className="bg-background border-border text-foreground text-[10px] px-1.5 font-mono">{colStories.length}</Badge>
                </div>

                {/* Column Body (Scrollable) */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                  {colStories.length === 0 ? (
                    <div className="text-center p-4 text-[11px] font-medium text-muted-foreground italic opacity-50">Empty</div>
                  ) : (
                    colStories.map(story => (
                      <div key={story.id} className="bg-card border border-border/80 p-3 rounded-lg shadow-sm hover:shadow-md transition-all group flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <Badge className="bg-primary/10 text-primary text-[9px] font-mono border-primary/20 px-1 py-0 shrink-0">{story.story_id || 'US'}</Badge>
                          <Badge className="bg-muted text-muted-foreground text-[9px] font-mono border-none px-1 py-0 shrink-0">{story.story_points || 0} SP</Badge>
                        </div>
                        
                        <h4 className="text-xs font-bold text-foreground leading-snug">{story.title}</h4>
                        
                        {/* Action Controls */}
                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={() => moveCard(story.id, col.id, 'backward')}
                            disabled={col.id === "To Do"}
                            className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded disabled:opacity-20 transition-colors"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button 
                            onClick={() => moveCard(story.id, col.id, 'forward')}
                            disabled={col.id === "Done"}
                            className="p-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-20 transition-colors"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}