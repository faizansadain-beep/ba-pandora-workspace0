import { useState, useEffect } from "react";
import { CheckSquare, UserCircle2, ShieldAlert, FileText, Download, ArrowLeft, ArrowRight, BookOpen, Settings, Activity, ClipboardCheck, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Lock, Bug, Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Card, Badge } from "./SharedUI";
import { exportToWordBrief } from "../../lib/exportUtils";

export default function UATTesterWorkspaceView({ activeProject }: { activeProject: string }) {
  // Identity & Routing State
  const [availableTesters, setAvailableTesters] = useState<any[]>([]);
  const [activeTesterId, setActiveTesterId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Data States
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  // Defect Modal State
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);
  const [defectForm, setDefectForm] = useState({
    associated_scenario: "", feature: "", browser: "Chrome", device: "Desktop (Windows)", severity: "Medium",
    steps: "1. \n2. \n3. ", expected: "", actual: ""
  });

  // Form States
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [setupChecklist, setSetupChecklist] = useState({ 
    login: false, profile: false, ai: false, kb: false, calendar: false, notifications: false, firstCall: false, dashboard: false 
  });
  
  const defaultSurvey = {
    usability_learning: 0, usability_navigation: 0, usability_features: 0, usability_onboarding: 0, usability_tasks: 0,
    val_problem: 0, val_calls: 0, val_time: 0, val_cx: 0, val_efficiency: 0,
    ai_natural: 0, ai_voice: 0, ai_understanding: 0, ai_accuracy: 0, ai_professional: 0, ai_friendly: 0, ai_answering: 0, ai_overall: 0,
    feat_setup: 0, feat_ai: 0, feat_kb: 0, feat_booking: 0, feat_dashboard: 0, feat_analytics: 0, feat_notifications: 0,
    rel_login: false, rel_ai_stop: false, rel_book_fail: false, rel_notif_fail: false, rel_dash_err: false, rel_ai_err: false, rel_perf: false, rel_desc: "",
    productionReady: "", commercial_intent: "", nps: -1, pricing: "", payment_preference: "",
    bestFeatures: "", least_valuable_features: "", painPoints: "", missingFeatures: "", favourite_feature: "", open_feedback: "", signature: ""
  };
  
  const [survey, setSurvey] = useState<any>(defaultSurvey);

  // --- INITIALIZATION ---
  useEffect(() => {
    async function fetchTesters() {
      const { data } = await supabase.from("uat_testers").select("*").eq("project_name", activeProject);
      if (data) setAvailableTesters(data);
    }
    fetchTesters();
  }, [activeProject]);

  async function loadWorkspace(testerId: string) {
    setLoading(true);

    // WIPE THE SLATE CLEAN EVERY TIME A TESTER LOADS
    setAgreedToTerms(false);
    setSetupChecklist({ login: false, profile: false, ai: false, kb: false, calendar: false, notifications: false, firstCall: false, dashboard: false });
    setSurvey(defaultSurvey);
    setFeedbackSaved(false);
    setCurrentStep(1);

    await supabase.rpc('seed_uat_scenarios', { p_project_name: activeProject, p_tester_id: testerId });
    const [scenRes, defRes, feedRes] = await Promise.all([
      supabase.from("uat_scenarios_progress").select("*").eq('tester_id', testerId).order('scenario_number'),
      supabase.from('uat_defects').select('*').eq('tester_id', testerId).order('created_at', { ascending: false }),
      supabase.from('uat_feedback').select('*').eq('tester_id', testerId).single()
    ]);
    
    if (scenRes.data) setScenarios(scenRes.data);
    if (defRes.data) setDefects(defRes.data);
    
    if (feedRes.data) {
      setFeedbackSaved(true);
      setAgreedToTerms(true);
      setSetupChecklist({ login: true, profile: true, ai: true, kb: true, calendar: true, notifications: true, firstCall: true, dashboard: true });
    }
    setLoading(false);
  }

  useEffect(() => { if (activeTesterId) loadWorkspace(activeTesterId); }, [activeTesterId]);

  // --- ACTIONS ---
  const handleScenarioUpdate = async (id: string, status: string) => {
    await supabase.from("uat_scenarios_progress").update({ status }).eq('id', id);
    setScenarios(scenarios.map(s => s.id === id ? { ...s, status } : s));
  };

  const submitDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDefect(true);
    const newDefectId = `BUG-${Math.floor(Math.random() * 90000)}`;
    
    const payload = {
      id: newDefectId,
      project_name: activeProject,
      tester_id: activeTesterId!,
      associated_test_case: defectForm.associated_scenario, // Maps to the new dropdown
      feature: defectForm.feature,
      feature_affected: defectForm.feature, 
      browser: defectForm.browser,
      device: defectForm.device,
      severity: defectForm.severity,
      steps_to_reproduce: defectForm.steps,
      steps_performed: defectForm.steps,    
      expected_behavior: defectForm.expected,
      expected_result: defectForm.expected, 
      actual_behavior: defectForm.actual,
      actual_result: defectForm.actual,     
      status: "Open"
    };

    const { error } = await supabase.from('uat_defects').insert([payload]);
    if (!error) {
      setDefects([payload, ...defects]);
      setIsDefectModalOpen(false);
      setDefectForm({ associated_scenario: "", feature: "", browser: "Chrome", device: "Desktop (Windows)", severity: "Medium", steps: "1. \n2. \n3. ", expected: "", actual: "" });
    } else {
      console.error("Supabase Error:", error);
      alert(`Failed to log defect! Database says: ${error.message}`);
    }
    setIsSubmittingDefect(false);
  };

  const submitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const activeTesterProfile = availableTesters.find(t => t.id === activeTesterId);
    
    const avgUsability = Math.round((survey.usability_learning + survey.usability_navigation + survey.usability_features + survey.usability_onboarding + survey.usability_tasks) / 5);
    const avgValue = Math.round((survey.val_problem + survey.val_calls + survey.val_time + survey.val_cx + survey.val_efficiency) / 5);
    const avgAi = Math.round((survey.ai_natural + survey.ai_voice + survey.ai_understanding + survey.ai_accuracy + survey.ai_professional + survey.ai_friendly + survey.ai_answering + survey.ai_overall) / 8);

    await supabase.from("uat_feedback").upsert({
      id: `FBK-${activeTesterId}`,
      project_name: activeProject,
      tester_id: activeTesterId,
      tester_name: activeTesterProfile?.tester_name,
      usability_score: avgUsability,
      business_value_score: avgValue,
      ai_quality_score: avgAi,
      nps_score: survey.nps,
      pricing_tier: survey.pricing,
      payment_preference: survey.payment_preference,
      production_ready: survey.productionReady,
      commercial_intent: survey.commercial_intent,
      best_features: survey.bestFeatures,
      least_valuable_features: survey.least_valuable_features,
      pain_points: survey.painPoints,
      missing_features: survey.missingFeatures,
      favourite_feature: survey.favourite_feature,
      open_feedback: survey.open_feedback,
      signature: survey.signature,
      usability_learning: survey.usability_learning, usability_navigation: survey.usability_navigation, usability_features: survey.usability_features, usability_onboarding: survey.usability_onboarding, usability_tasks: survey.usability_tasks,
      val_problem: survey.val_problem, val_calls: survey.val_calls, val_time: survey.val_time, val_cx: survey.val_cx, val_efficiency: survey.val_efficiency,
      ai_natural: survey.ai_natural, ai_voice: survey.ai_voice, ai_understanding: survey.ai_understanding, ai_accuracy: survey.ai_accuracy, ai_professional: survey.ai_professional, ai_friendly: survey.ai_friendly, ai_answering: survey.ai_answering, ai_overall: survey.ai_overall,
      feat_setup: survey.feat_setup, feat_ai: survey.feat_ai, feat_kb: survey.feat_kb, feat_booking: survey.feat_booking, feat_dashboard: survey.feat_dashboard, feat_analytics: survey.feat_analytics, feat_notifications: survey.feat_notifications,
      rel_login: survey.rel_login, rel_ai_stop: survey.rel_ai_stop, rel_book_fail: survey.rel_book_fail, rel_notif_fail: survey.rel_notif_fail, rel_dash_err: survey.rel_dash_err, rel_ai_err: survey.rel_ai_err, rel_perf: survey.rel_perf, rel_desc: survey.rel_desc
    });
    setFeedbackSaved(true);
    setLoading(false);
  };

  // --- STRICT VALIDATION GATES ---
  const isStep1Complete = agreedToTerms === true;
  const isStep2Complete = Object.values(setupChecklist).every(v => v === true);
  const isStep3Complete = scenarios.length > 0 && scenarios.every(s => s.status && s.status !== "Not Started" && s.status !== "Pending");
  
  const isStep4Complete = 
    survey.usability_learning > 0 && survey.usability_navigation > 0 && survey.usability_features > 0 && survey.usability_onboarding > 0 && survey.usability_tasks > 0 &&
    survey.val_problem > 0 && survey.val_calls > 0 && survey.val_time > 0 && survey.val_cx > 0 && survey.val_efficiency > 0 &&
    survey.ai_natural > 0 && survey.ai_voice > 0 && survey.ai_understanding > 0 && survey.ai_accuracy > 0 && survey.ai_professional > 0 && survey.ai_friendly > 0 && survey.ai_answering > 0 && survey.ai_overall > 0 &&
    survey.feat_setup > 0 && survey.feat_ai > 0 && survey.feat_kb > 0 && survey.feat_booking > 0 && survey.feat_dashboard > 0 && survey.feat_analytics > 0 && survey.feat_notifications > 0 &&
    survey.productionReady !== "" && survey.commercial_intent !== "" && survey.nps !== -1 && survey.pricing !== "" && survey.payment_preference !== "" &&
    survey.bestFeatures.trim() !== "" && survey.least_valuable_features.trim() !== "" && survey.painPoints.trim() !== "" && survey.missingFeatures.trim() !== "" && survey.favourite_feature.trim() !== "" && survey.open_feedback.trim() !== "" && survey.signature.trim() !== "";

  const canAccessStep = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return isStep1Complete;
    if (stepNumber === 3) return isStep1Complete && isStep2Complete;
    if (stepNumber === 4) return isStep1Complete && isStep2Complete && isStep3Complete;
    return false;
  };

  const isStepFullyDone = (stepNumber: number) => {
    if (stepNumber === 1) return isStep1Complete;
    if (stepNumber === 2) return isStep2Complete;
    if (stepNumber === 3) return isStep3Complete;
    if (stepNumber === 4) return feedbackSaved;
    return false;
  };

  const RatingRow = ({ label, stateKey }: { label: string, stateKey: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-border/50 hover:bg-muted/10 transition-colors">
      <div className="text-sm font-medium text-foreground flex-1 flex items-center gap-1">
        {label} <span className="text-red-500 font-bold">*</span>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {[1,2,3,4,5].map(score => (
          <button 
            key={score} type="button"
            onClick={() => setSurvey({...survey, [stateKey]: score})}
            className={cn("w-9 h-9 rounded-lg font-bold border transition-all text-xs", survey[stateKey] === score ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" : "bg-background text-muted-foreground hover:bg-muted")}
          >{score}</button>
        ))}
      </div>
    </div>
  );

  const handleExportSignOff = () => {
    const activeTesterProfile = availableTesters.find(t => t.id === activeTesterId);
    const structuredItems = [
      {
        id: "SURVEY-RESULTS",
        title: "UAT Participant Satisfaction & Sign-Off",
        details: [
          { label: "Tester Identity", value: `${activeTesterProfile?.tester_name} (${activeTesterId})`, isMeta: true },
          { label: "Digital Signature", value: survey.signature || "Not signed", color: "27AE60" },
          { label: "Net Promoter Score (NPS)", value: `${survey.nps} / 10` },
          { label: "Production Readiness", value: survey.productionReady, color: survey.productionReady === "Yes" ? "27AE60" : "D35400" },
          { label: "Valuable Features", value: survey.bestFeatures || "N/A" },
          { label: "Pain Points", value: survey.painPoints || "N/A" }
        ]
      },
      {
        id: "SCENARIO-RESULTS",
        title: "Scenario Execution Ledger",
        details: scenarios.map(sc => ({
          label: `Scenario ${sc.scenario_number}: ${sc.title}`,
          value: `Status: ${sc.status || "Pending"}`,
          color: sc.status === "Pass" ? "27AE60" : sc.status === "Fail" ? "C0392B" : "7F8C8D"
        }))
      },
      {
        id: "DEFECTS-LOGGED",
        title: "Defects Logged During UAT",
        details: defects.map(def => ({
          label: `${def.id}: ${def.feature || def.feature_affected}`,
          value: `Severity: ${def.severity} | Status: ${def.status}`,
          color: def.severity === "Critical" ? "C0392B" : "D35400"
        }))
      }
    ];
    exportToWordBrief("Formal UAT Sign-Off Document", activeProject, structuredItems, `UAT_SignOff_${activeTesterId}`);
  };

  if (!activeTesterId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-6 bg-muted/10">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
            <UserCircle2 size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Access UAT Portal</h2>
            <p className="text-sm text-muted-foreground mt-2">Select your pre-provisioned participant profile to begin.</p>
          </div>
          <div className="bg-card border border-border shadow-sm p-4 rounded-2xl text-left space-y-2 max-h-[300px] overflow-y-auto">
            {availableTesters.map(t => (
              <button key={t.id} onClick={() => setActiveTesterId(t.id)} className="w-full text-left p-3.5 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-between group">
                <div className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{t.tester_name}</div>
                <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded-md font-bold text-muted-foreground">{t.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-fade-in relative">
      
      {/* Header & Stepper */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTesterId(null)} className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border shadow-xs"><ArrowLeft size={16} /></button>
            <h1 className="text-xl font-black text-foreground tracking-tight">UAT Execution Portal</h1>
          </div>
        </div>
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-between bg-card border rounded-xl p-2 px-4 shadow-sm">
          {[
            { step: 1, label: "Welcome", icon: BookOpen },
            { step: 2, label: "Configuration", icon: Settings },
            { step: 3, label: "Execution", icon: Activity },
            { step: 4, label: "Sign-Off", icon: ClipboardCheck }
          ].map((s, i) => {
            const isAccessible = canAccessStep(s.step);
            const isDone = isStepFullyDone(s.step);

            return (
              <div key={s.step} className="flex items-center flex-1 last:flex-none">
                <button 
                  onClick={() => { if (isAccessible) setCurrentStep(s.step); }}
                  disabled={!isAccessible}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all disabled:cursor-not-allowed", 
                    currentStep === s.step ? "bg-primary text-primary-foreground shadow-sm" : 
                    isDone ? "text-emerald-600 bg-emerald-50 border-emerald-200 border hover:bg-emerald-100" :
                    isAccessible ? "text-primary font-bold hover:bg-primary/10" : "text-muted-foreground opacity-40"
                  )}
                >
                  {isDone ? <CheckCircle2 size={14} /> : (isAccessible ? <s.icon size={14} /> : <Lock size={14} />)}
                  <span className="text-[11px] font-black uppercase tracking-wider hidden sm:block">{s.label}</span>
                </button>
                {i < 3 && <div className={cn("flex-1 h-px mx-2 sm:mx-4 transition-colors", isDone ? "bg-emerald-500" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── WIZARD CONTENT AREA ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        
        {/* STEP 1: WELCOME */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/10 w-fit px-3 py-1 rounded-full">
                <Clock size={14}/> Expected Time: 30 Minutes
              </div>
              <span className="text-xs text-muted-foreground font-bold text-red-500">Agreement Required</span>
            </div>
            
            <Card className="p-8 border-primary/20 bg-primary/5">
              <h2 className="text-2xl font-black mb-4">Welcome to the Tellgence UAT Program [cite: 5]</h2>
              <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                Your feedback will directly influence improvements before the platform is released to production[cite: 7]. You have been selected because your business represents real-world use cases[cite: 8]. We are evaluating the product, not your ability to use technology[cite: 19].
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-background p-5 rounded-xl border">
                  <h3 className="text-sm font-black flex items-center gap-2 mb-3"><ShieldAlert size={16} className="text-amber-500"/> Core Responsibilities [cite: 21]</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 marker:text-amber-500">
                    <li>Complete all assigned test scenarios [cite: 24]</li>
                    <li>Use the system as you normally would in your business [cite: 25]</li>
                    <li>Report any issues immediately [cite: 26]</li>
                    <li>Provide honest and constructive feedback [cite: 27]</li>
                  </ul>
                </div>
                <div className="bg-background p-5 rounded-xl border">
                  <h3 className="text-sm font-black flex items-center gap-2 mb-3"><ShieldCheck size={16} className="text-emerald-500"/> Code of Conduct [cite: 124]</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 marker:text-emerald-500">
                    <li>Maintain confidentiality [cite: 126]</li>
                    <li>Use only the provided UAT environment [cite: 127]</li>
                    <li>Avoid sharing credentials [cite: 128]</li>
                  </ul>
                </div>
              </div>
            </Card>

            <label className={cn("flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors shadow-sm", agreedToTerms ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "bg-card hover:bg-muted/30 border-border")}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-bold">I acknowledge my responsibilities and agree to the UAT Code of Conduct. <span className="text-red-500">*</span></span>
            </label>

            <div className="flex justify-end pt-4 border-t">
              <button 
                onClick={() => { if (isStep1Complete) setCurrentStep(2); }} 
                disabled={!isStep1Complete} 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Continue to Setup <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SETUP CHECKLIST */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/10 w-fit px-3 py-1 rounded-full">
                <Clock size={14}/> Expected Time: 50 Minutes
              </div>
              <span className="text-xs text-red-500 font-bold">All setup parameters must be verified to proceed.</span>
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b bg-muted/10">
                <h3 className="font-black text-lg">Platform Configuration Checklist</h3>
                <p className="text-xs text-muted-foreground mt-1">Complete these foundational steps before executing test scenarios.</p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: 'login', label: "Account Login Verified", sub: "Successfully authenticated with temporary credentials [cite: 178-182]." },
                  { key: 'profile', label: "Business Profile Configured", sub: "Business Name, Industry, Phone, Email, Time Zone, Hours, and Services entered [cite: 186-195]." },
                  { key: 'ai', label: "AI Receptionist Initialized", sub: "Name, Greeting Message, Tone, Voice, Escalation Contact, and Booking Preferences set [cite: 198-204]." },
                  { key: 'kb', label: "Knowledge Base Uploaded", sub: "FAQs, pricing, and policies uploaded and processed [cite: 207-213]." },
                  { key: 'calendar', label: "Calendar Synchronized", sub: "Appointment slots mapped to working hours [cite: 221-223]." },
                  { key: 'notifications', label: "Notifications Configured", sub: "Email, SMS, and escalation recipients verified [cite: 225-228]." },
                  { key: 'firstCall', label: "First Test Call Executed", sub: "Called the assigned UAT number and verified basic flow [cite: 230-235]." },
                  { key: 'dashboard', label: "Dashboard Reviewed", sub: "Call History, Transcript, Summary, and Caller Information captured [cite: 245-247]." }
                ].map((item) => (
                  <label key={item.key} className={cn("flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all", setupChecklist[item.key as keyof typeof setupChecklist] ? "border-emerald-500/50 bg-emerald-50/20" : "hover:bg-muted/30")}>
                    <input 
                      type="checkbox" 
                      checked={setupChecklist[item.key as keyof typeof setupChecklist]} 
                      onChange={e => setSetupChecklist({...setupChecklist, [item.key]: e.target.checked})} 
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5" 
                    />
                    <div>
                      <div className="text-sm font-bold text-foreground">{item.label} <span className="text-red-500">*</span></div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <button 
                onClick={() => setCurrentStep(1)} 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-muted text-muted-foreground hover:text-foreground transition-all border shadow-sm"
              >
                <ArrowLeft size={16}/> Back
              </button>
              <button 
                onClick={() => { if (isStep2Complete) setCurrentStep(3); }} 
                disabled={!isStep2Complete} 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Start Execution <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SCENARIO EXECUTION */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/10 w-fit px-3 py-1 rounded-full">
                <Clock size={14}/> Expected Time: 2-3 Hours
              </div>
              <button 
                onClick={() => setIsDefectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                <Bug size={14} /> Report Defect
              </button>
            </div>

            <div className="flex items-center justify-between bg-card p-4 border rounded-xl shadow-sm shrink-0">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">Mandatory Test Catalogue [cite: 308]</h3>
                <p className="text-xs text-muted-foreground mt-1">Execute scenarios naturally. Record outcomes accurately[cite: 312].</p>
              </div>
              <Badge className={cn(isStep3Complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>
                {isStep3Complete ? "100% Completed" : `${scenarios.filter(s => !s.status || s.status === 'Not Started' || s.status === 'Pending').length} Pending Scenarios`}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {scenarios.map((sc: any) => (
                <div key={sc.id} className={cn("bg-card border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors", sc.status === "Pass" ? "border-l-4 border-l-emerald-500 bg-emerald-50/10" : sc.status === "Fail" ? "border-l-4 border-l-red-500 bg-red-50/10" : sc.status === "Blocked" ? "border-l-4 border-l-amber-500 bg-amber-50/10" : sc.status === "NA" ? "border-l-4 border-l-slate-400 bg-slate-50/10" : "")}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded font-bold">CASE {sc.scenario_number}</span>
                      <Badge className={cn("text-[9px] px-1.5 py-0 border-none", sc.priority === 'Critical' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>{sc.priority}</Badge>
                      <span className="text-red-500 font-bold ml-1">*</span>
                    </div>
                    <div className="text-sm font-bold">{sc.title}</div>
                  </div>
                  
                  <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/40 text-[10px] font-bold shrink-0 w-full sm:w-auto">
                    <button onClick={() => handleScenarioUpdate(sc.id, "Pass")} className={cn("flex-1 sm:flex-none px-3 py-2 rounded-md transition-all", sc.status === "Pass" ? "bg-emerald-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground")}>Pass</button>
                    <button onClick={() => handleScenarioUpdate(sc.id, "Fail")} className={cn("flex-1 sm:flex-none px-3 py-2 rounded-md transition-all", sc.status === "Fail" ? "bg-red-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground")}>Fail</button>
                    <button onClick={() => handleScenarioUpdate(sc.id, "Blocked")} className={cn("flex-1 sm:flex-none px-3 py-2 rounded-md transition-all", sc.status === "Blocked" ? "bg-amber-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground")}>Blocked</button>
                    <button onClick={() => handleScenarioUpdate(sc.id, "NA")} className={cn("flex-1 sm:flex-none px-3 py-2 rounded-md transition-all", sc.status === "NA" ? "bg-slate-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground")}>N/A</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t shrink-0">
              <button 
                onClick={() => setCurrentStep(2)} 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-muted text-muted-foreground hover:text-foreground transition-all border shadow-sm"
              >
                <ArrowLeft size={16}/> Back
              </button>
              <button 
                onClick={() => { if (isStep3Complete) setCurrentStep(4); }} 
                disabled={!isStep3Complete} 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Proceed to Survey <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SATISFACTION SURVEY & SIGN-OFF */}
        {currentStep === 4 && (
          <form onSubmit={submitSurvey} className="space-y-8 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/10 w-fit px-3 py-1 rounded-full mb-4">
                <Clock size={14}/> Expected Time: 20 Minutes
              </div>
              <span className="text-xs text-red-500 font-bold text-right">All survey fields are strictly mandatory.</span>
            </div>

            {/* Matrix 1: Product Usability */}
            <Card className="p-6 border-border shadow-sm">
              <h3 className="font-black text-base border-b pb-3 mb-3">Product Usability [cite: 580]</h3>
              <p className="text-xs text-muted-foreground mb-4">Rate your agreement: 1 (Strongly Disagree) to 5 (Strongly Agree).</p>
              <RatingRow label="The platform was easy to learn" stateKey="usability_learning" />
              <RatingRow label="Navigation was intuitive" stateKey="usability_navigation" />
              <RatingRow label="Features were easy to locate" stateKey="usability_features" />
              <RatingRow label="The onboarding process was straightforward" stateKey="usability_onboarding" />
              <RatingRow label="I could complete tasks without assistance" stateKey="usability_tasks" />
            </Card>

            {/* Matrix 2: Business Value */}
            <Card className="p-6 border-border shadow-sm">
              <h3 className="font-black text-base border-b pb-3 mb-3">Business Value [cite: 623]</h3>
              <p className="text-xs text-muted-foreground mb-4">Rate your agreement: 1 (Strongly Disagree) to 5 (Strongly Agree).</p>
              <RatingRow label="Tellgence solves a real business problem" stateKey="val_problem" />
              <RatingRow label="It would reduce missed calls" stateKey="val_calls" />
              <RatingRow label="It would save staff time" stateKey="val_time" />
              <RatingRow label="It would improve customer experience" stateKey="val_cx" />
              <RatingRow label="It would improve business efficiency" stateKey="val_efficiency" />
            </Card>

            {/* Matrix 3: AI Receptionist Eval */}
            <Card className="p-6 border-border shadow-sm">
              <h3 className="font-black text-base border-b pb-3 mb-3">AI Receptionist Evaluation [cite: 620]</h3>
              <p className="text-xs text-muted-foreground mb-4">Rate the AI experience: 1 (Very Poor) to 5 (Excellent)[cite: 621].</p>
              <RatingRow label="Natural conversation" stateKey="ai_natural" />
              <RatingRow label="Voice quality" stateKey="ai_voice" />
              <RatingRow label="Understanding requests" stateKey="ai_understanding" />
              <RatingRow label="Response accuracy" stateKey="ai_accuracy" />
              <RatingRow label="Professionalism" stateKey="ai_professional" />
              <RatingRow label="Friendliness" stateKey="ai_friendly" />
              <RatingRow label="Ability to answer questions" stateKey="ai_answering" />
              <RatingRow label="Overall AI quality" stateKey="ai_overall" />
            </Card>

            {/* Matrix 4: Feature Satisfaction */}
            <Card className="p-6 border-border shadow-sm">
              <h3 className="font-black text-base border-b pb-3 mb-3">Feature Satisfaction [cite: 665]</h3>
              <p className="text-xs text-muted-foreground mb-4">Rate the features you used: 1 (Very Poor) to 5 (Excellent)[cite: 666].</p>
              <RatingRow label="Business Setup" stateKey="feat_setup" />
              <RatingRow label="AI Receptionist" stateKey="feat_ai" />
              <RatingRow label="Knowledge Base" stateKey="feat_kb" />
              <RatingRow label="Appointment Booking" stateKey="feat_booking" />
              <RatingRow label="Dashboard" stateKey="feat_dashboard" />
              <RatingRow label="Analytics" stateKey="feat_analytics" />
              <RatingRow label="Notifications" stateKey="feat_notifications" />
            </Card>

            {/* Reliability & Errors */}
            <Card className="p-6 border-border shadow-sm bg-red-50/30 dark:bg-red-900/10">
              <h3 className="font-black text-base text-red-800 dark:text-red-400 border-b border-red-200 dark:border-red-900/50 pb-3 mb-4">Reliability Issues [cite: 713]</h3>
              <p className="text-xs text-muted-foreground mb-4">Did you experience any of the following? Check all that apply[cite: 714].</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {[
                  { key: 'rel_login', label: "Login issues" },
                  { key: 'rel_ai_stop', label: "AI stopped responding" },
                  { key: 'rel_book_fail', label: "Booking failed" },
                  { key: 'rel_notif_fail', label: "Notifications not received" },
                  { key: 'rel_dash_err', label: "Dashboard errors" },
                  { key: 'rel_ai_err', label: "Incorrect AI responses" },
                  { key: 'rel_perf', label: "System performance issues" }
                ].map(err => (
                  <label key={err.key} className="flex items-center gap-3 p-2 cursor-pointer">
                    <input type="checkbox" checked={survey[err.key]} onChange={e => setSurvey({...survey, [err.key]: e.target.checked})} className="w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                    <span className="text-sm font-medium">{err.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-red-800 dark:text-red-400 mb-2">If yes, please describe: <span className="text-red-500">*</span> [cite: 726]</label>
                <textarea required rows={2} value={survey.rel_desc} onChange={e => setSurvey({...survey, rel_desc: e.target.value})} className="w-full border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 bg-background" />
              </div>
            </Card>

            {/* Commercial Validation & Pricing */}
            <Card className="p-6 border-border shadow-sm">
              <h3 className="font-black text-base border-b pb-3 mb-5">Commercial Validation & Readiness [cite: 749]</h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Production Readiness <span className="text-red-500">*</span> [cite: 741]</label>
                  <p className="text-[10px] text-muted-foreground mb-2">Would you trust Tellgence to handle customer calls? [cite: 742]</p>
                  <select required value={survey.productionReady} onChange={e => setSurvey({...survey, productionReady: e.target.value})} className="w-full bg-muted/50 border p-2.5 rounded-lg text-sm font-bold">
                    <option value="">-- Select --</option>
                    <option>Yes</option>
                    <option>With Minor Improvements</option>
                    <option>No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Commercial Intent <span className="text-red-500">*</span></label>
                  <p className="text-[10px] text-muted-foreground mb-2">Would you consider using Tellgence after UAT? [cite: 750]</p>
                  <select required value={survey.commercial_intent} onChange={e => setSurvey({...survey, commercial_intent: e.target.value})} className="w-full bg-muted/50 border p-2.5 rounded-lg text-sm font-bold">
                    <option value="">-- Select --</option>
                    <option>Definitely</option>
                    <option>Probably</option>
                    <option>Maybe</option>
                    <option>Probably Not</option>
                    <option>Definitely Not</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Net Promoter Score (NPS) <span className="text-red-500">*</span></label>
                  <p className="text-[10px] text-muted-foreground mb-2">How likely are you to recommend Tellgence? (0 = Not likely, 10 = Extremely likely) [cite: 760]</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(score => (
                      <button 
                        key={score} type="button"
                        onClick={() => setSurvey({...survey, nps: score})}
                        className={cn("flex-1 py-2 rounded-md font-bold border transition-all text-xs", survey.nps === score ? "bg-primary text-primary-foreground border-primary scale-105 shadow-sm" : "bg-background text-muted-foreground hover:bg-muted")}
                      >{score}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Pricing Feedback <span className="text-red-500">*</span> [cite: 766]</label>
                  <p className="text-[10px] text-muted-foreground mb-2">What monthly price would you consider reasonable? [cite: 767]</p>
                  <select required value={survey.pricing} onChange={e => setSurvey({...survey, pricing: e.target.value})} className="w-full bg-muted/50 border p-2.5 rounded-lg text-sm font-bold">
                    <option value="">-- Select --</option>
                    <option>Under $49</option>
                    <option>$50-99</option>
                    <option>$100-199</option>
                    <option>$200-299</option>
                    <option>$300+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Payment Preference <span className="text-red-500">*</span></label>
                  <p className="text-[10px] text-muted-foreground mb-2">Which payment module do you prefer?</p>
                  <select required value={survey.payment_preference} onChange={e => setSurvey({...survey, payment_preference: e.target.value})} className="w-full bg-muted/50 border p-2.5 rounded-lg text-sm font-bold">
                    <option value="">-- Select --</option>
                    <option>Credit Card (Monthly Auto-Pay)</option>
                    <option>ACH / Direct Bank Transfer</option>
                    <option>Annual Invoice</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Qualitative Text Feedback */}
            <Card className="p-6 border-border shadow-sm space-y-5">
              <h3 className="font-black text-base border-b pb-3">Open Feedback [cite: 801]</h3>
              
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Most Valuable Features <span className="text-red-500">*</span> [cite: 774]</label>
                  <textarea required rows={2} value={survey.bestFeatures} onChange={e => setSurvey({...survey, bestFeatures: e.target.value})} placeholder="Select your top three. [cite: 775]" className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-primary bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Least Valuable Features <span className="text-red-500">*</span> [cite: 793]</label>
                  <textarea required rows={2} value={survey.least_valuable_features} onChange={e => setSurvey({...survey, least_valuable_features: e.target.value})} placeholder="Which features provided the least value? [cite: 794]" className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-primary bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Biggest Pain Points <span className="text-red-500">*</span> [cite: 795]</label>
                  <textarea required rows={2} value={survey.painPoints} onChange={e => setSurvey({...survey, painPoints: e.target.value})} placeholder="What frustrated you the most? [cite: 796]" className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-primary bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Missing Features <span className="text-red-500">*</span> [cite: 797]</label>
                  <textarea required rows={2} value={survey.missingFeatures} onChange={e => setSurvey({...survey, missingFeatures: e.target.value})} placeholder="What features would make Tellgence more valuable? [cite: 798]" className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-primary bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Favourite Feature <span className="text-red-500">*</span> [cite: 799]</label>
                  <textarea required rows={2} value={survey.favourite_feature} onChange={e => setSurvey({...survey, favourite_feature: e.target.value})} placeholder="What impressed you the most? [cite: 800]" className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-primary bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Open Feedback <span className="text-red-500">*</span> [cite: 801]</label>
                  <textarea required rows={2} value={survey.open_feedback} onChange={e => setSurvey({...survey, open_feedback: e.target.value})} placeholder="Please share any additional comments or suggestions. [cite: 802]" className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-primary bg-background" />
                </div>
              </div>

              <div className="pt-4 mt-2">
                <label className="block text-xs font-bold uppercase text-emerald-700 mb-2">Tester Declaration (Digital Signature) <span className="text-red-500">*</span> [cite: 528]</label>
                <p className="text-[10px] text-muted-foreground mb-3">I confirm that I have completed all assigned UAT scenarios and reported all observed issues to the best of my knowledge[cite: 529].</p>
                <input required placeholder="Type your full legal name to sign" value={survey.signature} onChange={e => setSurvey({...survey, signature: e.target.value})} className="w-full border-2 border-emerald-200 bg-emerald-50 rounded-lg p-3 text-sm font-black focus:outline-none focus:border-emerald-500" />
              </div>
            </Card>

            <div className="flex justify-between pt-4 border-t items-center">
              <button 
                type="button" 
                onClick={() => setCurrentStep(3)} 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-muted text-muted-foreground hover:text-foreground transition-all border shadow-sm"
              >
                <ArrowLeft size={16}/> Back
              </button>
              
              <div className="flex items-center gap-3">
                {!isStep4Complete && <span className="text-xs text-red-500 font-bold hidden sm:block">Complete all fields to submit.</span>}
                <button 
                  type="submit" 
                  disabled={loading || !isStep4Complete} 
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving Data..." : <><CheckCircle2 size={16}/> Lock & Submit Sign-Off</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          DEFECT LOGGING MODAL
      ──────────────────────────────────────────────────────────────────────── */}
      {isDefectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-border bg-red-50/50 dark:bg-red-900/10 shrink-0">
              <h2 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
                <Bug size={16} /> Log Defect [cite: 88]
              </h2>
              <button onClick={() => setIsDefectModalOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground bg-background hover:bg-muted rounded-md transition-colors border border-transparent hover:border-border shadow-xs">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={submitDefect} className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                
                {/* 💡 NEW SPLIT VIEW SCENARIO SELECTOR */}
                <div className="bg-muted/30 p-4 border border-border/80 rounded-xl mb-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-primary mb-1.5">Associated Test Scenario <span className="text-red-500">*</span></label>
                  <p className="text-xs text-muted-foreground mb-3">Which scenario were you executing when this issue occurred?</p>
                  <select 
                    required 
                    value={defectForm.associated_scenario} 
                    onChange={e => setDefectForm({...defectForm, associated_scenario: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-bold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="">-- Select Current Scenario --</option>
                    {scenarios.map(sc => (
                      <option key={sc.id} value={`CASE ${sc.scenario_number} - ${sc.title}`}>CASE {sc.scenario_number} - {sc.title}</option>
                    ))}
                    <option value="Independent / Unmapped Issue">Independent / Unmapped Issue</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Affected Feature / Area <span className="text-red-500">*</span> [cite: 93]</label>
                    <input 
                      required autoFocus
                      value={defectForm.feature} onChange={e => setDefectForm({...defectForm, feature: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-bold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-red-500 transition-colors" 
                      placeholder="e.g. Appointment Booking Calendar" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Browser [cite: 97]</label>
                    <select value={defectForm.browser} onChange={e => setDefectForm({...defectForm, browser: e.target.value})} className="w-full px-3 py-2 text-sm font-medium bg-muted/50 border border-border/80 rounded-lg focus:outline-none focus:border-red-500 transition-colors">
                      <option>Chrome</option>
                      <option>Safari</option>
                      <option>Edge</option>
                      <option>Firefox</option>
                      <option>Mobile Native</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Device Type [cite: 98]</label>
                    <select value={defectForm.device} onChange={e => setDefectForm({...defectForm, device: e.target.value})} className="w-full px-3 py-2 text-sm font-medium bg-muted/50 border border-border/80 rounded-lg focus:outline-none focus:border-red-500 transition-colors">
                      <option>Desktop (Windows)</option>
                      <option>Desktop (Mac)</option>
                      <option>Mobile (iOS)</option>
                      <option>Mobile (Android)</option>
                      <option>Tablet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Severity Level</label>
                  <select value={defectForm.severity} onChange={e => setDefectForm({...defectForm, severity: e.target.value})} className="w-full px-3 py-2 text-sm font-bold bg-background border border-border/80 rounded-lg focus:outline-none focus:border-red-500 transition-colors">
                    <option value="Low">Low - Cosmetic Issue</option>
                    <option value="Medium">Medium - Minor Functional Issue</option>
                    <option value="High">High - Major Functional Issue</option>
                    <option value="Critical">Critical - System Crash / Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Steps Performed <span className="text-red-500">*</span> [cite: 94]</label>
                  <textarea 
                    required rows={3}
                    value={defectForm.steps} onChange={e => setDefectForm({...defectForm, steps: e.target.value})} 
                    className="w-full px-3 py-2 text-sm font-medium bg-background border border-border/80 rounded-lg focus:outline-none focus:border-red-500 transition-colors custom-scrollbar" 
                    placeholder="1. Clicked on... 2. Typed..." 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Expected Behaviour <span className="text-red-500">*</span> [cite: 95]</label>
                    <textarea 
                      required rows={3}
                      value={defectForm.expected} onChange={e => setDefectForm({...defectForm, expected: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-medium bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-200/60 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors custom-scrollbar" 
                      placeholder="What should have happened?" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-red-600 mb-1.5">Actual Behaviour <span className="text-red-500">*</span> [cite: 96]</label>
                    <textarea 
                      required rows={3}
                      value={defectForm.actual} onChange={e => setDefectForm({...defectForm, actual: e.target.value})} 
                      className="w-full px-3 py-2 text-sm font-medium bg-red-50/30 dark:bg-red-900/10 border border-red-200/60 rounded-lg focus:outline-none focus:border-red-500 transition-colors custom-scrollbar" 
                      placeholder="What actually happened?" 
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center p-5 border-t border-border bg-muted/5 shrink-0">
                <span className="text-xs text-muted-foreground italic font-medium">* Ensure you have provided exact steps to reproduce.</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsDefectModalOpen(false)} className="px-5 py-2 text-sm font-bold bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border shadow-sm">Cancel</button>
                  <button type="submit" disabled={isSubmittingDefect} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all shadow-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                    {isSubmittingDefect ? "Logging..." : "Log Defect"}
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