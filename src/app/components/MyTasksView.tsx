import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Circle, Clock, CheckSquare, AlignLeft, Link2, Folder, User, X, Play, Edit3, Trash2, Save, Undo2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge, PriorityDot } from "./SharedUI";

// Added onViewChange prop to the view contract to support clickable hot-links!
export default function MyTasksView({ activeProject, userEmail, onViewChange }: { activeProject: string, userEmail?: string, onViewChange?: (v: string) => void }) {
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & CRUD State Engines
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Creation/Edit Form Data States
  const [formData, setFormData] = useState({ title: "", description: "", category: "General", linked_item: "", priority: "Medium", due_date: "" });
  const [editData, setEditData] = useState<any>({});

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching tasks:", error);
    else if (data) setDbTasks(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
  }, [activeProject]);

  // --- [C]rud: Create Task ---
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newId = `TSK-${Math.floor(Math.random() * 900) + 100}`;
    const newTask = {
      id: newId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      linked_item: formData.linked_item ? formData.linked_item.toUpperCase().trim() : null,
      status: "Todo",
      priority: formData.priority,
      due_date: formData.due_date || null,
      assignee: userEmail || "Unassigned", 
      project_name: activeProject
    };

    const { error } = await supabase.from('tasks').insert([newTask]);

    if (error) {
      alert(`Failed to save task: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setFormData({ title: "", description: "", category: "General", linked_item: "", priority: "Medium", due_date: "" });
      fetchTasks(); 
    }
    setIsSubmitting(false);
  }

  // --- c[R]ud: Initialize Update Data Form State ---
  function startEditing() {
    setEditData({ ...selectedTask });
    setIsEditing(true);
  }

  // --- cr[U]d: Update Task Modifications ---
  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanLinkedItem = editData.linked_item ? editData.linked_item.toUpperCase().trim() : null;
    const updatedFields = {
      title: editData.title,
      description: editData.description,
      category: editData.category,
      linked_item: cleanLinkedItem,
      priority: editData.priority,
      due_date: editData.due_date || null
    };

    const { error } = await supabase.from('tasks').update(updatedFields).eq('id', editData.id);

    if (error) {
      alert(`Failed to update records: ${error.message}`);
    } else {
      const consolidatedTask = { ...selectedTask, ...updatedFields };
      setSelectedTask(consolidatedTask);
      setDbTasks(dbTasks.map(t => t.id === editData.id ? consolidatedTask : t));
      setIsEditing(false);
    }
    setIsSubmitting(false);
  }

  // --- cru[D]: Delete Task Completely ---
  async function handleDeleteTask(id: string) {
    if (!window.confirm("Permanently purge this action item from database storage metrics? This cannot be undone.")) return;
    
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      alert(`Deletion failure restriction: ${error.message}`);
    } else {
      setDbTasks(dbTasks.filter(t => t.id !== id));
      setSelectedTask(null);
      setIsEditing(false);
    }
  }

  // --- Inline State Advance Cycler ---
  async function advanceTaskStatus(id: string, currentStatus: string, e: React.MouseEvent) {
    e.stopPropagation();
    let nextStatus = "Todo";
    if (currentStatus === "Todo") nextStatus = "In Progress";
    else if (currentStatus === "In Progress") nextStatus = "Done";

    setDbTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', id);
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, status: nextStatus } : null);
    }
  }

  // --- Smart Navigation Trace Resolver ---
  function handleTraceNavigation(itemKey: string) {
    if (!onViewChange) return;
    const prefix = itemKey.toUpperCase().split("-")[0];
    
    setSelectedTask(null); // Clean display frame state
    if (prefix === "REQ" || prefix === "BR" || prefix === "FR" || prefix === "NFR") onViewChange("requirements");
    else if (prefix === "DEF") onViewChange("defects");
    else if (prefix === "US") onViewChange("user-stories");
    else alert(`Trace identifier token [${prefix}] could not be resolved to a parent module.`);
  }

  const openTasks = dbTasks.filter(t => t.status === "Todo").length;
  const inProgressTasks = dbTasks.filter(t => t.status === "In Progress").length;
  const completedTasks = dbTasks.filter(t => t.status === "Done").length;
  const totalTasks = dbTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="p-6 space-y-5 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="My Tasks"
        sub={`Action items assigned to workspace context: ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={13} /> New Task
          </Btn>
        }
      />
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* LEFT COLUMN: MAIN WORK LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          {loading && dbTasks.length === 0 ? (
            <div className="p-12 flex justify-center text-muted-foreground text-sm font-medium">Loading tasks...</div>
          ) : dbTasks.length === 0 ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
              <CheckSquare size={32} className="text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-bold text-foreground">No tasks found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">You're all caught up for this project context scope.</p>
              <Btn variant="secondary" onClick={() => setIsModalOpen(true)}>Create a Task</Btn>
            </Card>
          ) : (
            <Card className="divide-y divide-border/60 overflow-hidden shadow-sm">
              {dbTasks.map(task => {
                const isInProgress = task.status === "In Progress";
                const isDone = task.status === "Done";

                return (
                  <div 
                    key={task.id} 
                    onClick={() => { setSelectedTask(task); setIsEditing(false); }}
                    className={cn("p-4 flex items-start gap-3 transition-colors hover:bg-muted/30 cursor-pointer", isDone && "opacity-50")}
                  >
                    <button 
                      onClick={(e) => advanceTaskStatus(task.id, task.status, e)}
                      className={cn(
                        "mt-0.5 flex-shrink-0 transition-colors p-0.5 rounded-md hover:bg-muted", 
                        isDone ? "text-emerald-500" : isInProgress ? "text-blue-500 animate-pulse" : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : isInProgress ? <Play size={18} className="fill-current" /> : <Circle size={18} />}
                    </button>
                    
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-xs font-bold transition-all text-foreground", isDone && "line-through text-muted-foreground font-normal")}>
                        {task.title}
                      </div>
                      
                      {task.linked_item && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-primary font-bold font-mono bg-primary/5 px-1.5 py-0.5 rounded w-fit border border-primary/10">
                          <Link2 size={10} /> {task.linked_item}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] font-semibold">
                        <span className="font-mono text-muted-foreground/80">{task.id}</span>
                        <div className="flex items-center gap-1">
                          <PriorityDot priority={task.priority} />
                          <span className="text-muted-foreground">{task.priority}</span>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock size={11} /> {task.due_date}
                          </div>
                        )}
                        <span className="text-[9px] uppercase font-bold px-1.5 border rounded-md bg-muted text-muted-foreground">{task.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: METRIC MATRIX CARD */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <Card className="p-4 shadow-sm border-border bg-slate-50/30 dark:bg-slate-900/10 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Workspace Metrics</h3>
            <div className="space-y-3 font-semibold text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Backlog</span>
                <span className="text-foreground font-mono">{totalTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scoped Todo</span>
                <span className="text-foreground font-mono">{openTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-500">Active Work</span>
                <span className="text-blue-500 font-mono">{inProgressTasks}</span>
              </div>
              <div className="pt-3 border-t border-border/60 flex justify-between text-sm">
                <span className="text-foreground font-bold">Completion</span>
                <span className="font-black text-emerald-600 font-mono">{completionRate}%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          CRUD OVERHAULED TASK VIEW & EDIT MODAL DIALOG
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-full overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {selectedTask.id}
                </span>
                <Badge className={selectedTask.status === "Done" ? "bg-emerald-100 text-emerald-700" : selectedTask.status === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}>
                  {selectedTask.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <>
                    <button onClick={startEditing} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Edit Task Properties"><Edit3 size={15}/></button>
                    <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Task"><Trash2 size={15}/></button>
                  </>
                )}
                <button onClick={() => { setSelectedTask(null); setIsEditing(false); }} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
              </div>
            </div>

            {/* Modal Content Form Split */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isEditing ? (
                <form id="edit-task-form" onSubmit={handleUpdateTask} className="space-y-4 text-xs font-bold text-muted-foreground">
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Task Summary Title</label>
                    <input required value={editData.title || ""} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full bg-background text-foreground border p-2 rounded focus:outline-none" />
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Traceable Linked Artifact ID</label>
                    <input value={editData.linked_item || ""} onChange={e => setEditData({ ...editData, linked_item: e.target.value })} className="w-full bg-background text-foreground border font-mono p-2 rounded focus:outline-none" placeholder="e.g. REQ-101" />
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Description Context</label>
                    <textarea rows={3} value={editData.description || ""} onChange={e => setEditData({ ...editData, description: e.target.value })} className="w-full bg-background text-foreground border p-2 rounded focus:outline-none font-normal" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block uppercase tracking-wider mb-1">Functional Category</label>
                      <select value={editData.category || "General"} onChange={e => setEditData({ ...editData, category: e.target.value })} className="w-full bg-muted text-foreground border p-2 rounded">
                        <option>General</option><option>Review</option><option>Documentation</option><option>Meeting</option><option>Design</option>
                      </select>
                    </div>
                    <div>
                      <label className="block uppercase tracking-wider mb-1">Priority Layer</label>
                      <select value={editData.priority || "Medium"} onChange={e => setEditData({ ...editData, priority: e.target.value })} className="w-full bg-muted text-foreground border p-2 rounded">
                        <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Target Due Date</label>
                    <input type="date" value={editData.due_date || ""} onChange={e => setEditData({ ...editData, due_date: e.target.value })} className="w-full bg-background text-foreground border p-2 rounded" />
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-foreground mb-1">{selectedTask.title}</h2>
                    <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1"><Folder size={12} /> {selectedTask.project_name}</span>
                      <span className="flex items-center gap-1"><User size={12} /> {selectedTask.assignee}</span>
                      {selectedTask.due_date && <span className="flex items-center gap-1"><Clock size={12} /> Due {selectedTask.due_date}</span>}
                    </div>
                  </div>

                  {/* UX ENHANCEMENT: INTERACTIVE ACTIONABLE CLICKABLE HOT-LINK */}
                  {selectedTask.linked_item && (
                    <div 
                      onClick={() => handleTraceNavigation(selectedTask.linked_item)}
                      className="p-3 bg-primary/5 border border-primary/20 hover:border-primary/50 rounded-xl flex items-start gap-3 cursor-pointer group/link transition-all shadow-sm"
                      title="Jump straight to target linked framework matrix module"
                    >
                      <Link2 size={15} className="text-primary mt-0.5 group-hover/link:rotate-45 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-primary flex items-center gap-1">
                          Connected System Traceability Path 
                          <span className="text-[10px] font-normal opacity-0 group-hover/link:opacity-100 transition-opacity ml-1 font-sans">Click to cross-examine →</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">This task holds operational traceability mapping to <span className="font-mono font-bold text-primary bg-background px-1.5 py-0.5 border rounded shadow-inner">{selectedTask.linked_item}</span>.</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlignLeft size={13} /> Description Notes
                    </h3>
                    <div className="text-xs text-foreground leading-relaxed bg-muted/20 p-4 rounded-xl border min-h-[100px] whitespace-pre-wrap">
                      {selectedTask.description || <span className="text-muted-foreground italic font-normal">No context documentation details provided.</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60 text-xs font-bold">
                    <div>
                      <div className="text-muted-foreground mb-1">Priority Layer</div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <PriorityDot priority={selectedTask.priority} />
                        {selectedTask.priority}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Functional Category</div>
                      <div className="text-foreground">{selectedTask.category}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Dynamic Footer */}
            <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground">Created {new Date(selectedTask.created_at).toLocaleDateString()}</span>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Btn variant="secondary" onClick={() => setIsEditing(false)}><Undo2 size={12}/> Discard</Btn>
                    <button form="edit-task-form" type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"><Save size={12}/> Commit Changes</button>
                  </>
                ) : (
                  <>
                    <Btn variant="secondary" onClick={() => setSelectedTask(null)}>Close</Btn>
                    <Btn variant="primary" onClick={(e: any) => advanceTaskStatus(selectedTask.id, selectedTask.status, e)}>
                      {selectedTask.status === "Done" ? "Reset to Todo" : "Advance Status"}
                    </Btn>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* NEW TASK REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6 max-h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-5 border-b pb-2">
              <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <CheckSquare size={16} className="text-primary" /> Create Action Item
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="text-xs font-bold text-muted-foreground space-y-4">
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Task Title Summary</label>
                  <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-xs bg-background border rounded-md focus:outline-none focus:border-primary text-foreground" placeholder="e.g. Conduct requirement refinement walk-through" />
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Description Context (Optional)</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 text-xs bg-background border rounded-md focus:outline-none focus:border-primary text-foreground font-normal" placeholder="Add context, validation requirements, or notes..." />
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Traceable Linked Artifact ID</label>
                  <input value={formData.linked_item} onChange={e => setFormData({...formData, linked_item: e.target.value})} className="w-full px-3 py-2 text-xs font-mono bg-background border rounded-md focus:outline-none focus:border-primary text-foreground" placeholder="e.g. REQ-1" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase tracking-wider mb-1.5">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-muted border rounded-md focus:outline-none text-foreground">
                      <option>General</option><option>Review</option><option>Documentation</option><option>Meeting</option><option>Design</option>
                    </select>
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1.5">Priority Weight</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-muted border rounded-md focus:outline-none text-foreground">
                      <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Target Due Date</label>
                  <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-background border rounded-md focus:outline-none text-foreground" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/60">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm">
                  {isSubmitting ? "Syncing..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}