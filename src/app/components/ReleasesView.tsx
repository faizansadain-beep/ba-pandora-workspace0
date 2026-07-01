import { useState, useEffect } from "react";
import { Plus, Download, Rocket, Calendar, Tag, Server, FileText, X, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ReleasesView({ activeProject }: { activeProject: string }) {
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedRelease, setSelectedRelease] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "", // Needed for edit mode
    title: "",
    version: "",
    release_date: "",
    status: "Planned",
    environment: "Production",
    notes: ""
  });

  async function fetchReleases() {
    setLoading(true);
    const { data, error } = await supabase
      .from('releases')
      .select('*')
      .eq('project_name', activeProject)
      .order('release_date', { ascending: false });

    if (error) console.error("Error fetching releases:", error);
    else if (data) setDbReleases(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchReleases();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSaveRelease(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const releasePayload = {
      id: isEditMode ? formData.id : `REL-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      version: formData.version,
      release_date: formData.release_date || null,
      status: formData.status,
      environment: formData.environment,
      notes: formData.notes,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('releases').update(releasePayload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('releases').insert([releasePayload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving release:", error);
      alert("Failed to save release!");
    } else {
      closeForm();
      fetchReleases();
      // If we just edited the currently selected item, update its detail view too
      if (isEditMode && selectedRelease) setSelectedRelease(releasePayload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this release? This cannot be undone.")) return;
    
    // Optimistic UI update
    setDbReleases(dbReleases.filter(r => r.id !== id));
    setSelectedRelease(null);
    
    // DB update
    const { error } = await supabase.from('releases').delete().eq('id', id);
    if (error) {
      console.error("Error deleting release:", error);
      fetchReleases(); // revert on failure
    }
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", version: "", release_date: "", status: "Planned", environment: "Production", notes: "" });
    setIsFormOpen(true);
  }

  function openEditForm(release: any) {
    setIsEditMode(true);
    setFormData({
      id: release.id,
      title: release.title,
      version: release.version,
      release_date: release.release_date || "",
      status: release.status,
      environment: release.environment,
      notes: release.notes || ""
    });
    setIsFormOpen(true);
    setSelectedRelease(null); // Close details view to show form
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Deployed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Ready": return "bg-blue-100 text-blue-700 border-blue-200";
      case "In Progress": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Rolled Back": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const deployedCount = dbReleases.filter(r => r.status === "Deployed").length;
  const upcomingCount = dbReleases.filter(r => r.status !== "Deployed" && r.status !== "Rolled Back").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Release Management"
        sub={`Track versions and deployments for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />New Release
            </Btn>
          </>
        }
      />
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Releases</div>
            <div className="text-2xl font-bold">{dbReleases.length}</div>
          </div>
          <Rocket className="text-primary opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Deployed to Prod</div>
            <div className="text-2xl font-bold text-emerald-600">{deployedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Upcoming / Planned</div>
            <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
          </div>
          <Calendar className="text-blue-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading releases...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Rocket size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No releases yet</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Start tracking your versions and deployments.</p>
          <Btn variant="secondary" onClick={openNewForm}>Create First Release</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbReleases.map(release => (
            <div 
              key={release.id} 
              onClick={() => setSelectedRelease(release)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-mono"><Tag size={10} className="mr-1" />{release.version}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">{release.id}</span>
                </div>
                <Badge className={getStatusColor(release.status)}>{release.status}</Badge>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">{release.title}</h3>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                {release.notes || "No release notes provided."}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Calendar size={12} />
                  {release.release_date ? new Date(release.release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "TBD"}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Server size={12} />
                  {release.environment}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: RELEASE DETAILS MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-sm px-2 py-1"><Tag size={12} className="mr-1.5" />{selectedRelease.version}</Badge>
                <Badge className={getStatusColor(selectedRelease.status)}>{selectedRelease.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                {/* ACTION BUTTONS: Edit & Delete */}
                <button onClick={() => openEditForm(selectedRelease)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit Release">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(selectedRelease.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Release">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => setSelectedRelease(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedRelease.title}</h2>
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> Date: {selectedRelease.release_date ? new Date(selectedRelease.release_date).toLocaleDateString() : 'TBD'}</span>
                  <span className="flex items-center gap-1.5"><Server size={14} /> Env: {selectedRelease.environment}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-foreground">
                  <FileText size={16} className="text-primary" /> Release Notes & Changelog
                </h3>
                <div className="text-sm text-foreground bg-muted/30 p-4 rounded-lg border border-border min-h-[120px] whitespace-pre-wrap leading-relaxed">
                  {selectedRelease.notes || <span className="text-muted-foreground italic">No detailed notes provided for this release.</span>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl">
              <span className="text-xs text-muted-foreground">Internal ID: {selectedRelease.id}</span>
              <Btn variant="secondary" onClick={() => setSelectedRelease(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          CREATE / UPDATE FORM MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6 max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Rocket size={18} className="text-blue-500" /> {isEditMode ? "Edit Release" : "New Release"}
              </h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSaveRelease} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Release Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Q3 Major Integration Update" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Version Tag</label>
                  <input 
                    required 
                    value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. v2.1.0" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Release Date</label>
                  <input 
                    type="date"
                    value={formData.release_date} onChange={e => setFormData({...formData, release_date: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Environment</label>
                  <select 
                    value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Production</option>
                    <option>Staging</option>
                    <option>UAT</option>
                    <option>QA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Planned</option>
                    <option>In Progress</option>
                    <option>Ready</option>
                    <option>Deployed</option>
                    <option>Rolled Back</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Release Notes & Changelog</label>
                <textarea 
                  rows={4}
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="List new features, fixes, and dependencies..." 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Create Release")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}