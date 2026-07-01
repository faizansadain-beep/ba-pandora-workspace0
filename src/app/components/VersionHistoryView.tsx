import { useState, useEffect } from "react";
import { Plus, Download, History, GitCommit, FileText, User, CheckCircle2, Clock, AlertTriangle, Edit, Trash2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function VersionHistoryView({ activeProject }: { activeProject: string }) {
  const [dbHistory, setDbHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    document_name: "",
    version_number: "1.0",
    change_summary: "",
    author: "",
    status: "Published"
  });

  async function fetchHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('version_history')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false }); // Newest changes first

    if (error) console.error("Error fetching version history:", error);
    else if (data) setDbHistory(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchHistory();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `VH-${Math.floor(Math.random() * 90000)}`,
      document_name: formData.document_name,
      version_number: formData.version_number,
      change_summary: formData.change_summary,
      author: formData.author,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('version_history').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('version_history').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving record:", error);
      alert("Failed to save version record!");
    } else {
      closeForm();
      fetchHistory();
      if (isEditMode && selectedRecord) setSelectedRecord(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this version history record? This cannot be undone.")) return;
    setDbHistory(dbHistory.filter(h => h.id !== id));
    setSelectedRecord(null);
    const { error } = await supabase.from('version_history').delete().eq('id', id);
    if (error) fetchHistory();
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", document_name: "", version_number: "1.0", change_summary: "", author: "", status: "Published" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      document_name: item.document_name,
      version_number: item.version_number,
      change_summary: item.change_summary,
      author: item.author || "",
      status: item.status || "Published"
    });
    setIsFormOpen(true);
    setSelectedRecord(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Published": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
      case "Deprecated": return { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle };
      default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock }; // Draft
    }
  };

  const getUniqueDocuments = () => {
    const docs = new Set(dbHistory.map(h => h.document_name));
    return docs.size;
  };

  return (
    <div className="p-6 space-y-5 relative max-w-5xl mx-auto">
      <SectionHeader
        title="Version Control & Audit History"
        sub={`Document control ledger and release baselines for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Ledger</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log New Version
            </Btn>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900">
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Total Audit Entries</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{dbHistory.length}</div>
          </div>
          <History className="text-blue-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Tracked Artifacts</div>
            <div className="text-2xl font-bold">{getUniqueDocuments()}</div>
          </div>
          <FileText className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Published Releases</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbHistory.filter(h => h.status === 'Published').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading audit ledger...</div>
      ) : dbHistory.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <GitCommit size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Document Revisions Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Start tracking your BRDs, Matrixes, and Models to maintain a strict audit trail.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Version</Btn>
        </Card>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {dbHistory.map((record, index) => {
            const visuals = getStatusVisuals(record.status);
            const StatusIcon = visuals.icon;
            const isEven = index % 2 === 0;

            return (
              <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Timeline Node */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitCommit size={16} />
                </div>
                
                {/* Content Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)]" onClick={() => setSelectedRecord(record)}>
                  <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4 md:border-l" style={{ borderLeftColor: record.status === 'Published' ? '#10B981' : record.status === 'Deprecated' ? '#EF4444' : '#94A3B8' }}>
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={cn("text-[10px] font-mono", visuals.color)}>
                        v{record.version_number} • {record.status}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-bold text-foreground mb-1.5">{record.document_name}</h3>
                    
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-muted/20 p-2 rounded">
                      {record.change_summary}
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground pt-2 border-t border-border">
                      <span className="flex items-center gap-1"><User size={12}/> {record.author || "Unknown Author"}</span>
                      <span className="font-mono">{record.id}</span>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
            <div className="flex items-center gap-3">
          <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedRecord.id}</Badge>
          <Badge className={cn("gap-1", getStatusVisuals(selectedRecord.status).color)}>
            {(() => {
              const Icon = getStatusVisuals(selectedRecord.status).icon;
              return <Icon size={12} />;
            })()} 
            {selectedRecord.status}
          </Badge>
        </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedRecord, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedRecord.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedRecord(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedRecord.document_name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Version Build</span>
                    <span className="text-lg font-mono font-bold text-primary">v{selectedRecord.version_number}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Modified By</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><User size={14} className="text-muted-foreground"/> {selectedRecord.author || "Unknown"}</span>
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Timestamp</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5"><Clock size={14} className="text-muted-foreground"/> {new Date(selectedRecord.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <section className="bg-muted/10 p-5 rounded-lg border border-border shadow-sm relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-3">
                  <FileText size={14} /> Change Summary & Justification
                </h3>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedRecord.change_summary}
                </div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedRecord.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedRecord(null)}>Close</Btn>
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
                <History size={18} className="text-blue-500" /> {isEditMode ? "Edit Version Record" : "Log Document Revision"}
              </h2>
              <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Artifact / Document Name</label>
                  <input 
                    required autoFocus list="docTypes"
                    value={formData.document_name} onChange={e => setFormData({...formData, document_name: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Business Requirements Document (BRD)" 
                  />
                  <datalist id="docTypes">
                    <option value="Business Requirements Document (BRD)" />
                    <option value="Functional Requirements Document (FRD)" />
                    <option value="Requirements Traceability Matrix (RTM)" />
                    <option value="Data Dictionary Mapping" />
                  </datalist>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Version #</label>
                  <input 
                    required 
                    value={formData.version_number} onChange={e => setFormData({...formData, version_number: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. 1.2" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Change Author</label>
                  <input 
                    required 
                    value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Jane Doe" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Document Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Deprecated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Change Summary / Revision Notes</label>
                <textarea 
                  required rows={4}
                  value={formData.change_summary} onChange={e => setFormData({...formData, change_summary: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="What specifically changed in this version? Who requested it?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Edits" : "Lock Version Entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}