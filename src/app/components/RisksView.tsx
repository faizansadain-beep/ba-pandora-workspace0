import { useState, useEffect } from "react";
import { Plus, Download, ShieldAlert, AlertTriangle, ShieldCheck, Activity, Edit, Trash2, X, Wand2, User, Target } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function RisksView({ activeProject }: { activeProject: string }) {
  const [dbRisks, setDbRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedRisk, setSelectedRisk] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    probability: 3,
    impact: 3,
    mitigation: "",
    status: "Open",
    owner: ""
  });

  async function fetchRisks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('risks')
      .select('*')
      .eq('project_name', activeProject)
      .order('score', { ascending: false }); // Highest risk score first

    if (error) console.error("Error fetching risks:", error);
    else if (data) setDbRisks(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchRisks();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const calculatedScore = formData.probability * formData.impact;

    const payload = {
      id: isEditMode ? formData.id : `RSK-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      description: formData.description,
      probability: formData.probability,
      impact: formData.impact,
      score: calculatedScore,
      mitigation: formData.mitigation,
      status: formData.status,
      owner: formData.owner,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('risks').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('risks').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving risk:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchRisks();
      if (isEditMode && selectedRisk) setSelectedRisk(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Risk?")) return;
    setDbRisks(dbRisks.filter(r => r.id !== id));
    setSelectedRisk(null);
    const { error } = await supabase.from('risks').delete().eq('id', id);
    if (error) fetchRisks();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbRisks.map(risk => {
      const level = getRiskLevel(risk.score).label;
      return {
        "Risk ID": risk.id,
        "Title": risk.title,
        "Description": risk.description || "",
        "Probability (1-5)": risk.probability || 3,
        "Impact (1-5)": risk.impact || 3,
        "Exposure Score": risk.score || 0,
        "Risk Severity Level": level,
        "Mitigation Strategy": risk.mitigation || "",
        "Current Status": risk.status || "Open",
        "Assigned Owner": risk.owner || "Unassigned"
      };
    });

    const columnWidths = [
      { wch: 12 }, // ID
      { wch: 30 }, // Title
      { wch: 45 }, // Description
      { wch: 18 }, // Probability
      { wch: 14 }, // Impact
      { wch: 15 }, // Score
      { wch: 18 }, // Severity Level
      { wch: 45 }, // Mitigation
      { wch: 15 }, // Status
      { wch: 20 }  // Owner
    ];

    exportToExcel(formattedRows, "Risk Register Log", `Project_Risk_Register_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbRisks.map(risk => {
      const riskLevel = getRiskLevel(risk.score);
      const severityColor = risk.score >= 15 ? "C0392B" : risk.score >= 9 ? "D35400" : risk.score >= 5 ? "F39C12" : "27AE60";
      
      return {
        id: risk.id,
        title: risk.title,
        details: [
          { label: "Current Lifecycle Status", value: risk.status, isMeta: true },
          { label: "Assigned Tracker Owner", value: risk.owner || "Unassigned", isMeta: true },
          { label: "Risk Severity Level", value: `${riskLevel.label} (Composite Score: ${risk.score})`, color: severityColor },
          { label: "Threat Probability Vector", value: `${risk.probability} out of 5` },
          { label: "Downstream Impact Severity", value: `${risk.impact} out of 5` },
          { label: "Risk Event Description", value: risk.description || "No qualitative analysis provided." },
          { label: "Active Mitigation Strategy & Contingency Plan", value: risk.mitigation || "No preventative strategy currently defined." }
        ]
      };
    });

    exportToWordBrief("Project Vulnerability & Risk Register Assessment Brief", activeProject, structuredItems, `Risk_Register_Executive_Brief_${activeProject}`);
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    setFormData({
      ...formData,
      description: "Risk Event: [Event/Condition] may occur, causing [Negative Outcome/Delay] to the project.",
      mitigation: "Preventative Action: [What to do now to reduce probability].\nContingency Plan: [What to do if the risk actually happens]."
    });
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    setFormData({ id: "", title: "", description: "", probability: 3, impact: 3, mitigation: "", status: "Open", owner: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      description: item.description || "",
      probability: item.probability || 3,
      impact: item.impact || 3,
      mitigation: item.mitigation || "",
      status: item.status || "Open",
      owner: item.owner || ""
    });
    setIsFormOpen(true);
    setSelectedRisk(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  // Calculate RAG rating based on standard 5x5 matrix
  const getRiskLevel = (score: number) => {
    if (score >= 15) return { label: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200", border: "#EF4444" };
    if (score >= 9) return { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200", border: "#F97316" };
    if (score >= 5) return { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200", border: "#F59E0B" };
    return { label: "Low", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200", border: "#10B981" };
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Closed":
      case "Mitigated": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Realized": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200"; // Open
    }
  };

  const activeRisks = dbRisks.filter(r => r.status === "Open");
  const criticalCount = activeRisks.filter(r => r.score >= 15).length;
  const mitigatedCount = dbRisks.filter(r => r.status === "Mitigated" || r.status === "Closed").length;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Risk Register"
        sub={`Probability vs. Impact mapping for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><Download size={13} /> Word Brief</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log Risk
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Critical Risks (Active)</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{criticalCount}</div>
          </div>
          <AlertTriangle className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Active Risks</div>
            <div className="text-2xl font-bold">{activeRisks.length}</div>
          </div>
          <Activity className="text-blue-500 opacity-20" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Mitigated / Closed</div>
            <div className="text-2xl font-bold text-emerald-600">{mitigatedCount}</div>
          </div>
          <ShieldCheck className="text-emerald-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading risk register...</div>
      ) : dbRisks.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ShieldAlert size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Risks Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Identify threats early so you can plan mitigations.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Risk</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbRisks.map(risk => {
            const riskLevel = getRiskLevel(risk.score);
            
            return (
              <div 
                key={risk.id} 
                onClick={() => setSelectedRisk(risk)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
                style={{ borderTopColor: riskLevel.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">{risk.id}</Badge>
                  <Badge className={cn("text-[10px]", getStatusBadge(risk.status))}>{risk.status}</Badge>
                </div>
                
                <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{risk.title}</h3>
                
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded flex items-center justify-center font-bold text-sm", riskLevel.color)}>
                      {risk.score}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      <div>Score</div>
                      <div className="font-semibold">{riskLevel.label}</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-foreground bg-muted/30 p-2.5 rounded border border-border/50 line-clamp-3 mb-4 font-medium leading-relaxed flex-1">
                  {risk.description}
                </div>
                
                <div className="mt-auto flex justify-between items-center text-[10px] font-medium pt-3 border-t border-border">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <User size={12} /> {risk.owner || "Unassigned"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-full">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2">{selectedRisk.id}</Badge>
                <Badge className={getStatusBadge(selectedRisk.status)}>{selectedRisk.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedRisk, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedRisk.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedRisk(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{selectedRisk.title}</h2>
                
                {/* 5x5 Matrix Visualizer */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch mb-2">
                  <div className={cn("p-4 rounded-lg border flex-1 flex items-center gap-4", getRiskLevel(selectedRisk.score).color)}>
                    <div className="text-4xl font-black">{selectedRisk.score}</div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider">{getRiskLevel(selectedRisk.score).label} RISK</div>
                      <div className="text-xs opacity-80">Probability ({selectedRisk.probability}) × Impact ({selectedRisk.impact})</div>
                    </div>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-lg flex flex-col justify-center min-w-[150px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Risk Owner</span>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <User size={14} className="text-muted-foreground" /> {selectedRisk.owner || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/30 p-5 rounded-lg border border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-foreground">
                    <ShieldAlert size={14} className="text-amber-500" /> Risk Description
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRisk.description}
                  </div>
                </section>

                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-lg" />
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-emerald-700 dark:text-emerald-400">
                    <Target size={14} /> Mitigation Strategy
                  </h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRisk.mitigation || <span className="text-muted-foreground italic">No mitigation plan defined.</span>}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedRisk.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedRisk(null)}>Close</Btn>
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
                <AlertTriangle size={18} className="text-blue-500" /> {isEditMode ? "Edit Risk" : "Log New Risk"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load BA Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Risk Title</label>
                <input 
                  required autoFocus 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Scope Creep on Dashboard Module" 
                />
              </div>

              {/* 5x5 Risk Matrix Calculator */}
              <div className="bg-muted/20 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Risk Scoring Matrix</h3>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    Score: <Badge className={getRiskLevel(formData.probability * formData.impact).color}>{formData.probability * formData.impact}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex justify-between">
                      <span>Probability (1-5)</span> <span>{formData.probability}</span>
                    </label>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={formData.probability} onChange={e => setFormData({...formData, probability: parseInt(e.target.value)})} 
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>Rare (1)</span><span>Almost Certain (5)</span></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex justify-between">
                      <span>Impact (1-5)</span> <span>{formData.impact}</span>
                    </label>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={formData.impact} onChange={e => setFormData({...formData, impact: parseInt(e.target.value)})} 
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>Negligible (1)</span><span>Severe (5)</span></div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Risk Description</label>
                <textarea 
                  required rows={3}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="What is the event, and what is the consequence?" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Mitigation Strategy</label>
                <textarea 
                  required rows={3}
                  value={formData.mitigation} onChange={e => setFormData({...formData, mitigation: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="How are we preventing this or minimizing the impact?" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Owner (Who manages this?)</label>
                  <input 
                    value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Project Manager, Lead Dev" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Open</option>
                    <option>Mitigated</option>
                    <option>Realized</option>
                    <option>Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Risk")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}