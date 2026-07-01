import { useState, useEffect } from "react";
import { Plus, Download, Presentation, Calendar, Users, MessageSquare, Edit, Trash2, X, Wand2, CheckCircle2, Clock, AlertTriangle, Figma } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function PrototypeReviewsView({ activeProject }: { activeProject: string }) {
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [dbDesigns, setDbDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    review_id: "",
    title: "",
    design_reference: "",
    review_date: "",
    stakeholders: "",
    status: "Scheduled",
    feedback_summary: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [reviewsRes, designsRes] = await Promise.all([
        supabase.from('design_prototype_reviews').select('*').eq('project_name', activeProject).order('review_date', { ascending: false }),
        supabase.from('design_figma_links').select('id, link_id, title').eq('project_name', activeProject).order('link_id', { ascending: true })
      ]);

      if (reviewsRes.data) setDbReviews(reviewsRes.data);
      if (designsRes.data) setDbDesigns(designsRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `REV-${Math.floor(Math.random() * 90000)}`,
      review_id: formData.review_id,
      title: formData.title,
      design_reference: formData.design_reference,
      review_date: formData.review_date || null,
      stakeholders: formData.stakeholders,
      status: formData.status,
      feedback_summary: formData.feedback_summary,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('design_prototype_reviews').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('design_prototype_reviews').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving review:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedReview) setSelectedReview(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this review session record?")) return;
    setDbReviews(dbReviews.filter(r => r.id !== id));
    setSelectedReview(null);
    const { error } = await supabase.from('design_prototype_reviews').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      feedback_summary: "Key Takeaways:\n1. \n2. \n\nAction Items for Design:\n- Update [Element] to [Behavior].\n- Clarify [Flow] state."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbReviews.length + 101;
    // Default to today's date for convenience
    const today = new Date().toISOString().split('T')[0];
    setFormData({ id: "", review_id: `REV-${nextNum}`, title: "", design_reference: "", review_date: today, stakeholders: "", status: "Scheduled", feedback_summary: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedReview(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Completed": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "Needs Re-review": return { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, border: "#EF4444" };
      case "In Progress": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, border: "#F59E0B" };
      default: return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Calendar, border: "#3B82F6" }; // Scheduled
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Prototype Reviews"
        sub={`Stakeholder walkthroughs, usability testing, and design feedback for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Log</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Review Session
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Upcoming Sessions</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbReviews.filter(r => r.status === 'Scheduled').length}
            </div>
          </div>
          <Calendar className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Completed Sign-offs</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbReviews.filter(r => r.status === 'Completed').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Needs Re-review</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbReviews.filter(r => r.status === 'Needs Re-review').length}
            </div>
          </div>
          <AlertTriangle className="text-red-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading review sessions...</div>
      ) : dbReviews.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Presentation size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Reviews Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Schedule walkthroughs with stakeholders to validate interactive prototypes.</p>
          <Btn variant="secondary" onClick={openNewForm}>Schedule First Review</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbReviews.map(review => {
            const visuals = getStatusVisuals(review.status);
            const reviewDate = review.review_date ? new Date(review.review_date).toLocaleDateString() : 'TBD';

            return (
              <div 
                key={review.id} 
                onClick={() => setSelectedReview(review)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{review.review_id}</Badge>
                  <Badge className={cn("text-[10px] gap-1 font-bold", visuals.color)}>
                    {(() => {
                      const Icon = visuals.icon;
                      return <Icon size={10} />;
                    })()} 
                    {review.status}
                  </Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-2">{review.title}</h3>
                
                {review.design_reference && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-3 max-w-full">
                    <Figma size={12} className="text-[#F24E1E] shrink-0" />
                    <span className="truncate">{review.design_reference.split(' - ')[1] || review.design_reference}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                    <Calendar size={12} className="shrink-0" /> <span className="font-medium">{reviewDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                    <Users size={12} className="shrink-0" /> <span className="truncate">{review.stakeholders.split(',').length} Participants</span>
                  </div>
                </div>

                <div className="text-xs text-foreground line-clamp-2 leading-relaxed flex-1 opacity-80 mt-1">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-1"><MessageSquare size={10}/> Feedback:</span>
                  {review.feedback_summary || "No notes yet."}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedReview.review_id}</Badge>
                <Badge className={cn("gap-1 font-bold", getStatusVisuals(selectedReview.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedReview.status).icon;
                    return <Icon size={14} />;
                  })()} 
                  {selectedReview.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedReview, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedReview.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedReview(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedReview.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <Calendar className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Session Date</div>
                      <div className="text-sm font-bold text-foreground">
                        {selectedReview.review_date ? new Date(selectedReview.review_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <Figma className="text-[#F24E1E] mt-0.5 shrink-0" size={18} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Target Prototype / Design</div>
                      <div className="text-sm font-bold text-foreground truncate">{selectedReview.design_reference || "Unassigned"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={12}/> Session Stakeholders & Participants
                </div>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border rounded-lg">
                  {selectedReview.stakeholders ? selectedReview.stakeholders.split(',').map((p: string, i: number) => (
                    <Badge key={i} className="bg-background text-foreground border-border font-medium shadow-sm">{p.trim()}</Badge>
                  )) : <span className="text-xs italic text-muted-foreground">No participants listed.</span>}
                </div>
              </div>

              <section className={cn("p-5 rounded-lg border relative shadow-sm", 
                  selectedReview.status === 'Needs Re-review' ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50" : "bg-muted/10 border-border"
              )}>
                {selectedReview.status === 'Needs Re-review' && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-lg" />
                )}
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground mb-3 border-b border-border/50 pb-2">
                  <MessageSquare size={14} className={selectedReview.status === 'Needs Re-review' ? "text-red-500" : "text-primary"} /> 
                  Feedback Summary & Action Items
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedReview.feedback_summary || <span className="italic text-muted-foreground">No session notes recorded.</span>}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedReview.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedReview(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Presentation size={18} className="text-blue-500" /> {isEditMode ? "Edit Review Session" : "Schedule Prototype Review"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Notes Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review ID</label>
                    <input 
                      required 
                      value={formData.review_id} onChange={e => setFormData({...formData, review_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Session Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. SSO Flow Executive Walkthrough" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Figma size={12}/> Target Design Link</label>
                    <select 
                      value={formData.design_reference} onChange={e => setFormData({...formData, design_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- No Design Linked --</option>
                      {dbDesigns.map(d => (
                        <option key={d.id} value={`${d.link_id} - ${d.title}`}>{d.link_id} - {d.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Date</label>
                    <input 
                      type="date" required
                      value={formData.review_date} onChange={e => setFormData({...formData, review_date: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Session Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className={cn("w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 font-bold", 
                        formData.status === 'Needs Re-review' ? "bg-red-50 text-red-700 border-red-200" :
                        formData.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        formData.status === 'In Progress' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-background text-foreground border-border"
                      )}
                    >
                      <option>Scheduled</option>
                      <option>In Progress</option>
                      <option>Needs Re-review</option>
                      <option>Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Users size={12}/> Stakeholders (Comma Separated)</label>
                  <input 
                    required 
                    value={formData.stakeholders} onChange={e => setFormData({...formData, stakeholders: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. David Wallace, Pam Beesly, IT Team" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Feedback & Action Items</label>
                  <textarea 
                    rows={5}
                    value={formData.feedback_summary} onChange={e => setFormData({...formData, feedback_summary: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                    placeholder="Log the feedback provided by stakeholders during the walkthrough..." 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Log Review Session")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}