import { useState, useEffect } from "react";
import { Plus, Download, Shield, ShieldCheck, ShieldAlert, Key, Lock, EyeOff, Edit, Trash2, X, Wand2, Link2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function SecurityView({ activeProject }: { activeProject: string }) {
  const [dbSec, setDbSec] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedSec, setSelectedSec] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    sec_id: "",
    title: "",
    scope: "Application",
    control_type: "Preventative",
    story_reference: "",
    encryption_standard: "",
    description: "",
    status: "Draft"
  });

  async function fetchData() {
    setLoading(true);
    const [secRes, storiesRes] = await Promise.all([
      supabase.from('security_requirements').select('*').eq('project_name', activeProject).order('sec_id', { ascending: true }),
      supabase.from('user_stories').select('id, story_id, title').eq('project_name', activeProject).order('story_id', { ascending: true })
    ]);

    if (secRes.data) setDbSec(secRes.data);
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
      id: isEditMode ? formData.id : `SEC-${Math.floor(Math.random() * 90000)}`,
      sec_id: formData.sec_id,
      title: formData.title,
      scope: formData.scope,
      control_type: formData.control_type,
      story_reference: formData.story_reference,
      encryption_standard: formData.encryption_standard,
      description: formData.description,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('security_requirements').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('security_requirements').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving security requirement:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedSec) setSelectedSec(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this security configuration profile?")) return;
    setDbSec(dbSec.filter(s => s.id !== id));
    setSelectedSec(null);
    const { error } = await supabase.from('security_requirements').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Threat Scenario: What threat vec is being mitigated?\n\nPolicy Mapping: Identify internal InfoSec standard reference.\n\nAccess Control Constraints: List roles authorized or blocked."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbSec.length + 101;
    setFormData({ id: "", sec_id: `SEC-${nextNum}`, title: "", scope: "Application", control_type: "Preventative", story_reference: "", encryption_standard: "", description: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      sec_id: item.sec_id,
      title: item.title,
      scope: item.scope || "Application",
      control_type: item.control_type || "Preventative",
      story_reference: item.story_reference || "",
      encryption_standard: item.encryption_standard || "",
      description: item.description || "",
      status: item.status || "Draft"
    });
    setIsFormOpen(true);
    setSelectedSec(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Review": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  const getScopeIcon = (scope: string) => {
    switch(scope) {
      case "IAM": return <Key size={12} className="text-blue-500" />;
      case "Data": return <Lock size={12} className="text-red-500" />;
      case "Network": return <ShieldAlert size={12} className="text-amber-500" />;
      default: return <EyeOff size={12} className="text-violet-500" />; // Application
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Security Requirements"
        sub={`Hardening policies, cryptography benchmarks, and IAM criteria for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Security Plan</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Policy Profile
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Controls</div>
            <div className="text-2xl font-bold">{dbSec.length}</div>
          </div>
          <Shield className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved Baselines</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {dbSec.filter(s => s.status === "Approved").length}
            </div>
          </div>
          <ShieldCheck className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">IAM Requirements</div>
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {dbSec.filter(s => s.scope === "IAM").length}
            </div>
          </div>
          <Key className="text-violet-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading security baselines...</div>
      ) : dbSec.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Shield size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Security Directives Configured</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Draft security controls, encryption patterns, and session bounds.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Security Profile</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbSec.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedSec(item)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: item.status === 'Approved' ? '#10B981' : item.status === 'In Review' ? '#3B82F6' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{item.sec_id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(item.status))}>{item.status}</Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{item.title}</h3>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-3">
                {getScopeIcon(item.scope)} {item.scope} Control ({item.control_type})
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                {item.description}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] pt-3 border-t border-border font-medium text-muted-foreground">
                <span className="flex items-center gap-1 text-primary truncate max-w-[180px]">
                  <Link2 size={12} className="shrink-0"/> {item.story_reference ? item.story_reference.split(' - ')[0] : "Unlinked"}
                </span>
                {item.encryption_standard && <span className="font-mono bg-card px-1.5 py-0.5 border border-border rounded text-[9px]">{item.encryption_standard}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedSec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedSec.sec_id}</Badge>
                <Badge className={getStatusColor(selectedSec.status)}>{selectedSec.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedSec, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedSec.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedSec(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedSec.title}</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Control Sphere</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">{getScopeIcon(selectedSec.scope)} {selectedSec.scope}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Classification</span>
                    <span className="text-sm font-bold text-foreground">{selectedSec.control_type}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Crypto Benchmark</span>
                    <span className="text-sm font-mono font-bold text-primary truncate">{selectedSec.encryption_standard || "None Specified"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                    <FileText size={14} /> Control Directive Ruleset
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedSec.description}
                  </div>
                </section>
                
                {selectedSec.story_reference && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3">
                    <Link2 className="text-primary shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Linked Operational Story</div>
                      <div className="text-sm font-medium text-foreground">{selectedSec.story_reference}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedSec.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedSec(null)}>Close</Btn>
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
                <Shield size={18} className="text-blue-500" /> {isEditMode ? "Edit Policy Record" : "Add Security Policy Profile"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Frame Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sec ID</label>
                  <input 
                    required 
                    value={formData.sec_id} onChange={e => setFormData({...formData, sec_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Policy / Directive Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Session Token Expiry Interval" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> Parent Story Linkage</label>
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lifecycle Review Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Draft</option>
                    <option>In Review</option>
                    <option>Approved</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-muted/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scope Sphere</label>
                  <select 
                    value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>IAM</option>
                    <option>Data</option>
                    <option>Network</option>
                    <option>Application</option>
                    <option>Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Control Action Pattern</label>
                  <select 
                    value={formData.control_type} onChange={e => setFormData({...formData, control_type: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Preventative</option>
                    <option>Detective</option>
                    <option>Corrective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Encryption Benchmark</label>
                  <input 
                    value={formData.encryption_standard} onChange={e => setFormData({...formData, encryption_standard: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. TLS 1.3, AES-256" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Technical Control Specifications</label>
                <textarea 
                  required rows={5}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Explicitly describe how the cryptographic algorithm, runtime environment, or session parameters must function..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Security Controls")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}