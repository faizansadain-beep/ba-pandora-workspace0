import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Link2, Clock, AlertTriangle, Edit3, Trash2, Save, Undo2, Folder, Share2, ClipboardCheck, LayoutGrid, Layout, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({ activeProject, onViewChange }: { activeProject: string; onViewChange?: (v: string) => void }) {
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Navigation & Selection States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [focusedDateStr, setFocusedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Creation Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    title: "", 
    event_date: "", 
    type: "Meeting", 
    reminder_buffer: "0",
    scope_type: "General", 
    linked_item_id: ""
  });
  const [editData, setEditData] = useState<any>({});

  async function fetchCalendarWorkspace() {
    setLoading(true);
    try {
      const [eventsRes, tasksRes, modulesRes, featuresRes] = await Promise.all([
        supabase.from('calendar_events').select('*').eq('project_name', activeProject),
        supabase.from('tasks').select('*').eq('project_name', activeProject).not('due_date', 'is', null),
        supabase.from('product_modules').select('id, title').eq('project_name', activeProject),
        supabase.from('product_features').select('id, title').eq('project_name', activeProject)
      ]);

      if (eventsRes.data) setDbEvents(eventsRes.data);
      if (tasksRes.data) setDbTasks(tasksRes.data);
      if (modulesRes.data) setModules(modulesRes.data);
      if (featuresRes.data) setFeatures(featuresRes.data);
    } catch (err) {
      console.error("Calendar fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCalendarWorkspace();
  }, [activeProject]);

  const copyShareText = (item: any) => {
    const dateLabel = item.event_date || item.raw?.due_date;
    const shareText = `📅 PROJECT CONTROL CENTER BRIEF\n-----------------------------------------\n📌 Event: ${item.title}\n📂 Project: ${activeProject}\n🗓️ Due Date: ${dateLabel ? new Date(dateLabel).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD'}\n🏷️ Category: ${item.type || 'System Task'}\n-----------------------------------------\nGenerated automatically from Workspace Core Control.`;

    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // --- CRUD HELPERS ---
  function startEditing() {
    setEditData({ ...selectedItem });
    setIsEditing(true);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newId = `EVT-${Math.floor(Math.random() * 900) + 100}`;
    let contextualTitle = formData.title;
    if (formData.scope_type !== "General" && formData.linked_item_id) {
      contextualTitle = `[${formData.scope_type}: ${formData.linked_item_id}] ${formData.title}`;
    }

    const newEvent = {
      id: newId,
      title: contextualTitle,
      event_date: formData.event_date,
      type: formData.type,
      reminder_buffer: Number(formData.reminder_buffer),
      project_name: activeProject
    };

    const { error } = await supabase.from('calendar_events').insert([newEvent]);
    if (!error) {
      setIsModalOpen(false);
      setFormData({ title: "", event_date: focusedDateStr, type: "Meeting", reminder_buffer: "0", scope_type: "General", linked_item_id: "" });
      fetchCalendarWorkspace(); 
    }
    setIsSubmitting(false);
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const updatedFields = {
      title: editData.title,
      event_date: editData.event_date,
      type: editData.type,
      reminder_buffer: Number(editData.reminder_buffer)
    };

    const { error } = await supabase.from('calendar_events').update(updatedFields).eq('id', editData.id);
    if (!error) {
      const consolidatedItem = { ...selectedItem, ...updatedFields };
      setSelectedItem(consolidatedItem);
      setDbEvents(dbEvents.map(evt => evt.id === editData.id ? consolidatedItem : evt));
      setIsEditing(false);
    }
    setIsSubmitting(false);
  }

  async function handleDeleteEvent(id: string) {
    if (!window.confirm("Permanently remove this milestone row?")) return;
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (!error) {
      setDbEvents(dbEvents.filter(evt => evt.id !== id));
      setSelectedItem(null);
      setIsEditing(false);
    }
  }

  // --- Grid Computations ---
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); 
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const padDate = (num: number) => num.toString().padStart(2, '0');

  const getBadgeStyles = (type: string) => {
    switch(type) {
      case "Dependencies": return "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20";
      case "Deadline": return "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20";
      case "Release": return "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20";
      case "Review": return "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20";
      default: return "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20";
    }
  };

  function handleTraceRedirect(item: any) {
    if (!onViewChange) return;
    setSelectedItem(null);
    if (item.isTask) { onViewChange("my-tasks"); return; }
    
    switch (item.type) {
      case "Dependencies": onViewChange("dependencies"); return;
      case "Tasks": onViewChange("my-tasks"); return;
      case "Roadmap": onViewChange("roadmap"); return;
      case "Sprints": onViewChange("sprint-planning"); return;
      case "Milestones": onViewChange("milestones"); return;
    }
    onViewChange("requirements");
  }

  const focusedCustomEvents = dbEvents.filter(e => e.event_date === focusedDateStr).map(e => ({ ...e, isTask: false }));
  const focusedTasks = dbTasks.filter(t => t.due_date === focusedDateStr).map(t => ({ id: t.id, title: t.title, type: "Tasks", isTask: true, raw: t }));
  const totalFocusedItems = [...focusedCustomEvents, ...focusedTasks];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] overflow-hidden bg-background antialiased flex flex-col">
      <SectionHeader
        title="Project Calendar Control"
        sub={`Predictive deadline matrix and operational buffers for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={() => { setFormData({...formData, event_date: focusedDateStr}); setIsModalOpen(true); }} className="gap-1.5 shadow-sm rounded-xl">
            <Plus size={14} /> Schedule Event
          </Btn>
        }
      />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: FIXED OVERLAP-PROOF CALENDAR WORKSPACE */}
        <div className="xl:col-span-8 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between mb-4 bg-muted/20 p-3 rounded-2xl border border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-foreground px-1">
                {MONTH_NAMES[currentMonth]} <span className="text-muted-foreground font-normal">{currentYear}</span>
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl p-1 shadow-xs">
              <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted rounded-lg transition-all">Today</button>
              <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="flex-1 bg-card border rounded-2xl p-4 flex flex-col min-h-0 shadow-sm">
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest border-b pb-2 shrink-0">
              {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
            </div>

            {/* OVERLAP FIX: Switched from rigid grid cells to fluid micro-cards with min-height limits */}
            <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto custom-scrollbar pt-1 pr-0.5 auto-rows-fr">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="bg-muted/10 rounded-xl opacity-30" />)}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const loopDateStr = `${currentYear}-${padDate(currentMonth + 1)}-${padDate(dayNum)}`;
                const isSelected = focusedDateStr === loopDateStr;
                const isToday = dayNum === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                const dayEventCount = dbEvents.filter(e => e.event_date === loopDateStr).length;
                const dayTaskCount = dbTasks.filter(t => t.due_date === loopDateStr).length;

                return (
                  <div
                    key={dayNum}
                    onClick={() => { setFocusedDateStr(loopDateStr); setSelectedItem(null); }}
                    className={cn(
                      "group relative rounded-xl border p-2.5 flex flex-col justify-between cursor-pointer transition-all min-h-[110px] w-full",
                      isSelected ? "border-primary bg-primary/[0.02] ring-1 ring-primary shadow-sm" : "border-border/60 bg-background hover:bg-muted/30 hover:border-border",
                      isToday && !isSelected && "bg-muted/40 border-foreground/30"
                    )}
                  >
                    {/* Top Row: Date Anchor */}
                    <div className="w-full flex justify-start">
                      <span className={cn(
                        "w-6 h-6 text-xs font-mono font-bold flex items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                        isToday ? "bg-primary text-primary-foreground font-black shadow-sm" : isSelected ? "text-primary font-black" : "text-foreground"
                      )}>
                        {padDate(dayNum)}
                      </span>
                    </div>

                    {/* Empty Space Utilization: Dynamic Mini Metric Triggers */}
                    <div className="w-full mt-2 space-y-1">
                      {dayEventCount > 0 && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 text-[9px] font-black font-mono">
                          <span className="w-1 h-1 rounded-full bg-blue-500" />
                          {dayEventCount} {dayEventCount === 1 ? 'Event' : 'Events'}
                        </div>
                      )}
                      {dayTaskCount > 0 && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/5 text-purple-600 dark:text-purple-400 border border-purple-500/10 text-[9px] font-black font-mono">
                          <span className="w-1 h-1 rounded-full bg-purple-500" />
                          {dayTaskCount} {dayTaskCount === 1 ? 'Task' : 'Tasks'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR INSPECTOR */}
        <div className="xl:col-span-4 flex flex-col h-full min-h-0 bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
          <div className="shrink-0 border-b pb-4 mb-4">
            <div className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Target Inspection Window</div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalIcon size={14} className="text-muted-foreground" />
              {new Date(focusedDateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
            {totalFocusedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground opacity-60">
                <LayoutGrid size={24} className="stroke-1 mb-2" />
                <p className="text-xs font-medium">No items or deadlines mapped for this date.</p>
              </div>
            ) : (
              totalFocusedItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setIsEditing(false); }}
                  className={cn(
                    "p-3.5 border rounded-xl bg-background hover:shadow-xs transition-all cursor-pointer border-l-4 group/card relative",
                    selectedItem?.id === item.id ? "border-primary bg-primary/[0.01]" : "border-border/70 hover:border-border",
                    item.isTask ? "border-l-purple-500" : "border-l-blue-500"
                  )}
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <span className={cn("text-[9px] font-black font-mono tracking-wider uppercase border rounded-md px-1.5 py-0.5", getBadgeStyles(item.type))}>
                      {item.type || "Task"}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyShareText(item); }}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md opacity-0 group-hover/card:opacity-100"
                    >
                      {copiedId === item.id ? <ClipboardCheck size={12} className="text-emerald-500" /> : <Share2 size={12} />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-foreground leading-snug mb-1 group-hover/card:text-primary transition-colors">{item.title}</h4>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* DETAILED INSPECTION MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] overflow-hidden">
            
            <div className="flex justify-between items-center px-5 py-4 bg-muted/30 border-b border-border/80 shrink-0">
              <span className={cn("text-[9px] font-black font-mono tracking-widest uppercase border rounded-md px-2 py-0.5", getBadgeStyles(selectedItem.type))}>
                {selectedItem.type || "System Task"}
              </span>
              
              <div className="flex items-center gap-1 text-muted-foreground">
                {!selectedItem.isTask && !isEditing && (
                  <>
                    <button onClick={startEditing} className="p-1.5 hover:text-foreground hover:bg-muted rounded-lg border border-transparent transition-colors" title="Edit Properties"><Edit3 size={13}/></button>
                    <button onClick={() => handleDeleteEvent(selectedItem.id)} className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent transition-colors" title="Delete"><Trash2 size={13}/></button>
                  </>
                )}
                <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-1.5 text-muted-foreground hover:text-foreground ml-1">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {isEditing ? (
                <form id="edit-event-form" onSubmit={handleUpdateEvent} className="space-y-4 text-xs font-bold text-muted-foreground">
                  <div>
                    <label className="block uppercase tracking-wider mb-1.5">Milestone Name</label>
                    <input required value={editData.title || ""} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full bg-background text-foreground border border-border/80 p-2 text-xs rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block uppercase tracking-wider mb-1.5">Target Date</label>
                      <input type="date" required value={editData.event_date || ""} onChange={e => setEditData({ ...editData, event_date: e.target.value })} className="w-full bg-background text-foreground border border-border/80 p-2 text-xs rounded-lg focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block uppercase tracking-wider mb-1.5">Type</label>
                      <select value={editData.type || "Meeting"} onChange={e => setEditData({ ...editData, type: e.target.value })} className="w-full bg-muted text-foreground border border-border/80 p-2 text-xs rounded-lg focus:outline-none">
                        <option>Meeting</option><option>Deadline</option><option>Review</option><option>Release</option><option>Dependencies</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1.5">Pre-Warning Alert Offset</label>
                    <select value={editData.reminder_buffer || "0"} onChange={e => setEditData({ ...editData, reminder_buffer: e.target.value })} className="w-full bg-muted text-foreground border border-border/80 p-2 text-xs rounded-lg">
                      <option value="0">No alert warning offset padding</option>
                      <option value="1">1 Day Prior</option>
                      <option value="3">3 Days Prior</option>
                      <option value="7">7 Days Prior</option>
                    </select>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-sm font-extrabold text-foreground leading-snug p-3.5 bg-muted/30 rounded-xl border border-border/60 shadow-inner">{selectedItem.title}</h2>
                  
                  <div className="space-y-2.5 p-3.5 bg-card border rounded-xl shadow-xs text-muted-foreground text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-primary"/>
                      <span>Target Due Date: <span className="font-mono font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border">{selectedItem.event_date || selectedItem.raw?.due_date}</span></span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Folder size={13} className="text-primary"/>
                      <span>Active Project Scope: <span className="text-foreground font-bold">{activeProject}</span></span>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => handleTraceRedirect(selectedItem)}
                    className="p-3 bg-primary/[0.02] border border-primary/20 hover:border-primary/40 transition-all rounded-xl flex items-start gap-2.5 cursor-pointer group shadow-xs"
                  >
                    <Link2 size={14} className="text-primary mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-primary text-[11px] flex items-center justify-between">
                        Traceability Link Redirect 
                        <span className="text-[10px] font-normal opacity-0 group-hover:opacity-100 transition-opacity">Open Tab →</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Clicking this card routes your frame container over to examine full workflow data context.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/20 flex justify-end gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Btn variant="secondary" onClick={() => setIsEditing(false)}><Undo2 size={12}/> Discard</Btn>
                  <button form="edit-event-form" type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"><Save size={12}/> Save Changes</button>
                </>
              ) : (
                <>
                  <Btn variant="secondary" onClick={() => setSelectedItem(null)}>Dismiss</Btn>
                  <Btn variant="primary" onClick={() => handleTraceRedirect(selectedItem)} className="text-[10px] font-bold uppercase tracking-wider px-3.5">Launch Module</Btn>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 max-h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <CalIcon size={15} className="text-primary" /> Log Workspace Milestone
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs font-bold text-muted-foreground">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
                <div>
                  <label className="block uppercase tracking-wider text-[10px] text-muted-foreground mb-1">Structural Scope</label>
                  <select 
                    value={formData.scope_type} 
                    onChange={e => setFormData({...formData, scope_type: e.target.value, linked_item_id: ""})} 
                    className="w-full px-2 py-1 bg-background text-foreground border rounded-md text-xs font-semibold"
                  >
                    <option value="General">General / Standalone</option>
                    <option value="Module">Linked Product Module</option>
                    <option value="Feature">Linked Product Feature</option>
                    <option value="Task">System Operational Task</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-[10px] text-muted-foreground mb-1">
                    {formData.scope_type === "General" ? "Scope Target" : `Select ${formData.scope_type}`}
                  </label>
                  
                  {formData.scope_type === "General" && (
                    <input disabled placeholder="Global Workspace Level" className="w-full px-2 py-1 bg-muted text-muted-foreground/60 border rounded-md text-xs cursor-not-allowed font-medium" />
                  )}

                  {formData.scope_type === "Module" && (
                    <select required value={formData.linked_item_id} onChange={e => setFormData({...formData, linked_item_id: e.target.value})} className="w-full px-2 py-1 bg-background text-foreground border rounded-md text-xs">
                      <option value="">-- Choose Module --</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  )}

                  {formData.scope_type === "Feature" && (
                    <select required value={formData.linked_item_id} onChange={e => setFormData({...formData, linked_item_id: e.target.value})} className="w-full px-2 py-1 bg-background text-foreground border rounded-md text-xs">
                      <option value="">-- Choose Feature --</option>
                      {features.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                    </select>
                  )}

                  {formData.scope_type === "Task" && (
                    <select required value={formData.linked_item_id} onChange={e => setFormData({...formData, linked_item_id: e.target.value})} className="w-full px-2 py-1 bg-background text-foreground border rounded-md text-xs">
                      <option value="">-- Choose Target Context --</option>
                      <option value="General Milestone">General Task Milestone</option>
                      <option value="Sprint Review">Sprint Execution Deadline</option>
                      <option value="UAT Signoff">UAT Scope Block</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1.5">Milestone Title</label>
                <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-xs bg-background border rounded-lg text-foreground font-semibold" placeholder="e.g. Critical Scope Sign-off Deadline" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Calendar Target Date</label>
                  <input required type="date" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="w-full px-3 py-1.5 bg-background border rounded-lg text-foreground font-medium" />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Classification Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-1.5 bg-muted border rounded-lg text-foreground">
                    <option>Meeting</option><option>Deadline</option><option>Review</option><option>Release</option><option>Dependencies</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1.5">Pre-Warning Buffer Alert</label>
                <select value={formData.reminder_buffer} onChange={e => setFormData({...formData, reminder_buffer: e.target.value})} className="w-full px-3 py-1.5 bg-muted border rounded-lg text-foreground">
                  <option value="0">No early alert warning padding</option>
                  <option value="1">1 Day Prior (Aggressive Buffer)</option>
                  <option value="3">3 Days Prior (Standard Framework Alert)</option>
                  <option value="7">7 Days Prior (Lead Time Sprint Buffer)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/60">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm">
                  {isSubmitting ? "Publishing..." : "Commit Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}