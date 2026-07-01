import { useState, useEffect } from "react";
import { Plus, Download, Database, ShieldAlert, ShieldCheck, FileType, Hash, Calendar, ToggleLeft, Link2, Edit, Trash2, X, Wand2, KeyRound, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function DataRequirementsView({ activeProject }: { activeProject: string }) {
  const [dbData, setDbData] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedData, setSelectedData] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    field_name: "",
    data_type: "String",
    length_format: "",
    is_required: false,
    security_level: "Standard",
    story_reference: "",
    description: ""
  });

  async function fetchData() {
    setLoading(true);
    
    // Dynamically fetch Data Reqs AND User Stories for linkage
    const [dataRes, storiesRes] = await Promise.all([
      supabase.from('data_requirements').select('*').eq('project_name', activeProject).order('field_name', { ascending: true }),
      supabase.from('user_stories').select('id, story_id, title').eq('project_name', activeProject).order('story_id', { ascending: true })
    ]);

    if (dataRes.data) setDbData(dataRes.data);
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
      id: isEditMode ? formData.id : `DATA-${Math.floor(Math.random() * 90000)}`,
      field_name: formData.field_name,
      data_type: formData.data_type,
      length_format: formData.length_format,
      is_required: formData.is_required,
      security_level: formData.security_level,
      story_reference: formData.story_reference,
      description: formData.description,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('data_requirements').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('data_requirements').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving data requirement:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedData) setSelectedData(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Data Requirement?")) return;
    setDbData(dbData.filter(d => d.id !== id));
    setSelectedData(null);
    const { error } = await supabase.from('data_requirements').delete().eq('id', id);
    if (error) fetchData();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Business Definition: What does this field represent?\n\nValidation Rules: (e.g., Cannot be in the past, must contain special character, must be unique)."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", field_name: "", data_type: "String", length_format: "", is_required: false, security_level: "Standard", story_reference: "", description: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      field_name: item.field_name,
      data_type: item.data_type || "String",
      length_format: item.length_format || "",
      is_required: item.is_required || false,
      security_level: item.security_level || "Standard",
      story_reference: item.story_reference || "",
      description: item.description || ""
    });
    setIsFormOpen(true);
    setSelectedData(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getSecurityColor = (level: string) => {
    switch(level) {
      case "PII":
      case "PHI": 
      case "PCI": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200";
      case "Confidential": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200";
      default: return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200"; // Standard
    }
  };

  const getDataTypeIcon = (type: string) => {
    switch(type) {
      case "Integer":
      case "Decimal": return <Hash size={12} className="text-blue-500" />;
      case "DateTime": return <Calendar size={12} className="text-violet-500" />;
      case "Boolean": return <ToggleLeft size={12} className="text-emerald-500" />;
      default: return <FileType size={12} className="text-amber-500" />; // String/Text
    }
  };

  const sensitiveCount = dbData.filter(d => d.security_level !== "Standard").length;
  const requiredCount = dbData.filter(d => d.is_required).length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Data Dictionary"
        sub={`Field-level data requirements and mappings for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Dictionary</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Data Field
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Data Fields</div>
            <div className="text-2xl font-bold">{dbData.length}</div>
          </div>
          <Database className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Sensitive Data (PII/PHI)</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{sensitiveCount}</div>
          </div>
          <ShieldAlert className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Required Fields</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{requiredCount}</div>
          </div>
          <KeyRound className="text-blue-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading data requirements...</div>
      ) : dbData.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Database size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Data Fields Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Define exact data structures to ensure accurate database and API design.</p>
          <Btn variant="secondary" onClick={openNewForm}>Add First Data Field</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {dbData.map(data => (
            <div 
              key={data.id} 
              onClick={() => setSelectedData(data)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
              style={{ borderLeftColor: data.security_level !== 'Standard' ? '#EF4444' : '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className={cn("text-[10px]", getSecurityColor(data.security_level))}>
                  {data.security_level !== 'Standard' && <ShieldAlert size={10} className="mr-1"/>}
                  {data.security_level}
                </Badge>
                {data.is_required && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 text-[10px]">Required</Badge>}
              </div>
              
              <h3 className="text-sm font-mono font-bold text-foreground leading-tight mb-2 truncate" title={data.field_name}>{data.field_name}</h3>
              
              <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground mb-4 bg-muted/30 p-2 rounded border border-border/50">
                <div className="flex items-center gap-1">{getDataTypeIcon(data.data_type)} {data.data_type}</div>
                <div className="w-px h-3 bg-border" />
                <div className="truncate flex-1" title={data.length_format}>{data.length_format || "No format specified"}</div>
              </div>
              
              <div className="text-xs text-foreground line-clamp-2 mb-4 leading-relaxed flex-1">
                {data.description || <span className="italic text-muted-foreground">No description provided.</span>}
              </div>
              
              <div className="mt-auto flex justify-between items-center text-[10px] pt-3 border-t border-border">
                <span className="flex items-center gap-1 text-primary max-w-full truncate" title={data.story_reference}>
                  <Link2 size={12} className="shrink-0" /> {data.story_reference ? data.story_reference.split(' - ')[0] : "Unlinked"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedData.id}</Badge>
                <Badge className={cn("gap-1", getSecurityColor(selectedData.security_level))}>
                  {selectedData.security_level !== 'Standard' && <ShieldAlert size={12} />} {selectedData.security_level}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedData, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedData.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedData(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-mono font-bold text-foreground mb-4">{selectedData.field_name}</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col items-center text-center justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data Type</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">{getDataTypeIcon(selectedData.data_type)} {selectedData.data_type}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col items-center text-center justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Constraint</span>
                    <span className={cn("text-sm font-bold", selectedData.is_required ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>
                      {selectedData.is_required ? "REQUIRED" : "OPTIONAL"}
                    </span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg col-span-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Format / Max Length</span>
                    <span className="text-sm font-medium text-foreground truncate">{selectedData.length_format || "Not specified"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                    <FileText size={14} /> Business Definition & Validation Rules
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedData.description || <span className="text-muted-foreground italic">No definition provided.</span>}
                  </div>
                </section>
                
                {selectedData.story_reference && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3">
                    <Link2 className="text-primary shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Linked User Story</div>
                      <div className="text-sm font-medium text-foreground">{selectedData.story_reference}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedData.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedData(null)}>Close</Btn>
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
                <Database size={18} className="text-blue-500" /> {isEditMode ? "Edit Data Field" : "Add Data Field"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Definition Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Database Field Name / Object Key</label>
                <input 
                  required autoFocus 
                  value={formData.field_name} onChange={e => setFormData({...formData, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_')})} 
                  className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. user_email_address" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> Parent User Story</label>
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Security Classification</label>
                  <select 
                    value={formData.security_level} onChange={e => setFormData({...formData, security_level: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Standard</option>
                    <option>Confidential</option>
                    <option>PII</option>
                    <option>PHI</option>
                    <option>PCI</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-muted/10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Technical Constraints</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data Type</label>
                    <select 
                      value={formData.data_type} onChange={e => setFormData({...formData, data_type: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>String</option>
                      <option>Integer</option>
                      <option>Decimal</option>
                      <option>Boolean</option>
                      <option>DateTime</option>
                      <option>JSON</option>
                      <option>Array</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Format / Length</label>
                    <input 
                      value={formData.length_format} onChange={e => setFormData({...formData, length_format: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="e.g. VARCHAR(255), ISO 8601, Regex" 
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <input 
                    type="checkbox" id="req-check"
                    checked={formData.is_required} onChange={e => setFormData({...formData, is_required: e.target.checked})}
                    className="w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <label htmlFor="req-check" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    This is a mandatory field (Cannot be NULL)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Definition & Rules</label>
                <textarea 
                  required rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="What is this data used for? Are there specific business rules (e.g. must be 18+ years old)?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Data Requirement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}