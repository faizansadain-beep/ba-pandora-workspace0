import { useState, useEffect } from "react";
import { Plus, Download, Scale, Shield, Zap, Book, Edit, Trash2, X, Wand2, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function BusinessRulesView({ activeProject }: { activeProject: string }) {
  const [dbRules, setDbRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    category: "Operational",
    rule_description: "",
    enforcement_level: "Strict",
    source: "",
    status: "Active"
  });

  async function fetchRules() {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_rules')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching rules:", error);
    else if (data) setDbRules(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchRules();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `BR-${Math.floor(Math.random() * 9000) + 1000}`,
      title: formData.title,
      category: formData.category,
      rule_description: formData.rule_description,
      enforcement_level: formData.enforcement_level,
      source: formData.source,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('business_rules').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('business_rules').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving business rule:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchRules();
      if (isEditMode && selectedRule) setSelectedRule(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Business Rule?")) return;
    setDbRules(dbRules.filter(r => r.id !== id));
    setSelectedRule(null);
    const { error } = await supabase.from('business_rules').delete().eq('id', id);
    if (error) fetchRules();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbRules.map(item => ({
      "Rule ID": item.id,
      "Title": item.title,
      "Category": item.category || "Operational",
      "Rule Definition / Logic": item.rule_description || "N/A",
      "Enforcement Level": item.enforcement_level || "Strict",
      "Source / Mandated By": item.source || "System Default",
      "Status": item.status,
      "Date Created": new Date(item.created_at).toLocaleDateString()
    }));

    const columnWidths = [
      { wch: 12 }, // Rule ID
      { wch: 28 }, // Title
      { wch: 15 }, // Category
      { wch: 50 }, // Rule Definition
      { wch: 20 }, // Enforcement Level
      { wch: 25 }, // Source
      { wch: 12 }, // Status
      { wch: 15 }  // Date Created
    ];

    exportToExcel(formattedRows, "Business Rules", `Business_Rules_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbRules.map(item => ({
      id: item.id,
      title: item.title,
      details: [
        { label: "Category", value: item.category || "Operational", isMeta: true },
        { label: "Enforcement", value: item.enforcement_level || "Strict", isMeta: true },
        { label: "Status", value: item.status, isMeta: true },
        { label: "Mandated By / Source", value: item.source || "System Default", isMeta: true },
        { label: "Rule Definition Logic", value: item.rule_description || "None provided.", color: "1A5276" }
      ]
    }));

    exportToWordBrief("System Business Rules Specification", activeProject, structuredItems, `Business_Rules_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Syntax Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      rule_description: "DECLARATIVE FORMAT:\n\"The system MUST [action] WHEN [condition] IS [state].\"\n\nGIVEN / WHEN / THEN FORMAT:\nGIVEN [a specific context/setup]\nWHEN [an action occurs]\nTHEN [a specific outcome must be enforced]"
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", category: "Operational", rule_description: "", enforcement_level: "Strict", source: "", status: "Proposed" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      category: item.category || "Operational",
      rule_description: item.rule_description || "",
      enforcement_level: item.enforcement_level || "Strict",
      source: item.source || "",
      status: item.status
    });
    setIsFormOpen(true);
    setSelectedRule(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Proposed": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Retired": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getEnforcementColor = (level: string) => {
    switch(level) {
      case "Strict": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200";
      case "Overrideable": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200";
      case "Guideline": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "Security": return <Shield size={14} className="text-red-500" />;
      case "Logic": return <Zap size={14} className="text-amber-500" />;
      case "Compliance": return <Book size={14} className="text-blue-500" />;
      default: return <Scale size={14} className="text-slate-500" />; // Operational
    }
  };

  const strictCount = dbRules.filter(r => r.enforcement_level === "Strict").length;
  const activeCount = dbRules.filter(r => r.status === "Active").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Business Rules"
        sub={`Core system logic and enforcement policies for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Rule
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Rules</div>
            <div className="text-2xl font-bold">{dbRules.length}</div>
          </div>
          <Scale className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Strict Enforcement</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{strictCount}</div>
          </div>
          <Shield className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Active in System</div>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading business rules...</div>
      ) : dbRules.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Scale size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Business Rules Defined</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Document the operational logic and constraints that govern the system.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Rule</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbRules.map(rule => (
            <div 
              key={rule.id} 
              onClick={() => setSelectedRule(rule)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
              style={{ borderLeftColor: rule.status === 'Active' ? '#10B981' : rule.status === 'Proposed' ? '#3B82F6' : '#94A3B8' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{rule.id}</Badge>
                <Badge className={cn("text-[10px]", getEnforcementColor(rule.enforcement_level))}>
                  {rule.enforcement_level}
                </Badge>
              </div>
              
              <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{rule.title}</h3>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-3">
                {getCategoryIcon(rule.category)} {rule.category}
              </div>
              
              <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed">
                {rule.rule_description}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-border">
                <span>Source: {rule.source || "None"}</span>
                <Badge className={cn("text-[9px] px-1.5 py-0", getStatusColor(rule.status))}>{rule.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedRule.id}</Badge>
                <Badge className={getStatusColor(selectedRule.status)}>{selectedRule.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedRule, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedRule.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedRule(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-muted px-2 py-0.5 rounded text-xs flex items-center gap-1.5 font-medium text-muted-foreground">
                    {getCategoryIcon(selectedRule.category)} {selectedRule.category} Rule
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">{selectedRule.title}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enforcement</span>
                  <Badge className={cn("text-xs py-0.5", getEnforcementColor(selectedRule.enforcement_level))}>
                    {selectedRule.enforcement_level}
                  </Badge>
                </div>
                <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Mandated By / Source</span>
                  <span className="text-sm font-medium text-foreground truncate">{selectedRule.source || "System Default"}</span>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-200 dark:border-blue-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-blue-700 dark:text-blue-400">
                    <Scale size={14} /> Rule Definition
                  </h3>
                  <div className="text-base font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRule.rule_description}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedRule.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedRule(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Scale size={18} className="text-blue-500" /> {isEditMode ? "Edit Business Rule" : "Add Business Rule"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Syntax Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rule Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Password Reset Cooldown" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Operational</option>
                    <option>Security</option>
                    <option>Compliance</option>
                    <option>Logic</option>
                    <option>Calculation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Proposed</option>
                    <option>Active</option>
                    <option>Retired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Rule Definition (The Logic)</label>
                <textarea 
                  required rows={5}
                  value={formData.rule_description} onChange={e => setFormData({...formData, rule_description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium" 
                  placeholder="State exactly what the system must or must not do..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Enforcement Level</label>
                  <select 
                    value={formData.enforcement_level} onChange={e => setFormData({...formData, enforcement_level: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="Strict">Strict (System Hard Stop)</option>
                    <option value="Overrideable">Overrideable (Requires Admin)</option>
                    <option value="Guideline">Guideline (Soft Warning)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Source / Mandated By (Optional)</label>
                  <input 
                    value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. InfoSec Policy v2, Legal Dept" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Rule")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}