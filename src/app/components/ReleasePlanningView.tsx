import { useState, useEffect } from "react";
import { Plus, Download, Rocket, Calendar, ArrowRight, ArrowLeft, Layers, ShieldCheck, Tag, Flag } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ReleasePlanningView({ activeProject }: { activeProject: string }) {
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active target selection
  const [activeReleaseVersion, setActiveReleaseVersion] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newRelease, setNewRelease] = useState({
    release_version: "",
    title: "",
    target_date: "",
    status: "Planned",
    description: ""
  });

  async function fetchReleaseWorkspace() {
    setLoading(true);
    try {
      // 1. Fetch the Releases
      const relRes = await supabase.from('delivery_releases').select('*').eq('project_name', activeProject).order('target_date', { ascending: true });
      // 2. Fetch the Product Features (The connected data!)
      const featRes = await supabase.from('product_features').select('*').eq('project_name', activeProject);

      if (relRes.data) {
        setDbReleases(relRes.data);
        if (relRes.data.length > 0 && !activeReleaseVersion) {
          setActiveReleaseVersion(relRes.data[0].release_version);
        }
      }
      if (featRes.data) setDbFeatures(featRes.data);
    } catch (err) {
      console.error("Workspace fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReleaseWorkspace();
  }, [activeProject]);

  // --- Dynamic Feature Assigner (Connected Architecture) ---
  async function moveFeatureToRelease(featureId: string, releaseVer: string | null) {
    // Optimistic UI Update
    setDbFeatures(prev => prev.map(f => f.id === featureId ? { ...f, release_version: releaseVer } : f));
    
    // Database Sync
    const { error } = await supabase
      .from('product_features')
      .update({ release_version: releaseVer })
      .eq('id', featureId);

    if (error) {
      console.error("Database save failed:", error);
      fetchReleaseWorkspace(); // revert on fail
    }
  }

  // --- Create Release ---
  async function handleCreateRelease(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      id: `REL-${Math.floor(Math.random() * 90000)}`,
      release_version: newRelease.release_version,
      title: newRelease.title,
      target_date: newRelease.target_date,
      status: newRelease.status,
      description: newRelease.description,
      project_name: activeProject
    };

    const { error } = await supabase.from('delivery_releases').insert([payload]);
    if (error) {
      alert(`Error initializing release: ${error.message}`);
    } else {
      setIsFormOpen(false);
      setActiveReleaseVersion(newRelease.release_version);
      fetchReleaseWorkspace();
    }
    setIsSubmitting(false);
  }

  // --- Splits ---
  const selectedReleaseDetails = dbReleases.find(r => r.release_version === activeReleaseVersion);
  
  // Connect Features to the Release Board
  const unassignedFeatures = dbFeatures.filter(f => !f.release_version || f.release_version === "");
  const assignedToCurrentRelease = dbFeatures.filter(f => f.release_version === activeReleaseVersion);

  return (
    <div className="p-6 space-y-6 relative max-w-7xl mx-auto">
      <SectionHeader
        title="Release Planning Engine"
        sub="Bundle deployed features, set go-live dates, and map scopes for production rollout."
        actions={
          <Btn variant="primary" onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setNewRelease({ release_version: `v3.${dbReleases.length + 1}.0`, title: "", target_date: today, status: "Planned", description: "" });
            setIsFormOpen(true);
          }}>
            <Plus size={14} /> Plan New Release
          </Btn>
        }
      />

      {/* TARGET SELECTOR HEADER */}
      <div className="bg-card border border-border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0"><Rocket size={14} className="inline mr-1 text-primary"/> Active Release:</label>
          <select 
            value={activeReleaseVersion} 
            onChange={(e) => setActiveReleaseVersion(e.target.value)}
            className="bg-muted px-3 py-1.5 rounded-lg text-sm font-bold border border-border focus:outline-none"
          >
            {dbReleases.map(r => (
              <option key={r.id} value={r.release_version}>{r.release_version} - {r.title}</option>
            ))}
          </select>
        </div>

        {selectedReleaseDetails && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <span className="text-muted-foreground flex items-center gap-1"><Calendar size={13}/> Target Date: <strong className="text-foreground">{selectedReleaseDetails.target_date}</strong></span>
            <span className="w-px h-3 bg-border" />
            <Badge className={
              selectedReleaseDetails.status === 'Deployed' ? "bg-emerald-100 text-emerald-700 border-none" : 
              selectedReleaseDetails.status === 'Code Freeze' ? "bg-blue-100 text-blue-700 border-none" : 
              "bg-amber-100 text-amber-700 border-none"
            }>
              {selectedReleaseDetails.status}
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm font-medium">Mapping release infrastructure...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Rocket size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Releases Planned</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Initialize a release version to start bundling your features for production.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* LEFT COLUMN: UNASSIGNED FEATURES */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers size={14}/> Unmapped Features ({unassignedFeatures.length})
              </h3>
            </div>

            <Card className="p-3 bg-muted/20 border border-border space-y-3 max-h-[60vh] overflow-y-auto">
              {unassignedFeatures.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium italic">All existing features have been mapped to a release. (Create more in the Features module!)</div>
              ) : (
                unassignedFeatures.map(feat => (
                  <div key={feat.id} className="bg-card border border-border p-3 rounded-lg shadow-sm flex items-center justify-between gap-3 group hover:border-primary/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/5 text-primary text-[9px] font-mono border-primary/10 px-1 py-0"><Tag size={9} className="mr-1 inline"/>{feat.feature_id}</Badge>
                        <Badge className="bg-slate-100 text-slate-700 text-[9px] px-1 py-0 border-none font-bold">{feat.priority}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug truncate">{feat.title}</h4>
                    </div>
                    <button 
                      onClick={() => moveFeatureToRelease(feat.id, activeReleaseVersion)}
                      className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground rounded-md transition-colors shadow-sm"
                      title="Add to Release"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN: ACTIVE RELEASE SCOPE */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Rocket size={14} className="text-emerald-500"/> {activeReleaseVersion} Scope ({assignedToCurrentRelease.length})
              </h3>
            </div>

            <Card className="p-3 border space-y-3 max-h-[60vh] overflow-y-auto min-h-[150px] bg-emerald-50/10 border-emerald-100 dark:bg-emerald-900/5 dark:border-emerald-900/30">
              {assignedToCurrentRelease.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground font-medium italic flex flex-col items-center justify-center gap-1.5">
                  <Flag size={16} className="text-emerald-400" />
                  <span>Release scope is empty. Push features from the left pane to build your deployment package.</span>
                </div>
              ) : (
                assignedToCurrentRelease.map(feat => (
                  <div key={feat.id} className="bg-card border border-border/80 p-3 rounded-lg shadow-sm flex items-center justify-between gap-3 group">
                    <button 
                      onClick={() => moveFeatureToRelease(feat.id, null)}
                      className="p-1.5 bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
                      title="Remove from Release"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-mono px-1 py-0 border-none"><ShieldCheck size={9} className="mr-1 inline"/>{feat.feature_id}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug truncate">{feat.title}</h4>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      )}

      {/* CREATE RELEASE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Rocket size={16} className="text-blue-500" /> Plan Release Version</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleCreateRelease} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Version Tag</label>
                  <input required placeholder="v3.1.0" value={newRelease.release_version} onChange={e => setNewRelease({...newRelease, release_version: e.target.value})} className="w-full bg-muted border p-2 text-xs font-mono rounded" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Release Title</label>
                  <input required placeholder="e.g. Q3 Analytics Patch" value={newRelease.title} onChange={e => setNewRelease({...newRelease, title: e.target.value})} className="w-full bg-muted border p-2 text-xs rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Target Go-Live</label>
                  <input type="date" required value={newRelease.target_date} onChange={e => setNewRelease({...newRelease, target_date: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Current Status</label>
                  <select required value={newRelease.status} onChange={e => setNewRelease({...newRelease, status: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-bold">
                    <option>Planned</option>
                    <option>In Progress</option>
                    <option>Code Freeze</option>
                    <option>Deployed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Release Scope Note</label>
                <textarea required rows={3} placeholder="Briefly summarize the impact of this release..." value={newRelease.description} onChange={e => setNewRelease({...newRelease, description: e.target.value})} className="w-full bg-muted border p-2 text-xs rounded leading-relaxed focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Lock Release Target</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}