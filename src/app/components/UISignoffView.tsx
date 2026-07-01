import { useState, useEffect } from "react";
import { Plus, Download, CheckSquare, UserCheck, Calendar, MessageSquare, Edit, Trash2, X, Wand2, Figma, XCircle, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function UISignoffView({ activeProject }: { activeProject: string }) {
  const [dbSignoffs, setDbSignoffs] = useState<any[]>([]);
  const [dbDesigns, setDbDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedSignoff, setSelectedSignoff] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    signoff_id: "",
    title: "",
    design_reference: "",
    signoff_authority: "",
    authority_role: "",
    status: "Pending",
    signoff_date: "",
    comments: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [signRes, designsRes] = await Promise.all([
        supabase.from('design_ui_signoff').select('*').eq('project_name', activeProject).order('signoff_id', { ascending: true }),
        supabase.from('design_figma_links').select('id, link_id, title').eq('project_name', activeProject).order('link_id', { ascending: true })
      ]);

      if (signRes.data) setDbSignoffs(signRes.data);
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
      id: isEditMode ? formData.id : `SGF-${Math.floor(Math.random() * 90000)}`,
      signoff_id: formData.signoff_id,
      title: formData.title,
      design_reference: formData.design_reference,
      signoff_authority: formData.signoff_authority,
      authority_role: formData.authority_role,
      status: formData.status,
      signoff_date: formData.status === 'Approved' ? (formData.signoff_date || new Date().toISOString().split('T')[0]) : null,
      comments: formData.comments,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('design_ui_signoff').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('design_ui_signoff').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving sign-off:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedSignoff) setSelectedSignoff(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this design sign-off record?")) return;
    setDbSignoffs(dbSignoffs.filter(s => s.id !== id));
    setSelectedSignoff(null);
    const { error } = await supabase.from('design_ui_signoff').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      comments: "The underlying high-fidelity design layouts match all verified functional business requirements. This asset is officially frozen for sprint planning."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbSignoffs.length + 201;
    const today = new Date().toISOString().split('T')[0];
    setFormData({ id: "", signoff_id: `SIG-${nextNum}`, title: "", design_reference: "", signoff_authority: "", authority_role: "", status: "Pending", signoff_date: today, comments: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item, signoff_date: item.signoff_date || new Date().toISOString().split('T')[0] });
    setIsFormOpen(true);
    setSelectedSignoff(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Approved": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckSquare, border: "#10B981" };
      case "Rejected": return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, border: "#EF4444" };
      default: return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, border: "#F59E0B" }; // Pending
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="UI Design Sign-off Ledger"
        sub={`Formal capability freezes, stakeholder agreements, and dev-ready baselines for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Ledger</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Record Sign-off
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Frozen & Approved</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbSignoffs.filter(s => s.status === 'Approved').length}
            </div>
          </div>
          <CheckSquare className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Awaiting Sign-off</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbSignoffs.filter(s => s.status === 'Pending').length}
            </div>
          </div>
          <Clock className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Ledger Items</div>
            <div className="text-2xl font-bold">{dbSignoffs.length}</div>
          </div>
          <UserCheck className="text-primary opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading signature ledger...</div>
      ) : dbSignoffs.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <CheckSquare size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Ledger is Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Baseline your high-fidelity designs by tracking official PO/Sponsor sign-offs.</p>
          <Btn variant="secondary" onClick={openNewForm}>Record First Sign-off</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbSignoffs.map(sign => {
            const visuals = getStatusVisuals(sign.status);

            return (
              <div 
                key={sign.id} 
                onClick={() => setSelectedSignoff(sign)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{sign.signoff_id}</Badge>
                  <Badge className={cn("text-[10px] gap-1 font-bold", visuals.color)}>
                    {(() => {
                      const Icon = visuals.icon;
                      return <Icon size={10} />;
                    })()} 
                    {sign.status}
                  </Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-3">{sign.title}</h3>
                
                {sign.design_reference && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-3 max-w-full">
                    <Figma size={12} className="text-[#F24E1E] shrink-0" />
                    <span className="truncate">{sign.design_reference.split(' - ')[1] || sign.design_reference}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-foreground font-semibold mb-3">
                  <UserCheck size={14} className="text-primary shrink-0" />
                  <span>{sign.signoff_authority}</span>
                  <span className="text-muted-foreground font-medium border-l border-border pl-2 truncate">{sign.authority_role}</span>
                </div>

                {sign.comments && (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-2 italic mb-1">
                    "{sign.comments}"
                  </div>
                )}
                
                <div className="mt-auto text-[10px] pt-3 border-t border-border flex justify-between text-muted-foreground font-medium">
                  <span>Sign-off Date: {sign.signoff_date ? new Date(sign.signoff_date).toLocaleDateString() : 'Pending'}</span>
                  <span className="font-mono">{sign.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedSignoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedSignoff.signoff_id}</Badge>
                <Badge className={cn("gap-1 font-bold", getStatusVisuals(selectedSignoff.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedSignoff.status).icon;
                    return <Icon size={14} />;
                  })()} 
                  {selectedSignoff.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedSignoff, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedSignoff.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedSignoff(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedSignoff.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <UserCheck className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Signing Authority</div>
                      <div className="text-sm font-bold text-foreground">{selectedSignoff.signoff_authority}</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5">{selectedSignoff.authority_role}</div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <Calendar className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Sign-off Timestamp</div>
                      <div className="text-sm font-bold text-foreground">
                        {selectedSignoff.signoff_date ? new Date(selectedSignoff.signoff_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Awaiting Freeze Approval'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-4 rounded-lg flex items-center gap-3">
                <Figma className="text-[#F24E1E] shrink-0" size={18} />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Baselined Design Asset</div>
                  <div className="text-sm font-medium text-foreground truncate">{selectedSignoff.design_reference || "No explicit mockup bound."}</div>
                </div>
              </div>

              {selectedSignoff.comments && (
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border/50 pb-2">
                    <MessageSquare size={14} /> Authority Comments & Closeout Notes
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedSignoff.comments}
                  </div>
                </section>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedSignoff.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedSignoff(null)}>Close</Btn>
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
                <CheckSquare size={18} className="text-blue-500" /> {isEditMode ? "Edit Sign-off Reference" : "Record Design Sign-off"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Standard Sign-off Block
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign ID</label>
                    <input 
                      required 
                      value={formData.signoff_id} onChange={e => setFormData({...formData, signoff_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign-off Ledger Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. SSO Gateway High-Fi Sign-off" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Figma size={12}/> Target Design Resource</label>
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
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign-off Authority</label>
                    <input 
                      required 
                      value={formData.signoff_authority} onChange={e => setFormData({...formData, signoff_authority: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. David Wallace" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Authority Role</label>
                    <input 
                      required 
                      value={formData.authority_role} onChange={e => setFormData({...formData, authority_role: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. Product Owner / Sponsor" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ledger Decision Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className={cn("w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 font-bold", 
                        formData.status === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        formData.status === 'Rejected' ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      <option>Pending</option>
                      <option>Approved</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign Date (If Approved)</label>
                    <input 
                      type="date" disabled={formData.status !== 'Approved'}
                      value={formData.signoff_date} onChange={e => setFormData({...formData, signoff_date: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sign-off Comments / Caveats</label>
                  <textarea 
                    rows={4}
                    value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed" 
                    placeholder="Log structural caveats, execution parameters, or rejection details..." 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Lock Sign-off")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}