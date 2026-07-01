import { useState, useEffect } from "react";
import { Plus, Download, Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Rocket, Edit, Trash2, Wand2, Server, Briefcase, ShieldCheck, Headset } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ProductionReadinessView({ activeProject }: { activeProject: string }) {
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [readinessItems, setReadinessItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active target selection
  const [activeRelease, setActiveRelease] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newItem, setNewItem] = useState({
    criteria_name: "",
    category: "Operations",
    status: "Red",
    notes: ""
  });

  async function fetchReadinessData() {
    setLoading(true);
    try {
      const relRes = await supabase.from('delivery_releases').select('release_version, title').eq('project_name', activeProject).order('release_version', { ascending: false });
      
      if (relRes.data && relRes.data.length > 0) {
        setDbReleases(relRes.data);
        const targetRelease = activeRelease || relRes.data[0].release_version;
        if (!activeRelease) setActiveRelease(targetRelease);

        const prrRes = await supabase
          .from('delivery_production_readiness')
          .select('*')
          .eq('project_name', activeProject)
          .eq('release_version', targetRelease)
          .order('created_at', { ascending: true });

        if (prrRes.data) setReadinessItems(prrRes.data);
      }
    } catch (err) {
      console.error("PRR fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReadinessData();
  }, [activeProject, activeRelease]);

  // --- Traffic Light Cycler (Fast UX) ---
  async function cycleStatus(id: string, currentStatus: string) {
    const cycleMap: Record<string, string> = {
      'Red': 'Yellow',
      'Yellow': 'Green',
      'Green': 'N/A',
      'N/A': 'Red'
    };
    const newStatus = cycleMap[currentStatus] || 'Red';
    
    // Optimistic UI update
    setReadinessItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));

    const { error } = await supabase.from('delivery_production_readiness').update({ status: newStatus }).eq('id', id);
    if (error) fetchReadinessData();
  }

  // --- Note Updater ---
  async function updateNote(id: string, newNote: string) {
    setReadinessItems(prev => prev.map(item => item.id === id ? { ...item, notes: newNote } : item));
    await supabase.from('delivery_production_readiness').update({ notes: newNote }).eq('id', id);
  }

  // --- Create Single Item ---
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      id: `PRR-${Math.floor(Math.random() * 90000)}`,
      release_version: activeRelease,
      criteria_name: newItem.criteria_name,
      category: newItem.category,
      status: newItem.status,
      notes: newItem.notes,
      project_name: activeProject
    };

    const { error } = await supabase.from('delivery_production_readiness').insert([payload]);
    if (error) alert(`Error saving PRR item: ${error.message}`);
    else {
      setIsFormOpen(false);
      setNewItem({ ...newItem, criteria_name: "", notes: "" });
      fetchReadinessData();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this readiness criteria?")) return;
    setReadinessItems(prev => prev.filter(t => t.id !== id));
    await supabase.from('delivery_production_readiness').delete().eq('id', id);
  }

  // --- Load Standard Enterprise Matrix ---
  async function loadStandardMatrix() {
    if (!activeRelease) return;
    if (!window.confirm("Inject standard enterprise readiness matrix for this release?")) return;
    
    const templates = [
      { category: "Operations", criteria_name: "L1/L2 Support Runbooks Published", status: "Red", notes: "Awaiting drafts" },
      { category: "Operations", criteria_name: "Support Desk Trained on New Features", status: "Red", notes: "Scheduling required" },
      { category: "Business", criteria_name: "End-User Comms & Marketing Drafted", status: "Red", notes: "" },
      { category: "Business", criteria_name: "Feature Documentation & FAQs Updated", status: "Red", notes: "" },
      { category: "Infrastructure", criteria_name: "Database Rollback Plan Documented", status: "Red", notes: "" },
      { category: "Infrastructure", criteria_name: "Feature Flags configured for gradual rollout", status: "Red", notes: "" },
      { category: "Security", criteria_name: "Final InfoSec Vulnerability Scan Passed", status: "Red", notes: "" }
    ].map(t => ({
      id: `PRR-${Math.floor(Math.random() * 900000)}`,
      release_version: activeRelease,
      project_name: activeProject,
      ...t
    }));

    await supabase.from('delivery_production_readiness').insert(templates);
    fetchReadinessData();
  }

  // Visual Helpers
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'Green': return { icon: <CheckCircle2 size={16}/>, color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" };
      case 'Yellow': return { icon: <AlertTriangle size={16}/>, color: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200" };
      case 'Red': return { icon: <XCircle size={16}/>, color: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" };
      default: return { icon: <MinusCircle size={16}/>, color: "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200" };
    }
  };

  const CATEGORIES = [
    { id: "Business", icon: <Briefcase size={14}/> },
    { id: "Operations", icon: <Headset size={14}/> },
    { id: "Infrastructure", icon: <Server size={14}/> },
    { id: "Security", icon: <ShieldCheck size={14}/> }
  ];

  const totalItems = readinessItems.filter(i => i.status !== 'N/A').length;
  const greenItems = readinessItems.filter(i => i.status === 'Green').length;
  const healthPercent = totalItems === 0 ? 0 : Math.round((greenItems / totalItems) * 100);

  return (
    <div className="p-6 space-y-6 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Production Readiness Review (PRR)"
        sub="Assess organizational health, documentation, and operational preparedness prior to a release."
        actions={
          <>
            <Btn variant="secondary" onClick={loadStandardMatrix}>
              <Wand2 size={13} /> Load PRR Matrix
            </Btn>
            <Btn variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={13} /> Add Criteria
            </Btn>
          </>
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

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="text-right">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Release Health</div>
            <div className={cn("text-xl font-black", healthPercent === 100 ? "text-emerald-500" : healthPercent > 60 ? "text-amber-500" : "text-red-500")}>
              {healthPercent}% Ready
            </div>
          </div>
          <Activity className={cn("opacity-50", healthPercent === 100 ? "text-emerald-500" : healthPercent > 60 ? "text-amber-500" : "text-red-500")} size={32} />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm font-medium">Loading readiness matrix...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Activity size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Target Releases Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Go to Release Planning to establish a version target before assessing readiness.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map(cat => {
            const catItems = readinessItems.filter(i => i.category === cat.id);
            if (catItems.length === 0) return null;

            return (
              <Card key={cat.id} className="overflow-hidden border-border shadow-sm flex flex-col h-full">
                <div className="p-3 border-b border-border/50 bg-muted/30 flex items-center gap-2 shrink-0">
                  <div className="p-1.5 bg-background rounded-md text-primary shadow-sm border border-border">{cat.icon}</div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{cat.id} Preparedness</h3>
                </div>
                
                <div className="divide-y divide-border/40 flex-1">
                  {catItems.map(item => {
                    const display = getStatusDisplay(item.status);
                    return (
                      <div key={item.id} className="p-3 hover:bg-muted/20 transition-colors group">
                        <div className="flex items-start gap-3">
                          {/* Traffic Light Button */}
                          <button 
                            onClick={() => cycleStatus(item.id, item.status)}
                            title="Click to cycle status (Red -> Yellow -> Green -> N/A)"
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 transition-colors",
                              display.color
                            )}
                          >
                            {display.icon} {item.status}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-foreground leading-snug mb-1 pr-6 relative">
                              {item.criteria_name}
                              <button onClick={() => handleDelete(item.id)} className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                                <Trash2 size={13}/>
                              </button>
                            </h4>
                            <input 
                              type="text" 
                              placeholder="Add status notes..."
                              value={item.notes || ""}
                              onChange={(e) => updateNote(item.id, e.target.value)}
                              className="w-full text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-0.5 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          {readinessItems.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center p-12 border border-dashed rounded-xl border-border bg-muted/10">
              <Activity className="mx-auto text-muted-foreground/50 mb-3" size={28}/>
              <p className="text-sm font-medium text-foreground">PRR Matrix is empty for {activeRelease}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Load the enterprise template to inject standard operational and business checks.</p>
              <Btn variant="secondary" onClick={loadStandardMatrix}>Load PRR Matrix</Btn>
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Activity size={16} className="text-blue-500" /> Add Readiness Criteria</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Criteria Definition</label>
                <input autoFocus required placeholder="e.g. Legal approval obtained for terms update" value={newItem.criteria_name} onChange={e => setNewItem({...newItem, criteria_name: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Category Domain</label>
                  <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-background border p-2 text-xs rounded font-bold">
                    <option>Business</option>
                    <option>Operations</option>
                    <option>Infrastructure</option>
                    <option>Security</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Current Status</label>
                  <select value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})} className="w-full bg-background border p-2 text-xs rounded">
                    <option>Green</option>
                    <option>Yellow</option>
                    <option>Red</option>
                    <option>N/A</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Status Notes (Optional)</label>
                <input placeholder="Current blockers or context..." value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} className="w-full bg-muted border p-2 text-xs rounded" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Btn variant="secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Add Criteria</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}