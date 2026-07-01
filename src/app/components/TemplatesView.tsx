import { useState, useEffect } from "react";
import { Plus, Copy, FileText, CheckCircle2, Edit, Trash2, LayoutTemplate, MessageSquare, ShieldCheck, Target } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function TemplatesView() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "Agile & Stories",
    description: "",
    content: ""
  });

  const CATEGORIES = ["All", "Agile & Stories", "Requirements", "Testing & QA", "Comms & Approvals", "General"];

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('admin_templates').select('*').order('category', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      if (data) setTemplates(data);
    } catch (err) {
      console.error("Template fetch error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: isEditMode ? formData.id : `TMPL-${Math.floor(Math.random() * 90000)}`,
      name: formData.name,
      category: formData.category,
      description: formData.description,
      content: formData.content
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('admin_templates').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('admin_templates').insert([payload]);
      error = insertError;
    }

    if (error) alert(`Error saving template: ${error.message}`);
    else {
      setIsFormOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Permanently delete this template?")) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    setSelectedTemplate(null);
    await supabase.from('admin_templates').delete().eq('id', id);
  }

  function handleCopy(content: string, id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", name: "", category: activeCategory !== "All" ? activeCategory : "Agile & Stories", description: "", content: "" });
    setIsFormOpen(true);
  }

  function openEditForm(tmpl: any) {
    setIsEditMode(true);
    setFormData({ ...tmpl });
    setIsFormOpen(true);
  }

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Agile & Stories': return <Target size={14} className="text-blue-500" />;
      case 'Testing & QA': return <ShieldCheck size={14} className="text-emerald-500" />;
      case 'Comms & Approvals': return <MessageSquare size={14} className="text-purple-500" />;
      default: return <FileText size={14} className="text-slate-500" />;
    }
  };

  const filteredTemplates = activeCategory === "All" ? templates : templates.filter(t => t.category === activeCategory);

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Global Template Library"
        sub="Standardize your requirements, user stories, and defect reports across all projects."
        actions={
          <Btn variant="primary" onClick={openNewForm}>
            <Plus size={13} /> Create Template
          </Btn>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT PANE: Category Menu */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 pl-2">Categories</div>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex justify-between items-center",
                activeCategory === cat 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
              {cat !== "All" && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-mono",
                  activeCategory === cat ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10"
                )}>
                  {templates.filter(t => t.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* MIDDLE PANE: Template Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm font-medium">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="h-64 flex flex-col items-center justify-center text-center border-dashed bg-muted/10">
              <LayoutTemplate size={32} className="text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium text-foreground">No Templates Found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create a standardized format for this category.</p>
              <Btn variant="secondary" onClick={openNewForm}>Create Template</Btn>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 content-start">
              {filteredTemplates.map(tmpl => (
                <Card 
                  key={tmpl.id} 
                  className={cn(
                    "p-5 flex flex-col gap-3 cursor-pointer transition-all border-border hover:border-primary/50 group",
                    selectedTemplate?.id === tmpl.id ? "ring-2 ring-primary border-transparent" : "shadow-sm"
                  )}
                  onClick={() => setSelectedTemplate(tmpl)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryIcon(tmpl.category)}
                      <Badge className="bg-muted text-muted-foreground border-none text-[10px] px-1.5 py-0">{tmpl.category}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleCopy(tmpl.content, tmpl.id, e)}
                        className={cn("p-1.5 rounded transition-colors", copiedId === tmpl.id ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary")}
                        title="Copy Markdown"
                      >
                        {copiedId === tmpl.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEditForm(tmpl); }} className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-blue-50 hover:text-blue-600"><Edit size={14}/></button>
                      <button onClick={(e) => handleDelete(tmpl.id, e)} className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug">{tmpl.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tmpl.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANE: Preview/Viewer */}
        <div className="w-full lg:w-[400px] shrink-0 h-[400px] lg:h-full">
          {selectedTemplate ? (
            <Card className="h-full flex flex-col border-border shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
              <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm text-foreground truncate pr-2">{selectedTemplate.name}</h3>
                <Btn 
                  variant="primary" 
                  onClick={() => handleCopy(selectedTemplate.content, selectedTemplate.id)}
                  className="h-7 text-[11px] px-2 shrink-0"
                >
                  {copiedId === selectedTemplate.id ? <><CheckCircle2 size={11} className="text-emerald-400"/> Copied</> : <><Copy size={11} /> Copy</>}
                </Btn>
              </div>
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedTemplate.content}
                </pre>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-center border-dashed border-border bg-muted/10">
              <FileText size={48} className="text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground px-8">Select a template to view its full markdown structure.</p>
            </Card>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
              <h3 className="font-bold text-foreground flex items-center gap-2"><LayoutTemplate size={16} className="text-blue-500" /> {isEditMode ? "Edit Template" : "Create New Template"}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form id="templateForm" onSubmit={handleSave} className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Template Name</label>
                  <input required autoFocus placeholder="e.g. API Route Documentation" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded font-bold focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background border p-2 text-sm rounded">
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Short Description</label>
                <input required placeholder="When should the team use this template?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border p-2 text-sm rounded focus:outline-none" />
              </div>
              
              <div className="flex-1 flex flex-col min-h-[250px]">
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex justify-between">
                  Template Content (Markdown)
                </label>
                <textarea required placeholder="Write your markdown structure here..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full flex-1 bg-muted border border-border p-3 text-sm rounded-lg font-mono leading-relaxed focus:outline-none focus:border-primary resize-none" />
              </div>
            </form>
            <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
              <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
              <Btn variant="primary" type="submit" form="templateForm" disabled={isSubmitting}>Save Template</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}