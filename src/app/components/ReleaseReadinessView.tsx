import { useState, useEffect } from "react";
import { Download, Gauge, AlertTriangle, Flame, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, ProgressBar, StatusBadge, PriorityDot, Badge } from "./SharedUI";

export default function ReleaseReadinessView({ activeProject }: { activeProject: string }) {
  const [dbReadiness, setDbReadiness] = useState<any[]>([]);
  const [dbBlockers, setDbBlockers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    impact: "",
    severity: "High",
    owner: "Sarah Chen",
    due: ""
  });

  async function fetchData() {
    setLoading(true);
    const [readinessRes, blockersRes] = await Promise.all([
      supabase.from('readiness_items').select('*').eq('project_name', activeProject), 
      supabase.from('blockers').select('*').eq('project_name', activeProject).order('created_at', { ascending: false })         
    ]);

    if (readinessRes.error) console.error("Error fetching readiness:", readinessRes.error);
    else setDbReadiness(readinessRes.data || []);

    if (blockersRes.error) console.error("Error fetching blockers:", blockersRes.error);
    else setDbBlockers(blockersRes.data || []);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  async function handleCreateBlocker(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newBlocker = {
      title: formData.title,
      impact: formData.impact,
      severity: formData.severity,
      owner: formData.owner,
      due: formData.due || "TBD",
      project_name: activeProject
    };

    const { error } = await supabase.from('blockers').insert([newBlocker]);

    if (error) {
      console.error("Error saving blocker:", error);
      alert("Failed to save blocker!");
    } else {
      setIsModalOpen(false);
      setFormData({ title: "", impact: "", severity: "High", owner: "Sarah Chen", due: "" });
      fetchData(); 
    }
    setIsSubmitting(false);
  }

  const overallScore = dbReadiness.length > 0 ? Math.round(dbReadiness.reduce((s, r) => s + r.score, 0) / dbReadiness.length) : 0;
  const ready = dbReadiness.filter(r => r.status === "Ready").length;
  const atRisk = dbReadiness.filter(r => r.status === "At Risk").length;

  return (
    <div className="p-6 space-y-5 relative">
      <SectionHeader
        title="Production Readiness"
        sub={`${activeProject} · Review: Pending`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Report</Btn>
            <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={13} />Log Blocker
            </Btn>
          </>
        }
      />
      
      {loading && dbReadiness.length === 0 ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading Production Readiness...</div>
      ) : (
        <>
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              <Gauge size={22} className="text-amber-700 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm">{overallScore >= 80 ? "Go" : "Conditional Go"}</div>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Overall readiness: {overallScore}% · {dbBlockers.length} blockers must be resolved before release</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{overallScore}%</div>
              <div className="text-xs text-amber-600 dark:text-amber-500">Overall</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{ready}</div><div className="text-xs text-muted-foreground mt-1">Dimensions Ready</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{dbReadiness.length - ready - atRisk}</div><div className="text-xs text-muted-foreground mt-1">In Progress</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-bold text-red-500">{atRisk}</div><div className="text-xs text-muted-foreground mt-1">At Risk</div></Card>
          </div>
          
          <Card>
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-sm">Readiness Dimensions</h3></div>
            <div className="divide-y divide-border">
              {dbReadiness.length === 0 ? <div className="p-4 text-sm text-center text-muted-foreground">No readiness data mapped for this project yet.</div> : dbReadiness.map(item => (
                <div key={item.dimension} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-40 flex-shrink-0"><div className="text-sm font-medium text-foreground">{item.dimension}</div><div className="text-xs text-muted-foreground">{item.completed}/{item.items} items</div></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-muted-foreground">{item.score}%</span>{item.blocker && <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle size={10} />{item.blocker}</span>}</div>
                    <ProgressBar value={item.score} color={item.score >= 85 ? "emerald" : item.score >= 70 ? "blue" : item.score >= 60 ? "amber" : "red"} />
                  </div>
                  <div className="w-24 flex-shrink-0 text-right"><StatusBadge status={item.status} /></div>
                  <div className="w-28 flex-shrink-0 text-right"><span className="text-xs text-muted-foreground">{item.owner}</span></div>
                </div>
              ))}
            </div>
          </Card>
          
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Flame size={14} className="text-red-500" />Release Blockers</h3>
            <div className="space-y-2">
              {dbBlockers.length === 0 ? <div className="text-sm text-muted-foreground">No active blockers for this project.</div> : dbBlockers.map(b => (
                <div key={b.id} className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:bg-red-900/10 bg-red-50">
                  <PriorityDot priority={b.severity} />
                  <div className="flex-1"><div className="text-sm font-medium text-foreground">{b.title}</div><div className="text-xs text-muted-foreground mt-0.5">{b.impact}</div></div>
                  <div className="text-right flex-shrink-0"><div className="text-xs text-muted-foreground">{b.owner}</div><div className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">Due {b.due}</div></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* NEW BLOCKER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Flame size={18} className="text-red-500" /> Log Release Blocker
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateBlocker} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Blocker Title</label>
                <input 
                  required 
                  autoFocus 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Critical security vulnerability in Auth module" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Impact Description</label>
                <textarea 
                  required 
                  rows={2}
                  value={formData.impact} 
                  onChange={e => setFormData({...formData, impact: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Prevents users from securely resetting passwords." 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Severity</label>
                  <select 
                    value={formData.severity} 
                    onChange={e => setFormData({...formData, severity: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Resolution Date</label>
                  <input 
                    type="date"
                    value={formData.due} 
                    onChange={e => setFormData({...formData, due: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Log Blocker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}