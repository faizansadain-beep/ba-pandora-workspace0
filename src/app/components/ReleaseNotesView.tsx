import { useState, useEffect } from "react";
import { Plus, Download, FileText, Megaphone, Sparkles, Rocket, Users, Code, CheckCircle2, FileEdit, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ReleaseNotesView({ activeProject }: { activeProject: string }) {
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [dbNotes, setDbNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [activeRelease, setActiveRelease] = useState<string>("");
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    audience: "Internal / Stakeholders",
    content: "",
    status: "Draft"
  });

  async function fetchNotesWorkspace() {
    setLoading(true);
    try {
      const relRes = await supabase.from('delivery_releases').select('release_version, title').eq('project_name', activeProject).order('release_version', { ascending: false });
      
      if (relRes.data && relRes.data.length > 0) {
        setDbReleases(relRes.data);
        const targetRelease = activeRelease || relRes.data[0].release_version;
        if (!activeRelease) setActiveRelease(targetRelease);

        const notesRes = await supabase
          .from('delivery_release_notes')
          .select('*')
          .eq('project_name', activeProject)
          .eq('release_version', targetRelease)
          .order('created_at', { ascending: false });

        if (notesRes.data) setDbNotes(notesRes.data);
      }
    } catch (err) {
      console.error("Notes fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchNotesWorkspace();
  }, [activeProject, activeRelease]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: isEditMode ? formData.id : `RN-${Math.floor(Math.random() * 90000)}`,
      release_version: activeRelease,
      title: formData.title,
      audience: formData.audience,
      content: formData.content,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('delivery_release_notes').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('delivery_release_notes').insert([payload]);
      error = insertError;
    }

    if (error) alert(`Error saving document: ${error.message}`);
    else {
      setSelectedNote(null);
      setIsEditMode(false);
      fetchNotesWorkspace();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this release note document?")) return;
    setDbNotes(prev => prev.filter(n => n.id !== id));
    await supabase.from('delivery_release_notes').delete().eq('id', id);
  }

  // --- Auto-Compile Magic ---
  async function autoCompileTemplate() {
    if (!window.confirm("Auto-compile notes based on attached features? This will overwrite your current draft.")) return;
    
    // Fetch features tied to this release
    const { data: features } = await supabase
      .from('product_features')
      .select('feature_id, title, priority')
      .eq('project_name', activeProject)
      .eq('release_version', activeRelease);

    let generatedText = `# Release Notes: ${activeRelease}\n\n`;
    generatedText += `We are excited to announce the deployment of ${activeRelease}. This update includes several highly requested capabilities.\n\n`;
    generatedText += `## ✨ New Features & Enhancements\n`;
    
    if (features && features.length > 0) {
      features.forEach(f => {
        generatedText += `- **[${f.feature_id}] ${f.title}** (Priority: ${f.priority})\n`;
      });
    } else {
      generatedText += `- *No features are explicitly linked to this release yet.*\n`;
    }

    generatedText += `\n## 🐛 Bug Fixes & Optimizations\n- General performance improvements and minor UI fixes.\n`;
    generatedText += `\n---\n*Generated automatically via BA's Pandora Delivery Engine.*`;

    setFormData(prev => ({ ...prev, content: generatedText }));
  }

  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: `${activeRelease} Release Notes`, audience: "Internal / Stakeholders", content: "", status: "Draft" });
    setSelectedNote({ mode: 'edit' }); // Triggers the editor UI
  }

  function openEditForm(note: any) {
    setIsEditMode(true);
    setFormData({ ...note });
    setSelectedNote(note);
  }

  const getAudienceIcon = (aud: string) => {
    switch(aud) {
      case 'Public / End-Users': return <Megaphone size={12}/>;
      case 'Technical / DevOps': return <Code size={12}/>;
      default: return <Users size={12}/>;
    }
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <SectionHeader
        title="Release Notes Publisher"
        sub="Draft, auto-generate, and publish targeted release communications for stakeholders and end-users."
        actions={
          <Btn variant="primary" onClick={openNewForm} disabled={!activeRelease || selectedNote !== null}>
            <Plus size={13} /> Draft Document
          </Btn>
        }
      />

      {/* HEADER CONTROLS */}
      <div className="bg-card border border-border p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3 pl-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0"><Rocket size={14} className="inline mr-1 text-primary"/> Source Release:</label>
          <select 
            value={activeRelease} 
            onChange={(e) => setActiveRelease(e.target.value)}
            disabled={selectedNote !== null}
            className="bg-muted px-3 py-1.5 rounded-lg text-sm font-bold border border-border focus:outline-none min-w-[200px]"
          >
            {dbReleases.length === 0 ? <option>No Releases Found</option> : null}
            {dbReleases.map(r => (
              <option key={r.release_version} value={r.release_version}>{r.release_version} - {r.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Loading documents...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed">
          <FileText size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Target Releases Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Go to Release Planning to establish a version target before drafting notes.</p>
        </Card>
      ) : selectedNote ? (
        /* EDITOR VIEW (Dual Pane) */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* LEFT PANE: Editor */}
          <Card className="flex flex-col border-border shadow-sm overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <FileEdit size={16} className="text-primary"/> {isEditMode ? "Edit Document" : "Draft New Notes"}
              </div>
              <Btn variant="secondary" onClick={autoCompileTemplate} className="h-7 text-[11px]">
                <Sparkles size={11} className="text-amber-500"/> Auto-Compile Template
              </Btn>
            </div>
            <form id="noteForm" onSubmit={handleSave} className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Document Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded font-bold focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4 border p-3 rounded-xl bg-muted/10">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Target Audience</label>
                  <select value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} className="w-full bg-background border p-2 text-xs rounded">
                    <option>Internal / Stakeholders</option>
                    <option>Public / End-Users</option>
                    <option>Technical / DevOps</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Publish Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-bold">
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 flex flex-col h-full min-h-[300px]">
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex justify-between items-end">
                  Markdown Content <span className="text-[9px] font-normal normal-case opacity-60">Supports standard markdown (#, -, **)</span>
                </label>
                <textarea 
                  required 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                  className="w-full flex-1 bg-background border p-3 text-sm rounded-lg font-mono leading-relaxed focus:outline-none focus:border-primary resize-none" 
                />
              </div>
            </form>
            <div className="p-3 border-t border-border bg-muted/20 flex justify-end gap-2 shrink-0">
              <Btn variant="secondary" onClick={() => setSelectedNote(null)}>Cancel</Btn>
              <Btn variant="primary" type="submit" form="noteForm" disabled={isSubmitting}>Save Document</Btn>
            </div>
          </Card>

          {/* RIGHT PANE: Live Preview / Instructions */}
          <Card className="flex flex-col border-border shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
            <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2 text-sm font-bold text-foreground shrink-0">
              <FileText size={16} className="text-primary"/> Document Preview
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-2xl mx-auto prose prose-sm dark:prose-invert prose-headings:text-foreground prose-a:text-primary prose-p:text-muted-foreground">
                {formData.content ? (
                  /* Ultra-basic markdown renderer for preview */
                  <div dangerouslySetInnerHTML={{ 
                    __html: formData.content
                      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b pb-2">$1</h2>')
                      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black mb-4 text-primary">$1</h1>')
                      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                      .replace(/\*(.*)\*/gim, '<em>$1</em>')
                      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
                      .replace(/\n$/gim, '<br />')
                  }} />
                ) : (
                  <div className="text-center p-12 opacity-40">
                    <FileText size={48} className="mx-auto mb-4" />
                    <p>Start typing on the left, or hit Auto-Compile to generate content from mapped features.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0 overflow-y-auto custom-scrollbar content-start">
          {dbNotes.length === 0 ? (
            <div className="col-span-full p-12 text-center border border-dashed rounded-xl border-border bg-muted/10">
              <FileText className="mx-auto text-muted-foreground/50 mb-3" size={28}/>
              <p className="text-sm font-medium text-foreground">No notes drafted for {activeRelease}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create a targeted document for stakeholders, public users, or DevOps.</p>
              <Btn variant="primary" onClick={openNewForm}>Draft New Document</Btn>
            </div>
          ) : (
            dbNotes.map(note => (
              <Card key={note.id} className="p-5 flex flex-col hover:border-primary/50 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <Badge className={cn("text-[10px] font-bold border-none px-2 py-0.5", 
                    note.status === 'Published' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {note.status === 'Published' ? <CheckCircle2 size={12} className="mr-1 inline"/> : null}
                    {note.status}
                  </Badge>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditForm(note)} className="p-1 text-muted-foreground hover:text-primary"><FileEdit size={14}/></button>
                    <button onClick={() => handleDelete(note.id)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
                
                <h3 className="text-sm font-bold text-foreground leading-snug mb-1">{note.title}</h3>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5 mb-4 border-b pb-3">
                  {getAudienceIcon(note.audience)} {note.audience}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {note.content.replace(/[#*]/g, '')} {/* Strip basic markdown for preview */}
                </p>
                
                <Btn variant="secondary" className="w-full text-xs" onClick={() => openEditForm(note)}>Open Editor</Btn>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}