import { useState, useEffect } from "react";
import { Plus, Download, GitMerge, Clock, AlertTriangle, Target, Filter, Zap, Activity, Edit, Trash2, X, Wand2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ValueStreamMappingView({ activeProject }: { activeProject: string }) {
  const [dbVsm, setDbVsm] = useState<any[]>([]);
  const [dbProcesses, setDbProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedVsm, setSelectedVsm] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    vsm_id: "",
    title: "",
    process_reference: "",
    total_lead_time: 0,
    value_added_time: 0,
    waste_time: 0,
    time_unit: "Hours",
    bottleneck_description: "",
    optimization_goal: "",
    status: "Analyzing"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [vsmRes, procRes] = await Promise.all([
        supabase.from('value_stream_mapping').select('*').eq('project_name', activeProject).order('vsm_id', { ascending: true }),
        supabase.from('process_maps').select('id, map_id, title').eq('project_name', activeProject).order('map_id', { ascending: true })
      ]);

      if (vsmRes.data) setDbVsm(vsmRes.data);
      if (procRes.data) setDbProcesses(procRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- Calculations ---
  const calculateEfficiency = (valueAdded: number, totalLead: number) => {
    if (!totalLead || totalLead === 0) return 0;
    return Math.round((valueAdded / totalLead) * 100);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 50) return "text-emerald-600 dark:text-emerald-400";
    if (efficiency >= 20) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400"; // Lean manufacturing considers <20% to be inefficient
  };

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `VSM-${Math.floor(Math.random() * 90000)}`,
      vsm_id: formData.vsm_id,
      title: formData.title,
      process_reference: formData.process_reference,
      total_lead_time: Number(formData.total_lead_time),
      value_added_time: Number(formData.value_added_time),
      waste_time: Number(formData.waste_time),
      time_unit: formData.time_unit,
      bottleneck_description: formData.bottleneck_description,
      optimization_goal: formData.optimization_goal,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('value_stream_mapping').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('value_stream_mapping').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving VSM:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedVsm) setSelectedVsm(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this value stream from analysis?")) return;
    setDbVsm(dbVsm.filter(v => v.id !== id));
    setSelectedVsm(null);
    const { error } = await supabase.from('value_stream_mapping').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      bottleneck_description: "The primary constraint occurs at [Step Name], where items wait in a queue for [Actor/System] to manually process them.",
      optimization_goal: "Reduce waste time by implementing [Automation/Process Change] to achieve a target lead time of [X time]."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbVsm.length + 101;
    setFormData({ id: "", vsm_id: `VSM-${nextNum}`, title: "", process_reference: "", total_lead_time: 0, value_added_time: 0, waste_time: 0, time_unit: "Hours", bottleneck_description: "", optimization_goal: "", status: "Analyzing" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedVsm(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Optimized": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Analyzing": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Draft
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Value Stream Mapping (VSM)"
        sub={`Lean analysis, bottleneck identification, and cycle efficiency mapping for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Streams</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Analyze Stream
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Value Streams</div>
            <div className="text-2xl font-bold">{dbVsm.length}</div>
          </div>
          <Activity className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Active Bottlenecks</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbVsm.filter(v => v.status === 'Analyzing').length}
            </div>
          </div>
          <Filter className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Optimized Flows</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbVsm.filter(v => v.status === 'Optimized').length}
            </div>
          </div>
          <Zap className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading process efficiency data...</div>
      ) : dbVsm.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Activity size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Value Streams Mapped</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Identify delays, measure process cycle efficiency, and map out lean operations.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Value Stream</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dbVsm.map(vsm => {
            const efficiency = calculateEfficiency(vsm.value_added_time, vsm.total_lead_time);

            return (
              <div 
                key={vsm.id} 
                onClick={() => setSelectedVsm(vsm)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: vsm.status === 'Optimized' ? '#10B981' : '#F59E0B' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{vsm.vsm_id}</Badge>
                  <Badge className={cn("text-[10px] font-bold", getStatusColor(vsm.status))}>{vsm.status}</Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-2">{vsm.title}</h3>
                
                {vsm.process_reference && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-4">
                    <GitMerge size={12} className="text-primary/70" /> Map: {vsm.process_reference.split(' - ')[0]}
                  </div>
                )}
                
                {/* Visual Lean Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-muted/30 p-2 rounded border border-border/50 text-center">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Lead</div>
                    <div className="text-sm font-mono font-bold text-foreground">{vsm.total_lead_time} <span className="text-[10px]">{vsm.time_unit}</span></div>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100 dark:border-emerald-900/30 text-center">
                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Value Add</div>
                    <div className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">{vsm.value_added_time} <span className="text-[10px]">{vsm.time_unit}</span></div>
                  </div>
                  <div className="bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/30 text-center">
                    <div className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">Waste (Wait)</div>
                    <div className="text-sm font-mono font-bold text-red-700 dark:text-red-400">{vsm.waste_time} <span className="text-[10px]">{vsm.time_unit}</span></div>
                  </div>
                </div>

                {/* Efficiency Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1">
                    <span className="text-muted-foreground">Cycle Efficiency (PCE)</span>
                    <span className={cn(getEfficiencyColor(efficiency))}>{efficiency}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${efficiency}%` }} />
                    <div className="bg-red-400 h-full" style={{ width: `${100 - efficiency}%` }} />
                  </div>
                </div>
                
                <div className="mt-auto text-[10px] pt-3 border-t border-border flex items-start gap-1.5">
                  <Target size={14} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground line-clamp-1 italic text-xs font-medium">"{vsm.optimization_goal}"</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedVsm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedVsm.vsm_id}</Badge>
                <Badge className={cn("font-bold", getStatusColor(selectedVsm.status))}>{selectedVsm.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedVsm, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedVsm.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedVsm(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedVsm.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <Activity className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Process Cycle Efficiency</div>
                      <div className={cn("text-lg font-black font-mono leading-none", getEfficiencyColor(calculateEfficiency(selectedVsm.value_added_time, selectedVsm.total_lead_time)))}>
                        {calculateEfficiency(selectedVsm.value_added_time, selectedVsm.total_lead_time)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                    <GitMerge className="text-primary mt-0.5 shrink-0" size={18} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Linked Parent Process Map</div>
                      <div className="text-sm font-bold text-foreground truncate">{selectedVsm.process_reference || "Unassigned"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Breakdown Blocks */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/20 border border-border p-4 rounded-lg flex flex-col items-center justify-center text-center">
                  <Clock size={16} className="text-muted-foreground mb-1"/>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Lead Time</span>
                  <span className="text-xl font-mono font-bold text-foreground">{selectedVsm.total_lead_time} <span className="text-xs">{selectedVsm.time_unit}</span></span>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                  <Zap size={16} className="text-emerald-500 mb-1"/>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Value-Added Work</span>
                  <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedVsm.value_added_time} <span className="text-xs">{selectedVsm.time_unit}</span></span>
                </div>
                <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                  <AlertTriangle size={16} className="text-red-500 mb-1"/>
                  <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-0.5">Waste / Wait Queue</span>
                  <span className="text-xl font-mono font-bold text-red-600 dark:text-red-400">{selectedVsm.waste_time} <span className="text-xs">{selectedVsm.time_unit}</span></span>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-red-50/30 dark:bg-red-900/10 p-5 rounded-lg border border-red-200 dark:border-red-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-700 dark:text-red-400 mb-2">
                    <Filter size={14} /> Identified Bottleneck Constraint
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedVsm.bottleneck_description}
                  </div>
                </section>

                <section className="bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-700 dark:text-blue-400 mb-2">
                    <Target size={14} /> Target Optimization Goal
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedVsm.optimization_goal}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedVsm.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedVsm(null)}>Close</Btn>
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
                <Activity size={18} className="text-blue-500" /> {isEditMode ? "Edit Value Stream" : "Map Value Stream"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load VSM Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Stream ID</label>
                    <input 
                      required 
                      value={formData.vsm_id} onChange={e => setFormData({...formData, vsm_id: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Stream Title</label>
                    <input 
                      required autoFocus 
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. End-to-End User Provisioning Flow" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><GitMerge size={12}/> Map to Core Process</label>
                    <select 
                      value={formData.process_reference} onChange={e => setFormData({...formData, process_reference: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">-- No Map Linked --</option>
                      {dbProcesses.map(p => (
                        <option key={p.id} value={`${p.map_id} - ${p.title}`}>{p.map_id} - {p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Time Unit</label>
                      <select 
                        value={formData.time_unit} onChange={e => setFormData({...formData, time_unit: e.target.value})} 
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option>Minutes</option>
                        <option>Hours</option>
                        <option>Days</option>
                        <option>Weeks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Review Status</label>
                      <select 
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                      >
                        <option>Draft</option>
                        <option>Analyzing</option>
                        <option>Optimized</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Numerical Input Block */}
                <div className="bg-muted/10 border border-border p-4 rounded-xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Lean Time Tracking (In {formData.time_unit})</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1"><Clock size={10}/> Total Lead Time</label>
                      <input 
                        required type="number" min="0" step="0.5"
                        value={formData.total_lead_time} onChange={e => setFormData({...formData, total_lead_time: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-lg font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 text-center" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1.5 flex items-center gap-1"><Zap size={10}/> Value Added</label>
                      <input 
                        required type="number" min="0" step="0.5"
                        value={formData.value_added_time} onChange={e => setFormData({...formData, value_added_time: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-lg font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-red-600 uppercase mb-1.5 flex items-center gap-1"><AlertTriangle size={10}/> Waste / Queues</label>
                      <input 
                        required type="number" min="0" step="0.5"
                        value={formData.waste_time} onChange={e => setFormData({...formData, waste_time: Number(e.target.value)})} 
                        className="w-full px-3 py-2 text-lg font-mono text-red-600 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-center" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1"><Filter size={12}/> Bottleneck Constraint Identification</label>
                  <textarea 
                    required rows={3}
                    value={formData.bottleneck_description} onChange={e => setFormData({...formData, bottleneck_description: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-red-50/30 dark:bg-red-900/5 border border-red-200 dark:border-red-900/30 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" 
                    placeholder="Where exactly does the process halt? Why is there so much waste time?" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1"><Target size={12}/> Target Optimization Goal</label>
                  <textarea 
                    required rows={3}
                    value={formData.optimization_goal} onChange={e => setFormData({...formData, optimization_goal: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-blue-50/30 dark:bg-blue-900/5 border border-blue-200 dark:border-blue-900/30 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="What is the objective solution to reduce the lead time and increase cycle efficiency?" 
                  />
                </div>

              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Edits" : "Lock Stream Map")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}