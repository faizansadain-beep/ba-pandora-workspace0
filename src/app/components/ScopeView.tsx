import { useState, useEffect } from "react";
import { Plus, Download, Target, CheckCircle2, Ban, Clock, Edit, Trash2, X, Wand2, Crosshair, Layers, FileText, Search, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function ScopeView({ activeProject }: { activeProject: string }) {
  const [dbScope, setDbScope] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Accordion States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["In Scope", "Out of Scope", "Deferred"]));

  // View & Form States
  const [selectedScope, setSelectedScope] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    scope_id: "",
    title: "",
    boundary_type: "In Scope",
    category: "Functional",
    description: "",
    justification: ""
  });

  async function fetchScope() {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_scope')
      .select('*')
      .eq('project_name', activeProject)
      .order('scope_id', { ascending: true });

    if (error) console.error("Error fetching scope:", error);
    else if (data) setDbScope(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchScope();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `SCP-${Math.floor(Math.random() * 90000)}`,
      scope_id: formData.scope_id,
      title: formData.title,
      boundary_type: formData.boundary_type,
      category: formData.category,
      description: formData.description,
      justification: formData.justification,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('product_scope').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('product_scope').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving scope boundary:", error);
      alert(`Failed to save! Database says: ${error.message || error.details}`);
    } else {
      closeForm();
      fetchScope();
      if (isEditMode && selectedScope) setSelectedScope(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this item from the scope boundary matrix?")) return;
    setDbScope(dbScope.filter(s => s.id !== id));
    setSelectedScope(null);
    const { error } = await supabase.from('product_scope').delete().eq('id', id);
    if (error) fetchScope();
  }

  // --- EXPORTS ---
  function handleExcelExport() {
    const formattedRows = dbScope.map(scope => ({
      "Scope ID": scope.scope_id,
      "Boundary Title": scope.title,
      "Category": scope.category,
      "Boundary Rule": scope.boundary_type,
      "Explicit Definition": scope.description || "",
      "Business Justification": scope.justification || ""
    }));

    const columnWidths = [
      { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 20 },
      { wch: 50 }, { wch: 50 }
    ];

    exportToExcel(formattedRows, "Scope Boundaries Matrix", `Project_Scope_Matrix_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const getWordColor = (boundary: string) => {
      if (boundary === "Out of Scope") return "C0392B"; // Red
      if (boundary === "Deferred") return "D35400"; // Orange
      return "27AE60"; // Green (In Scope)
    };

    const structuredItems = dbScope.map(scope => ({
      id: scope.scope_id,
      title: scope.title,
      details: [
        { label: "Classification Category", value: scope.category, isMeta: true },
        { label: "Boundary Rule", value: scope.boundary_type, color: getWordColor(scope.boundary_type) },
        { label: "Explicit Boundary Definition", value: scope.description || "No explicit definition provided." },
        { label: "Business Justification & Impact", value: scope.justification || "No explicit justification provided." }
      ]
    }));

    exportToWordBrief("Project Scope Boundaries Matrix", activeProject, structuredItems, `Project_Scope_Brief_${activeProject}`);
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Define the explicit boundary parameter (e.g., 'Integration with system X for read-only data extraction').",
      justification: "State the business reason: Why is this required now, why is it excluded, or why is it delayed?"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbScope.length + 101;
    setFormData({ id: "", scope_id: `SCP-${nextNum}`, title: "", boundary_type: "In Scope", category: "Functional", description: "", justification: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedScope(null);
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

  const filteredScope = dbScope.filter(s => {
    const matchesSearch = (s.title + s.scope_id + s.description).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedScope = {
    "In Scope": filteredScope.filter(s => s.boundary_type === "In Scope"),
    "Out of Scope": filteredScope.filter(s => s.boundary_type === "Out of Scope"),
    "Deferred": filteredScope.filter(s => s.boundary_type === "Deferred"),
  };

  const getBoundaryVisuals = (boundary: string) => {
    switch(boundary) {
      case "Out of Scope": return { color: "bg-red-100 text-red-700 border-red-200", icon: Ban, border: "border-red-500", headerBg: "bg-red-50/50 dark:bg-red-900/10" };
      case "Deferred": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, border: "border-amber-500", headerBg: "bg-amber-50/50 dark:bg-amber-900/10" };
      default: return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "border-emerald-500", headerBg: "bg-emerald-50/50 dark:bg-emerald-900/10" }; 
    }
  };

  const uniqueCategories = ["All", ...new Set(dbScope.map(s => s.category))];

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Project Scope Boundaries"
        sub={`Explicit definition of what is included, excluded, and deferred for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><FileText size={13} /> Word Brief</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Define Boundary
            </Btn>
          </div>
        }
      />

      {/* OVERALL KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-wider mb-1">In Scope</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbScope.filter(s => s.boundary_type === 'In Scope').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-black uppercase tracking-wider mb-1">Out of Scope</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbScope.filter(s => s.boundary_type === 'Out of Scope').length}
            </div>
          </div>
          <Ban className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-black uppercase tracking-wider mb-1">Deferred (Phase 2+)</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbScope.filter(s => s.boundary_type === 'Deferred').length}
            </div>
          </div>
          <Clock className="text-amber-500 opacity-80" size={32} />
        </Card>
      </div>

      {/* FILTER & SEARCH ENGINE */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search bounds by keyword or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="relative sm:w-64 shrink-0">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>)}
          </select>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm font-mono">Synchronizing scope bounds...</div>
      ) : dbScope.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Target size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Boundaries Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Protect your project by explicitly defining what you are and are NOT building.</p>
          <Btn variant="primary" onClick={openNewForm}><Plus size={13}/> Define First Boundary</Btn>
        </Card>
      ) : filteredScope.length === 0 ? (
        <div className="text-center py-16 bg-muted/10 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground font-medium">No boundaries match your search criteria.</p>
          <button onClick={() => {setSearchQuery(""); setFilterCategory("All");}} className="mt-2 text-xs text-primary hover:underline font-bold">Clear Filters</button>
        </div>
      ) : (
        <div className="space-y-4">
          {["In Scope", "Out of Scope", "Deferred"].map(boundaryType => {
            const items = groupedScope[boundaryType as keyof typeof groupedScope];
            if (items.length === 0) return null;

            const isExpanded = expandedGroups.has(boundaryType);
            const visuals = getBoundaryVisuals(boundaryType);
            const BoundaryIcon = visuals.icon;

            return (
              <div key={boundaryType} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Accordion Header */}
                <button 
                  onClick={() => toggleGroup(boundaryType)}
                  className={cn("p-4 flex items-center justify-between border-l-4 transition-colors hover:bg-muted/30", visuals.border, visuals.headerBg, isExpanded && "border-b border-border")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-background border shadow-xs", visuals.color)}>
                      <BoundaryIcon size={16} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{boundaryType}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{items.length} defined {items.length === 1 ? 'boundary' : 'boundaries'}</p>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-4 bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {items.map(scope => (
                        <div 
                          key={scope.id} 
                          onClick={() => setSelectedScope(scope)}
                          className="bg-background border border-border/80 rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col h-full group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <Badge className="bg-primary/5 text-primary font-mono text-[10px] border-primary/20">{scope.scope_id}</Badge>
                            <Badge className={cn("text-[9px] gap-1 px-1.5 font-bold", visuals.color)}>
                              <BoundaryIcon size={10} /> {scope.boundary_type}
                            </Badge>
                          </div>
                          
                          <h3 className="text-sm font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{scope.title}</h3>
                          
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded w-fit mb-3">
                            <Layers size={11} className="text-primary/70" /> {scope.category}
                          </div>
                          
                          <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 mb-3 font-medium leading-relaxed flex-1 line-clamp-3">
                            {scope.description}
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
      {selectedScope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedScope.scope_id}</Badge>
                <Badge className={cn("gap-1 font-bold", getBoundaryVisuals(selectedScope.boundary_type).color)}>
                  {(() => {
                    const Icon = getBoundaryVisuals(selectedScope.boundary_type).icon;
                    return <Icon size={14} />;
                  })()} 
                  {selectedScope.boundary_type}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedScope, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedScope.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedScope(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers size={12}/> {selectedScope.category} Boundary
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedScope.title}</h2>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border pb-2">
                    <Crosshair size={14} /> Explicit Scope Definition
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedScope.description}
                  </div>
                </section>

                <section className={cn("p-5 rounded-lg border relative", 
                  selectedScope.boundary_type === 'Out of Scope' ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50" : 
                  selectedScope.boundary_type === 'Deferred' ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/50" : 
                  "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50"
                )}>
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full rounded-l-lg", 
                    selectedScope.boundary_type === 'Out of Scope' ? "bg-red-500" : 
                    selectedScope.boundary_type === 'Deferred' ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                  <h3 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2",
                    selectedScope.boundary_type === 'Out of Scope' ? "text-red-700 dark:text-red-400" : 
                    selectedScope.boundary_type === 'Deferred' ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                  )}>
                    <Target size={14} /> Business Justification
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedScope.justification || <span className="italic text-muted-foreground">No justification provided.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground font-medium">Project: {selectedScope.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedScope(null)}>Close Inspection</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0 border-b border-border/60 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Target size={16} className="text-blue-500" /> {isEditMode ? "Edit Scope Boundary" : "Define Scope Boundary"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 px-2 py-1 rounded transition-colors">
                    <Wand2 size={12} /> Load Matrix Frame
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Scope ID</label>
                  <input 
                    required 
                    value={formData.scope_id} onChange={e => setFormData({...formData, scope_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Boundary Parameter Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                    placeholder="e.g. Historical Data Migration (Pre-2022)" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Boundary Rule</label>
                  <select 
                    value={formData.boundary_type} onChange={e => setFormData({...formData, boundary_type: e.target.value})} 
                    className={cn("w-full px-3 py-2 text-sm rounded-lg focus:outline-none border-border/80 font-bold transition-colors appearance-none", 
                      formData.boundary_type === 'Out of Scope' ? "bg-red-50 text-red-700 border-red-200 focus:border-red-500" : 
                      formData.boundary_type === 'Deferred' ? "bg-amber-50 text-amber-700 border-amber-200 focus:border-amber-500" : 
                      "bg-emerald-50 text-emerald-700 border-emerald-200 focus:border-emerald-500"
                    )}
                  >
                    <option value="In Scope">✓ In Scope</option>
                    <option value="Out of Scope">⊘ Explicitly Out of Scope</option>
                    <option value="Deferred">⏱ Deferred (Future Phase)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Classification Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-muted/50 border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option>Functional</option>
                    <option>Integration</option>
                    <option>Data Migration</option>
                    <option>Compliance / Legal</option>
                    <option>Non-Functional (Performance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Explicit Boundary Definition</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors custom-scrollbar" 
                  placeholder="Clearly state what is included or excluded..." 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Business Justification & Impact</label>
                <textarea 
                  required rows={3}
                  value={formData.justification} onChange={e => setFormData({...formData, justification: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-medium bg-muted/30 border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors custom-scrollbar" 
                  placeholder="Why is this the decision? (e.g. Budget constraints, compliance mandate, technical limitation)..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/60 shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Processing..." : (isEditMode ? "Save Changes" : "Lock Boundary")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}