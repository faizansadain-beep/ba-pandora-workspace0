import { useState, useEffect } from "react";
import { Plus, Download, Bot, MessageSquare, AlertTriangle, CheckCircle, ShieldAlert, Cpu, Edit, Trash2, X, Wand2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function AIConversationTestingView({ activeProject }: { activeProject: string }) {
  const [dbAiTests, setDbAiTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    test_id: "",
    scenario_title: "",
    prompt_payload: "",
    expected_intent: "",
    actual_response: "",
    system_prompt_version: "v1.0",
    evaluation_metric: "Passed"
  });

  async function fetchAiTests() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('testing_ai_conversations')
        .select('*')
        .eq('project_name', activeProject)
        .order('test_id', { ascending: true });

      if (error) console.error("Error fetching AI logs:", error);
      else if (data) setDbAiTests(data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAiTests();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `AI-${Math.floor(Math.random() * 90000)}`,
      test_id: formData.test_id,
      scenario_title: formData.scenario_title,
      prompt_payload: formData.prompt_payload,
      expected_intent: formData.expected_intent,
      actual_response: formData.actual_response,
      system_prompt_version: formData.system_prompt_version,
      evaluation_metric: formData.evaluation_metric,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('testing_ai_conversations').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('testing_ai_conversations').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving AI conversation test:", error);
      alert(`Failed to save! Database error: ${error.message}`);
    } else {
      closeForm();
      fetchAiTests();
      if (isEditMode && selectedTest) setSelectedTest(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this conversational test evaluation?")) return;
    setDbAiTests(dbAiTests.filter(t => t.id !== id));
    setSelectedTest(null);
    const { error } = await supabase.from('testing_ai_conversations').delete().eq('id', id);
    if (error) fetchAiTests();
  }

  function loadTemplate() {
    setFormData({
      ...formData,
      prompt_payload: "System Context Prompt:\n[User execution phrase]\n\nVariables Evaluated:\nTenant Context: active\nPermissions Profile: User",
      expected_intent: "System must strictly route to baseline schema structures and suppress access to downstream sibling containers."
    });
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbAiTests.length + 101;
    setFormData({ id: "", test_id: `AI-TC-${nextNum}`, scenario_title: "", prompt_payload: "", expected_intent: "", actual_response: "", system_prompt_version: "v1.0", evaluation_metric: "Passed" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedTest(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getMetricBadge = (metric: string) => {
    switch (metric) {
      case "Passed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Hallucinated": return "bg-red-100 text-red-700 border-red-200";
      case "Guardrail Triggered": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200"; // Poor Context
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="AI Conversation Evaluation"
        sub={`Baseline prompts, track agent response validation runs, and monitor hallucinations for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export LLM Matrix</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Evaluate Prompt
            </Btn>
          </>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Passed Evaluations</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {dbAiTests.filter(t => t.evaluation_metric === 'Passed').length}
            </div>
          </div>
          <CheckCircle className="text-emerald-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Hallucination Anomalies</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dbAiTests.filter(t => t.evaluation_metric === 'Hallucinated').length}
            </div>
          </div>
          <AlertTriangle className="text-red-500 opacity-80" size={32} />
        </Card>
        <Card className="p-4 flex items-center justify-between border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-900">
          <div>
            <div className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-1">Guardrail Activations</div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {dbAiTests.filter(t => t.evaluation_metric === 'Guardrail Triggered').length}
            </div>
          </div>
          <ShieldAlert className="text-purple-500 opacity-80" size={32} />
        </Card>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading AI conversation ledger...</div>
      ) : dbAiTests.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <Bot size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Chat Scenarios Evaluated</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Baseline user prompts and validate generative output rules.</p>
          <Btn variant="secondary" onClick={openNewForm}>Evaluate First Prompt</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbAiTests.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setSelectedTest(chat)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-t-4"
              style={{ borderTopColor: chat.evaluation_metric === 'Passed' ? '#10B981' : chat.evaluation_metric === 'Hallucinated' ? '#EF4444' : '#A855F7' }}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{chat.test_id}</Badge>
                <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border-none", getMetricBadge(chat.evaluation_metric))}>{chat.evaluation_metric}</Badge>
              </div>
              
              <h3 className="text-base font-bold text-foreground leading-tight mb-2 truncate">{chat.scenario_title}</h3>
              
              <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mb-3">
                <Cpu size={12} className="text-primary/70" /> System Prompt Ref: {chat.system_prompt_version}
              </div>

              <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border border-border/50 line-clamp-2 italic mb-1 flex-1">
                "Prompt: {chat.prompt_payload}"
              </div>
            </div>
          ))}
        </div>
      )}

      {/* READ MODAL */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedTest.test_id}</Badge>
                <Badge className={cn("font-bold px-2 border-none", getMetricBadge(selectedTest.evaluation_metric))}>{selectedTest.evaluation_metric}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedTest, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedTest.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedTest(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Model Version: {selectedTest.system_prompt_version}</span>
                <h2 className="text-lg font-bold text-foreground leading-snug">{selectedTest.scenario_title}</h2>
              </div>

              <section className="bg-muted/40 border p-3 rounded-lg">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5"><MessageSquare size={13}/> User Input Prompt</h3>
                <div className="text-xs font-mono font-medium text-foreground bg-background p-2 rounded border">{selectedTest.prompt_payload}</div>
              </section>

              <section className="bg-blue-50/20 border border-blue-200 p-3.5 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-1">Expected Functional Intent</h3>
                <div className="text-sm font-medium text-foreground">{selectedTest.expected_intent}</div>
              </section>

              <section className={cn("p-4 border rounded-lg", selectedTest.evaluation_metric === 'Hallucinated' ? "bg-red-50/20 border-red-200" : "bg-emerald-50/20 border-emerald-200")}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Bot size={14} className={selectedTest.evaluation_metric === 'Hallucinated' ? "text-red-600" : "text-emerald-600"}/>
                  Actual Generative AI Response
                </h3>
                <div className="text-xs font-mono font-medium text-foreground whitespace-pre-wrap leading-relaxed bg-background/50 p-2 rounded border border-border/40">{selectedTest.actual_response}</div>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedTest(null)}>Close Audit Panel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Bot size={18} className="text-blue-500" /> Log Conversational Evaluation</h2>
              <div className="flex items-center gap-3">
                {!isEditMode && (
                  <button onClick={loadTemplate} type="button" className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded"><Wand2 size={12} /> Load Eval Frame</button>
                )}
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Test ID</label>
                    <input required value={formData.test_id} onChange={e => setFormData({...formData, test_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Scenario Title</label>
                    <input required autoFocus value={formData.scenario_title} onChange={e => setFormData({...formData, scenario_title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md" placeholder="e.g. Prompt injection injection attempt via user hash" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">System Prompt Version</label>
                    <input required value={formData.system_prompt_version} onChange={e => setFormData({...formData, system_prompt_version: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-mono" placeholder="e.g. v2.4-hotfix" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Evaluation Quality Metric</label>
                    <select value={formData.evaluation_metric} onChange={e => setFormData({...formData, evaluation_metric: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                      <option value="Passed">Passed (Valid Response)</option>
                      <option value="Hallucinated">Hallucinated (Fabricated Context)</option>
                      <option value="Guardrail Triggered">Guardrail Triggered (Safety Suppressed)</option>
                      <option value="Poor Context">Poor Context (Vague / Unhelpful)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">User Prompt Input Payload</label>
                  <textarea required rows={3} value={formData.prompt_payload} onChange={e => setFormData({...formData, prompt_payload: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md font-mono" placeholder="Paste the specific user query used to test the LLM agent node..." />
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1.5">Expected System Intent Response</label>
                  <textarea required rows={2} value={formData.expected_intent} onChange={e => setFormData({...formData, expected_intent: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed" placeholder="Describe the expected business intent routing or content filtering markers..." />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1.5">Actual AI Model Response Output</label>
                  <textarea required rows={4} value={formData.actual_response} onChange={e => setFormData({...formData, actual_response: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md font-mono leading-relaxed" placeholder="Paste the actual generative text output array thrown by the conversational interface..." />
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0 bg-muted/10 flex justify-end gap-2">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Locking..." : "Log AI Evaluation Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}