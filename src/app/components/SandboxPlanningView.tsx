import { useState, useEffect, useMemo } from "react";
import { Plus, Download, FileText, Edit, Trash2, X, Search, Filter, Layers, Box, Cpu, ShieldCheck, Database, Globe, Users, Target, Activity, ListTree, ChevronRight, LayoutTemplate, ArrowLeft, Menu, CornerDownRight, Maximize2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import * as XLSX from 'xlsx';

// --- AUTO-ID GENERATORS & BLANK TEMPLATES ---
const genId = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 9000) + 1000}`;

const createEmptyCapability = () => ({ id: genId("CAP"), name: "" });
const createEmptyRule = () => ({ id: genId("BR"), rule: "" });
const createEmptyReq = () => ({ id: genId("FR"), req: "" });
const createEmptyUat = () => ({ id: genId("UAT"), test: "" });

const createEmptySubFeature = () => ({
  name: "", purpose: "", database: "", acceptance_criteria: "",
  capabilities: [createEmptyCapability()],
  business_rules: [createEmptyRule()],
  functional_reqs: [createEmptyReq()],
  validation_rules: [""],
  user_roles: [""],
  apis: [""],
  uat_scenarios: [createEmptyUat()]
});

const createEmptyFeature = () => ({
  feature_id: genId("FEA"), feature_name: "", description: "", entry_point: "", exit_point: "", 
  process_steps: [""],
  sub_features: [createEmptySubFeature()]
});

export default function SandboxPlanningView({ activeProject }: { activeProject: string }) {
  const [dbSandbox, setDbSandbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View States: 'list' | 'workspace'
  const [activeScreen, setActiveScreen] = useState<'list' | 'workspace'>('list');
  const [workspaceMode, setWorkspaceMode] = useState<'read' | 'edit'>('read');
  const [formData, setFormData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // List View Inline Expansion State
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  // Split-Screen Layout States
  const [selectedNode, setSelectedNode] = useState<{ type: string, fIdx?: number, sIdx?: number }>({ type: 'epic' });
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Filters
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPhase, setFilterPhase] = useState("All");
  const [filterSow, setFilterSow] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('sandbox_planning').select('*').eq('project_name', activeProject).order('created_at', { ascending: false });
    if (!error && data) setDbSandbox(data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeProject]);

  const filteredData = useMemo(() => {
    return dbSandbox.filter(item => {
      const matchSearch = searchQuery === "" || item.epic_name.toLowerCase().includes(searchQuery.toLowerCase()) || item.epic_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPhase = filterPhase === "All" || item.phase === filterPhase;
      const matchSow = filterSow === "All" || item.sow === filterSow;
      const matchStatus = filterStatus === "All" || item.status === filterStatus;
      return matchSearch && matchPhase && matchSow && matchStatus;
    });
  }, [dbSandbox, searchQuery, filterPhase, filterSow, filterStatus]);

  // --- EXPORTS ---
  const exportToExcel = () => {
    if (filteredData.length === 0) return alert("No data to export.");
    const exportData = filteredData.map(item => ({
      "Epic ID": item.epic_id,
      "Epic Name": item.epic_name,
      "Module": item.module,
      "SOW": item.sow,
      "Phase": item.phase,
      "Sprint": item.sprint,
      "Status": item.status,
      "Priority": item.priority,
      "Objective": item.business_objective,
      "Features Count": (typeof item.features_data === 'string' ? JSON.parse(item.features_data) : item.features_data)?.length || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sandbox Matrix");
    XLSX.writeFile(workbook, `${activeProject}_Sandbox_Mapping.xlsx`);
  };

  const exportToWord = () => {
    if (filteredData.length === 0) return alert("No data to export.");
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Sandbox Export</title></head><body style='font-family: Arial, sans-serif;'>";
    const footer = "</body></html>";
    let html = `<h1 style='color: #333;'>Sandbox Mapping - ${activeProject}</h1>`;
    
    filteredData.forEach(item => {
      html += `<h2 style='background-color: #f3f4f6; padding: 10px;'>${item.epic_id}: ${item.epic_name}</h2>`;
      html += `<ul><li><b>SOW:</b> ${item.sow}</li><li><b>Phase:</b> ${item.phase}</li><li><b>Module:</b> ${item.module}</li><li><b>Objective:</b> ${item.business_objective}</li></ul>`;
      
      const features = typeof item.features_data === 'string' ? JSON.parse(item.features_data) : item.features_data;
      if (features && features.length > 0) {
        features.forEach((f: any) => {
          html += `<h3>Feature: ${f.feature_id || "ID"} - ${f.feature_name || "Name"}</h3>`;
          html += `<p><i>${f.description || "No description"}</i></p>`;
        });
      }
      html += `<hr/>`;
    });
    
    const blob = new Blob(['\ufeff', header + html + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject}_Sandbox.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CRUD & WORKSPACE NAVIGATION ---
  async function handleSave() {
    setIsSubmitting(true);
    const payload = { ...formData, project_name: activeProject };
    let error;

    if (formData.id) {
      const res = await supabase.from('sandbox_planning').update(payload).eq('id', formData.id);
      error = res.error;
    } else {
      const res = await supabase.from('sandbox_planning').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert(`Error saving: ${error.message}`);
    } else {
      await fetchData();
      setWorkspaceMode('read');
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete this entire Sandbox Epic?`)) return;
    await supabase.from('sandbox_planning').delete().eq('id', id);
    fetchData();
    closeWorkspace();
  }

  function openNewWorkspace() {
    setFormData({ 
      epic_id: genId("EPC"), epic_name: "", module: "", sow: "SOW 1", phase: "Foundation", sprint: "Sprint 1", priority: "High", status: "Draft", source: "", business_objective: "", business_value: "", stakeholders: "", dependencies: "", 
      features_data: [createEmptyFeature()]
    });
    setWorkspaceMode('edit');
    setSelectedNode({ type: 'epic' });
    setActiveScreen('workspace');
  }

  function openWorkspace(item: any, mode: 'read' | 'edit') {
    let parsedFeatures = item.features_data;
    if (typeof parsedFeatures === 'string') parsedFeatures = JSON.parse(parsedFeatures);
    if (!parsedFeatures || parsedFeatures.length === 0) parsedFeatures = [createEmptyFeature()];

    parsedFeatures = parsedFeatures.map((f: any) => {
      if (!f.process_steps) {
        f.process_steps = f.business_process 
          ? f.business_process.split('->').map((s: string) => s.trim()).filter(Boolean) 
          : [""];
      }
      if (f.process_steps.length === 0) f.process_steps = [""];
      return f;
    });

    setFormData({ ...item, features_data: parsedFeatures });
    setWorkspaceMode(mode);
    setSelectedNode({ type: 'epic' });
    setActiveScreen('workspace');
  }

  function closeWorkspace() {
    setActiveScreen('list');
    setFormData(null);
    setShowMobileSidebar(false);
  }

  // --- PROGRESSIVE FORM MUTATIONS ---
  const updateEpic = (field: string, value: string) => setFormData({ ...formData, [field]: value });
  const updateFeature = (fIdx: number, field: string, value: string) => {
    const updated = [...formData.features_data];
    updated[fIdx][field] = value;
    setFormData({ ...formData, features_data: updated });
  };
  const addFeatureArrayItem = (fIdx: number, arrayName: string, emptyVal: any) => {
    const updated = [...formData.features_data];
    if (!updated[fIdx][arrayName]) updated[fIdx][arrayName] = [];
    updated[fIdx][arrayName].push(emptyVal);
    setFormData({ ...formData, features_data: updated });
  };
  const updateFeatureArrayItem = (fIdx: number, arrayName: string, itemIdx: number, value: string) => {
    const updated = [...formData.features_data];
    updated[fIdx][arrayName][itemIdx] = value;
    setFormData({ ...formData, features_data: updated });
  };
  const removeFeatureArrayItem = (fIdx: number, arrayName: string, itemIdx: number) => {
    const updated = [...formData.features_data];
    updated[fIdx][arrayName].splice(itemIdx, 1);
    setFormData({ ...formData, features_data: updated });
  };
  const updateSubFeature = (fIdx: number, sIdx: number, field: string, value: string) => {
    const updated = [...formData.features_data];
    updated[fIdx].sub_features[sIdx][field] = value;
    setFormData({ ...formData, features_data: updated });
  };
  const addArrayItem = (fIdx: number, sIdx: number, arrayName: string, emptyVal: any) => {
    const updated = [...formData.features_data];
    if (!updated[fIdx].sub_features[sIdx][arrayName]) updated[fIdx].sub_features[sIdx][arrayName] = [];
    updated[fIdx].sub_features[sIdx][arrayName].push(emptyVal);
    setFormData({ ...formData, features_data: updated });
  };
  const updateArrayItem = (fIdx: number, sIdx: number, arrayName: string, itemIdx: number, field: string | null, value: string) => {
    const updated = [...formData.features_data];
    if (field === null) updated[fIdx].sub_features[sIdx][arrayName][itemIdx] = value;
    else updated[fIdx].sub_features[sIdx][arrayName][itemIdx][field] = value;
    setFormData({ ...formData, features_data: updated });
  };
  const removeArrayItem = (fIdx: number, sIdx: number, arrayName: string, itemIdx: number) => {
    const updated = [...formData.features_data];
    updated[fIdx].sub_features[sIdx][arrayName].splice(itemIdx, 1);
    setFormData({ ...formData, features_data: updated });
  };

  // --- RENDERERS ---
  if (activeScreen === 'workspace' && formData) {
    const isEdit = workspaceMode === 'edit';
    const features = formData.features_data || [];

    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background relative overflow-hidden">
        {/* Workspace Toolbar */}
        <div className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={closeWorkspace} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"><ArrowLeft size={16}/></button>
            <div className="h-4 w-px bg-border hidden md:block"></div>
            <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="md:hidden p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md"><Menu size={16}/></button>
            <Badge className="font-mono bg-indigo-100 text-indigo-700 hidden sm:inline-flex">{formData.epic_id}</Badge>
            <span className="font-bold text-sm truncate max-w-[150px] sm:max-w-xs">{formData.epic_name || "Untitled Epic"}</span>
            {isEdit && <Badge className="bg-amber-100 text-amber-700 border-none animate-pulse hidden md:inline-flex">Edit Mode</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Btn variant="secondary" onClick={() => setWorkspaceMode('read')} className="hidden sm:flex">Cancel</Btn>
                <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow-sm disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Matrix"}
                </button>
              </>
            ) : (
              <Btn variant="primary" onClick={() => setWorkspaceMode('edit')}><Edit size={13}/> Edit Matrix</Btn>
            )}
          </div>
        </div>

        {/* Split Screen Layout */}
        <div className="flex flex-1 min-h-0 relative">
          
          {/* LEFT PANEL: ARCHITECTURE TREE MAPPING */}
          {showMobileSidebar && (
            <div 
              className="absolute inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" 
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          <div className={cn(
            "w-full md:w-80 border-r bg-muted/10 flex flex-col shrink-0 absolute md:relative z-30 h-full transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none",
            showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}>
            <div className="p-3 border-b text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center justify-between bg-muted/20">
              <span className="flex items-center gap-1.5"><ListTree size={14}/> Architecture Map</span>
              <button onClick={() => setShowMobileSidebar(false)} className="md:hidden p-1 hover:text-foreground"><X size={14}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-card md:bg-transparent">
              <button 
                onClick={() => { setSelectedNode({ type: 'epic' }); setShowMobileSidebar(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors", selectedNode.type === 'epic' ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800" : "hover:bg-muted border border-transparent")}
              >
                <Layers size={16} className={selectedNode.type === 'epic' ? "text-indigo-600" : "text-muted-foreground"}/>
                <span className="truncate flex-1">{formData.epic_name || "Epic Details"}</span>
              </button>

              <div className="pl-4 mt-2 space-y-1.5 border-l-2 border-muted">
                {features.map((feat: any, fIdx: number) => (
                  <div key={fIdx}>
                    <button 
                      onClick={() => { setSelectedNode({ type: 'feature', fIdx }); setShowMobileSidebar(false); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors", selectedNode.type === 'feature' && selectedNode.fIdx === fIdx ? "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800" : "hover:bg-muted border border-transparent")}
                    >
                      <Box size={14} className={selectedNode.type === 'feature' && selectedNode.fIdx === fIdx ? "text-blue-600" : "text-muted-foreground"}/>
                      <span className="truncate flex-1 text-xs">{feat.feature_name || `Feature ${fIdx+1}`}</span>
                    </button>
                    
                    <div className="pl-6 mt-1 space-y-1">
                      {feat.sub_features?.map((sub: any, sIdx: number) => (
                        <button 
                          key={sIdx}
                          onClick={() => { setSelectedNode({ type: 'subfeature', fIdx, sIdx }); setShowMobileSidebar(false); }}
                          className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-xs transition-colors border", selectedNode.type === 'subfeature' && selectedNode.fIdx === fIdx && selectedNode.sIdx === sIdx ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-bold border-emerald-200 dark:border-emerald-800" : "hover:bg-muted text-muted-foreground border-transparent")}
                        >
                          <Cpu size={12} className={selectedNode.type === 'subfeature' && selectedNode.fIdx === fIdx && selectedNode.sIdx === sIdx ? "text-emerald-600" : "text-muted-foreground/50"}/>
                          <span className="truncate flex-1">{sub.name || `Sub ${sIdx+1}`}</span>
                        </button>
                      ))}
                      
                      {isEdit && (
                        <button 
                          onClick={() => { const updated = [...features]; updated[fIdx].sub_features.push(createEmptySubFeature()); setFormData({...formData, features_data: updated}); setSelectedNode({ type: 'subfeature', fIdx, sIdx: updated[fIdx].sub_features.length - 1 }); }}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-left text-[10px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors mt-1"
                        >
                          <Plus size={10}/> Add Sub-Feature
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isEdit && (
                  <button 
                    onClick={() => { const updated = [...features]; updated.push(createEmptyFeature()); setFormData({...formData, features_data: updated}); setSelectedNode({ type: 'feature', fIdx: updated.length - 1 }); }}
                    className="w-full flex items-center gap-1.5 px-3 py-2 mt-3 border-2 border-dashed rounded-lg text-left text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <Plus size={12}/> Map New Feature
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: DYNAMIC CONTENT EDITOR / VIEWER */}
          <div className="flex-1 overflow-y-auto bg-card custom-scrollbar w-full">
            {/* EPIC NODE */}
            {selectedNode.type === 'epic' && (
              <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in space-y-6">
                <div className="flex items-center gap-2 mb-6 text-indigo-600"><Layers size={24}/> <h2 className="text-xl md:text-2xl font-black">Epic Configuration</h2></div>
                
                {isEdit ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Epic ID</label><input required value={formData.epic_id} onChange={e => updateEpic('epic_id', e.target.value)} className="w-full px-3 py-2 text-sm bg-muted border rounded" /></div>
                      <div className="md:col-span-3"><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Epic Name</label><input required value={formData.epic_name} onChange={e => updateEpic('epic_name', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Module</label><input value={formData.module} onChange={e => updateEpic('module', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">SOW</label><input value={formData.sow} onChange={e => updateEpic('sow', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Phase</label><input value={formData.phase} onChange={e => updateEpic('phase', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Status</label><select value={formData.status} onChange={e => updateEpic('status', e.target.value)} className="w-full px-3 py-2 text-sm border rounded"><option>Draft</option><option>In Review</option><option>Approved</option><option>Delivered</option></select></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Business Objective</label><textarea rows={4} value={formData.business_objective} onChange={e => updateEpic('business_objective', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Business Value</label><textarea rows={4} value={formData.business_value} onChange={e => updateEpic('business_value', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/10 p-5 rounded-xl border">
                      <div><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">Module</span><div className="text-sm font-medium">{formData.module || "-"}</div></div>
                      <div><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">SOW</span><div className="text-sm font-medium">{formData.sow || "-"}</div></div>
                      <div><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">Phase</span><div className="text-sm font-medium">{formData.phase || "-"}</div></div>
                      <div><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">Status</span><Badge>{formData.status}</Badge></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border p-5 rounded-xl bg-card shadow-sm"><span className="text-[10px] font-black text-muted-foreground uppercase block mb-2">Business Objective</span><p className="text-sm leading-relaxed">{formData.business_objective || "Not defined"}</p></div>
                      <div className="border p-5 rounded-xl bg-card shadow-sm"><span className="text-[10px] font-black text-muted-foreground uppercase block mb-2">Business Value</span><p className="text-sm leading-relaxed">{formData.business_value || "Not defined"}</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FEATURE NODE */}
            {selectedNode.type === 'feature' && selectedNode.fIdx !== undefined && (
              <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2 text-blue-600"><Box size={24}/> <h2 className="text-xl md:text-2xl font-black">Feature Definition</h2></div>
                  {isEdit && <button onClick={() => { const updated = [...features]; updated.splice(selectedNode.fIdx!, 1); setFormData({...formData, features_data: updated}); setSelectedNode({ type: 'epic' }); }} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 self-start sm:self-auto"><Trash2 size={12}/> Delete Feature</button>}
                </div>

                {isEdit ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Feature ID</label><input value={features[selectedNode.fIdx].feature_id} onChange={e => updateFeature(selectedNode.fIdx!, 'feature_id', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div className="md:col-span-3"><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Feature Name</label><input value={features[selectedNode.fIdx].feature_name} onChange={e => updateFeature(selectedNode.fIdx!, 'feature_name', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                    </div>
                    <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Description</label><textarea rows={3} value={features[selectedNode.fIdx].description} onChange={e => updateFeature(selectedNode.fIdx!, 'description', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Entry Point</label><input value={features[selectedNode.fIdx].entry_point} onChange={e => updateFeature(selectedNode.fIdx!, 'entry_point', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Exit Point</label><input value={features[selectedNode.fIdx].exit_point} onChange={e => updateFeature(selectedNode.fIdx!, 'exit_point', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                    </div>

                    <div className="bg-muted/10 border p-5 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Activity size={12}/> Steps to Perform</label>
                        <button type="button" onClick={() => addFeatureArrayItem(selectedNode.fIdx!, 'process_steps', "")} className="text-[10px] text-primary font-bold flex items-center gap-1"><Plus size={10}/> Add Step</button>
                      </div>
                      <div className="space-y-2">
                        {features[selectedNode.fIdx].process_steps?.map((step: string, i: number) => (
                          <div key={i} className="flex gap-2 items-center group">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                            <input value={step} onChange={e => updateFeatureArrayItem(selectedNode.fIdx!, 'process_steps', i, e.target.value)} placeholder={`E.g., User completes step ${i + 1}...`} className="flex-1 px-3 py-2 text-sm border rounded" />
                            <button type="button" onClick={()=>removeFeatureArrayItem(selectedNode.fIdx!, 'process_steps', i)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border-b pb-6">
                      <Badge className="font-mono mb-3 bg-blue-50 text-blue-700 border-none px-2 py-1">{features[selectedNode.fIdx].feature_id || "No ID"}</Badge>
                      <h3 className="text-2xl md:text-3xl font-bold">{features[selectedNode.fIdx].feature_name || "Unnamed Feature"}</h3>
                      <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">{features[selectedNode.fIdx].description || "No description provided."}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/10 border p-5 rounded-xl"><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1"><Target size={12} className="inline mr-1"/> Entry Point</span><div className="text-sm font-medium">{features[selectedNode.fIdx].entry_point || "-"}</div></div>
                      <div className="bg-muted/10 border p-5 rounded-xl"><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1"><Target size={12} className="inline mr-1"/> Exit Point</span><div className="text-sm font-medium">{features[selectedNode.fIdx].exit_point || "-"}</div></div>
                    </div>

                    {features[selectedNode.fIdx].process_steps?.some((s:string) => s) ? (
                      <div className="bg-background border p-6 rounded-xl shadow-sm">
                        <span className="text-[10px] font-black text-muted-foreground uppercase block mb-5 flex items-center gap-1"><Activity size={12}/> Process Flow / Steps to Perform</span>
                        <div className="flex flex-wrap items-center gap-y-4 gap-x-2">
                          {features[selectedNode.fIdx].process_steps.filter((s:string) => s).map((step: string, i: number, arr: any[]) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex items-center gap-2 bg-muted/20 border border-border/50 px-3 py-1.5 rounded-full shadow-sm">
                                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                                <span className="text-xs md:text-sm font-bold pr-1">{step}</span>
                              </div>
                              {i < arr.length - 1 && <ChevronRight size={16} className="text-muted-foreground/50 mx-1"/>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                       <div className="bg-muted/10 border p-5 rounded-xl"><span className="text-[10px] font-black text-muted-foreground uppercase block mb-1"><Activity size={12} className="inline mr-1"/> Steps to Perform</span><div className="text-sm font-medium text-muted-foreground italic">No steps defined.</div></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUB-FEATURE NODE */}
            {selectedNode.type === 'subfeature' && selectedNode.fIdx !== undefined && selectedNode.sIdx !== undefined && (
              <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2 text-emerald-600"><Cpu size={24}/> <h2 className="text-xl md:text-2xl font-black">Sub-Feature Definition</h2></div>
                  {isEdit && <button onClick={() => { const updated = [...features]; updated[selectedNode.fIdx!].sub_features.splice(selectedNode.sIdx!, 1); setFormData({...formData, features_data: updated}); setSelectedNode({ type: 'feature', fIdx: selectedNode.fIdx }); }} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 self-start sm:self-auto"><Trash2 size={12}/> Delete Sub-Feature</button>}
                </div>

                {isEdit ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Sub-Feature Name</label><input value={features[selectedNode.fIdx].sub_features[selectedNode.sIdx].name} onChange={e => updateSubFeature(selectedNode.fIdx!, selectedNode.sIdx!, 'name', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Database Table</label><input value={features[selectedNode.fIdx].sub_features[selectedNode.sIdx].database} onChange={e => updateSubFeature(selectedNode.fIdx!, selectedNode.sIdx!, 'database', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>
                    </div>
                    <div><label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Purpose</label><textarea rows={2} value={features[selectedNode.fIdx].sub_features[selectedNode.sIdx].purpose} onChange={e => updateSubFeature(selectedNode.fIdx!, selectedNode.sIdx!, 'purpose', e.target.value)} className="w-full px-3 py-2 text-sm border rounded" /></div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 bg-muted/5 p-4 md:p-6 rounded-xl border border-dashed">
                      
                      {/* Capabilities */}
                      <div className="bg-card border shadow-sm p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black uppercase text-muted-foreground">Capabilities</label><button type="button" onClick={() => addArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'capabilities', createEmptyCapability())} className="text-[10px] text-primary font-bold flex items-center gap-1"><Plus size={10}/> Add</button></div>
                        <div className="space-y-2">
                          {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].capabilities?.map((c:any, i:number) => (
                            <div key={i} className="flex gap-2 group">
                              <input value={c.id} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'capabilities', i, 'id', e.target.value)} placeholder="ID" className="w-20 md:w-24 px-2 py-1.5 text-xs border rounded font-mono font-bold text-muted-foreground"/>
                              <input value={c.name} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'capabilities', i, 'name', e.target.value)} placeholder="Capability Name" className="flex-1 px-3 py-1.5 text-sm border rounded"/>
                              <button type="button" onClick={()=>removeArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'capabilities', i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Business Rules */}
                      <div className="bg-amber-50/30 dark:bg-amber-900/10 border border-amber-200/50 shadow-sm p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black uppercase text-amber-600">Business Rules</label><button type="button" onClick={() => addArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'business_rules', createEmptyRule())} className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Plus size={10}/> Add</button></div>
                        <div className="space-y-2">
                          {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].business_rules?.map((r:any, i:number) => (
                            <div key={i} className="flex gap-2 group">
                              <input value={r.id} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'business_rules', i, 'id', e.target.value)} placeholder="ID" className="w-20 md:w-24 px-2 py-1.5 text-xs border border-amber-200 bg-amber-50 font-mono font-bold text-amber-700 rounded"/>
                              <input value={r.rule} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'business_rules', i, 'rule', e.target.value)} placeholder="Rule logic..." className="flex-1 px-3 py-1.5 text-sm border border-amber-200 bg-amber-50 rounded"/>
                              <button type="button" onClick={()=>removeArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'business_rules', i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Functional Reqs */}
                      <div className="bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-200/50 shadow-sm p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black uppercase text-emerald-600">Functional Reqs</label><button type="button" onClick={() => addArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'functional_reqs', createEmptyReq())} className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Plus size={10}/> Add</button></div>
                        <div className="space-y-2">
                          {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].functional_reqs?.map((r:any, i:number) => (
                            <div key={i} className="flex gap-2 group">
                              <input value={r.id} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'functional_reqs', i, 'id', e.target.value)} placeholder="ID" className="w-20 md:w-24 px-2 py-1.5 text-xs border border-emerald-200 bg-emerald-50 font-mono font-bold text-emerald-700 rounded"/>
                              <input value={r.req} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'functional_reqs', i, 'req', e.target.value)} placeholder="System shall..." className="flex-1 px-3 py-1.5 text-sm border border-emerald-200 bg-emerald-50 rounded"/>
                              <button type="button" onClick={()=>removeArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'functional_reqs', i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* UAT Scenarios */}
                      <div className="bg-purple-50/30 dark:bg-purple-900/10 border border-purple-200/50 shadow-sm p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black uppercase text-purple-600">UAT Scenarios</label><button type="button" onClick={() => addArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'uat_scenarios', createEmptyUat())} className="text-[10px] text-purple-600 font-bold flex items-center gap-1"><Plus size={10}/> Add</button></div>
                        <div className="space-y-2">
                          {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].uat_scenarios?.map((u:any, i:number) => (
                            <div key={i} className="flex gap-2 group">
                              <input value={u.id} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'uat_scenarios', i, 'id', e.target.value)} placeholder="ID" className="w-20 md:w-24 px-2 py-1.5 text-xs border border-purple-200 bg-purple-50 font-mono font-bold text-purple-700 rounded"/>
                              <input value={u.test} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'uat_scenarios', i, 'test', e.target.value)} placeholder="Scenario title..." className="flex-1 px-3 py-1.5 text-sm border border-purple-200 bg-purple-50 rounded"/>
                              <button type="button" onClick={()=>removeArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'uat_scenarios', i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* APIs */}
                      <div className="bg-card border shadow-sm p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black uppercase text-muted-foreground">APIs & Endpoints</label><button type="button" onClick={() => addArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'apis', "")} className="text-[10px] text-primary font-bold flex items-center gap-1"><Plus size={10}/> Add</button></div>
                        <div className="space-y-2">
                          {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].apis?.map((a:any, i:number) => (
                            <div key={i} className="flex gap-2 group">
                              <input value={a} onChange={e => updateArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'apis', i, null, e.target.value)} placeholder="e.g. POST /api/v1/..." className="flex-1 px-3 py-1.5 text-sm border rounded font-mono"/>
                              <button type="button" onClick={()=>removeArrayItem(selectedNode.fIdx!, selectedNode.sIdx!, 'apis', i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Acceptance Criteria */}
                      <div className="bg-card border shadow-sm p-4 rounded-xl">
                        <label className="block text-[10px] font-black text-blue-600 uppercase mb-3">Acceptance Criteria</label>
                        <textarea rows={4} value={features[selectedNode.fIdx].sub_features[selectedNode.sIdx].acceptance_criteria} onChange={e => updateSubFeature(selectedNode.fIdx!, selectedNode.sIdx!, 'acceptance_criteria', e.target.value)} className="w-full px-3 py-2 text-sm border border-blue-200 bg-blue-50/30 rounded" placeholder="Given... When... Then..." />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* View Mode Data Representation */}
                    <div className="xl:col-span-2 border-b pb-6">
                      <h3 className="text-2xl md:text-3xl font-bold">{features[selectedNode.fIdx].sub_features[selectedNode.sIdx].name || "Unnamed Sub-Feature"}</h3>
                      <p className="text-base text-muted-foreground mt-2 max-w-3xl leading-relaxed">{features[selectedNode.fIdx].sub_features[selectedNode.sIdx].purpose || "No purpose defined."}</p>
                    </div>

                    <div className="space-y-6">
                      {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].capabilities?.some((c:any)=>c.id || c.name) && (
                        <div className="bg-card border shadow-sm p-5 rounded-xl">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-3 border-b pb-2">Capabilities</span>
                          <ul className="text-sm space-y-2 font-medium">
                            {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].capabilities.map((c: any, i: number) => (c.id || c.name) && <li key={i} className="flex items-start gap-3"><Badge className="bg-muted font-mono px-2 py-0.5 border-none mt-0.5">{c.id || "?"}</Badge> <span>{c.name || "Untitled"}</span></li>)}
                          </ul>
                        </div>
                      )}
                      {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].business_rules?.some((r:any)=>r.id || r.rule) && (
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 p-5 rounded-xl shadow-sm">
                          <span className="text-[10px] font-black uppercase text-amber-700 block mb-3 border-b border-amber-200/50 pb-2">Business Rules</span>
                          <ul className="text-sm space-y-3 text-amber-900 dark:text-amber-400">
                            {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].business_rules.map((r: any, i: number) => (r.id || r.rule) && <li key={i} className="flex items-start gap-3"><Badge className="bg-amber-100 text-amber-800 font-mono px-2 py-0.5 border-none mt-0.5">{r.id || "?"}</Badge> <span>{r.rule || "Empty"}</span></li>)}
                          </ul>
                        </div>
                      )}
                      {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].functional_reqs?.some((r:any)=>r.id || r.req) && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 p-5 rounded-xl shadow-sm">
                          <span className="text-[10px] font-black uppercase text-emerald-700 block mb-3 border-b border-emerald-200/50 pb-2 flex items-center gap-1.5"><ShieldCheck size={14}/> Functional Requirements</span>
                          <ul className="text-sm space-y-3 text-emerald-900 dark:text-emerald-400">
                            {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].functional_reqs.map((r: any, i: number) => (r.id || r.req) && <li key={i} className="flex items-start gap-3"><Badge className="bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 border-none mt-0.5">{r.id || "?"}</Badge> <span>{r.req || "Empty"}</span></li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                       <div className="bg-slate-50 dark:bg-slate-900/50 border p-5 rounded-xl shadow-sm">
                        <span className="text-[9px] font-black uppercase text-muted-foreground block mb-2 flex items-center gap-1.5"><Database size={14}/> Database / Table</span>
                        <span className="text-sm font-mono font-bold px-2 py-1 bg-background border rounded">{features[selectedNode.fIdx].sub_features[selectedNode.sIdx].database || "-"}</span>
                      </div>

                      {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].apis?.some((a:string)=>a) && (
                        <div className="bg-card border shadow-sm p-5 rounded-xl">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-3 border-b pb-2 flex items-center gap-1.5"><Globe size={14}/> APIs & Endpoints</span>
                          <div className="flex flex-wrap gap-2">
                            {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].apis.map((a: string, i: number) => a && <Badge key={i} className="font-mono bg-purple-50 text-purple-700 border-purple-200 px-2 py-1">{a}</Badge>)}
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 p-5 rounded-xl shadow-sm">
                        <span className="text-[10px] font-black uppercase text-blue-700 block mb-3 border-b border-blue-200/50 pb-2">Acceptance Criteria</span>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 leading-relaxed whitespace-pre-wrap">{features[selectedNode.fIdx].sub_features[selectedNode.sIdx].acceptance_criteria || "None specified"}</p>
                      </div>

                      {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].uat_scenarios?.some((u:any)=>u.id || u.test) && (
                        <div className="bg-card border shadow-sm p-5 rounded-xl">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-3 border-b pb-2">UAT Scenarios</span>
                          <ul className="text-sm space-y-3 font-medium">
                            {features[selectedNode.fIdx].sub_features[selectedNode.sIdx].uat_scenarios.map((u: any, i: number) => (u.id || u.test) && <li key={i} className="flex items-start gap-3"><Badge className="bg-purple-100 text-purple-800 font-mono px-2 py-0.5 border-none mt-0.5">{u.id || "?"}</Badge> <span>{u.test || "Untitled"}</span></li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- DEFAULT LIST VIEW RENDERER ---
  return (
    <div className="p-4 md:p-6 space-y-5 relative w-full mx-auto h-[calc(100vh-4rem)] flex flex-col max-w-[1600px]">
      <SectionHeader
        title="Architecture Sandbox Mapping"
        sub={`Deep architectural planning and requirement structuring for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setIsFilterOpen(!isFilterOpen)} className={isFilterOpen ? "bg-muted" : ""}><Filter size={13} /> <span className="hidden sm:inline">Filter</span></Btn>
            <Btn variant="secondary" onClick={exportToWord} className="hidden sm:flex"><FileText size={13} />Word</Btn>
            <Btn variant="secondary" onClick={exportToExcel} className="hidden sm:flex"><Download size={13} />Excel</Btn>
            <Btn variant="primary" onClick={openNewWorkspace}><Plus size={13} />Create Epic</Btn>
          </div>
        }
      />

      {/* FILTER ACCORDION */}
      {isFilterOpen && (
        <Card className="p-4 bg-muted/20 border border-border shadow-sm shrink-0 -mt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Search</label>
              <Search className="absolute left-3 top-[26px] text-muted-foreground" size={14} />
              <input type="text" placeholder="ID or Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">SOW</label>
              <select value={filterSow} onChange={e => setFilterSow(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-border rounded-md">
                <option value="All">All SOWs</option><option>SOW 1</option><option>SOW 2</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Phase</label>
              <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-border rounded-md">
                <option value="All">All Phases</option><option>Foundation</option><option>Build</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-border rounded-md">
                <option value="All">All Statuses</option><option>Draft</option><option>In Review</option><option>Approved</option><option>Delivered</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* DATA LIST */}
      {loading ? ( <div className="flex-1 flex justify-center items-center text-sm font-mono text-muted-foreground">Loading Sandbox Data...</div> ) : 
      filteredData.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center border-dashed">
          <LayoutTemplate size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium">Sandbox is Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">No architectural mappings found.</p>
          <Btn variant="primary" onClick={openNewWorkspace}>Create First Epic</Btn>
        </Card>
      ) : (
        <Card className="flex-1 overflow-y-auto custom-scrollbar border p-0">
          <div className="divide-y divide-border">
            {filteredData.map(item => {
              const parsedFeatures = typeof item.features_data === 'string' ? JSON.parse(item.features_data) : (item.features_data || []);
              
              return (
                <div key={item.id} className="flex flex-col border-b last:border-0 group">
                  
                  {/* MAIN ROW */}
                  <div 
                    onClick={() => setExpandedListId(prev => prev === item.id ? null : item.id)}
                    className="p-4 hover:bg-muted/30 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg shrink-0"><LayoutTemplate size={20}/></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono font-bold">{item.epic_id}</span>
                          <Badge className="bg-muted text-muted-foreground text-[9px] border-none px-1.5">{item.module || "No Module"}</Badge>
                          <Badge className={cn("text-[9px] border-none px-1.5", item.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{item.status}</Badge>
                        </div>
                        <h4 className="text-sm font-bold text-foreground truncate">{item.epic_name || "Untitled Epic"}</h4>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 shrink-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/50">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">{item.sow} • {item.phase}</div>
                        <div className="text-xs font-medium mt-0.5">{parsedFeatures.length} Features Mapped</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openWorkspace(item, 'read'); }} title="Open Full Workspace" className="p-2 bg-muted/50 sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-indigo-600 transition-all rounded-md"><Maximize2 size={16}/></button>
                        <button onClick={(e) => { e.stopPropagation(); openWorkspace(item, 'edit'); }} title="Edit Matrix" className="p-2 bg-muted/50 sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all rounded-md"><Edit size={16}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, e); }} title="Delete Epic" className="p-2 bg-muted/50 sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all rounded-md"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  </div>

                  {/* INLINE TREE MAP EXPANSION */}
                  {expandedListId === item.id && (
                    <div className="border-t bg-muted/5 p-4 sm:px-8 space-y-4 cursor-default animate-fade-in" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 mb-2"><ListTree size={12}/> Architecture Summary</span>
                      {parsedFeatures.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic">No features mapped yet.</div>
                      ) : (
                        parsedFeatures.map((feat: any, fIdx: number) => (
                          <div key={fIdx} className="bg-card border rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <Box size={14} className="text-blue-500" /> 
                              <span className="font-mono text-muted-foreground text-xs">{feat.feature_id || "ID"}</span>
                              {feat.feature_name || "Unnamed Feature"}
                            </div>
                            
                            {feat.sub_features?.length > 0 && (
                              <div className="pl-4 border-l-2 border-border/50 ml-1.5 mt-2 space-y-2">
                                {feat.sub_features.map((sub: any, sIdx: number) => {
                                  // Calculate quick metrics for sub-feature
                                  const capsCount = sub.capabilities?.filter((c:any)=>c.id||c.name).length || 0;
                                  const rulesCount = sub.business_rules?.filter((r:any)=>r.id||r.rule).length || 0;
                                  const reqsCount = sub.functional_reqs?.filter((r:any)=>r.id||r.req).length || 0;
                                  const uatCount = sub.uat_scenarios?.filter((u:any)=>u.id||u.test).length || 0;

                                  return (
                                    <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                        <CornerDownRight size={12} className="text-muted-foreground/50"/>
                                        <Cpu size={12} className="text-emerald-500"/>
                                        <span className="text-foreground">{sub.name || "Unnamed Sub-feature"}</span>
                                      </div>
                                      <div className="flex items-center gap-2 ml-7 sm:ml-0 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                                        {capsCount > 0 && <Badge className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-none">{capsCount} Capabilities</Badge>}
                                        {rulesCount > 0 && <Badge className="text-[9px] px-1 py-0 bg-amber-50 text-amber-600 border-none">{rulesCount} Rules</Badge>}
                                        {reqsCount > 0 && <Badge className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-600 border-none">{reqsCount} Reqs</Badge>}
                                        {uatCount > 0 && <Badge className="text-[9px] px-1 py-0 bg-purple-50 text-purple-600 border-none">{uatCount} Tests</Badge>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      
                      <div className="pt-2 flex justify-end">
                        <Btn variant="primary" onClick={() => openWorkspace(item, 'read')} className="text-xs h-7 px-3 py-0"><Maximize2 size={12} className="mr-1"/> Open Full Workspace</Btn>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}