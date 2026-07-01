import { useState, useEffect } from "react";
import { Plus, Download, BarChart3, LineChart, PieChart, Users, Clock, Edit, Trash2, X, Wand2, Link2, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ReportingRequirementsView({ activeProject }: { activeProject: string }) {
  const [dbRep, setDbRep] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedRep, setSelectedRep] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    rep_id: "",
    title: "",
    cadence: "On-Demand",
    target_audience: "Operational",
    metrics: "",
    story_reference: "",
    description: "",
    status: "Draft"
  });

  async function fetchData() {
    setLoading(true);
    const [repRes, storiesRes] = await Promise.all([
      supabase.from('reporting_requirements').select('*').eq('project_name', activeProject).order('rep_id', { ascending: true }),
      supabase.from('user_stories').select('id, story_id, title').eq('project_name', activeProject).order('story_id', { ascending: true })
    ]);

    if (repRes.data) setDbRep(repRes.data);
    if (storiesRes.data) setDbStories(storiesRes.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `REP-${Math.floor(Math.random() * 90000)}`,
      rep_id: formData.rep_id,
      title: formData.title,
      cadence: formData.cadence,
      target_audience: formData.target_audience,
      metrics: formData.metrics,
      story_reference: formData.story_reference,
      description: formData.description,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('reporting_requirements').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('reporting_requirements').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedRep) setSelectedRep(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this profile layout?")) return;
    setDbRep(dbRep.filter(r => r.id !== id));
    setSelectedRep(null);
    const { error } = await supabase.from('reporting_requirements').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      metrics: "Core Dimensions: (e.g., User ID, Event Timestamp, Success Boolean).\n\nAggregated KPIs: (e.g., Total Count over time, Trend Percent change).",
      description: "Business Value / Goal: Why does leadership require this information extract map?\n\nExport Constraints: (e.g., Must export to XLSX and CSV, access restricted to Finance group roles)."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbRep.length + 101;
    setFormData({ id: "", rep_id: `REP-${nextNum}`, title: "", cadence: "On-Demand", target_audience: "Operational", metrics: "", story_reference: "", description: "", status: "Draft" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      rep_id: item.rep_id,
      title: item.title,
      cadence: item.cadence || "On-Demand",
      target_audience: item.target_audience || "Operational",
      metrics: item.metrics || "",
      story_reference: item.story_reference || "",
      description: item.description || "",
      status: item.status || "Draft"
    });
    setIsFormOpen(true);
    setSelectedRep(null);
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

  const getAudienceColor = (aud: string) => {
    switch(aud) {
      case "Executive": return "bg-violet-100 text-violet-700 border-violet-200";
      case "Audit": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Operational
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Reporting & Analytics Requirements"
        sub={`Data extract specifications, dashboard visual wireframes, and business indicators for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Catalog</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Report Matrix
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Mapped Metrics</div>
            <div className="text-2xl font-bold">{dbRep.length}</div>
          </div>
          <BarChart3 className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Approved & Baselined</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {dbRep.filter(r => r.status === "Approved").length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Real-Time Reports</div>
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {dbRep.filter(r => r.cadence === "Real-Time").length}
            </div>
          </div>
          <LineChart className="text-violet-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading visual specifications...</div>
      ) : dbRep.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <BarChart3 size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Report Guidelines Profiled</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Draft analytics dashboards, file extracts, and dimension fields.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Analytical Report</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbRep.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedRep(item)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: item.status === 'Approved' ? '#10B981' : item.status === 'In Review' ? '#3B82F6' : item.status === 'Blocked' ? '#EF4444' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{item.rep_id}</Badge>
                <Badge className={cn("text-[10px]", getStatusColor(item.status))}>{item.status}</Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{item.title}</h3>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                <Badge className="bg-muted text-muted-foreground text-[9px] border-none font-medium flex items-center gap-1"><Clock size={10}/> {item.cadence}</Badge>
                <Badge className={cn("text-[9px]", getAudienceColor(item.target_audience))}>Audience: {item.target_audience}</Badge>
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                {item.description}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] pt-3 border-t border-border font-medium text-muted-foreground">
                <span className="flex items-center gap-1 text-primary truncate max-w-[180px]">
                  <Link2 size={12} className="shrink-0"/> {item.story_reference ? item.story_reference.split(' - ')[0] : "Unlinked"}
                </span>
                <PieChart size={14} className="text-muted-foreground opacity-60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ MODAL */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedRep.rep_id}</Badge>
                <Badge className={getStatusColor(selectedRep.status)}>{selectedRep.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedRep, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedRep.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedRep(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedRep.title}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Update Cadence</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Clock size={14}/> {selectedRep.cadence}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Target Reader Profile</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Users size={14}/> {selectedRep.target_audience}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                    <FileText size={14} /> Scope Objective Definition
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRep.description}
                  </div>
                </section>

                <section className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-700 dark:text-blue-400 mb-2">
                    <BarChart3 size={14} /> Bound Dimensions & Aggregation KPIs
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRep.metrics}
                  </div>
                </section>
                
                {selectedRep.story_reference && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3">
                    <Link2 className="text-primary shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Linked Parent User Story</div>
                      <div className="text-sm font-medium text-foreground">{selectedRep.story_reference}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedRep.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedRep(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-500" /> {isEditMode ? "Edit Metrics Matrix" : "Map Report Specification"}
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">ID Ref</label>
                  <input 
                    required 
                    value={formData.rep_id} onChange={e => setFormData({...formData, rep_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reporting Asset Matrix Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Daily Active Token Sync Fail Log" 
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Lifecycle State</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Delivery Rhythm Cadence</label>
                  <select 
                    value={formData.cadence} onChange={e => setFormData({...formData, cadence: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>On-Demand</option>
                    <option>Real-Time</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reader Target Audience</label>
                  <select 
                    value={formData.target_audience} onChange={e => setFormData({...formData, target_audience: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Operational</option>
                    <option>Executive</option>
                    <option>Audit</option>
                    <option>External Partner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Report Fields, Dimensions & Aggregation KPIs</label>
                <textarea 
                  required rows={3}
                  value={formData.metrics} onChange={e => setFormData({...formData, metrics: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="Detail columns, fields, data filters and trend aggregates..." 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Functional Scope Objective Description</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="State technical query parameters and core reporting business value..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Matrix")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}