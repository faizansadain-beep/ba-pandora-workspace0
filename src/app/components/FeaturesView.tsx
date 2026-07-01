import { useState, useEffect } from "react";
import { Plus, Download, Star, Target, Layers, Edit, Trash2, X, Wand2, Package, CheckCircle2, AlertCircle, Search, Filter, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function FeaturesView({ activeProject }: { activeProject: string }) {
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [dbModules, setDbModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Accordion States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["In Progress", "Backlog", "Proposed"]));

  // View & Form States
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    feature_id: "",
    title: "",
    module_reference: "",
    description: "",
    business_value: "",
    priority: "Medium",
    status: "Backlog"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [featRes, modRes] = await Promise.all([
        supabase.from('product_features').select('*').eq('project_name', activeProject).order('feature_id', { ascending: true }),
        supabase.from('product_modules').select('id, module_id, title').eq('project_name', activeProject).order('module_id', { ascending: true })
      ]);

      if (featRes.data) setDbFeatures(featRes.data);
      if (modRes.data) setDbModules(modRes.data);
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
      id: isEditMode ? formData.id : `FEA-${Math.floor(Math.random() * 90000)}`,
      feature_id: formData.feature_id,
      title: formData.title,
      module_reference: formData.module_reference,
      description: formData.description,
      business_value: formData.business_value,
      priority: formData.priority,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('product_features').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('product_features').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving feature:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedFeature) setSelectedFeature(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this feature from the product scope?")) return;
    setDbFeatures(dbFeatures.filter(f => f.id !== id));
    setSelectedFeature(null);
    const { error } = await supabase.from('product_features').delete().eq('id', id);
    if (error) fetchData();
  }

  // --- EXPORTS ---
  function handleExcelExport() {
    const formattedRows = dbFeatures.map(feat => ({
      "Feature ID": feat.feature_id,
      "Feature Title": feat.title,
      "Parent Module": feat.module_reference || "Unassigned",
      "Priority": feat.priority,
      "Lifecycle Status": feat.status,
      "Feature Scope": feat.description || "",
      "Business Value": feat.business_value || ""
    }));

    const columnWidths = [
      { wch: 15 }, { wch: 35 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 50 }
    ];

    exportToExcel(formattedRows, "Product Features Repository", `Product_Features_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const getWordColor = (status: string) => {
      if (status === "Delivered") return "27AE60"; // Green
      if (status === "In Progress") return "2980B9"; // Blue
      if (status === "Proposed") return "D35400"; // Orange
      return "7F8C8D"; // Gray (Backlog)
    };

    const structuredItems = dbFeatures.map(feat => ({
      id: feat.feature_id,
      title: feat.title,
      details: [
        { label: "Parent System Module", value: feat.module_reference || "Unassigned", isMeta: true },
        { label: "Execution Priority", value: feat.priority, isMeta: true },
        { label: "Lifecycle Status", value: feat.status, color: getWordColor(feat.status) },
        { label: "Feature Scope & Behavior", value: feat.description || "No description provided." },
        { label: "Benefit Hypothesis (Business Value)", value: feat.business_value || "No value proposition defined.", color: "27AE60" }
      ]
    }));

    exportToWordBrief("Product Features & Capabilities Directory", activeProject, structuredItems, `Product_Features_Brief_${activeProject}`);
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Functional Behavior: What exactly does this feature do for the user?\n\nScope Boundary: What is explicitly OUT of scope for this feature?",
      business_value: "Benefit Hypothesis: If we build this, we expect to see [Metric/Outcome] improve by [Target/Amount]."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbFeatures.length + 101;
    setFormData({ id: "", feature_id: `FEA-${nextNum}`, title: "", module_reference: "", description: "", business_value: "", priority: "Medium", status: "Backlog" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedFeature(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // --- DATA PROCESSING & FILTERING ---
  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  };

  const filteredFeatures = dbFeatures.filter(f => {
    const matchesSearch = (f.title + f.feature_id + f.description).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = filterModule === "All" || (f.module_reference && f.module_reference === filterModule);
    return matchesSearch && matchesModule;
  });

  const groupedFeatures = {
    "In Progress": filteredFeatures.filter(f => f.status === "In Progress"),
    "Backlog": filteredFeatures.filter(f => f.status === "Backlog"),
    "Proposed": filteredFeatures.filter(f => f.status === "Proposed"),
    "Delivered": filteredFeatures.filter(f => f.status === "Delivered"),
  };

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Delivered": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "border-emerald-500", headerBg: "bg-emerald-50/50 dark:bg-emerald-900/10" };
      case "In Progress": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Layers, border: "border-blue-500", headerBg: "bg-blue-50/50 dark:bg-blue-900/10" };
      case "Proposed": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle, border: "border-amber-500", headerBg: "bg-amber-50/50 dark:bg-amber-900/10" };
      default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Star, border: "border-slate-500", headerBg: "bg-slate-50/50 dark:bg-slate-900/10" }; // Backlog
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "High": return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50";
      case "Low": return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50";
      default: return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50"; // Medium
    }
  };

  const uniqueModules = ["All", ...new Set(dbFeatures.map(f => f.module_reference).filter(Boolean))];

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Product Features"
        sub={`Core capabilities and value deliveries for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><FileText size={13} /> Word Brief</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} /> Propose Feature
            </Btn>
          </div>
        }
      />

      {/* OVERALL KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="p-4 flex items-center justify-between border-border shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Total Features</div>
            <div className="text-2xl font-bold text-foreground">{dbFeatures.length}</div>
          </div>
          <Star className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900 shadow-sm">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 uppercase font-black tracking-wider mb-1">In Progress</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbFeatures.filter(f => f.status === 'In Progress').length}
            </div>
          </div>
          <Layers className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900 shadow-sm">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-black tracking-wider mb-1">Delivered to Market</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbFeatures.filter(f => f.status === 'Delivered').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {/* FILTER & SEARCH ENGINE */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search features by keyword or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="relative sm:w-80 shrink-0">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            {uniqueModules.map(mod => <option key={mod} value={mod}>{mod === "All" ? "All Parent Modules" : mod}</option>)}
          </select>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm font-mono">Synchronizing feature repository...</div>
      ) : dbFeatures.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Star size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Features Documented</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define the core capabilities that will deliver value to your users.</p>
          <Btn variant="primary" onClick={openNewForm}><Plus size={13}/> Create First Feature</Btn>
        </Card>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-16 bg-muted/10 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground font-medium">No features match your search criteria.</p>
          <button onClick={() => {setSearchQuery(""); setFilterModule("All");}} className="mt-2 text-xs text-primary hover:underline font-bold">Clear Filters</button>
        </div>
      ) : (
        <div className="space-y-4">
          {["In Progress", "Backlog", "Proposed", "Delivered"].map(statusGroup => {
            const items = groupedFeatures[statusGroup as keyof typeof groupedFeatures];
            if (items.length === 0) return null;

            const isExpanded = expandedGroups.has(statusGroup);
            const visuals = getStatusVisuals(statusGroup);
            const StatusIcon = visuals.icon;

            return (
              <div key={statusGroup} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Accordion Header */}
                <button 
                  onClick={() => toggleGroup(statusGroup)}
                  className={cn("p-4 flex items-center justify-between border-l-4 transition-colors hover:bg-muted/30", visuals.border, visuals.headerBg, isExpanded && "border-b border-border")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-background border shadow-xs", visuals.color)}>
                      <StatusIcon size={16} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{statusGroup}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{items.length} capability {items.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-4 bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map(feat => (
                        <div 
                          key={feat.id} 
                          onClick={() => setSelectedFeature(feat)}
                          className="bg-background border border-border/80 rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col h-full group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2">
                              <Badge className="bg-primary/5 text-primary font-mono text-[10px] border-primary/20 px-1.5">{feat.feature_id}</Badge>
                              <Badge className={cn("text-[9px] px-1.5 py-0 border font-bold", getPriorityColor(feat.priority))}>
                                {feat.priority}
                              </Badge>
                            </div>
                            <Badge className={cn("text-[9px] gap-1 px-1.5 font-bold", visuals.color)}>
                              <StatusIcon size={10} /> {feat.status}
                            </Badge>
                          </div>
                          
                          <h3 className="text-sm font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{feat.title}</h3>
                          
                          {feat.module_reference && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md w-fit mb-3 border border-border/60">
                              <Package size={11} className="text-primary/70" /> {feat.module_reference.split(' - ')[0]}
                            </div>
                          )}
                          
                          <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 mb-3 font-medium leading-relaxed flex-1 line-clamp-3">
                            {feat.description}
                          </div>
                          
                          <div className="mt-auto text-[10px] pt-3 border-t border-border flex items-start gap-2">
                            <Target size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground line-clamp-1 italic font-medium">"{feat.business_value || "No business value defined."}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedFeature.feature_id}</Badge>
                <Badge className={cn("gap-1 font-bold", getStatusVisuals(selectedFeature.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedFeature.status).icon;
                    return <Icon size={12} />;
                  })()} 
                  {selectedFeature.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedFeature, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedFeature.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedFeature(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedFeature.title}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
                    <Target className={cn("mt-0.5 shrink-0", 
                      selectedFeature.priority === "High" ? "text-red-500" :
                      selectedFeature.priority === "Low" ? "text-blue-500" : "text-amber-500"
                    )} size={20} />
                    <div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Execution Priority</div>
                      <div className="text-sm font-bold text-foreground">{selectedFeature.priority}</div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
                    <Package className="text-primary mt-0.5 shrink-0" size={20} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Parent Module Link</div>
                      <div className="text-sm font-bold text-foreground truncate">{selectedFeature.module_reference || "Unassigned"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-xl border border-border shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border/60 pb-2">
                    <Layers size={14} /> Feature Scope & Behavior
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedFeature.description}
                  </div>
                </section>

                <section className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 relative shadow-sm">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-xl" />
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-2 border-b border-emerald-200/50 dark:border-emerald-900/50 pb-2">
                    <Target size={14} /> Benefit Hypothesis (Business Value)
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedFeature.business_value || <span className="italic text-muted-foreground">Value proposition pending.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs font-medium text-muted-foreground">Project: {selectedFeature.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedFeature(null)}>Close Inspection</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0 border-b border-border/60 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Star size={16} className="text-blue-500" /> {isEditMode ? "Edit Feature" : "Propose New Feature"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 px-2 py-1 rounded transition-colors">
                    <Wand2 size={12} /> Load BA Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Feature ID</label>
                  <input 
                    required 
                    value={formData.feature_id} onChange={e => setFormData({...formData, feature_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Feature Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                    placeholder="e.g. SAML 2.0 SSO Integration" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Package size={12}/> Parent System Module</label>
                  <select 
                    required value={formData.module_reference} onChange={e => setFormData({...formData, module_reference: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-muted/50 border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">-- Assign to Core Module --</option>
                    {dbModules.map(m => (
                      <option key={m.id} value={`${m.module_id} - ${m.title}`}>{m.module_id} - {m.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Priority</label>
                    <select 
                      value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-bold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Lifecycle Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-bold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option>Proposed</option>
                      <option>Backlog</option>
                      <option>In Progress</option>
                      <option>Delivered</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Feature Scope & Behavior Description</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-medium bg-muted/30 border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors custom-scrollbar" 
                  placeholder="Describe exactly what this feature does, and what boundaries define its completion..." 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1"><Target size={12}/> Benefit Hypothesis (Business Value)</label>
                <textarea 
                  required rows={3}
                  value={formData.business_value} onChange={e => setFormData({...formData, business_value: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-medium bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar" 
                  placeholder="If we build this, what measurable metric or user outcome will improve?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/60 shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Processing..." : (isEditMode ? "Save Changes" : "Create Feature")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}