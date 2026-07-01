import { useState, useEffect } from "react";
import { Plus, Download, CheckSquare, Circle, CheckCircle2, Rocket, ListTodo, ShieldAlert, Trash2, Wand2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function DeploymentChecklistView({ activeProject }: { activeProject: string }) {
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active target selection
  const [activeRelease, setActiveRelease] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newTask, setNewTask] = useState({
    task_name: "",
    phase: "Pre-Deployment",
    owner_role: "Business Analyst"
  });

  async function fetchChecklistData() {
    setLoading(true);
    try {
      // 1. Fetch available Releases
      const relRes = await supabase.from('delivery_releases').select('release_version, title, status').eq('project_name', activeProject).order('release_version', { ascending: false });
      
      if (relRes.data && relRes.data.length > 0) {
        setDbReleases(relRes.data);
        const targetRelease = activeRelease || relRes.data[0].release_version;
        if (!activeRelease) setActiveRelease(targetRelease);

        // 2. Fetch Checklist Tasks explicitly for the selected Release
        const tasksRes = await supabase
          .from('delivery_deployment_checklists')
          .select('*')
          .eq('project_name', activeProject)
          .eq('release_version', targetRelease)
          .order('created_at', { ascending: true });

        if (tasksRes.data) setChecklistItems(tasksRes.data);
      }
    } catch (err) {
      console.error("Checklist fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchChecklistData();
  }, [activeProject, activeRelease]);

  // --- Task Status Toggler ---
  async function toggleTaskStatus(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    
    // Optimistic UI Update
    setChecklistItems(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Database Sync
    const { error } = await supabase
      .from('delivery_deployment_checklists')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error("Failed to toggle status:", error);
      fetchChecklistData(); // revert on fail
    }
  }

  // --- Create Single Task ---
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      id: `DEP-${Math.floor(Math.random() * 90000)}`,
      release_version: activeRelease,
      task_name: newTask.task_name,
      phase: newTask.phase,
      owner_role: newTask.owner_role,
      status: "Pending",
      project_name: activeProject
    };

    const { error } = await supabase.from('delivery_deployment_checklists').insert([payload]);
    if (error) alert(`Error saving task: ${error.message}`);
    else {
      setIsFormOpen(false);
      setNewTask({ ...newTask, task_name: "" }); // Reset text, keep phase/role
      fetchChecklistData();
    }
    setIsSubmitting(false);
  }

  // --- Delete Task ---
  async function handleDelete(taskId: string) {
    if (!window.confirm("Remove this deployment requirement?")) return;
    setChecklistItems(prev => prev.filter(t => t.id !== taskId));
    const { error } = await supabase.from('delivery_deployment_checklists').delete().eq('id', taskId);
    if (error) fetchChecklistData();
  }

  // --- Magic Feature: Load BA Template ---
  async function loadStandardBATemplate() {
    if (!activeRelease) return alert("Select a release first!");
    if (!window.confirm("Inject standard BA deployment checklist template for this release?")) return;
    
    const templateTasks = [
      { id: `DEP-${Math.floor(Math.random() * 90000)}1`, release_version: activeRelease, project_name: activeProject, task_name: "Verify Go/No-Go Approval Board is locked", phase: "Pre-Deployment", owner_role: "Business Analyst", status: "Pending" },
      { id: `DEP-${Math.floor(Math.random() * 90000)}2`, release_version: activeRelease, project_name: activeProject, task_name: "Update end-user training documentation", phase: "Pre-Deployment", owner_role: "Business Analyst", status: "Pending" },
      { id: `DEP-${Math.floor(Math.random() * 90000)}3`, release_version: activeRelease, project_name: activeProject, task_name: "Publish final Release Notes to stakeholders", phase: "Execution", owner_role: "Product Owner", status: "Pending" },
      { id: `DEP-${Math.floor(Math.random() * 90000)}4`, release_version: activeRelease, project_name: activeProject, task_name: "Conduct live production smoke testing post-deploy", phase: "Post-Deployment", owner_role: "QA Lead", status: "Pending" },
    ];

    await supabase.from('delivery_deployment_checklists').insert(templateTasks);
    fetchChecklistData();
  }

  // Metrics
  const completedTasks = checklistItems.filter(t => t.status === 'Completed').length;
  const totalTasks = checklistItems.length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const PHASES = ["Pre-Deployment", "Execution", "Post-Deployment"];

  return (
    <div className="p-6 space-y-6 relative max-w-5xl mx-auto">
      <SectionHeader
        title="Deployment Readiness Checklist"
        sub="Track operational readiness, communication tasks, and validation steps prior to going live."
        actions={
          <>
            <Btn variant="secondary" onClick={loadStandardBATemplate}>
              <Wand2 size={13} /> Load BA Template
            </Btn>
            <Btn variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={13} /> Add Custom Task
            </Btn>
          </>
        }
      />

      {/* TARGET RELEASE SELECTOR */}
      <div className="bg-card border border-border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0"><Rocket size={14} className="inline mr-1 text-primary"/> Target Release:</label>
          <select 
            value={activeRelease} 
            onChange={(e) => setActiveRelease(e.target.value)}
            className="bg-muted px-3 py-1.5 rounded-lg text-sm font-bold border border-border focus:outline-none min-w-[200px]"
          >
            {dbReleases.length === 0 ? <option>No Releases Found</option> : null}
            {dbReleases.map(r => (
              <option key={r.release_version} value={r.release_version}>{r.release_version} - {r.title}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-64 space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Launch Readiness</span>
            <span className={progressPercent === 100 ? "text-emerald-600" : "text-primary"}>{completedTasks} / {totalTasks} Tasks ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500", progressPercent === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm font-medium">Fetching deployment procedures...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ShieldAlert size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Target Releases Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Go to Release Planning to establish a version target before building a checklist.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {PHASES.map(phaseName => {
            const phaseTasks = checklistItems.filter(t => t.phase === phaseName);
            if (phaseTasks.length === 0) return null;

            return (
              <div key={phaseName} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">{phaseName} Gate</h3>
                <div className="space-y-2">
                  {phaseTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                        task.status === 'Completed' ? "bg-muted/30 border-transparent opacity-60" : "bg-card border-border shadow-sm hover:border-primary/40"
                      )}
                    >
                      {/* Checkbox Toggle */}
                      <button 
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      >
                        {task.status === 'Completed' ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold leading-snug", task.status === 'Completed' && "line-through text-muted-foreground")}>
                          {task.task_name}
                        </p>
                      </div>

                      {/* Meta Tags */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{task.owner_role}</span>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {checklistItems.length === 0 && (
            <div className="text-center p-12 border border-dashed rounded-xl border-border bg-muted/10">
              <ListTodo className="mx-auto text-muted-foreground/50 mb-3" size={28}/>
              <p className="text-sm font-medium text-foreground">Checklist is empty for {activeRelease}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Click "Load BA Template" to auto-populate standard release requirements.</p>
              <Btn variant="secondary" onClick={loadStandardBATemplate}>Inject Template Tasks</Btn>
            </div>
          )}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2"><CheckSquare size={16} className="text-blue-500" /> Add Deployment Task</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Requirement / Task Description</label>
                <input autoFocus required placeholder="e.g. Verify feature flags are active..." value={newTask.task_name} onChange={e => setNewTask({...newTask, task_name: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Execution Phase</label>
                  <select value={newTask.phase} onChange={e => setNewTask({...newTask, phase: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-bold">
                    <option>Pre-Deployment</option>
                    <option>Execution</option>
                    <option>Post-Deployment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Task Owner</label>
                  <select value={newTask.owner_role} onChange={e => setNewTask({...newTask, owner_role: e.target.value})} className="w-full bg-background border p-2 text-xs rounded">
                    <option>Business Analyst</option>
                    <option>Product Owner</option>
                    <option>DevOps / Engineering</option>
                    <option>QA Lead</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Add Task</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}