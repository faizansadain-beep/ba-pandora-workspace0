import { useState, useEffect } from "react";
import { Plus, Download, Scale, ShieldCheck, Eye, ClipboardCheck, AlertCircle, Edit, Trash2, X, Wand2, Link2, FileText, Accessibility } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ComplianceView({ activeProject }: { activeProject: string }) {
  const [dbComp, setDbComp] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedComp, setSelectedComp] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    comp_id: "",
    title: "",
    authority_standard: "",
    category: "Privacy",
    audit_method: "",
    story_reference: "",
    description: "",
    status: "Draft"
  });

  async function fetchData() {
    setLoading(true);
    const [compRes, storiesRes] = await Promise.all([
      supabase.from('compliance_requirements').select('*').eq('project_name', activeProject).order('comp_id', { ascending: true }),
      supabase.from('user_stories').select('id, story_id, title').eq('project_name', activeProject).order('story_id', { ascending: true })
    ]);

    if (compRes.data) setDbComp(compRes.data);
    if (storiesRes.data) setDbStories(storiesRes.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `COMP-${Math.floor(Math.random() * 90000)}`,
      comp_id: formData.comp_id,
      title: formData.title,
      authority_standard: formData.authority_standard,
      category: formData.category,
      audit_method: formData.audit_method,
      story_reference: formData.story_reference,
      description: formData.description,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('compliance_requirements').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('compliance_requirements').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving compliance requirement:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedComp) setSelectedComp(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this compliance framework requirement?")) return;
    setDbComp(dbComp.filter(c => c.id !== id));
    setSelectedComp(null);
    const { error } = await supabase.from('compliance_requirements').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Regulatory Mandate: State exactly what compliance rule forces this behavior.\n\nLegal Risk if Breached: (e.g., Fines, breach of SLA contract, audit failure).",
      audit_method: "Verification Procedure: How does QA or an internal auditor verify that the engineering team met this compliance goal?"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbComp.length + 101;
    setFormData({ id: "", comp_id: `COMP-${nextNum}`, title: "", authority_standard: "", category: "Privacy", audit_method: "", story_reference: "", description: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      comp_id: item.comp_id,
      title: item.title,
      authority_standard: item.authority_standard || "",
      category: item.category || "Privacy",
      audit_method: item.audit_method || "",
      story_reference: item.story_reference || "",
      description: item.description || "",
      status: item.status || "Draft"
    });
    setIsFormOpen(true);
    setSelectedComp(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Compliant": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Under Review": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Non-Compliant": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case "Accessibility": return <Accessibility size={12} className="text-blue-500" />;
      case "Privacy": return <Eye size={12} className="text-violet-500" />;
      default: return <Scale size={12} className="text-amber-500" />;
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Regulatory Compliance Controls"
        sub={`Accessibility checkpoints, security policies, and legal framework baselines for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Compliance Book</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Map Mandate Profile
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Mapped Constraints</div>
            <div className="text-2xl font-bold">{dbComp.length}</div>
          </div>
          <Scale className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Validated Compliant</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {dbComp.filter(c => c.status === "Compliant").length}
            </div>
          </div>
          <ShieldCheck className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-200">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Non-Compliant / Exposure</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {dbComp.filter(c => c.status === "Non-Compliant").length}
            </div>
          </div>
          <AlertCircle className="text-red-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading governance requirements...</div>
      ) : dbComp.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Scale size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Regulatory Directives Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Track statutory, accessibility, or audit criteria guidelines.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Compliance Profile</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbComp.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedComp(item)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: item.status === 'Compliant' ? '#10B981' : item.status === 'Under Review' ? '#3B82F6' : item.status === 'Non-Compliant' ? '#EF4444' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{item.comp_id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(item.status))}>{item.status}</Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-1.5">{item.title}</h3>
              <div className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50 self-start mb-3">
                Standard: {item.authority_standard}
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-3">
                {getCategoryIcon(item.category)} {item.category} Frame
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                {item.description}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] pt-3 border-t border-border font-medium text-muted-foreground">
                <span className="flex items-center gap-1 text-primary truncate max-w-[180px]">
                  <Link2 size={12} className="shrink-0"/> {item.story_reference ? item.story_reference.split(' - ')[0] : "Unlinked"}
                </span>
                {item.audit_method && <Badge className="bg-muted text-muted-foreground border-none text-[9px]">Has Audit Loop</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedComp.comp_id}</Badge>
                <Badge className={getStatusColor(selectedComp.status)}>{selectedComp.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedComp, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedComp.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedComp(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedComp.title}</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Mandate Category</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">{getCategoryIcon(selectedComp.category)} {selectedComp.category}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg col-span-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Authority Framework Standard</span>
                    <span className="text-sm font-mono font-bold text-primary truncate">{selectedComp.authority_standard}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                    <FileText size={14} /> Regulatory Mandate Specification
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedComp.description}
                  </div>
                </section>

                {selectedComp.audit_method && (
                  <section className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-700 dark:text-blue-400 mb-2">
                      <ClipboardCheck size={14} /> QA / Audit Verification Procedure
                    </h3>
                    <div className="text-sm font-medium text-foreground whitespace-pre-wrap">
                      {selectedComp.audit_method}
                    </div>
                  </section>
                )}
                
                {selectedComp.story_reference && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3">
                    <Link2 className="text-primary shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Linked Parent User Story</div>
                      <div className="text-sm font-medium text-foreground">{selectedComp.story_reference}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedComp.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedComp(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Scale size={18} className="text-blue-500" /> {isEditMode ? "Edit Framework Mandate" : "Map Compliance Requirement"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Governance Blueprint
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Comp ID</label>
                  <input 
                    required 
                    value={formData.comp_id} onChange={e => setFormData({...formData, comp_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Requirement / Constraint Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Right to be Forgotten (Data Erasure)" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> Parent User Story Link</label>
                  <select 
                    value={formData.story_reference} onChange={e => setFormData({...formData, story_reference: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">-- No Story Linked --</option>
                    {dbStories.map(s => (
                      <option key={s.id} value={`${s.story_id} - ${s.title}`}>{s.story_id} - {s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Audit Evaluation Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Draft</option>
                    <option>Under Review</option>
                    <option>Compliant</option>
                    <option>Non-Compliant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mandate Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Privacy</option>
                    <option>Accessibility</option>
                    <option>Financial / Tax</option>
                    <option>Retention / Archival</option>
                    <option>Statutory Regulatory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Authority Framework Standard</label>
                  <input 
                    required
                    value={formData.authority_standard} onChange={e => setFormData({...formData, authority_standard: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. GDPR Art 17, WCAG 2.1 AA, HIPAA" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mandate Operational Description</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="State the exact parameters and legal constraints mandated by this governing body standard..." 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">QA Audit Verification Procedure (Optional)</label>
                <textarea 
                  rows={3}
                  value={formData.audit_method} onChange={e => setFormData({...formData, audit_method: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="How does a tester prove the system complies with this standard rule profile?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Compliance Control")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}