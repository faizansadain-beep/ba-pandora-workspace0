import { useState, useEffect } from "react";
import { Plus, Download, Map, Calendar as CalIcon, User, AlertCircle, Target, AlignLeft, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge, ProgressBar, Avatar } from "./SharedUI";

export default function RoadmapView({ activeProject }: { activeProject: string }) {
  const [dbRoadmap, setDbRoadmap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [tempProgress, setTempProgress] = useState(0); // For smooth slider dragging
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    strategic_goal: "Core Infrastructure",
    phase: "Discovery",
    start_date: "",
    end_date: "",
    owner: "Sarah Chen",
    status: "On Track"
  });

  const phases = ["Discovery", "Design", "Development", "Testing", "Release"];

  async function fetchRoadmap() {
    setLoading(true);
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('project_name', activeProject)
      .order('start_date', { ascending: true });

    if (error) console.error("Error fetching roadmap:", error);
    else if (data) setDbRoadmap(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchRoadmap();
  }, [activeProject]);

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newId = `RM-${Math.floor(Math.random() * 900) + 100}`;

    const newItem = {
      id: newId,
      title: formData.title,
      description: formData.description,
      strategic_goal: formData.strategic_goal,
      phase: formData.phase,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      progress: 0,
      owner: formData.owner,
      status: formData.status,
      project_name: activeProject
    };

    const { error } = await supabase.from('roadmap_items').insert([newItem]);

    if (error) {
      console.error("Error saving roadmap item:", error);
      alert("Failed to save item!");
    } else {
      setIsModalOpen(false);
      setFormData({ title: "", description: "", strategic_goal: "Core Infrastructure", phase: "Discovery", start_date: "", end_date: "", owner: "Sarah Chen", status: "On Track" });
      fetchRoadmap(); 
    }
    setIsSubmitting(false);
  }

  // Mutation: Update Progress (Only triggers when slider is released)
  async function saveProgress(id: string, newProgress: number) {
    // Optimistic UI Update
    setDbRoadmap(dbRoadmap.map(i => i.id === id ? { ...i, progress: newProgress } : i));
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, progress: newProgress });
    
    // DB Update
    await supabase.from('roadmap_items').update({ progress: newProgress }).eq('id', id);
  }

  // Helper to open modal and set local slider state
  function openDetailModal(item: any) {
    setSelectedItem(item);
    setTempProgress(item.progress);
  }

  const atRiskCount = dbRoadmap.filter(i => i.status === "At Risk" || i.status === "Delayed").length;
  const avgProgress = dbRoadmap.length > 0 ? Math.round(dbRoadmap.reduce((acc, curr) => acc + curr.progress, 0) / dbRoadmap.length) : 0;

  return (
    <div className="p-6 space-y-5 relative">
      <SectionHeader
        title="Product Roadmap"
        sub={`Strategic timeline for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export</Btn>
            <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={13} />New Initiative
            </Btn>
          </>
        }
      />
      
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Initiatives</div>
            <div className="text-2xl font-bold">{dbRoadmap.length}</div>
          </div>
          <Map className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Average Completion</div>
            <div className="text-2xl font-bold text-emerald-600">{avgProgress}%</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-100 flex items-center justify-center">
             <div className="w-full h-full rounded-full bg-emerald-500/20" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Items At Risk / Delayed</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{atRiskCount}</div>
          </div>
          <AlertCircle className="text-amber-500" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading Roadmap...</div>
      ) : (
        <div className="space-y-6">
          {phases.map(phase => {
            const items = dbRoadmap.filter(item => item.phase === phase);
            if (items.length === 0) return null;
            
            return (
              <div key={phase} className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-border pb-1">
                  {phase} <Badge className="bg-muted text-muted-foreground ml-2">{items.length}</Badge>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(item => (
                    {/* Fixed: Replaced Card with standard div so onClick works natively */},
                    <div 
                      key={item.id} 
                      onClick={() => openDetailModal(item)}
                      className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4" 
                      style={{ borderLeftColor: item.status === 'On Track' ? '#10B981' : item.status === 'At Risk' ? '#F59E0B' : '#EF4444' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.id}</span>
                        <Badge className={item.status === 'On Track' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{item.status}</Badge>
                      </div>
                      
                      <h4 className="font-medium text-sm text-foreground mb-3 leading-snug">{item.title}</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{item.progress}%</span>
                          </div>
                          <ProgressBar value={item.progress} color={item.progress === 100 ? "emerald" : "blue"} />
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CalIcon size={12} />
                            {item.start_date ? new Date(item.start_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'} - 
                            {item.end_date ? new Date(item.end_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'}
                          </div>
                          <Avatar initials={item.owner.substring(0,2).toUpperCase()} size="xs" color="slate" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          INITIATIVE DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                  {selectedItem.id}
                </span>
                <Badge className="bg-muted text-muted-foreground">{selectedItem.phase}</Badge>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{selectedItem.title}</h2>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User size={12} /> {selectedItem.owner}</span>
                  <span className="flex items-center gap-1">
                    <CalIcon size={12} /> 
                    {selectedItem.start_date ? new Date(selectedItem.start_date).toLocaleDateString() : 'TBD'} to {selectedItem.end_date ? new Date(selectedItem.end_date).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              </div>

              {/* Progress Slider (Fixed!) */}
              <div className="bg-muted/30 border border-border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold">Initiative Progress</span>
                  <span className="text-sm font-bold text-primary">{tempProgress}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={tempProgress}
                  onChange={(e) => setTempProgress(parseInt(e.target.value))} // Only updates visual UI instantly
                  onMouseUp={() => saveProgress(selectedItem.id, tempProgress)} // Saves to database when released
                  onTouchEnd={() => saveProgress(selectedItem.id, tempProgress)} // For mobile touch release
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0% (Not Started)</span>
                  <span>100% (Complete)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
                  <Target size={16} className="text-primary mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-primary">Strategic Goal</div>
                    <div className="text-sm text-foreground mt-0.5">{selectedItem.strategic_goal || "General Growth"}</div>
                  </div>
                </div>
                <div className="p-3 bg-card border border-border rounded-lg flex items-start gap-3">
                  <AlertCircle size={16} className={selectedItem.status === 'On Track' ? 'text-emerald-500' : 'text-amber-500'} />
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">Current Status</div>
                    <div className="text-sm font-medium text-foreground mt-0.5">{selectedItem.status}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <AlignLeft size={14} className="text-muted-foreground" /> Overview & Description
                </h3>
                <div className="text-sm text-foreground bg-muted/30 p-4 rounded-lg border border-border min-h-[100px] whitespace-pre-wrap">
                  {selectedItem.description || <span className="text-muted-foreground italic">No detailed description provided for this initiative.</span>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Added to Roadmap: {new Date(selectedItem.created_at).toLocaleDateString()}</span>
              <Btn variant="secondary" onClick={() => setSelectedItem(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          NEW ROADMAP ITEM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6 max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Map size={18} className="text-blue-500" /> New Roadmap Initiative
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Initiative Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Core Authentication Upgrade" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description & Scope</label>
                <textarea 
                  rows={2}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="High-level overview of what this delivers..." 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Strategic Goal / Pillar</label>
                <select 
                  value={formData.strategic_goal} onChange={e => setFormData({...formData, strategic_goal: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option>Core Infrastructure</option>
                  <option>User Experience (UX)</option>
                  <option>Revenue Generation</option>
                  <option>Security & Compliance</option>
                  <option>Technical Debt</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lifecycle Phase</label>
                  <select 
                    value={formData.phase} onChange={e => setFormData({...formData, phase: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {phases.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="On Track">On Track</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                </div>
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target End Date</label>
                  <input 
                    required type="date"
                    value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Add to Roadmap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}