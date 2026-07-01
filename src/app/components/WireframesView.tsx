import { useState, useEffect } from "react";
import { Plus, Download, Layout, LayoutTemplate, Smartphone, Monitor, Edit, Trash2, X, Wand2, Link2, ListTree, CheckCircle2, Eye, PenTool } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function WireframesView({ activeProject }: { activeProject: string }) {
  const [dbWireframes, setDbWireframes] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedWireframe, setSelectedWireframe] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    wireframe_id: "",
    title: "",
    feature_reference: "",
    screen_type: "Web Dashboard",
    annotations: "",
    mockup_link: "",
    status: "Draft"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [wireRes, featRes] = await Promise.all([
        supabase.from('design_wireframes').select('*').eq('project_name', activeProject).order('wireframe_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (wireRes.data) setDbWireframes(wireRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
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
      id: isEditMode ? formData.id : `WIR-${Math.floor(Math.random() * 90000)}`,
      wireframe_id: formData.wireframe_id,
      title: formData.title,
      feature_reference: formData.feature_reference,
      screen_type: formData.screen_type,
      annotations: formData.annotations,
      mockup_link: formData.mockup_link,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('design_wireframes').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('design_wireframes').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving wireframe:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedWireframe) setSelectedWireframe(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this wireframe specification?")) return;
    setDbWireframes(dbWireframes.filter(w => w.id !== id));
    setSelectedWireframe(null);
    const { error } = await supabase.from('design_wireframes').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      annotations: "Header Area: [Describe elements]\nMain Content: [Describe layout and interactions]\nFooter/Actions: [Describe buttons and routing]"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbWireframes.length + 101;
    setFormData({ id: "", wireframe_id: `WF-${nextNum}`, title: "", feature_reference: "", screen_type: "Web Dashboard", annotations: "", mockup_link: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedWireframe(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Review": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  const getScreenIcon = (type: string) => {
    switch(type) {
      case "Mobile App": return Smartphone;
      case "Modal / Dialog": return LayoutTemplate;
      case "Email Template": return Layout;
      default: return Monitor; // Web Dashboard
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Functional Wireframes"
        sub={`Low-fidelity layouts and structural functional annotations for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Specs</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Draft Wireframe
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Wireframes Cataloged</div>
            <div className="text-2xl font-bold">{dbWireframes.length}</div>
          </div>
          <PenTool className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Pending UX Review</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbWireframes.filter(w => w.status === 'In Review').length}
            </div>
          </div>
          <Eye className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved for UI</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbWireframes.filter(w => w.status === 'Approved').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading visual specifications...</div>
      ) : dbWireframes.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Layout size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Wireframes Documented</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Draft structural layouts to visually explain functional requirements to the design team.</p>
          <Btn variant="secondary" onClick={openNewForm}>Draft First Wireframe</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbWireframes.map(wire => {
            const ScreenIcon = getScreenIcon(wire.screen_type);

            return (
              <div 
                key={wire.id} 
                onClick={() => setSelectedWireframe(wire)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
                style={{ borderTopColor: wire.status === 'Approved' ? '#10B981' : wire.status === 'In Review' ? '#F59E0B' : '#94A3B8' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{wire.wireframe_id}</Badge>
                  <Badge className={cn("text-[10px] font-bold", getStatusColor(wire.status))}>{wire.status}</Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-3">{wire.title}</h3>

                {/* Wireframe Placeholder Visual */}
                <div className="bg-muted/40 border border-border/50 rounded-lg h-24 mb-4 flex items-center justify-center relative overflow-hidden group/visual">
                  <ScreenIcon size={32} className="text-muted-foreground/40" />
                  {wire.mockup_link && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover/visual:opacity-100 flex items-center justify-center transition-opacity">
                      <a href={wire.mockup_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                        <Link2 size={14}/> View Mockup
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-3">
                  <ScreenIcon size={12} className="text-primary/70" /> {wire.screen_type}
                </div>
                
                <div className="mt-auto text-[10px] pt-3 border-t border-border flex items-start gap-1.5">
                  <ListTree size={14} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground line-clamp-1 italic text-xs font-medium truncate">
                    {wire.feature_reference ? wire.feature_reference.split(' - ')[1] || wire.feature_reference : "No linked feature"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedWireframe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedWireframe.wireframe_id}</Badge>
                <Badge className={cn("font-bold", getStatusColor(selectedWireframe.status))}>{selectedWireframe.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedWireframe, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedWireframe.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedWireframe(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedWireframe.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    {(() => {
                      const Icon = getScreenIcon(selectedWireframe.screen_type);
                      return <Icon className="text-primary mt-0.5 shrink-0" size={18} />;
                    })()}
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Target Platform Type</div>
                      <div className="text-sm font-bold text-foreground">{selectedWireframe.screen_type}</div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <ListTree className="text-primary mt-0.5 shrink-0" size={18} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Parent Feature Map</div>
                      <div className="text-sm font-bold text-foreground truncate">{selectedWireframe.feature_reference || "Unassigned"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedWireframe.mockup_link && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-700 dark:text-blue-400 mb-1">
                      <Link2 size={14} /> External Design Asset
                    </h3>
                    <p className="text-sm text-foreground">A structural link or mockup is available for this wireframe.</p>
                  </div>
                  <a href={selectedWireframe.mockup_link} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors">
                    Open Source Link
                  </a>
                </div>
              )}

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                  <PenTool size={14} /> Functional Layout Annotations
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedWireframe.annotations}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedWireframe.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedWireframe(null)}>Close</Btn>
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
                <Layout size={18} className="text-blue-500" /> {isEditMode ? "Edit Wireframe Spec" : "Draft Layout Requirement"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Annotation Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Wireframe ID</label>
                    <input 
                      required 
                      value={formData.wireframe_id} onChange={e => setFormData({...formData, wireframe_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Layout Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. SSO Login Gateway" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><ListTree size={12}/> Parent Feature Link</label>
                    <select 
                      value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- No Map Linked --</option>
                      {dbFeatures.map(f => (
                        <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform / Screen Type</label>
                    <select 
                      value={formData.screen_type} onChange={e => setFormData({...formData, screen_type: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>Web Dashboard</option>
                      <option>Mobile App</option>
                      <option>Modal / Dialog</option>
                      <option>Email Template</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                    >
                      <option>Draft</option>
                      <option>In Review</option>
                      <option>Approved</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> External Asset URL (Optional)</label>
                  <input 
                    type="url"
                    value={formData.mockup_link} onChange={e => setFormData({...formData, mockup_link: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. https://miro.com/app/board/..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Structural & Functional Annotations</label>
                  <textarea 
                    required rows={6}
                    value={formData.annotations} onChange={e => setFormData({...formData, annotations: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                    placeholder="Describe the functional intent behind this layout. What data must be present? What happens when buttons are clicked?" 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Create Spec")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}