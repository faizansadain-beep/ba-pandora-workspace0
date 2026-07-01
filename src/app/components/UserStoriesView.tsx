import { useState, useEffect } from "react";
import { Plus, Download, BookOpen, Edit, Trash2, X, Wand2, ListChecks, User, Target, Zap, LayoutTemplate, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function UserStoriesView({ activeProject }: { activeProject: string }) {
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    story_id: "",
    title: "",
    as_a: "",
    i_want_to: "",
    so_that: "",
    story_points: 0,
    priority: "Medium",
    status: "Backlog",
    acceptance_criteria: [] as { id: string, given: string, when: string, then: string }[]
  });

  async function fetchStories() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('project_name', activeProject)
      .order('story_id', { ascending: true });

    if (error) console.error("Error fetching stories:", error);
    else if (data) setDbStories(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchStories();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `US-${Math.floor(Math.random() * 90000)}`,
      story_id: formData.story_id,
      title: formData.title,
      as_a: formData.as_a,
      i_want_to: formData.i_want_to,
      so_that: formData.so_that,
      story_points: formData.story_points,
      priority: formData.priority,
      status: formData.status,
      acceptance_criteria: formData.acceptance_criteria,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('user_stories').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('user_stories').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving story:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchStories();
      if (isEditMode && selectedStory) setSelectedStory(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this User Story?")) return;
    setDbStories(dbStories.filter(s => s.id !== id));
    setSelectedStory(null);
    const { error } = await supabase.from('user_stories').delete().eq('id', id);
    if (error) fetchStories();
  }

  // --- BA Tool: Dynamic AC Builder ---
  const addCriteria = () => setFormData({ ...formData, acceptance_criteria: [...formData.acceptance_criteria, { id: `ac${Date.now()}`, given: "", when: "", then: "" }] });
  const updateCriteria = (index: number, field: string, value: any) => {
    const newAC = [...formData.acceptance_criteria];
    newAC[index] = { ...newAC[index], [field]: value };
    setFormData({ ...formData, acceptance_criteria: newAC });
  };
  const removeCriteria = (index: number) => {
    const newAC = [...formData.acceptance_criteria];
    newAC.splice(index, 1);
    setFormData({ ...formData, acceptance_criteria: newAC });
  };

  function loadTemplate() {
    setFormData({
      ...formData,
      as_a: "System Admin",
      i_want_to: "override the lock out period",
      so_that: "I can immediately restore access for executives during critical incidents."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbStories.length + 101;
    const nextStoryId = `US-${nextNum}`;
    
    setFormData({ id: "", story_id: nextStoryId, title: "", as_a: "", i_want_to: "", so_that: "", story_points: 0, priority: "Medium", status: "Backlog", acceptance_criteria: [] });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      story_id: item.story_id,
      title: item.title,
      as_a: item.as_a || "",
      i_want_to: item.i_want_to || "",
      so_that: item.so_that || "",
      story_points: item.story_points || 0,
      priority: item.priority || "Medium",
      status: item.status || "Backlog",
      acceptance_criteria: item.acceptance_criteria || []
    });
    setIsFormOpen(true);
    setSelectedStory(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Done": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Progress": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Ready for Dev": return "bg-violet-100 text-violet-700 border-violet-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Backlog
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "High": return "text-red-700 bg-red-100 border-red-200";
      case "Low": return "text-blue-700 bg-blue-100 border-blue-200";
      default: return "text-amber-700 bg-amber-100 border-amber-200"; // Medium
    }
  };

  const readyCount = dbStories.filter(s => s.status === "Ready for Dev").length;
  const totalPoints = dbStories.reduce((acc, curr) => acc + (curr.story_points || 0), 0);

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="User Stories"
        sub={`Agile requirements and acceptance criteria for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Backlog</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Write Story
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-violet-200 bg-violet-50 dark:bg-violet-900/10 dark:border-violet-900">
          <div>
            <div className="text-xs text-violet-700 dark:text-violet-400 font-medium mb-1">Ready for Dev</div>
            <div className="text-2xl font-bold text-violet-700 dark:text-violet-400">{readyCount}</div>
          </div>
          <Zap className="text-violet-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Estimated Points</div>
            <div className="text-2xl font-bold">{totalPoints}</div>
          </div>
          <Layers className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Stories</div>
            <div className="text-2xl font-bold">{dbStories.length}</div>
          </div>
          <BookOpen className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading user stories...</div>
      ) : dbStories.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <BookOpen size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No User Stories</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Translate requirements into actionable Agile user stories.</p>
          <Btn variant="secondary" onClick={openNewForm}>Write First Story</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbStories.map(story => (
            <div 
              key={story.id} 
              onClick={() => setSelectedStory(story)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
              style={{ borderLeftColor: story.status === 'Done' ? '#10B981' : story.status === 'Ready for Dev' ? '#8B5CF6' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{story.story_id}</Badge>
                <div className="flex gap-2">
                  {story.story_points > 0 && <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{story.story_points} pts</Badge>}
                  <Badge className={cn("text-[10px]", getStatusBadge(story.status))}>{story.status}</Badge>
                </div>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-4">{story.title}</h3>
              
              {/* Narrative Block */}
              <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 mb-4 flex-1 space-y-1">
                <div><span className="font-semibold text-muted-foreground mr-1">As a</span><span className="font-medium">{story.as_a}</span>,</div>
                <div><span className="font-semibold text-muted-foreground mr-1">I want to</span><span className="font-medium">{story.i_want_to}</span>,</div>
                <div><span className="font-semibold text-muted-foreground mr-1">So that</span><span className="font-medium">{story.so_that}</span>.</div>
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] font-medium pt-3 border-t border-border">
                <Badge className={cn("text-[9px] px-1.5 py-0", getPriorityColor(story.priority))}>
                  {story.priority} Priority
                </Badge>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ListChecks size={12} /> {story.acceptance_criteria ? story.acceptance_criteria.length : 0} ACs
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedStory.story_id}</Badge>
                <Badge className={getStatusBadge(selectedStory.status)}>{selectedStory.status}</Badge>
                {selectedStory.story_points > 0 && <Badge className="bg-muted text-muted-foreground font-mono">{selectedStory.story_points} Points</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedStory, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedStory.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedStory(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedStory.title}</h2>
                
                {/* User Story Narrative */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 space-y-2 text-base">
                  <div className="flex items-start gap-2">
                    <User size={18} className="text-blue-500 mt-0.5 shrink-0" />
                    <div><span className="font-bold text-blue-700 dark:text-blue-400 mr-2">As a</span> <span className="text-foreground">{selectedStory.as_a}</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Target size={18} className="text-amber-500 mt-0.5 shrink-0" />
                    <div><span className="font-bold text-amber-700 dark:text-amber-400 mr-2">I want to</span> <span className="text-foreground">{selectedStory.i_want_to}</span></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div><span className="font-bold text-emerald-700 dark:text-emerald-400 mr-2">So that</span> <span className="text-foreground">{selectedStory.so_that}</span></div>
                  </div>
                </div>
              </div>

              {/* Acceptance Criteria (BDD) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground border-b border-border pb-2">
                  <ListChecks size={16} /> Acceptance Criteria
                </h3>
                
                {(!selectedStory.acceptance_criteria || selectedStory.acceptance_criteria.length === 0) ? (
                  <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg">No acceptance criteria defined.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedStory.acceptance_criteria.map((ac: any, idx: number) => (
                      <div key={idx} className="bg-card border border-border rounded-lg p-4 shadow-sm">
                        <div className="text-xs font-bold text-muted-foreground mb-2">Scenario {idx + 1}</div>
                        <div className="space-y-1.5 text-sm">
                          <div><span className="font-bold text-foreground mr-2 w-12 inline-block">Given</span> <span className="text-muted-foreground">{ac.given}</span></div>
                          <div><span className="font-bold text-foreground mr-2 w-12 inline-block">When</span> <span className="text-muted-foreground">{ac.when}</span></div>
                          <div><span className="font-bold text-foreground mr-2 w-12 inline-block">Then</span> <span className="text-muted-foreground">{ac.then}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedStory.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedStory(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen size={18} className="text-blue-500" /> {isEditMode ? "Edit User Story" : "Write User Story"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <LayoutTemplate size={12} /> Fill Persona
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Story ID</label>
                    <input 
                      required 
                      value={formData.story_id} onChange={e => setFormData({...formData, story_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Short Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. SSO Login Redirection" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>Backlog</option>
                      <option>Ready for Dev</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                    <select 
                      value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Story Points (Fibonacci)</label>
                    <select 
                      value={formData.story_points} onChange={e => setFormData({...formData, story_points: parseInt(e.target.value)})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="5">5</option>
                      <option value="8">8</option>
                      <option value="13">13</option>
                      <option value="21">21</option>
                    </select>
                  </div>
                </div>

                {/* Narrative Framework */}
                <div className="bg-muted/10 p-4 rounded-lg border border-border space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Story Narrative</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-20 text-xs font-bold text-muted-foreground text-right">As a</span>
                      <input required placeholder="User Persona (e.g. End User)" value={formData.as_a} onChange={e => setFormData({...formData, as_a: e.target.value})} className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-20 text-xs font-bold text-muted-foreground text-right">I want to</span>
                      <input required placeholder="Perform action/feature" value={formData.i_want_to} onChange={e => setFormData({...formData, i_want_to: e.target.value})} className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-20 text-xs font-bold text-muted-foreground text-right">So that</span>
                      <input required placeholder="Business value/benefit" value={formData.so_that} onChange={e => setFormData({...formData, so_that: e.target.value})} className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                  </div>
                </div>

                {/* BDD Acceptance Criteria Builder */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold">Acceptance Criteria (BDD)</h3>
                      <p className="text-[10px] text-muted-foreground">Given / When / Then format</p>
                    </div>
                    <Btn type="button" variant="secondary" onClick={addCriteria}><Plus size={12}/> Add Scenario</Btn>
                  </div>
                  
                  {formData.acceptance_criteria.length === 0 ? (
                    <div className="text-center p-6 bg-muted/30 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                      No criteria added. Click "Add Scenario" to define how this story is tested.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.acceptance_criteria.map((ac, index) => (
                        <div key={ac.id} className="bg-card border border-border rounded-lg p-3 relative group shadow-sm">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Scenario {index + 1}</div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="w-12 text-xs font-bold mt-1.5">Given</span>
                              <input placeholder="initial context/setup" value={ac.given} onChange={e => updateCriteria(index, "given", e.target.value)} className="flex-1 px-2 py-1 text-sm bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="w-12 text-xs font-bold mt-1.5">When</span>
                              <input placeholder="an action occurs" value={ac.when} onChange={e => updateCriteria(index, "when", e.target.value)} className="flex-1 px-2 py-1 text-sm bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="w-12 text-xs font-bold mt-1.5">Then</span>
                              <input placeholder="expected outcome" value={ac.then} onChange={e => updateCriteria(index, "then", e.target.value)} className="flex-1 px-2 py-1 text-sm bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                          </div>
                          <button type="button" onClick={() => removeCriteria(index)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Story")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}