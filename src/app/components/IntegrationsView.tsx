import { useState, useEffect } from "react";
import { Plus, Download, ArrowRightLeft, Radio, KeyRound, Code, Edit, Trash2, X, Wand2, Link2, FileText, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function IntegrationsView({ activeProject }: { activeProject: string }) {
  const [dbInt, setDbInt] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedInt, setSelectedInt] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    int_id: "",
    system_name: "",
    integration_type: "REST API",
    direction: "Outbound",
    auth_method: "OAuth2",
    story_reference: "",
    endpoint_url: "",
    payload_format: "JSON",
    description: "",
    status: "Proposed"
  });

  async function fetchData() {
    setLoading(true);
    const [intRes, storiesRes] = await Promise.all([
      supabase.from('integrations').select('*').eq('project_name', activeProject).order('int_id', { ascending: true }),
      supabase.from('user_stories').select('id, story_id, title').eq('project_name', activeProject).order('story_id', { ascending: true })
    ]);

    if (intRes.data) setDbInt(intRes.data);
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
      id: isEditMode ? formData.id : `INT-${Math.floor(Math.random() * 90000)}`,
      int_id: formData.int_id,
      system_name: formData.system_name,
      integration_type: formData.integration_type,
      direction: formData.direction,
      auth_method: formData.auth_method,
      story_reference: formData.story_reference,
      endpoint_url: formData.endpoint_url,
      payload_format: formData.payload_format,
      description: formData.description,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('integrations').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('integrations').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving integration:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedInt) setSelectedInt(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Integration mapping?")) return;
    setDbInt(dbInt.filter(i => i.id !== id));
    setSelectedInt(null);
    const { error } = await supabase.from('integrations').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Data Model Mapping: (e.g., Maps field X in our system to field Y in external interface).\n\nFrequency/Trigger: (e.g., real-time, scheduled cron job, event driven via webhook)."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbInt.length + 101;
    setFormData({ id: "", int_id: `INT-${nextNum}`, system_name: "", integration_type: "REST API", direction: "Outbound", auth_method: "OAuth2", story_reference: "", endpoint_url: "", payload_format: "JSON", description: "", status: "Proposed" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      int_id: item.int_id,
      system_name: item.system_name,
      integration_type: item.integration_type || "REST API",
      direction: item.direction || "Outbound",
      auth_method: item.auth_method || "OAuth2",
      story_reference: item.story_reference || "",
      endpoint_url: item.endpoint_url || "",
      payload_format: item.payload_format || "JSON",
      description: item.description || "",
      status: item.status || "Proposed"
    });
    setIsFormOpen(true);
    setSelectedInt(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "In Development": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Blocked": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Proposed
    }
  };

  const getDirectionBadge = (dir: string) => {
    switch(dir) {
      case "Bi-directional": return "bg-violet-100 text-violet-700 border-violet-200";
      case "Inbound": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200"; // Outbound
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="System Integrations"
        sub={`API contracts, schemas, and system connectivity maps for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Specs</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Map Integration
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Mapped Interfaces</div>
            <div className="text-2xl font-bold">{dbInt.length}</div>
          </div>
          <ArrowRightLeft className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">In Dev / Active</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dbInt.filter(i => i.status === "Active" || i.status === "In Development").length}
            </div>
          </div>
          <Activity className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Blocked Pipelines</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbInt.filter(i => i.status === "Blocked").length}
            </div>
          </div>
          <Radio className="text-red-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading integration maps...</div>
      ) : dbInt.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ArrowRightLeft size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Integrations Mapped</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define APIs, protocols, and payloads between your platforms.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First System Integration</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbInt.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedInt(item)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: item.status === 'Active' ? '#10B981' : item.status === 'In Development' ? '#3B82F6' : item.status === 'Blocked' ? '#EF4444' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{item.int_id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(item.status))}>{item.status}</Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-1.5">{item.system_name}</h3>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                <Badge className="bg-muted text-muted-foreground text-[9px] border-none font-medium">{item.integration_type}</Badge>
                <Badge className={cn("text-[9px]", getDirectionBadge(item.direction))}>{item.direction}</Badge>
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                {item.description || <span className="italic text-muted-foreground">No details documented.</span>}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] pt-3 border-t border-border font-medium text-muted-foreground">
                <span className="flex items-center gap-1 text-primary truncate max-w-[180px]">
                  <Link2 size={12} className="shrink-0"/> {item.story_reference ? item.story_reference.split(' - ')[0] : "Unlinked"}
                </span>
                <span className="font-mono bg-card px-1.5 py-0.5 border border-border rounded text-[9px]">{item.payload_format}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedInt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedInt.int_id}</Badge>
                <Badge className={getStatusColor(selectedInt.status)}>{selectedInt.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedInt, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedInt.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedInt(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedInt.system_name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Interface Type</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Code size={14}/> {selectedInt.integration_type}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Flow Direction</span>
                    <span className="text-sm font-bold text-foreground">{selectedInt.direction}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Authentication</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><KeyRound size={14} className="text-amber-500"/> {selectedInt.auth_method}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Payload Format</span>
                    <span className="text-sm font-mono font-bold text-primary">{selectedInt.payload_format}</span>
                  </div>
                </div>
              </div>

              {selectedInt.endpoint_url && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Endpoint Resource Target URL</label>
                  <div className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md font-mono text-foreground select-all overflow-x-auto whitespace-nowrap">
                    {selectedInt.endpoint_url}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                    <FileText size={14} /> Interface Mapping & Schema Rules
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedInt.description || <span className="text-muted-foreground italic">No definition provided.</span>}
                  </div>
                </section>
                
                {selectedInt.story_reference && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3">
                    <Link2 className="text-primary shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Linked Requirement / Story</div>
                      <div className="text-sm font-medium text-foreground">{selectedInt.story_reference}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedInt.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedInt(null)}>Close</Btn>
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
                <ArrowRightLeft size={18} className="text-blue-500" /> {isEditMode ? "Edit Interface Map" : "Map System Interface"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Mapping Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Int ID</label>
                  <input 
                    required 
                    value={formData.int_id} onChange={e => setFormData({...formData, int_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">External Connected System Name</label>
                  <input 
                    required autoFocus 
                    value={formData.system_name} onChange={e => setFormData({...formData, system_name: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Stripe Gateway API, SalesForce CRM" 
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lifecycle Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Proposed</option>
                    <option>In Development</option>
                    <option>Active</option>
                    <option>Blocked</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-muted/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Integration Type</label>
                  <select 
                    value={formData.integration_type} onChange={e => setFormData({...formData, integration_type: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>REST API</option>
                    <option>Webhook</option>
                    <option>SOAP API</option>
                    <option>SFTP File Dump</option>
                    <option>GraphQL</option>
                    <option>Message Queue (RabbitMQ/Kafka)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Authentication Protocol</label>
                  <select 
                    value={formData.auth_method} onChange={e => setFormData({...formData, auth_method: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>OAuth2</option>
                    <option>API Key</option>
                    <option>Basic Auth (User/Pass)</option>
                    <option>Mutual TLS (mTLS)</option>
                    <option>None / Public</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data Flow Direction</label>
                  <select 
                    value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Outbound</option>
                    <option>Inbound</option>
                    <option>Bi-directional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payload Interchange Structure</label>
                  <select 
                    value={formData.payload_format} onChange={e => setFormData({...formData, payload_format: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>JSON</option>
                    <option>XML</option>
                    <option>CSV</option>
                    <option>Binary/Multipart</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Endpoint Address / Base URL</label>
                <input 
                  value={formData.endpoint_url} onChange={e => setFormData({...formData, endpoint_url: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="https://api.externalvendor.com/v1/resource" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payload Transformation & Field Mapping Contract</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Document how fields are systematically translated or when messages are transmitted..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Integration Specs")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}