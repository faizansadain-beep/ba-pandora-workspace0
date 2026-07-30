import { useState, useEffect, useMemo } from "react";
import { Plus, Download, ListChecks, CheckCircle2, XCircle, Clock, Edit, Trash2, X, Wand2, FileText, Beaker, Link2, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { BulkUploadBtn } from "./BulkUploadBtn";
import * as XLSX from 'xlsx';

export default function AcceptanceCriteriaView({ activeProject }: { activeProject: string }) {
  const [dbAc, setDbAc] = useState<any[]>([]);
  const [dbStories, setDbStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedAc, setSelectedAc] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    id: "",
    ac_id: "",
    story_reference: "",
    title: "",
    format: "BDD",
    given_context: "",
    when_action: "",
    then_result: "",
    checklist_description: "",
    status: "Pending"
  });

  async function fetchData() {
    setLoading(true);
    
    // Fetch both ACs and User Stories for the dropdown
    const [acRes, storiesRes] = await Promise.all([
      supabase.from('acceptance_criteria').select('*').eq('project_name', activeProject).order('ac_id', { ascending: true }),
      supabase.from('user_stories').select('id, story_id, title').eq('project_name', activeProject).order('story_id', { ascending: true })
    ]);

    if (acRes.data) setDbAc(acRes.data);
    if (storiesRes.data) setDbStories(storiesRes.data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [activeProject]);

  // --- SEARCH FILTER ---
  const filteredAc = useMemo(() => {
    if (!searchQuery) return dbAc;
    const lowerQ = searchQuery.toLowerCase();
    return dbAc.filter(a => 
      (a.ac_id && a.ac_id.toLowerCase().includes(lowerQ)) ||
      (a.title && a.title.toLowerCase().includes(lowerQ)) ||
      (a.story_reference && a.story_reference.toLowerCase().includes(lowerQ)) ||
      (a.given_context && a.given_context.toLowerCase().includes(lowerQ)) ||
      (a.when_action && a.when_action.toLowerCase().includes(lowerQ)) ||
      (a.then_result && a.then_result.toLowerCase().includes(lowerQ)) ||
      (a.checklist_description && a.checklist_description.toLowerCase().includes(lowerQ))
    );
  }, [dbAc, searchQuery]);

  // --- EXPORTS ---
  const exportToExcel = () => {
    if (filteredAc.length === 0) return alert("No Criteria to export.");
    const exportData = filteredAc.map(a => ({
      "AC ID": a.ac_id,
      "Title": a.title,
      "Story Link": a.story_reference || "Unlinked",
      "Format": a.format,
      "Given": a.format === 'BDD' ? a.given_context : "",
      "When": a.format === 'BDD' ? a.when_action : "",
      "Then": a.format === 'BDD' ? a.then_result : "",
      "Description": a.format === 'Checklist' ? a.checklist_description : "",
      "Status": a.status
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Acceptance Criteria");
    XLSX.writeFile(wb, `${activeProject}_Acceptance_Criteria.xlsx`);
  };

  const exportToWord = () => {
    if (filteredAc.length === 0) return alert("No Criteria to export.");
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Acceptance Criteria Export</title></head><body style='font-family: Arial, sans-serif;'>";
    const footer = "</body></html>";
    let html = `<h1 style='color: #333;'>Acceptance Criteria - ${activeProject}</h1>`;

    filteredAc.forEach(a => {
      html += `<div style='margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;'>`;
      html += `<h2 style='color: #2563eb;'>[${a.ac_id}] ${a.title}</h2>`;
      html += `<p><b>Story Link:</b> ${a.story_reference || "Unlinked"} | <b>Status:</b> ${a.status}</p>`;

      if (a.format === 'BDD') {
        html += `<div style='margin-left: 20px;'>`;
        html += `<p style='margin: 2px 0;'><b>Given:</b> ${a.given_context || "N/A"}</p>`;
        html += `<p style='margin: 2px 0;'><b>When:</b> ${a.when_action || "N/A"}</p>`;
        html += `<p style='margin: 2px 0;'><b>Then:</b> ${a.then_result || "N/A"}</p>`;
        html += `</div>`;
      } else {
        html += `<div style='margin-left: 20px; font-style: italic;'>`;
        html += `<p>${a.checklist_description ? a.checklist_description.replace(/\n/g, '<br/>') : "No description provided."}</p>`;
        html += `</div>`;
      }
      html += `</div>`;
    });

    const blob = new Blob(['\ufeff', header + html + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject}_Acceptance_Criteria.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- BULK UPLOAD HANDLER ---
  const handleBulkUpload = async (excelData: any[]) => {
    if (excelData.length === 0) return alert("The uploaded file is empty.");
    setIsUploading(true);

    const mappedData = excelData.map(row => ({
      id: `AC-${Math.floor(Math.random() * 900000)}`,
      ac_id: row['ac_id'] || `AC-${Math.floor(Math.random() * 90000)}`,
      story_reference: row['story_reference'] || '',
      title: row['title'] || 'Untitled Scenario',
      format: row['format'] || 'BDD',
      given_context: row['given_context'] || '',
      when_action: row['when_action'] || '',
      then_result: row['then_result'] || '',
      checklist_description: row['checklist_description'] || '',
      status: row['status'] || 'Pending',
      project_name: activeProject
    }));

    const { error } = await supabase.from('acceptance_criteria').insert(mappedData);

    if (error) {
      alert(`Upload failed: ${error.message}`);
    } else {
      alert(`Successfully uploaded ${mappedData.length} Acceptance Criteria!`);
      fetchData();
    }
    setIsUploading(false);
  };


  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `AC-${Math.floor(Math.random() * 90000)}`,
      ac_id: formData.ac_id,
      story_reference: formData.story_reference,
      title: formData.title,
      format: formData.format,
      given_context: formData.format === 'BDD' ? formData.given_context : null,
      when_action: formData.format === 'BDD' ? formData.when_action : null,
      then_result: formData.format === 'BDD' ? formData.then_result : null,
      checklist_description: formData.format === 'Checklist' ? formData.checklist_description : null,
      status: formData.status,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('acceptance_criteria').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('acceptance_criteria').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving AC:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchData();
      if (isEditMode && selectedAc) setSelectedAc(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this Acceptance Criteria?")) return;
    setDbAc(dbAc.filter(a => a.id !== id));
    setSelectedAc(null);
    const { error } = await supabase.from('acceptance_criteria').delete().eq('id', id);
    if (error) fetchData();
  }

  // --- BA Tool: Load Template ---
  function loadTemplate() {
    if (formData.format === 'BDD') {
      setFormData({
        ...formData,
        given_context: "a specific prerequisite or system state",
        when_action: "the user performs a specific action",
        then_result: "the system responds with a specific outcome"
      });
    } else {
      setFormData({
        ...formData,
        checklist_description: "1. The UI must display...\n2. The character limit is exactly...\n3. The calculation formula is..."
      });
    }
  }

  // --- Helpers ---
  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbAc.length + 101;
    const nextAcId = `AC-${nextNum}`;
    
    setFormData({ id: "", ac_id: nextAcId, story_reference: "", title: "", format: "BDD", given_context: "", when_action: "", then_result: "", checklist_description: "", status: "Pending" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({
      id: item.id,
      ac_id: item.ac_id,
      story_reference: item.story_reference || "",
      title: item.title,
      format: item.format || "BDD",
      given_context: item.given_context || "",
      when_action: item.when_action || "",
      then_result: item.then_result || "",
      checklist_description: item.checklist_description || "",
      status: item.status || "Pending"
    });
    setIsFormOpen(true);
    setSelectedAc(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getStatusVisuals = (status: string) => {
    switch(status) {
      case "Passed": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, border: "#10B981" };
      case "Failed": return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, border: "#EF4444" };
      default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock, border: "#94A3B8" }; // Pending
    }
  };

  const passedCount = filteredAc.filter(a => a.status === "Passed").length;
  const failedCount = filteredAc.filter(a => a.status === "Failed").length;
  const passRate = filteredAc.length > 0 ? Math.round((passedCount / filteredAc.length) * 100) : 0;

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Master Acceptance Criteria"
        sub={`Testable conditions and scenarios for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <BulkUploadBtn onUpload={handleBulkUpload} isLoading={isUploading} />
            <Btn variant="secondary" onClick={exportToWord}><FileText size={13} />Word</Btn>
            <Btn variant="secondary" onClick={exportToExcel}><Download size={13} />Excel</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Add Criteria
            </Btn>
          </div>
        }
      />

      {/* SEARCH BAR */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-[10px] text-muted-foreground" size={16} />
        <input 
          type="text" 
          placeholder="Search criteria by ID, title, or scenario definition..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-card border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-[10px] text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Passed Scenarios</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{passedCount}</div>
          </div>
          <CheckCircle2 className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Failed Scenarios</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{failedCount}</div>
          </div>
          <XCircle className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Current Pass Rate</div>
            <div className="text-2xl font-bold">{passRate}%</div>
          </div>
          <Beaker className="text-blue-500 opacity-20" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading acceptance criteria...</div>
      ) : filteredAc.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <ListChecks size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">{searchQuery ? "No criteria match your search." : "No Acceptance Criteria"}</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{searchQuery ? "Try adjusting your keywords." : "Define exactly what needs to happen for a feature to be considered 'Done'."}</p>
          {!searchQuery && (
            <div className="flex gap-2">
              <BulkUploadBtn onUpload={handleBulkUpload} isLoading={isUploading} />
              <Btn variant="primary" onClick={openNewForm}>Add First Scenario</Btn>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAc.map(ac => {
            const visuals = getStatusVisuals(ac.status);
            const StatusIcon = visuals.icon;

            return (
              <div 
                key={ac.id} 
                onClick={() => setSelectedAc(ac)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLeftColor: visuals.border }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{ac.ac_id}</Badge>
                    <Badge className="bg-muted text-muted-foreground font-mono text-[10px]"><Link2 size={10} className="mr-1"/> {ac.story_reference || "No Link"}</Badge>
                  </div>
                  <Badge className={cn("text-[10px] gap-1", visuals.color)}>
                    <StatusIcon size={10} /> {ac.status}
                  </Badge>
                </div>
                
                <h3 className="text-sm font-bold text-foreground leading-tight mb-3">{ac.title}</h3>
                
                <div className="flex-1">
                  {ac.format === 'BDD' ? (
                    <div className="space-y-1.5 text-[11px] bg-muted/20 p-3 rounded border border-border/50">
                      <div><span className="font-bold text-muted-foreground w-10 inline-block">Given</span> <span className="font-medium text-foreground">{ac.given_context}</span></div>
                      <div><span className="font-bold text-muted-foreground w-10 inline-block">When</span> <span className="font-medium text-foreground">{ac.when_action}</span></div>
                      <div><span className="font-bold text-muted-foreground w-10 inline-block">Then</span> <span className="font-medium text-foreground">{ac.then_result}</span></div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-foreground bg-muted/20 p-3 rounded border border-border/50 line-clamp-3 whitespace-pre-wrap">
                      {ac.checklist_description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          READ: DETAIL MODAL 
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedAc.ac_id}</Badge>
                <Badge className={cn("gap-1", getStatusVisuals(selectedAc.status).color)}>
                  {(() => {
                    const Icon = getStatusVisuals(selectedAc.status).icon;
                    return <Icon size={12} />;
                  })()} 
                  {selectedAc.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedAc, e)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                  <Edit size={16} />
                </button>
                <button onClick={(e) => handleDelete(selectedAc.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setSelectedAc(null); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{selectedAc.title}</h2>
                <div className="flex items-center gap-3">
                  <div className="bg-card border border-border px-3 py-1.5 rounded flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Format</span>
                    <span className="text-xs font-bold text-foreground">{selectedAc.format}</span>
                  </div>
                  <div className="bg-card border border-border px-3 py-1.5 rounded flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Story Link</span>
                    <span className="text-xs font-bold text-primary flex items-center gap-1"><Link2 size={12}/> {selectedAc.story_reference || "Unlinked"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <section className="bg-muted/10 p-6 rounded-xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground mb-4 border-b border-border pb-2">
                    <ListChecks size={16} /> Criteria / Scenario Definition
                  </h3>
                  
                  {selectedAc.format === 'BDD' ? (
                    <div className="space-y-4 text-base">
                      <div className="flex items-start gap-3">
                        <span className="font-black text-slate-400 w-16 text-right">GIVEN</span> 
                        <span className="font-medium text-foreground">{selectedAc.given_context}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-black text-amber-500 w-16 text-right">WHEN</span> 
                        <span className="font-medium text-foreground">{selectedAc.when_action}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-black text-emerald-500 w-16 text-right">THEN</span> 
                        <span className="font-bold text-foreground">{selectedAc.then_result}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedAc.checklist_description}
                    </div>
                  )}
                </section>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-xl shrink-0">
               <span className="text-xs text-muted-foreground">Project: {selectedAc.project_name}</span>
               <Btn variant="secondary" onClick={() => setSelectedAc(null)}>Close</Btn>
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
                <ListChecks size={18} className="text-blue-500" /> {isEditMode ? "Edit Criteria" : "Add Acceptance Criteria"}
              </h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded">
                    <Wand2 size={12} /> Load Format Template
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">AC ID</label>
                  <input 
                    required 
                    value={formData.ac_id} onChange={e => setFormData({...formData, ac_id: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scenario Title</label>
                  <input 
                    required autoFocus 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. Successful IdP Redirection" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 size={12}/> Story Link</label>
                  <select 
                    value={formData.story_reference} onChange={e => setFormData({...formData, story_reference: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">-- Select Story --</option>
                    {dbStories.map(s => (
                      <option key={s.id} value={`${s.story_id} - ${s.title}`}>{s.story_id} - {s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Format</label>
                  <select 
                    value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>BDD</option>
                    <option>Checklist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Testing Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option>Pending</option>
                    <option>Passed</option>
                    <option>Failed</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-muted/10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Criteria Definition</h3>
                
                {formData.format === 'BDD' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-xs font-bold text-slate-500 text-right">GIVEN</span>
                      <input required placeholder="initial context/state" value={formData.given_context} onChange={e => setFormData({...formData, given_context: e.target.value})} className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-xs font-bold text-amber-600 text-right">WHEN</span>
                      <input required placeholder="trigger action" value={formData.when_action} onChange={e => setFormData({...formData, when_action: e.target.value})} className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-xs font-bold text-emerald-600 text-right">THEN</span>
                      <input required placeholder="expected outcome" value={formData.then_result} onChange={e => setFormData({...formData, then_result: e.target.value})} className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <textarea 
                      required rows={5}
                      value={formData.checklist_description} onChange={e => setFormData({...formData, checklist_description: e.target.value})} 
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                      placeholder="Enter a bulleted list of conditions to satisfy..." 
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border shrink-0">
                <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Save Criteria")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
