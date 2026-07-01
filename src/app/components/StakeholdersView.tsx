import { useState, useEffect } from "react";
import { Plus, Download, Users, User, Edit, Trash2, X, Briefcase, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function StakeholdersView({ activeProject }: { activeProject: string }) {
  const [dbStakeholders, setDbStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedStakeholder, setSelectedStakeholder] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    role: "",
    department: "",
    influence: "Medium",
    interest: "Medium",
    raci: "Consulted",
    communication: ""
  });

  async function fetchStakeholders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('project_name', activeProject)
      .order('influence', { ascending: false }); 

    if (error) console.error("Error fetching stakeholders:", error);
    else if (data) setDbStakeholders(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchStakeholders();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `STK-${Math.floor(Math.random() * 900) + 100}`,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      influence: formData.influence,
      interest: formData.interest,
      raci: formData.raci,
      communication: formData.communication,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('stakeholders').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('stakeholders').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving stakeholder:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchStakeholders();
      if (isEditMode && selectedStakeholder) setSelectedStakeholder(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this stakeholder from the project?")) return;
    setDbStakeholders(dbStakeholders.filter(s => s.id !== id));
    setSelectedStakeholder(null);
    const { error } = await supabase.from('stakeholders').delete().eq('id', id);
    if (error) fetchStakeholders();
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", name: "", role: "", department: "", influence: "Medium", interest: "Medium", raci: "Consulted", communication: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation(); 
    setIsEditMode(true);
    setFormData({
      id: item.id,
      name: item.name,
      role: item.role,
      department: item.department || "",
      influence: item.influence || "Medium",
      interest: item.interest || "Medium",
      raci: item.raci || "Consulted",
      communication: item.communication || ""
    });
    setIsFormOpen(true);
    setSelectedStakeholder(null); 
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // BA Framework: Power/Interest Grid Logic
  const getEngagementStrategy = (influence: string, interest: string) => {
    if (influence === "High" && interest === "High") return { label: "Manage Closely", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    if (influence === "High" && (interest === "Low" || interest === "Medium")) return { label: "Keep Satisfied", color: "bg-blue-100 text-blue-700 border-blue-200" };
    if ((influence === "Low" || influence === "Medium") && interest === "High") return { label: "Keep Informed", color: "bg-violet-100 text-violet-700 border-violet-200" };
    return { label: "Monitor", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  const getRaciColor = (raci: string) => {
    switch(raci) {
      case "Accountable": return "bg-red-100 text-red-700 border-red-200";
      case "Responsible": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Consulted": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Informed": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Stakeholder Register"
        sub={`RACI and Engagement mapping for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Matrix</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Stakeholder
            </Btn>
          </>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading stakeholders...</div>
      ) : dbStakeholders.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Users size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Stakeholders Mapped</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Identify your key players, their influence, and RACI roles.</p>
          <Btn variant="secondary" onClick={openNewForm}>Map First Stakeholder</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbStakeholders.map(stk => {
            const strategy = getEngagementStrategy(stk.influence, stk.interest);
            
            return (
              <div 
                key={stk.id} 
                onClick={() => setSelectedStakeholder(stk)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                    {stk.name.charAt(0)}
                  </div>
                  <Badge className={cn("text-[10px]", getRaciColor(stk.raci))}>
                    {stk.raci}
                  </Badge>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight">{stk.name}</h3>
                <div className="text-xs text-muted-foreground font-medium mb-3">{stk.role} • {stk.department}</div>
                
                <div className="mt-auto space-y-3 pt-3 border-t border-border">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Power/Interest:</span>
                    <span className="font-semibold">{stk.influence} / {stk.interest}</span>
                  </div>
                  <Badge className={cn("w-full justify-center", strategy.color)}>
                    Strategy: {strategy.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedStakeholder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedStakeholder.id}</Badge>
                <Badge className={getRaciColor(selectedStakeholder.raci)}>{selectedStakeholder.raci}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedStakeholder, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedStakeholder.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedStakeholder(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border border-primary/20 shrink-0">
                  {selectedStakeholder.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedStakeholder.name}</h2>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Briefcase size={14} /> {selectedStakeholder.role} | {selectedStakeholder.department}
                  </div>
                </div>
              </div>

              {/* Power / Interest Analysis */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Activity size={14} /> Engagement Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Influence (Power)</span><span className="font-semibold">{selectedStakeholder.influence}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Interest</span><span className="font-semibold">{selectedStakeholder.interest}</span></div>
                  </div>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border flex flex-col justify-center items-center text-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Target Strategy</h3>
                  <Badge className={cn("text-sm py-1 px-3", getEngagementStrategy(selectedStakeholder.influence, selectedStakeholder.interest).color)}>
                    {getEngagementStrategy(selectedStakeholder.influence, selectedStakeholder.interest).label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-blue-700 dark:text-blue-400">
                    <User size={16} /> Communication Plan & Needs
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedStakeholder.communication || <span className="text-muted-foreground italic">No specific communication plan documented.</span>}
                  </div>
                </section>
              </div>
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
                <User size={18} className="text-blue-500" /> {isEditMode ? "Edit Stakeholder" : "Add Stakeholder"}
              </h2>
              <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
                  <input 
                    required autoFocus 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. David Wallace" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role / Job Title</label>
                  <input 
                    required 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Project Sponsor" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Department / Group</label>
                <input 
                  required 
                  value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Executive Leadership" 
                />
              </div>

              {/* BA RACI & Power Grid */}
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Engagement Profiling</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Influence (Power)</label>
                    <select 
                      value={formData.influence} onChange={e => setFormData({...formData, influence: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Interest</label>
                    <select 
                      value={formData.interest} onChange={e => setFormData({...formData, interest: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">RACI Role</label>
                    <select 
                      value={formData.raci} onChange={e => setFormData({...formData, raci: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="Responsible">Responsible (Does the work)</option>
                      <option value="Accountable">Accountable (Approves)</option>
                      <option value="Consulted">Consulted (Provides input)</option>
                      <option value="Informed">Informed (Kept in loop)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Communication Plan & Needs</label>
                <textarea 
                  rows={3}
                  value={formData.communication} onChange={e => setFormData({...formData, communication: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="How and when should this stakeholder be engaged?" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Stakeholder")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}