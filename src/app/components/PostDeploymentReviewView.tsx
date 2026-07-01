import { useState, useEffect } from "react";
import { Download, Rocket, AlertTriangle, CheckCircle2, XCircle, Activity, Bug, Users, FileText, Edit, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function PostDeploymentReviewView({ activeProject }: { activeProject: string }) {
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // States
  const [activeRelease, setActiveRelease] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    deployment_status: "Success",
    hotfixes_required: 0,
    incidents_logged: 0,
    executive_summary: "",
    adoption_notes: ""
  });

  async function fetchPDRWorkspace() {
    setLoading(true);
    try {
      const relRes = await supabase.from('delivery_releases').select('release_version, title, status').eq('project_name', activeProject).order('release_version', { ascending: false });
      
      if (relRes.data && relRes.data.length > 0) {
        setDbReleases(relRes.data);
        const targetRelease = activeRelease || relRes.data[0].release_version;
        if (!activeRelease) setActiveRelease(targetRelease);

        const pdrRes = await supabase
          .from('delivery_post_deployment_reviews')
          .select('*')
          .eq('project_name', activeProject)
          .eq('release_version', targetRelease)
          .single(); // We only expect 1 review per release

        if (pdrRes.data) {
          setReviewData(pdrRes.data);
        } else {
          setReviewData(null);
        }
      }
    } catch (err: any) {
      // Supabase throws if .single() finds no rows, this is expected behavior if no PDR exists
      if (err.code !== 'PGRST116') {
        console.error("PDR fetch exception:", err);
      }
      setReviewData(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPDRWorkspace();
  }, [activeProject, activeRelease]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: reviewData ? formData.id : `PDR-${Math.floor(Math.random() * 90000)}`,
      release_version: activeRelease,
      deployment_status: formData.deployment_status,
      hotfixes_required: Number(formData.hotfixes_required),
      incidents_logged: Number(formData.incidents_logged),
      executive_summary: formData.executive_summary,
      adoption_notes: formData.adoption_notes,
      project_name: activeProject
    };

    let error;
    if (reviewData) {
      const { error: updateError } = await supabase.from('delivery_post_deployment_reviews').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('delivery_post_deployment_reviews').insert([payload]);
      error = insertError;
    }

    if (error) alert(`Error saving PDR: ${error.message}`);
    else {
      setIsFormOpen(false);
      fetchPDRWorkspace();
    }
    setIsSubmitting(false);
  }

  function openForm() {
    if (reviewData) {
      setFormData({ ...reviewData });
    } else {
      setFormData({ id: "", deployment_status: "Success", hotfixes_required: 0, incidents_logged: 0, executive_summary: "", adoption_notes: "" });
    }
    setIsFormOpen(true);
  }

  // Visual Helpers
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'Success': return { icon: <CheckCircle2 size={24}/>, color: "text-emerald-500", bg: "bg-emerald-50/50 border-emerald-200" };
      case 'Success with Issues': return { icon: <AlertTriangle size={24}/>, color: "text-amber-500", bg: "bg-amber-50/50 border-amber-200" };
      case 'Rolled Back': return { icon: <XCircle size={24}/>, color: "text-red-500", bg: "bg-red-50/50 border-red-200" };
      default: return { icon: <Activity size={24}/>, color: "text-slate-500", bg: "bg-slate-50 border-slate-200" };
    }
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1200px] mx-auto">
      <SectionHeader
        title="Post Deployment Review (PDR)"
        sub="Assess release stability, track hotfixes, and document adoption metrics post go-live."
        actions={
          <Btn variant={reviewData ? "secondary" : "primary"} onClick={openForm} disabled={!activeRelease}>
            {reviewData ? <><Edit size={13} /> Edit Review</> : <><Plus size={13} /> Conduct PDR</>}
          </Btn>
        }
      />

      {/* HEADER CONTROLS */}
      <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0"><Rocket size={14} className="inline mr-1 text-primary"/> Release Target:</label>
          <select 
            value={activeRelease} 
            onChange={(e) => setActiveRelease(e.target.value)}
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
        <div className="p-12 flex justify-center items-center text-muted-foreground text-sm font-medium">Fetching telemetry...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Activity size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Target Releases Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Go to Release Planning to establish a version target before reviewing it.</p>
        </Card>
      ) : !reviewData ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed bg-muted/10">
          <Activity size={32} className="text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Review Conducted for {activeRelease}</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">The code is live, but the health and stability metrics haven't been logged yet.</p>
          <Btn variant="primary" onClick={openForm}>Conduct Post-Deployment Review</Btn>
        </Card>
      ) : (
        /* EXECUTIVE DASHBOARD VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status KPI */}
            <Card className={cn("p-6 flex items-center gap-4 border shadow-sm", getStatusDisplay(reviewData.deployment_status).bg)}>
              <div className={cn("p-3 rounded-full bg-background shadow-sm border", getStatusDisplay(reviewData.deployment_status).color)}>
                {getStatusDisplay(reviewData.deployment_status).icon}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deployment Status</span>
                <div className={cn("text-lg font-black", getStatusDisplay(reviewData.deployment_status).color)}>
                  {reviewData.deployment_status}
                </div>
              </div>
            </Card>

            {/* Hotfix KPI */}
            <Card className={cn("p-6 flex items-center gap-4 border shadow-sm transition-colors", 
              reviewData.hotfixes_required > 0 ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"
            )}>
              <div className={cn("p-3 rounded-full bg-background shadow-sm border", 
                reviewData.hotfixes_required > 0 ? "text-red-500 border-red-200" : "text-emerald-500 border-emerald-200"
              )}>
                <Bug size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Production Hotfixes</span>
                <div className={cn("text-lg font-black", reviewData.hotfixes_required > 0 ? "text-red-600" : "text-emerald-600")}>
                  {reviewData.hotfixes_required} Deployed
                </div>
              </div>
            </Card>

            {/* Incident KPI */}
            <Card className={cn("p-6 flex items-center gap-4 border shadow-sm",
              reviewData.incidents_logged > 5 ? "border-red-200 bg-red-50/30" : reviewData.incidents_logged > 0 ? "border-amber-200 bg-amber-50/30" : "border-emerald-200 bg-emerald-50/30"
            )}>
              <div className={cn("p-3 rounded-full bg-background shadow-sm border",
                reviewData.incidents_logged > 5 ? "text-red-500 border-red-200" : reviewData.incidents_logged > 0 ? "text-amber-500 border-amber-200" : "text-emerald-500 border-emerald-200"
              )}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Support Incidents</span>
                <div className={cn("text-lg font-black", 
                  reviewData.incidents_logged > 5 ? "text-red-600" : reviewData.incidents_logged > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {reviewData.incidents_logged} Logged
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col border-border shadow-sm">
              <div className="p-3 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <FileText size={16} className="text-primary"/>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Executive Summary</h3>
              </div>
              <div className="p-5 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {reviewData.executive_summary || "No executive summary provided."}
              </div>
            </Card>

            <Card className="flex flex-col border-border shadow-sm">
              <div className="p-3 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                <Users size={16} className="text-blue-500"/>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Adoption & Feedback</h3>
              </div>
              <div className="p-5 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {reviewData.adoption_notes || "No adoption metrics logged yet."}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Activity size={16} className="text-blue-500" /> {reviewData ? "Edit PDR Metrics" : "Log PDR Metrics"}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form id="pdrForm" onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-xl bg-muted/20">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Final Status</label>
                  <select required value={formData.deployment_status} onChange={e => setFormData({...formData, deployment_status: e.target.value})} className="w-full bg-background border p-2 text-sm rounded font-bold">
                    <option>Success</option>
                    <option>Success with Issues</option>
                    <option>Rolled Back</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Bug size={12}/> Hotfixes</label>
                  <input type="number" min="0" required value={formData.hotfixes_required} onChange={e => setFormData({...formData, hotfixes_required: Number(e.target.value)})} className="w-full bg-background border p-2 text-sm rounded focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Incidents Logged</label>
                  <input type="number" min="0" required value={formData.incidents_logged} onChange={e => setFormData({...formData, incidents_logged: Number(e.target.value)})} className="w-full bg-background border p-2 text-sm rounded focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Executive Summary</label>
                <textarea required rows={4} placeholder="Summarize the deployment execution, major hurdles, and overall stability..." value={formData.executive_summary} onChange={e => setFormData({...formData, executive_summary: e.target.value})} className="w-full bg-muted border p-3 text-sm rounded-lg leading-relaxed focus:outline-none focus:border-primary" />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> User Adoption & Feedback</label>
                <textarea rows={3} placeholder="How is the user base responding? Any drop-offs or complaints?" value={formData.adoption_notes} onChange={e => setFormData({...formData, adoption_notes: e.target.value})} className="w-full bg-blue-50/20 border border-blue-100 p-3 text-sm rounded-lg leading-relaxed focus:outline-none" />
              </div>

            </form>
            <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
              <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
              <Btn variant="primary" type="submit" form="pdrForm" disabled={isSubmitting}>{reviewData ? "Update Metrics" : "Lock Review"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}