import { useState, useEffect, useRef } from "react";
import { Plus, Download, Clock, Users, CheckSquare, FileText, Edit, Trash2, X, Wand2, Calendar, MessageSquare, Zap, Target, User, Bold, Italic, List } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function MeetingNotesView({ activeProject }: { activeProject: string }) {
  const [dbNotes, setDbNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Form States
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    meeting_date: new Date().toISOString().slice(0, 16),
    meeting_type: "Elicitation",
    attendees: "",
    content: "",
    key_decisions: "",
    action_items: [] as { id: string, task: string, owner: string, status: string }[]
  });

  async function fetchNotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('project_name', activeProject)
      .order('meeting_date', { ascending: false });

    if (error) console.error("Error fetching notes:", error);
    else if (data) setDbNotes(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, [activeProject]);

  // --- CRUD: CREATE & UPDATE ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `MTG-${Math.floor(Math.random() * 900) + 100}`,
      title: formData.title,
      meeting_date: new Date(formData.meeting_date).toISOString(),
      meeting_type: formData.meeting_type,
      attendees: formData.attendees,
      content: formData.content,
      key_decisions: formData.key_decisions,
      action_items: formData.action_items,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('meeting_notes').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('meeting_notes').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving note:", error);
      alert("Failed to save!");
    } else {
      closeForm();
      fetchNotes();
      if (isEditMode && selectedNote) setSelectedNote(payload);
    }
    setIsSubmitting(false);
  }

  // --- CRUD: DELETE ---
  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete these meeting notes?")) return;
    setDbNotes(dbNotes.filter(n => n.id !== id));
    setSelectedNote(null);
    const { error } = await supabase.from('meeting_notes').delete().eq('id', id);
    if (error) fetchNotes();
  }

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = dbNotes.map(note => {
      const actionsText = (note.action_items || [])
        .map((ai: any) => `[${ai.status}] ${ai.task} (${ai.owner || 'Unassigned'})`)
        .join("; ");

      return {
        "Meeting ID": note.id,
        "Subject / Title": note.title,
        "Meeting Date": note.meeting_date ? new Date(note.meeting_date).toLocaleDateString() : "",
        "Classification Type": note.meeting_type || "Elicitation",
        "Attendees List": note.attendees || "",
        "Key Decisions Made": note.key_decisions || "",
        "Extracted Action Items": actionsText,
        "Detailed Discussion Notes": note.content || ""
      };
    });

    const columnWidths = [
      { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 30 }, { wch: 40 }, { wch: 45 }, { wch: 50 }
    ];

    exportToExcel(formattedRows, "Elicitation Registry Log", `Meeting_Minutes_Log_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const structuredItems = dbNotes.map(note => {
      const formattedActions = (note.action_items || []).map((ai: any) => ({
        label: `Action [Status: ${ai.status}]`,
        value: `${ai.task} - Assigned to: ${ai.owner || 'Unassigned'}`
      }));

      return {
        id: note.id,
        title: note.title,
        details: [
          { label: "Session Classification", value: note.meeting_type, isMeta: true },
          { label: "Date & Time Anchor", value: note.meeting_date ? new Date(note.meeting_date).toLocaleString() : "TBD", isMeta: true },
          { label: "Confirmed Stakeholder Attendees", value: note.attendees || "None documented", isMeta: true },
          { label: "General Minutes Summary Transcript", value: note.content || "No detailed transcript compiled." },
          { label: "Core Business Decisions Captured", value: note.key_decisions || "No key architecture decisions logged.", color: "27AE60" },
          ...formattedActions
        ]
      };
    });

    exportToWordBrief("Elicitation Session Records & Core Decision Artifact Logs", activeProject, structuredItems, `Project_Meeting_Minutes_Brief_${activeProject}`);
  }

  // --- TEXT WRAP FORMATTING CONTROLLERS ---
  const injectFormatting = (syntaxStart: string, syntaxEnd: string = "") => {
    const txtArea = textareaRef.current;
    if (!txtArea) return;

    const startPos = txtArea.selectionStart;
    const endPos = txtArea.selectionEnd;
    const originalText = formData.content;
    const selectedText = originalText.substring(startPos, endPos);

    const replacement = syntaxStart + (selectedText || "text") + syntaxEnd;
    const modifiedContent = originalText.substring(0, startPos) + replacement + originalText.substring(endPos);

    setFormData({ ...formData, content: modifiedContent });
    
    setTimeout(() => {
      txtArea.focus();
      txtArea.setSelectionRange(startPos + syntaxStart.length, startPos + syntaxStart.length + (selectedText || "text").length);
    }, 50);
  };

  // --- BA Tools: Actions Engine ---
  const addActionItem = () => {
    setFormData({ 
      ...formData, 
      action_items: [...formData.action_items, { id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, task: "", owner: "", status: "Pending" }] 
    });
  };
  
  const updateActionItem = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      action_items: prev.action_items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeActionItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      action_items: prev.action_items.filter(item => item.id !== id)
    }));
  };

  const appendTimestamp = () => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const prefix = formData.content.length > 0 ? '\n' : '';
    setFormData(prev => ({ ...prev, content: `${prev.content}${prefix}[${timeString}] - ` }));
  };

  function loadElicitationTemplate() {
    setFormData(prev => ({
      ...prev,
      content: "AGENDA:\n1. Review Current State\n2. Identify Pain Points\n3. Define Target Objectives\n\nNOTES:\n- "
    }));
  }

  function openNewForm() {
    setIsEditMode(false);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setFormData({ id: "", title: "", meeting_date: now.toISOString().slice(0, 16), meeting_type: "Elicitation", attendees: "", content: "", key_decisions: "", action_items: [] });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    const d = new Date(item.meeting_date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    
    setFormData({
      id: item.id,
      title: item.title,
      meeting_date: d.toISOString().slice(0, 16),
      meeting_type: item.meeting_type || "Elicitation",
      attendees: item.attendees || "",
      content: item.content || "",
      key_decisions: item.key_decisions || "",
      action_items: item.action_items || []
    });
    setIsFormOpen(true);
    setSelectedNote(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case "Workshop": return "bg-violet-100 text-violet-700 border-violet-200";
      case "Review / Sign-off": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Daily Standup": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const totalMeetings = dbNotes.length;
  const allActionItems = dbNotes.flatMap(n => n.action_items || []);
  const pendingActions = allActionItems.filter(ai => ai.status !== "Done").length;
  const totalDecisions = dbNotes.filter(n => n.key_decisions && n.key_decisions.trim() !== "").length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Meeting Notes & Decisions"
        sub={`Elicitation records and actionable outcomes for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}><Download size={14} /> Excel</Btn>
            <Btn variant="secondary" onClick={handleWordExport}><FileText size={14} /> Word Brief</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={14} /> Log Meeting
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="p-4 flex items-center justify-between border-border shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-black tracking-wider mb-1">Total Meetings</div>
            <div className="text-2xl font-black text-foreground">{totalMeetings}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-amber-200/60 bg-amber-50/50 dark:bg-amber-900/10 shadow-sm">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 uppercase font-black tracking-wider mb-1">Pending Actions</div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{pendingActions}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-200/50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <CheckSquare size={20} />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-black tracking-wider mb-1">Decisions Logged</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalDecisions}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Zap size={20} />
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-mono">Synchronizing meeting records...</div>
      ) : dbNotes.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed bg-muted/10 shadow-none">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageSquare size={28} className="text-muted-foreground/60" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Meetings Logged</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-sm leading-relaxed">Centralize your elicitation sessions, stakeholder interviews, and technical workshops in one place.</p>
          <Btn variant="primary" onClick={openNewForm}><Plus size={14}/> Log First Meeting</Btn>
        </Card>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {dbNotes.map(note => {
              const pendingForNote = (note.action_items || []).filter((ai: any) => ai.status !== "Done").length;
              const hasDecisions = note.key_decisions && note.key_decisions.trim() !== "";

              return (
                <div 
                  key={note.id} 
                  onClick={() => setSelectedNote(note)}
                  className="bg-card border border-border/80 rounded-2xl p-5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col h-[280px] group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-muted text-muted-foreground font-mono text-[10px] px-2">{note.id}</Badge>
                    <Badge className={cn("text-[10px] px-2 font-bold", getTypeColor(note.meeting_type))}>{note.meeting_type}</Badge>
                  </div>
                  
                  <h3 className="text-sm font-black text-foreground leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors">{note.title}</h3>
                  
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground font-medium mb-4">
                    <span className="flex items-center gap-2"><Calendar size={13} className="text-primary/70"/> {new Date(note.meeting_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span className="flex items-center gap-2 truncate"><Users size={13} className="text-primary/70"/> {note.attendees || "No attendees listed"}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50 line-clamp-2 flex-1 whitespace-pre-wrap font-medium">
                    {note.content || <span className="italic opacity-60">No transcript provided...</span>}
                  </div>
                  
                  <div className="flex-shrink-0 flex gap-2 pt-4 mt-auto">
                    {pendingForNote > 0 && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold px-2"><CheckSquare size={10} className="mr-1.5"/> {pendingForNote} Action{pendingForNote !== 1 ? 's' : ''}</Badge>}
                    {hasDecisions && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold px-2"><Target size={10} className="mr-1.5"/> Decisions</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* READ: DETAIL MODAL */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-muted text-muted-foreground font-mono px-2.5 py-1 text-xs">{selectedNote.id}</Badge>
                <Badge className={cn("text-xs font-bold px-2.5 py-1", getTypeColor(selectedNote.meeting_type))}>{selectedNote.meeting_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => openEditForm(selectedNote, e)} className="px-3 py-1.5 text-xs font-bold text-foreground bg-background hover:bg-muted border rounded-md transition-colors flex items-center gap-1.5">
                  <Edit size={13} /> Edit Note
                </button>
                <button onClick={(e) => handleDelete(selectedNote.id, e)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button onClick={() => setSelectedNote(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors bg-muted/50 hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
              
              {/* Left Col: Transcript & Meta */}
              <div className="flex-1 p-6 lg:p-8 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border/60 custom-scrollbar space-y-6 bg-background">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-4 leading-tight">{selectedNote.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border/50">
                    <span className="flex items-center gap-2"><Calendar size={14} className="text-primary"/> {new Date(selectedNote.meeting_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</span>
                    <span className="flex items-center gap-2"><Users size={14} className="text-primary"/> {selectedNote.attendees || "No attendees listed"}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                    <FileText size={15} className="text-primary" /> Meeting Transcript & Notes
                  </h3>
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed p-5 rounded-xl bg-card border border-border shadow-sm min-h-[300px]">
                    {selectedNote.content || <span className="italic text-muted-foreground">No transcript provided.</span>}
                  </div>
                </div>
              </div>

              {/* Right Col: Actions & Decisions */}
              <div className="w-full lg:w-[400px] bg-muted/10 p-6 lg:p-8 overflow-y-auto custom-scrollbar shrink-0 flex flex-col gap-8">
                
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Target size={15} /> Key Decisions
                  </h3>
                  <div className="text-sm text-foreground bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 whitespace-pre-wrap font-medium leading-relaxed">
                    {selectedNote.key_decisions || <span className="text-muted-foreground italic text-xs">No formal decisions were documented for this session.</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <CheckSquare size={15} /> Action Items
                    </h3>
                    {selectedNote.action_items?.length > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] px-2">{selectedNote.action_items.filter((a: any) => a.status !== 'Done').length} Pending</Badge>
                    )}
                  </div>
                  
                  {(!selectedNote.action_items || selectedNote.action_items.length === 0) ? (
                    <div className="text-xs text-muted-foreground italic bg-card p-4 rounded-xl border border-border shadow-sm text-center">No action items assigned.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedNote.action_items.map((ai: any) => (
                        <div key={ai.id} className={cn("bg-card p-3.5 rounded-xl border flex gap-3 transition-colors", ai.status === 'Done' ? "border-emerald-200/50 opacity-60 bg-emerald-50/20" : "border-border shadow-sm")}>
                          <div className="mt-0.5 shrink-0">
                            {ai.status === 'Done' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <div className="w-4 h-4 rounded border-2 border-muted-foreground/40" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={cn("text-xs font-bold leading-tight mb-1.5 break-words", ai.status === 'Done' ? "line-through text-muted-foreground" : "text-foreground")}>{ai.task}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]"><User size={10}/> {ai.owner || "Unassigned"}</span>
                              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", 
                                ai.status === 'Pending' ? "text-amber-600 bg-amber-50" : 
                                ai.status === 'In Progress' ? "text-blue-600 bg-blue-50" :
                                ai.status === 'Done' ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                              )}>
                                {ai.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6 animate-fade-in">
          <div className="bg-card w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <MessageSquare size={18} className="text-blue-500" /> {isEditMode ? "Edit Meeting Notes" : "Log New Elicitation Session"}
              </h2>
              <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="p-1.5 text-muted-foreground hover:text-foreground bg-background hover:bg-muted rounded-md transition-colors border border-transparent hover:border-border shadow-xs">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Top Section: Meta Info */}
                <div className="p-6 border-b border-border/60 space-y-5 bg-muted/5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Meeting Subject / Title</label>
                      <input 
                        required autoFocus 
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="w-full px-3 py-2 text-sm font-bold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                        placeholder="e.g. Stakeholder Interview - Auth Flow" 
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Meeting Type</label>
                      <select 
                        value={formData.meeting_type} onChange={e => setFormData({...formData, meeting_type: e.target.value})} 
                        className="w-full px-3 py-2 text-sm font-semibold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors"
                      >
                        <option>Elicitation</option>
                        <option>Workshop</option>
                        <option>Review / Sign-off</option>
                        <option>Daily Standup</option>
                        <option>Ad-hoc Discussion</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Date & Time</label>
                      <input 
                        type="datetime-local" required
                        value={formData.meeting_date} onChange={e => setFormData({...formData, meeting_date: e.target.value})} 
                        className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Attendees</label>
                      <input 
                        value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value})} 
                        className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-primary transition-colors" 
                        placeholder="e.g. John Doe, IT Security Team" 
                      />
                    </div>
                  </div>
                </div>

                {/* Main Content Split */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left: Transcript Editor */}
                  <div className="lg:col-span-7 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <label className="block text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2"><FileText size={14}/> General Notes & Transcript</label>
                      
                      {/* Editor Toolbar */}
                      <div className="flex items-center gap-1 border border-border/80 rounded-md bg-muted/30 p-1 shadow-sm">
                        <button type="button" onClick={() => injectFormatting("**", "**")} className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors" title="Bold Text"><Bold size={13}/></button>
                        <button type="button" onClick={() => injectFormatting("*", "*")} className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors" title="Italic Text"><Italic size={13}/></button>
                        <button type="button" onClick={() => injectFormatting("- ", "")} className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors" title="Bullet List Line"><List size={13}/></button>
                        <div className="w-px h-4 bg-border/80 mx-1" />
                        <button type="button" onClick={loadElicitationTemplate} className="text-[10px] bg-background hover:bg-muted text-foreground px-2 py-1 rounded transition-colors flex items-center gap-1 font-bold border border-border/50"><Wand2 size={11}/> Template</button>
                        <button type="button" onClick={appendTimestamp} className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors font-bold flex items-center gap-1 border border-primary/10"><Clock size={11}/> Timestamp</button>
                      </div>
                    </div>
                    <textarea 
                      required
                      ref={textareaRef}
                      value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} 
                      className="w-full flex-1 min-h-[300px] px-4 py-3 text-sm bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary font-medium custom-scrollbar resize-y shadow-inner" 
                      placeholder="Start typing your session notes here..." 
                    />
                  </div>

                  {/* Right: Deliverables */}
                  <div className="lg:col-span-5 flex flex-col gap-8">
                    
                    {/* Key Decisions */}
                    <div className="flex flex-col">
                      <label className="block text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2"><Target size={14}/> Key Decisions Made</label>
                      <textarea 
                        value={formData.key_decisions} onChange={e => setFormData({...formData, key_decisions: e.target.value})} 
                        className="w-full min-h-[120px] px-4 py-3 text-sm bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl focus:outline-none focus:border-emerald-500 custom-scrollbar resize-y font-medium" 
                        placeholder="1. Approved auth route architecture...&#10;2. Deferred reporting dashboard..." 
                      />
                    </div>

                    {/* Action Items Engine */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2"><CheckSquare size={14}/> Action Items</label>
                      </div>
                      
                      <div className="space-y-4">
                        {formData.action_items.map((ai) => (
                          <div key={ai.id} className="bg-card border border-border/80 rounded-xl p-4 relative group shadow-sm flex flex-col gap-3 transition-colors hover:border-amber-500/30">
                            <input 
                              placeholder="What needs to be done?" 
                              value={ai.task} 
                              onChange={e => updateActionItem(ai.id, "task", e.target.value)}
                              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors pr-8"
                            />
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-1">
                                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input 
                                  placeholder="Owner" 
                                  value={ai.owner} 
                                  onChange={e => updateActionItem(ai.id, "owner", e.target.value)}
                                  className="w-full bg-muted/40 border border-border/60 rounded-md pl-8 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-primary transition-colors"
                                />
                              </div>
                              <select 
                                value={ai.status} 
                                onChange={e => updateActionItem(ai.id, "status", e.target.value)}
                                className="w-full sm:w-[130px] shrink-0 bg-muted/40 border border-border/60 rounded-md px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-colors"
                              >
                                <option>Pending</option>
                                <option>In Progress</option>
                                <option>Done</option>
                                <option>Blocked</option>
                              </select>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeActionItem(ai.id)} 
                              className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded p-1.5 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove Action Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        {/* 💡 NEW: Placeholder Add Item Card */}
                        <button 
                          type="button" 
                          onClick={addActionItem} 
                          className="w-full py-4 border-2 border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all gap-1.5"
                        >
                          <Plus size={16} />
                          <span className="text-xs font-bold uppercase tracking-wider">Add Action Item</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-between items-center p-5 border-t border-border bg-muted/5 shrink-0">
                <span className="text-xs text-muted-foreground italic font-medium hidden sm:inline-block">* Ensure action items are clearly assigned before saving.</span>
                <div className="flex gap-3 w-full sm:w-auto justify-end">
                  <Btn variant="secondary" onClick={(e: any) => { e.stopPropagation(); closeForm(); }} type="button">Cancel</Btn>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {isSubmitting ? "Committing Record..." : (isEditMode ? "Save Changes" : "Save Session Notes")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}