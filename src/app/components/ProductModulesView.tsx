import { useState, useEffect } from "react";
import { Plus, Download, Package, Box, Layers, Edit, Trash2, X, Wand2, UserCircle, Activity, Search, Filter, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function ProductModulesView({ activeProject }: { activeProject: string }) {
  const [dbModules, setDbModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Accordion States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOwner, setFilterOwner] = useState("All");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Active", "In Development", "Planned"]));

  // View & Form States
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    module_id: "",
    title: "",
    description: "",
    business_owner: "",
    status: "Planned"
  });

  async function fetchModules() {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_modules')
      .select('*')
      .eq('project_name', activeProject)
      .order('module_id', { ascending: true });

    if (error) console.error("Error fetching modules:", error);
    else if (data) setDbModules(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchModules();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `MOD-${Math.floor(Math.random() * 90000)}`,
      module_id: formData.module_id,
      title: formData.title,
      description: formData.description,
      business_owner: formData.business_owner,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('product_modules').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('product_modules').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving module:", error);
      alert("Failed to save product module!");
    } else {
      closeForm();
      fetchModules();
      if (isEditMode && selectedModule) setSelectedModule(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this core product module? This breaks architectural alignment.")) return;
    setDbModules(dbModules.filter(m => m.id !== id));
    setSelectedModule(null);
    const { error } = await supabase.from('product_modules').delete().eq('id', id);
    if (error) fetchModules();
  }

  // --- EXPORTS ---
  function handleExcelExport() {
    const formattedRows = dbModules.map(mod => ({
      "Module ID": mod.module_id,
      "Module Title": mod.title,
      "Business Owner": mod.business_owner || "Unassigned",
      "Lifecycle Status": mod.status,
      "Capability Overview": mod.description || ""
    }));

    const columnWidths = [
      { wch: 15 }, { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 60 }
    ];

    exportToExcel(formattedRows, "Product Modules Architecture", `Product_Modules_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const getWordColor = (status: string) => {
      if (status === "Active") return "27AE60"; // Green
      if (status === "In Development") return "2980B9"; // Blue
      if (status === "Deprecated") return "C0392B"; // Red
      return "7F8C8D"; // Gray (Planned)
    };

    const structuredItems = dbModules.map(mod => ({
      id: mod.module_id,
      title: mod.title,
      details: [
        { label: "Business Owner / Sponsor", value: mod.business_owner || "Unassigned", isMeta: true },
        { label: "Lifecycle Status", value: mod.status, color: getWordColor(mod.status) },
        { label: "Core Capability Description", value: mod.description || "No description provided." }
      ]
    }));

    exportToWordBrief("Product Modules & Capability Boundaries", activeProject, structuredItems, `Product_Modules_Brief_${activeProject}`);
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "High-level capability overview: What distinct business function does this boundary encompass?"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbModules.length + 101;
    setFormData({ id: "", module_id: `MOD-${nextNum}`, title: "", description: "", business_owner: "", status: "Planned" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      module_id: item.module_id,
      title: item.title,
      description: item.description || "",
      business_owner: item.business_owner || "",
      status: item.status || "Planned"
    });
    setIsFormOpen(true);
    setSelectedModule(null);
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

  const filteredModules = dbModules.filter(m => {
    const matchesSearch = (m.title + m.module_id + m.description).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOwner = filterOwner === "All" || (m.business_owner && m.business_owner === filterOwner);
    return matchesSearch && matchesOwner;
  });

  const groupedModules = {
    "Active": filteredModules.filter(m => m.status === "Active"),
    "In Development": filteredModules.filter(m => m.status === "In Development"),
    "Planned": filteredModules.filter(m => m.status === "Planned"),
    "Deprecated": filteredModules.filter(m => m.status === "Deprecated"),
  };

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Active": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Activity, border: "border-emerald-500", headerBg: "bg-emerald-50/50 dark:bg-emerald-900/10" };
      case "In Development": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Box, border: "border-blue-500", headerBg: "bg-blue-50/50 dark:bg-blue-900/10" };
      case "Deprecated": return { color: "bg-red-100 text-red-700 border-red-200", icon: Trash2, border: "border-red-500", headerBg: "bg-red-50/50 dark:bg-red-900/10" };
      default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Package, border: "border-slate-500", headerBg: "bg-slate-50/50 dark:bg-slate-900/10" }; // Planned
    }
  };

  const uniqueOwners = ["All", ...new Set(dbModules.map(m => m.business_owner).filter(Boolean))];

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Product Modules"
        sub={`High-level capability boundaries and system components for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><FileText size={13} /> Word Brief</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Define Module
            </Btn>
          </div>
        }
      />

      {/* OVERALL KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="p-4 flex items-center justify-between border-border shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Total Modules</div>
            <div className="text-2xl font-bold text-foreground">{dbModules.length}</div>
          </div>
          <Package className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900 shadow-sm">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-black tracking-wider mb-1">Active in Prod</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbModules.filter(m => m.status === 'Active').length}
            </div>
          </div>
          <Activity className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900 shadow-sm">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 uppercase font-black tracking-wider mb-1">In Pipeline</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dbModules.filter(m => m.status === 'In Development').length}
            </div>
          </div>
          <Box className="text-blue-500 opacity-80" size={32} />
        </Card>
      </div>

      {/* FILTER & SEARCH ENGINE */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search modules by keyword or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="relative sm:w-64 shrink-0">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            {uniqueOwners.map(owner => <option key={owner} value={owner}>{owner === "All" ? "All Business Owners" : owner}</option>)}
          </select>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm font-mono">Synchronizing module topography...</div>
      ) : dbModules.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Package size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Modules Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Break your product down into major functional boundaries.</p>
          <Btn variant="primary" onClick={openNewForm}><Plus size={13}/> Define Core Module</Btn>
        </Card>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-16 bg-muted/10 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground font-medium">No modules match your search criteria.</p>
          <button onClick={() => {setSearchQuery(""); setFilterOwner("All");}} className="mt-2 text-xs text-primary hover:underline font-bold">Clear Filters</button>
        </div>
      ) : (
        <div className="space-y-4">
          {["Active", "In Development", "Planned", "Deprecated"].map(statusGroup => {
            const items = groupedModules[statusGroup as keyof typeof groupedModules];
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
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{statusGroup} Modules</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{items.length} capability {items.length === 1 ? 'boundary' : 'boundaries'}</p>
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
                      {items.map(mod => (
                        <div 
                          key={mod.id} 
                          onClick={() => setSelectedModule(mod)}
                          className="bg-background border border-border/80 rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col h-full group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2 items-center">
                              <Package size={14} className="text-primary opacity-60" />
                              <Badge className="bg-primary/5 text-primary font-mono text-[10px] border-primary/20 px-1.5">{mod.module_id}</Badge>
                            </div>
                            <Badge className={cn("text-[9px] gap-1 px-1.5 font-bold", visuals.color)}>
                              {mod.status}
                            </Badge>
                          </div>
                          
                          <h3 className="text-sm font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{mod.title}</h3>
                          
                          <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                            {mod.description}
                          </div>
                          
                          <div className="mt-auto flex justify-between items-center text-[10px] pt-3 border-t border-border font-medium text-muted-foreground">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider"><UserCircle size={14} className="text-primary/70"/> {mod.business_owner || "Unassigned"}</span>
                            <span>Created {new Date(mod.created_at).toLocaleDateString()}</span>
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
      {selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedModule.module_id}</Badge>
                <Badge className={cn("font-bold", getStatusVisuals(selectedModule.status).color)}>{selectedModule.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedModule, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedModule.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedModule(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-4">{selectedModule.title}</h2>
                <div className="bg-muted/10 border border-border p-4 rounded-xl flex items-center gap-3 w-fit pr-8 shadow-sm">
                  <UserCircle className="text-primary shrink-0" size={24} />
                  <div>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Primary Business Owner</div>
                    <div className="text-sm font-bold text-foreground">{selectedModule.business_owner || "Unassigned"}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-xl border border-border shadow-sm relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary rounded-l-xl" />
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3 border-b border-border/60 pb-2">
                    <Layers size={14} /> Module Capability Overview
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedModule.description}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs font-medium text-muted-foreground">Project: {selectedModule.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedModule(null)}>Close Inspection</Btn>
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
                <Package size={16} className="text-blue-500" /> {isEditMode ? "Edit Module" : "Define System Module"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 px-2 py-1 rounded transition-colors">
                    <Wand2 size={12} /> Load Definition Schema
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Module ID</label>
                  <input 
                    required 
                    value={formData.module_id} onChange={e => setFormData({...formData, module_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Module Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                    placeholder="e.g. Identity & Access Management (IAM)" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Business Owner / Sponsor</label>
                  <input 
                    required 
                    value={formData.business_owner} onChange={e => setFormData({...formData, business_owner: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                    placeholder="e.g. David Wallace" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Lifecycle Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className={cn("w-full px-3 py-2 text-sm rounded-lg focus:outline-none border-border/80 font-bold transition-colors appearance-none", 
                      formData.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200 focus:border-emerald-500" : 
                      formData.status === 'In Development' ? "bg-blue-50 text-blue-700 border-blue-200 focus:border-blue-500" : 
                      formData.status === 'Deprecated' ? "bg-red-50 text-red-700 border-red-200 focus:border-red-500" :
                      "bg-slate-50 text-slate-700 border-slate-200 focus:border-slate-500" // Planned
                    )}
                  >
                    <option>Planned</option>
                    <option>In Development</option>
                    <option>Active</option>
                    <option>Deprecated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Core Capability Description</label>
                <textarea 
                  required rows={5}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors custom-scrollbar" 
                  placeholder="Define the functional boundary of this module..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/60 shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Processing..." : (isEditMode ? "Save Changes" : "Create Module")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}