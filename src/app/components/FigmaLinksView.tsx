import { useState, useEffect } from "react";
import { Plus, Download, Figma, ExternalLink, Edit, Trash2, X, Wand2, Link2, ListTree, CheckCircle2, Clock, AlertTriangle, Palette } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function FigmaLinksView({ activeProject }: { activeProject: string }) {
  const [dbLinks, setDbLinks] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedLink, setSelectedLink] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    link_id: "",
    title: "",
    feature_reference: "",
    figma_url: "",
    design_status: "Hi-Fi Draft",
    notes: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [linksRes, featRes] = await Promise.all([
        supabase.from('design_figma_links').select('*').eq('project_name', activeProject).order('link_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (linksRes.data) setDbLinks(linksRes.data);
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
      id: isEditMode ? formData.id : `FIG-${Math.floor(Math.random() * 90000)}`,
      link_id: formData.link_id,
      title: formData.title,
      feature_reference: formData.feature_reference,
      figma_url: formData.figma_url,
      design_status: formData.design_status,
      notes: formData.notes,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('design_figma_links').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('design_figma_links').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving Figma link:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedLink) setSelectedLink(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this design link from the repository?")) return;
    setDbLinks(dbLinks.filter(l => l.id !== id));
    setSelectedLink(null);
    const { error } = await supabase.from('design_figma_links').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      notes: "Design Handoff Notes:\n- Auto-layout is applied.\n- Assets are exportable.\n- Refer to the 'Variables' panel for color/spacing tokens."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbLinks.length + 101;
    setFormData({ id: "", link_id: `FIG-${nextNum}`, title: "", feature_reference: "", figma_url: "", design_status: "Hi-Fi Draft", notes: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedLink(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Ready for Dev": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "Wireframing": return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Palette, border: "#94A3B8" };
      case "Deprecated": return { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, border: "#EF4444" };
      default: return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock, border: "#3B82F6" }; // Hi-Fi Draft
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Figma Design Repository"
        sub={`Centralized high-fidelity designs and dev-handoff links for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Directory</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Figma Link
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Ready for Dev</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbLinks.filter(l => l.design_status === 'Ready for Dev').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Linked Assets</div>
            <div className="text-2xl font-bold">{dbLinks.length}</div>
          </div>
          <Figma className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Hi-Fi Drafts / In Progress</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbLinks.filter(l => l.design_status === 'Hi-Fi Draft' || l.design_status === 'Wireframing').length}
            </div>
          </div>
          <Clock className="text-blue-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading design repository...</div>
      ) : dbLinks.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Figma size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Designs Linked</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Connect Figma URLs to your product features for seamless dev handoffs.</p>
          <Btn variant="secondary" onClick={openNewForm}>Add First Link</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbLinks.map(link => {
            const visuals = getStatusVisuals(link.design_status);

            return (
              <div 
                key={link.id} 
                onClick={() => setSelectedLink(link)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full border-l-4 group"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Figma size={14} className="text-[#F24E1E]" />
                    <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{link.link_id}</Badge>
                  </div>
                  <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                    {(() => {
                      const Icon = visuals.icon;
                      return <Icon size={10} />;
                    })()} 
                    {link.design_status}
                  </Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors">{link.title}</h3>
                
                {link.feature_reference && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-4">
                    <ListTree size={12} className="text-primary/70" /> {link.feature_reference.split(' - ')[0]}
                  </div>
                )}
                
                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                  <a 
                    href={link.figma_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={e => e.stopPropagation()} 
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <ExternalLink size={14}/> Open in Figma
                  </a>
                  <span className="text-[10px] text-muted-foreground italic truncate max-w-[40%]">
                    {link.notes ? "Contains handoff notes" : "No notes"}
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
      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedLink.link_id}</Badge>
                <Badge className={cn("gap-1 font-bold", getStatusVisuals(selectedLink.design_status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedLink.design_status).icon;
                    return <Icon size={14} />;
                  })()} 
                  {selectedLink.design_status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedLink, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedLink.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedLink(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedLink.title}</h2>
                <div className="bg-card border border-border p-4 rounded-lg flex items-center gap-3">
                  <ListTree className="text-primary mt-0.5 shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Linked Parent Feature</div>
                    <div className="text-sm font-bold text-foreground truncate">{selectedLink.feature_reference || "Unassigned"}</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#2C2D33] text-white border border-border/50 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
                  <Figma size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
                    <Figma size={16} className="text-[#F24E1E]" /> Design File Link
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md truncate">{selectedLink.figma_url}</p>
                </div>
                <a 
                  href={selectedLink.figma_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="relative z-10 px-5 py-2.5 bg-white text-black hover:bg-gray-100 text-sm font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2 shrink-0"
                >
                  <ExternalLink size={16}/> View Design
                </a>
              </div>

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                  <Palette size={14} /> Design & Handoff Notes
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedLink.notes || <span className="italic text-muted-foreground">No additional context provided.</span>}
                </div>
              </section>

            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedLink.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedLink(null)}>Close</Btn>
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
                <Figma size={18} className="text-[#F24E1E]" /> {isEditMode ? "Edit Figma Reference" : "Add Figma Link"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Handoff Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link ID</label>
                    <input 
                      required 
                      value={formData.link_id} onChange={e => setFormData({...formData, link_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Screen / Asset Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. SSO Login Screen (Final)" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> Direct Figma URL</label>
                    <input 
                      required type="url"
                      value={formData.figma_url} onChange={e => setFormData({...formData, figma_url: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="https://www.figma.com/file/..." 
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><ListTree size={12}/> Parent Feature Link</label>
                    <select 
                      value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- No Feature Linked --</option>
                      {dbFeatures.map(f => (
                        <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Design Readiness Status</label>
                    <select 
                      value={formData.design_status} onChange={e => setFormData({...formData, design_status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                    >
                      <option>Wireframing</option>
                      <option>Hi-Fi Draft</option>
                      <option>Ready for Dev</option>
                      <option>Deprecated</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Context & Dev Handoff Notes</label>
                  <textarea 
                    rows={4}
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                    placeholder="Mention specific artboards, edge case behaviors, or interactions developers should note..." 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Figma Link")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}