import { useState, useEffect } from "react";
import { Plus, Download, Bug, ShieldAlert, AlertCircle, Play, FileText, CheckCircle2, Edit, Trash2, X, Wand2, ListTree, UserCircle2, MonitorSmartphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import * as XLSX from 'xlsx';

export default function DefectsView({ activeProject }: { activeProject: string }) {
  const [dbDefects, setDbDefects] = useState<any[]>([]);
  const [dbTestCases, setDbTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedDefect, setSelectedDefect] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    id: "", defect_id: "", title: "", associated_test_case: "", severity: "Medium", priority: "P2", description: "", steps_to_reproduce: "", status: "New", source: "QA"
  });

  async function fetchDefects() {
    setLoading(true);
    try {
      const [qaRes, uatRes, caseRes, testersRes] = await Promise.all([
        supabase.from('testing_defects').select('*').eq('project_name', activeProject).order('defect_id', { ascending: true }),
        supabase.from('uat_defects').select('*').eq('project_name', activeProject).order('created_at', { ascending: false }),
        supabase.from('testing_cases').select('id, test_id, title').eq('project_name', activeProject).order('test_id', { ascending: true }),
        supabase.from('uat_testers').select('id, tester_name').eq('project_name', activeProject)
      ]);

      let combinedDefects: any[] = [];

      // Map Internal QA Defects
      if (qaRes.data) {
        combinedDefects = [...combinedDefects, ...qaRes.data.map(d => ({
          ...d, 
          source: 'QA',
          display_id: d.defect_id,
          display_title: d.title
        }))];
      }

      // Map External UAT Defects
      if (uatRes.data) {
        const testers = testersRes.data || [];
        combinedDefects = [...combinedDefects, ...uatRes.data.map(d => {
          const testerName = testers.find(t => t.id === d.tester_id)?.tester_name || d.tester_id;
          return {
            ...d,
            source: 'UAT',
            display_id: d.id, // UAT IDs are like BUG-XXXX
            display_title: `${d.feature || d.feature_affected} Issue`,
            tester_name: testerName,
            priority: 'UAT',
            associated_test_case: 'External User Finding'
          }
        })];
      }

      setDbDefects(combinedDefects);
      if (caseRes.data) setDbTestCases(caseRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDefects();
  }, [activeProject]);

  // --- EXPORT LOGIC ---
  const exportToExcel = () => {
    if (dbDefects.length === 0) return alert("No defects to export.");
    
    // Map data to a clean format for Excel
    const exportData = dbDefects.map(def => ({
      "Defect ID": def.display_id,
      "Source": def.source,
      "Title": def.display_title,
      "Severity": def.severity,
      "Status": def.status,
      "Priority": def.priority || "N/A",
      "Tester / Test Case": def.source === 'UAT' ? def.tester_name : def.associated_test_case,
      "Description": def.actual_behavior || def.actual_result || def.description || "",
      "Steps to Reproduce": def.steps_to_reproduce || def.steps_performed || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Defects Ledger");
    XLSX.writeFile(workbook, `${activeProject}_Defects_Log.xlsx`);
  };

  const exportToWord = () => {
    if (dbDefects.length === 0) return alert("No defects to export.");

    // Create an MS Word compatible HTML Blob
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Defects Export</title></head><body style='font-family: Arial, sans-serif;'>";
    const footer = "</body></html>";
    
    let html = `<h1 style='color: #333;'>Defects Ledger - ${activeProject}</h1>`;
    html += "<table border='1' style='border-collapse: collapse; width: 100%; text-align: left; font-size: 12px;'>";
    html += "<tr style='background-color: #f3f4f6;'><th>ID</th><th>Source</th><th>Title</th><th>Severity</th><th>Status</th><th>Description</th></tr>";
    
    dbDefects.forEach(def => {
      const description = def.actual_behavior || def.actual_result || def.description || "";
      html += `<tr>
        <td style='padding: 8px;'>${def.display_id}</td>
        <td style='padding: 8px;'>${def.source}</td>
        <td style='padding: 8px;'>${def.display_title}</td>
        <td style='padding: 8px;'>${def.severity}</td>
        <td style='padding: 8px;'>${def.status}</td>
        <td style='padding: 8px;'>${description}</td>
      </tr>`;
    });
    html += "</table>";
    
    const sourceHTML = header + html + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject}_Defects_Log.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    let error;

    if (formData.source === 'UAT') {
      const { error: updateError } = await supabase.from('uat_defects')
        .update({ status: formData.status, severity: formData.severity })
        .eq('id', formData.id);
      error = updateError;
    } else {
      const payload = {
        id: isEditMode ? formData.id : `DEF-${Math.floor(Math.random() * 90000)}`,
        defect_id: formData.display_id,
        title: formData.display_title,
        associated_test_case: formData.associated_test_case,
        severity: formData.severity,
        priority: formData.priority,
        description: formData.description,
        steps_to_reproduce: formData.steps_to_reproduce,
        status: formData.status,
        project_name: activeProject
      };

      if (isEditMode) {
        const { error: updateError } = await supabase.from('testing_defects').update(payload).eq('id', formData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('testing_defects').insert([payload]);
        error = insertError;
      }
    }

    if (error) {
      console.error("Error saving defect log:", error);
      alert(`Failed to save! Database error: ${error.message}`);
    } else {
      closeForm();
      fetchDefects();
      setSelectedDefect(null);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, source: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete this ${source} defect record entirely from the ledger?`)) return;
    
    setDbDefects(dbDefects.filter(d => d.id !== id));
    setSelectedDefect(null);
    
    const table = source === 'UAT' ? 'uat_defects' : 'testing_defects';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) fetchDefects();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      steps_to_reproduce: "1. Navigate to target screen layout.\n2. Click element node payload.\n3. Observe unhandled system stack crash.",
      description: "Observed Behavior: [What occurred]\nExpected Behavior: [What specifications declared must map]"
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbDefects.filter(d => d.source === 'QA').length + 101;
    setFormData({ id: "", display_id: `DF-${nextNum}`, display_title: "", associated_test_case: "", severity: "Medium", priority: "P2", description: "", steps_to_reproduce: "", status: "New", source: "QA" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedDefect(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "Critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "High": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "Low": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <SectionHeader
        title="Unified Defect Resolution Ledger"
        sub={`Track internal QA bugs and external UAT findings mapped to validation runs for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={exportToWord}><FileText size={13} />Word</Btn>
            <Btn variant="secondary" onClick={exportToExcel}><Download size={13} />Excel</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Log QA Defect
            </Btn>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Active Blockers (Critical / High)</div>
            <div className="text-2xl font-black text-red-700 dark:text-red-400">
              {dbDefects.filter(d => (d.severity === 'Critical' || d.severity === 'High') && d.status !== 'Closed').length}
            </div>
          </div>
          <ShieldAlert className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">In Triage & Fix Runs</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {dbDefects.filter(d => d.status === 'New' || d.status === 'Assigned' || d.status === 'In Progress' || d.status === 'Open').length}
            </div>
          </div>
          <AlertCircle className="text-amber-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Ready / Resolved</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {dbDefects.filter(d => d.status === 'Ready for Retest' || d.status === 'Resolved').length}
            </div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-mono">Loading unified logs...</div>
      ) : dbDefects.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed">
          <Bug size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Defect Repository is Clean</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">No validation anomalies or active UAT blockers are logged.</p>
          <Btn variant="secondary" onClick={openNewForm}>Log First Defect</Btn>
        </Card>
      ) : (
        <Card className="flex-1 overflow-y-auto custom-scrollbar border border-border shadow-sm p-0">
          <div className="divide-y divide-border">
            {dbDefects.map(def => (
              <div 
                key={def.id} 
                onClick={() => setSelectedDefect(def)}
                className="p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:w-44 shrink-0">
                  <Bug className={def.source === 'UAT' ? "text-amber-500" : "text-red-500"} size={16} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs font-mono font-bold text-foreground">{def.display_id}</div>
                      <Badge className={cn("text-[8px] font-mono border-none px-1 py-0", def.source === 'UAT' ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700")}>{def.source}</Badge>
                    </div>
                    {def.source === 'UAT' ? (
                      <div className="text-[9px] text-muted-foreground mt-0.5 truncate flex items-center gap-1"><UserCircle2 size={10}/> {def.tester_name}</div>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground text-[8px] font-mono border-none px-1 py-0 mt-0.5">{def.priority}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">{def.display_title}</h4>
                  {def.source === 'QA' && def.associated_test_case && (
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1"><ListTree size={10}/> {def.associated_test_case.split(' - ')[0]}</span>
                  )}
                  {def.source === 'UAT' && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MonitorSmartphone size={10}/> {def.browser} / {def.device}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:w-52 justify-end">
                  <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border-none", getSeverityStyle(def.severity))}>{def.severity}</Badge>
                  <Badge className={cn("text-[10px] font-bold border", def.status === 'Open' || def.status === 'New' ? "bg-red-50 text-red-700 border-red-100" : "bg-blue-50 text-blue-700 border-blue-100")}>{def.status}</Badge>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditForm(def, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={14}/></button>
                    <button onClick={(e) => handleDelete(def.id, def.source, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* READ MODAL */}
      {selectedDefect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className={cn("font-mono px-2 border", selectedDefect.source === 'UAT' ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-primary/10 text-primary border-primary/20")}>{selectedDefect.display_id}</Badge>
                <Badge className={cn("font-bold px-2 border-none", getSeverityStyle(selectedDefect.severity))}>{selectedDefect.severity}</Badge>
                <Badge className="bg-blue-100 text-blue-700 font-bold px-2">{selectedDefect.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedDefect, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedDefect.id, selectedDefect.source, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedDefect(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  {selectedDefect.source === 'UAT' ? `Reported via External UAT by ${selectedDefect.tester_name}` : `Linked QA Failure Vector Point`}
                </span>
                <h2 className="text-lg font-bold text-foreground leading-snug">{selectedDefect.display_title}</h2>
              </div>

              {selectedDefect.source === 'UAT' ? (
                <>
                  <div className="flex gap-4">
                    <div className="bg-muted/30 border border-border/50 p-3 rounded-lg flex-1">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider block mb-1 text-[10px]">Environment Browser</span>
                      <div className="text-sm font-medium">{selectedDefect.browser}</div>
                    </div>
                    <div className="bg-muted/30 border border-border/50 p-3 rounded-lg flex-1">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider block mb-1 text-[10px]">Client Device</span>
                      <div className="text-sm font-medium">{selectedDefect.device}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                      <div className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-400 mb-1.5">Actual Behaviour (Issue)</div>
                      <div className="text-sm font-medium text-foreground whitespace-pre-wrap">{selectedDefect.actual_behavior || selectedDefect.actual_result || selectedDefect.description}</div>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">Expected Behaviour</div>
                      <div className="text-sm font-medium text-foreground whitespace-pre-wrap">{selectedDefect.expected_behavior || selectedDefect.expected_result}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-muted/30 border border-border/50 p-3 rounded-lg text-xs font-mono font-medium text-foreground">
                    <span className="font-sans font-bold text-muted-foreground uppercase tracking-wider block mb-0.5 text-[10px]">Associated Validation Step Case</span>
                    {selectedDefect.associated_test_case || "Independent Unmapped Node"}
                  </div>

                  <section className="bg-muted/10 border p-4 rounded-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><FileText size={12}/> Description</h3>
                    <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">{selectedDefect.description}</div>
                  </section>
                </>
              )}

              {selectedDefect.steps_to_reproduce && (
                <section className="bg-blue-50/20 border border-blue-200 p-4 rounded-lg">
                  <h3 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-2 flex items-center gap-1"><Play size={12}/> Steps to Reproduce</h3>
                  <div className="text-xs font-mono font-medium text-foreground whitespace-pre-wrap leading-relaxed bg-background/60 p-3 rounded border border-border/50">
                    {selectedDefect.steps_to_reproduce || selectedDefect.steps_performed}
                  </div>
                </section>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedDefect(null)}>Close Defect Details</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bug size={18} className={formData.source === 'UAT' ? "text-amber-500" : "text-red-500"} /> 
                {isEditMode ? `Edit ${formData.source} Defect Record` : "Log Internal QA Defect"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded"><Wand2 size={12} /> Load Matrix Frame</button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {formData.source === 'UAT' ? (
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border border-amber-200 dark:border-amber-900/30 rounded-lg space-y-4">
                    <p className="text-xs text-amber-800 dark:text-amber-400 font-bold mb-2">Note: Triage mode only. Original tester inputs (Description, Steps, Environment) cannot be altered to maintain reporting integrity.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5">Triage Severity</label>
                        <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                          <option>Critical</option>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5">Resolution Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold text-primary">
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                          <option>Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Defect Ref ID</label>
                        <input required value={formData.display_id} onChange={e => setFormData({...formData, display_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Defect Headline Title</label>
                        <input required autoFocus value={formData.display_title} onChange={e => setFormData({...formData, display_title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="e.g. Empty query submission causes screen crash" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Failed Test Case</label>
                        <select value={formData.associated_test_case} onChange={e => setFormData({...formData, associated_test_case: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md">
                          <option value="">-- Independent Defect --</option>
                          {dbTestCases.map(c => <option key={c.id} value={`${c.test_id} - ${c.title}`}>{c.test_id} - {c.title}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Severity</label>
                          <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md">
                            <option>Critical</option>
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                          <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md">
                            <option>P1</option>
                            <option>P2</option>
                            <option>P3</option>
                            <option>P4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                            <option>New</option>
                            <option>Assigned</option>
                            <option>In Progress</option>
                            <option>Ready for Retest</option>
                            <option>Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Defect Description Summary</label>
                      <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed" placeholder="Clearly outline the observed variance..." />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1.5">Steps to Reproduce Failure</label>
                      <textarea rows={4} value={formData.steps_to_reproduce} onChange={e => setFormData({...formData, steps_to_reproduce: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md font-mono text-xs leading-relaxed" placeholder="1. Set viewport context&#10;2. Fire request payload..." />
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : formData.source === 'UAT' ? "Update UAT Triage" : "Log QA Defect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
