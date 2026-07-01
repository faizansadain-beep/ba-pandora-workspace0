import { useState, useEffect } from "react";
import { Plus, Lightbulb, ThumbsUp, AlertTriangle, Target, Trash2, Edit, Calendar } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function LessonsLearnedView({ activeProject }: { activeProject: string }) {
  const [dbSprints, setDbSprints] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [activeSprint, setActiveSprint] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "Went Well",
    description: "",
    owner: "Team"
  });

  async function fetchRetroData() {
    setLoading(true);
    try {
      const sprintsRes = await supabase.from('delivery_sprints').select('sprint_id, title').eq('project_name', activeProject).order('sprint_id', { ascending: false });
      
      if (sprintsRes.data && sprintsRes.data.length > 0) {
        setDbSprints(sprintsRes.data);
        const targetSprint = activeSprint || sprintsRes.data[0].sprint_id;
        if (!activeSprint) setActiveSprint(targetSprint);

        const lessonsRes = await supabase
          .from('delivery_lessons_learned')
          .select('*')
          .eq('project_name', activeProject)
          .eq('sprint_id', targetSprint)
          .order('created_at', { ascending: true });

        if (lessonsRes.data) setLessons(lessonsRes.data);
      }
    } catch (err) {
      console.error("Retro fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRetroData();
  }, [activeProject, activeSprint]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: `LL-${Math.floor(Math.random() * 90000)}`,
      sprint_id: activeSprint,
      category: formData.category,
      description: formData.description,
      owner: formData.owner,
      project_name: activeProject
    };

    const { error } = await supabase.from('delivery_lessons_learned').insert([payload]);

    if (error) alert(`Error saving lesson: ${error.message}`);
    else {
      setIsFormOpen(false);
      setFormData({ ...formData, description: "" }); // keep category/owner
      fetchRetroData();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this retrospective item?")) return;
    setLessons(prev => prev.filter(l => l.id !== id));
    await supabase.from('delivery_lessons_learned').delete().eq('id', id);
  }

  const columns = [
    { id: "Went Well", label: "What Went Well", icon: <ThumbsUp size={16} className="text-emerald-500"/>, bg: "bg-emerald-50/30 border-emerald-100", card: "border-emerald-200" },
    { id: "Needs Improvement", label: "Needs Improvement", icon: <AlertTriangle size={16} className="text-amber-500"/>, bg: "bg-amber-50/30 border-amber-100", card: "border-amber-200" },
    { id: "Action Item", label: "Action Items", icon: <Target size={16} className="text-blue-500"/>, bg: "bg-blue-50/30 border-blue-100", card: "border-blue-200" }
  ];

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <SectionHeader
        title="Sprint Retrospective & Lessons"
        sub={`Document process improvements, celebrate wins, and track action items for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={() => setIsFormOpen(true)} disabled={!activeSprint}>
            <Plus size={13} /> Add Retro Item
          </Btn>
        }
      />

      {/* SPRINT SELECTOR */}
      <div className="bg-card border border-border p-3 rounded-xl flex items-center gap-4 shadow-sm shrink-0">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0 pl-2 flex items-center gap-1.5"><Calendar size={14}/> Active Sprint Retro:</label>
        <select 
          value={activeSprint} 
          onChange={(e) => setActiveSprint(e.target.value)}
          className="bg-muted px-3 py-1.5 rounded-lg text-sm font-bold border border-border focus:outline-none min-w-[200px]"
        >
          {dbSprints.length === 0 ? <option>No Sprints Found</option> : null}
          {dbSprints.map(s => (
            <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_id} - {s.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Loading retrospective board...</div>
      ) : dbSprints.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed">
          <Lightbulb size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Sprints Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">You need to initialize a Sprint in Sprint Planning before holding a retrospective.</p>
        </Card>
      ) : (
        /* RETRO BOARD (3 Columns) */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-y-auto custom-scrollbar pb-4">
          {columns.map(col => {
            const colItems = lessons.filter(l => l.category === col.id);
            return (
              <div key={col.id} className={cn("flex flex-col rounded-xl border h-full", col.bg)}>
                <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-background/40 backdrop-blur-sm rounded-t-xl">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                    {col.icon} {col.label}
                  </h3>
                  <Badge className="bg-background border-border text-foreground text-[10px] px-2 font-mono shadow-sm">{colItems.length}</Badge>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                  {colItems.length === 0 ? (
                    <div className="text-center p-8 text-xs font-medium text-muted-foreground italic opacity-60">No items logged</div>
                  ) : (
                    colItems.map(item => (
                      <div key={item.id} className={cn("bg-card border p-4 rounded-lg shadow-sm group flex flex-col gap-3 relative transition-all hover:shadow-md", col.card)}>
                        <p className="text-sm text-foreground leading-relaxed pr-6">{item.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                            {item.owner}
                          </span>
                        </div>

                        {/* Hover Delete Action */}
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Lightbulb size={16} className="text-blue-500" /> Add Retrospective Insight</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Observation Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded font-bold">
                    <option>Went Well</option>
                    <option>Needs Improvement</option>
                    <option>Action Item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Owner / Department</label>
                  <input required placeholder="e.g. BA, QA, Dev Team" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-background border p-2 text-sm rounded" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Observation / Action</label>
                <textarea autoFocus required rows={4} placeholder="Describe the win, the bottleneck, or the concrete action to take next sprint..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border p-3 text-sm rounded-lg leading-relaxed focus:outline-none focus:border-primary" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Log Insight</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}