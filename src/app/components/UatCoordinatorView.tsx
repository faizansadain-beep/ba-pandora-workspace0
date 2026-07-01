import { useState, useEffect } from "react";
import { Download, ShieldAlert, Users, CheckCircle2, XCircle, Activity, BarChart3, AlertTriangle, FileText, Star, MessageSquare, ClipboardCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToWordBrief } from "../../lib/exportUtils";

export default function UatCoordinatorDashboardView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [testers, setTesters] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [defects, setDefects] = useState<any[]>([]);

  async function fetchUatData() {
    setLoading(true);
    try {
      const [testerRes, feedRes, scenRes, defRes] = await Promise.all([
        supabase.from('uat_testers').select('*').eq('project_name', activeProject),
        supabase.from('uat_feedback').select('*').eq('project_name', activeProject),
        supabase.from('uat_scenarios_progress').select('*').eq('project_name', activeProject),
        supabase.from('uat_defects').select('*').eq('project_name', activeProject)
      ]);

      if (testerRes.data) setTesters(testerRes.data);
      if (feedRes.data) setFeedbacks(feedRes.data);
      if (scenRes.data) setScenarios(scenRes.data);
      if (defRes.data) setDefects(defRes.data);
    } catch (err) {
      console.error("Error fetching UAT coordinator data:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUatData();
  }, [activeProject]);

  // --- METRICS CALCULATION ---
  const totalTesters = testers.length;
  const completedSurveys = feedbacks.length;
  const completionRate = totalTesters > 0 ? Math.round((completedSurveys / totalTesters) * 100) : 0;

  // NPS Logic
  const npsScores = feedbacks.map(f => f.nps_score).filter(s => s !== null);
  const promoters = npsScores.filter(s => s >= 9).length;
  const detractors = npsScores.filter(s => s <= 6).length;
  const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;

  // Averages
  const avgUsability = feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + (f.usability_score || 0), 0) / feedbacks.length).toFixed(1) : "0.0";
  const avgValue = feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + (f.business_value_score || 0), 0) / feedbacks.length).toFixed(1) : "0.0";

  // Production Readiness Votes
  const readyVotes = feedbacks.filter(f => f.production_ready === "Yes").length;
  const minorVotes = feedbacks.filter(f => f.production_ready === "With Minor Improvements").length;
  const noVotes = feedbacks.filter(f => f.production_ready === "No").length;

  // Defect Stats
  const openDefects = defects.filter(d => d.status !== "Closed").length;
  const criticalDefects = defects.filter(d => d.severity === "Critical" && d.status !== "Closed").length;

  // --- EXPORTS ---
  function handleWordExport() {
    const structuredItems = [
      {
        id: "UAT-SUMMARY",
        title: "UAT Execution & Satisfaction Summary",
        details: [
          { label: "Total Provisioned Testers", value: String(totalTesters), isMeta: true },
          { label: "Completed Final Sign-Offs", value: `${completedSurveys} (${completionRate}%)` },
          { label: "Net Promoter Score (NPS)", value: String(nps), color: nps >= 0 ? "27AE60" : "C0392B" },
          { label: "Average Usability Score", value: `${avgUsability} / 5.0` },
          { label: "Average Business Value", value: `${avgValue} / 5.0` },
          { label: "Critical Open Defects", value: String(criticalDefects), color: criticalDefects > 0 ? "C0392B" : "27AE60" }
        ]
      },
      {
        id: "PROD-READINESS",
        title: "Production Readiness Votes",
        details: [
          { label: "Ready for Production (Yes)", value: String(readyVotes), color: "27AE60" },
          { label: "Ready with Minor Fixes", value: String(minorVotes), color: "D35400" },
          { label: "Not Ready (No)", value: String(noVotes), color: "C0392B" }
        ]
      },
      ...feedbacks.map(f => ({
        id: `FBK-${f.tester_id}`,
        title: `Feedback: ${f.tester_name}`,
        details: [
          { label: "NPS Score", value: `${f.nps_score}/10`, isMeta: true },
          { label: "Production Ready Vote", value: f.production_ready },
          { label: "Favourite Features", value: f.best_features || "N/A" },
          { label: "Reported Pain Points", value: f.pain_points || "N/A" },
          { label: "Digital Signature", value: f.signature || "Unsigned" }
        ]
      }))
    ];

    exportToWordBrief("UAT Release Gate Summary", activeProject, structuredItems, `UAT_Release_Gate_${activeProject}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-fade-in">
      <SectionHeader
        title="UAT Release Gates & Telemetry"
        sub={`Aggregated quantitative and qualitative analytics to determine production readiness for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleWordExport} disabled={feedbacks.length === 0}><FileText size={14} /> Export UAT Summary Report</Btn>
          </div>
        }
      />

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-mono">Aggregating cohort telemetry matrices...</div>
      ) : totalTesters === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed bg-muted/10 shadow-none">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={28} className="text-muted-foreground/60" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No UAT Data Available</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">There are no provisioned testers in this workspace. Provision testers and have them complete the wizard to see aggregated analytics here.</p>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden gap-6">
          
          {/* MACRO KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
            <Card className="p-4 border-border shadow-sm flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Completion Rate</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{completionRate}%</span>
                <span className="text-xs text-muted-foreground font-medium">{completedSurveys} of {totalTesters}</span>
              </div>
            </Card>
            <Card className={cn("p-4 shadow-sm flex flex-col justify-center border", nps >= 30 ? "bg-emerald-50/50 border-emerald-200" : nps > 0 ? "bg-blue-50/50 border-blue-200" : "bg-red-50/50 border-red-200")}>
              <div className={cn("text-[10px] font-black uppercase tracking-wider mb-1", nps >= 30 ? "text-emerald-700" : nps > 0 ? "text-blue-700" : "text-red-700")}>Net Promoter Score</div>
              <div className={cn("text-2xl font-black", nps >= 30 ? "text-emerald-600" : nps > 0 ? "text-blue-600" : "text-red-600")}>{nps}</div>
            </Card>
            <Card className="p-4 border-border shadow-sm flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Avg Usability</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground">{avgUsability}</span>
                <Star size={14} className="text-amber-500 fill-amber-500" />
              </div>
            </Card>
            <Card className="p-4 border-border shadow-sm flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Avg Business Value</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground">{avgValue}</span>
                <Star size={14} className="text-amber-500 fill-amber-500" />
              </div>
            </Card>
            <Card className={cn("p-4 shadow-sm flex flex-col justify-center border", criticalDefects > 0 ? "bg-red-50/50 border-red-200" : "bg-emerald-50/50 border-emerald-200")}>
              <div className={cn("text-[10px] font-black uppercase tracking-wider mb-1", criticalDefects > 0 ? "text-red-700" : "text-emerald-700")}>Critical Issues</div>
              <div className={cn("text-2xl font-black", criticalDefects > 0 ? "text-red-600" : "text-emerald-600")}>{criticalDefects}</div>
            </Card>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            
            {/* LEFT: TESTER PROGRESS LEDGER */}
            <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden border-border shadow-sm">
              <div className="p-4 border-b border-border bg-muted/10 shrink-0 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-primary"/> Tester Execution Ledger
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-card z-10 shadow-xs">
                    <tr className="border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Participant Identity</th>
                      <th className="p-4 text-center">Scenario Progress</th>
                      <th className="p-4 text-center">NPS</th>
                      <th className="p-4 text-center">Vote</th>
                      <th className="p-4 text-center">Sign-Off</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background">
                    {testers.map(tester => {
                      const testerScenarios = scenarios.filter(s => s.tester_id === tester.id);
                      const passed = testerScenarios.filter(s => s.status === 'Pass').length;
                      const totalScen = testerScenarios.length || 25; // fallback to 25 if not seeded yet
                      const pct = Math.round((passed / totalScen) * 100);
                      
                      const feedback = feedbacks.find(f => f.tester_id === tester.id);
                      
                      return (
                        <tr key={tester.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-xs text-foreground">{tester.tester_name}</div>
                            <div className="font-mono text-[9px] text-muted-foreground">{tester.id}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 items-center">
                              <span className="text-xs font-bold">{passed} / {totalScen}</span>
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {feedback ? (
                              <Badge className={cn("text-[10px] font-bold px-2", feedback.nps_score >= 9 ? "bg-emerald-100 text-emerald-700" : feedback.nps_score <= 6 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                {feedback.nps_score}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="p-4 text-center">
                            {feedback ? (
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", feedback.production_ready === 'Yes' ? "text-emerald-600" : feedback.production_ready === 'No' ? "text-red-600" : "text-amber-600")}>
                                {feedback.production_ready === 'With Minor Improvements' ? 'Minor Fixes' : feedback.production_ready}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="p-4 text-center">
                            {feedback?.signature ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <XCircle size={16} className="text-muted-foreground/40 mx-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* RIGHT: AGGREGATED FEEDBACK & READINESS */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
              
              <Card className="p-5 border-border shadow-sm shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-4 text-foreground">
                  <Activity size={14} className="text-primary"/> Production Readiness Votes
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1"><span className="text-emerald-600">Ready (Yes)</span> <span>{readyVotes}</span></div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${completedSurveys ? (readyVotes/completedSurveys)*100 : 0}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1"><span className="text-amber-600">Minor Fixes Req.</span> <span>{minorVotes}</span></div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${completedSurveys ? (minorVotes/completedSurveys)*100 : 0}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1"><span className="text-red-600">Not Ready (No)</span> <span>{noVotes}</span></div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${completedSurveys ? (noVotes/completedSurveys)*100 : 0}%` }} /></div>
                  </div>
                </div>
              </Card>

              <Card className="p-0 border-border shadow-sm flex flex-col flex-1 min-h-[250px]">
                <div className="p-4 border-b border-border bg-muted/10 shrink-0">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                    <MessageSquare size={14} className="text-primary"/> Qualitative Feedback Stream
                  </h3>
                </div>
                <div className="p-4 overflow-y-auto space-y-4 text-sm flex-1">
                  {feedbacks.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic text-center py-6">No surveys submitted yet.</div>
                  ) : (
                    feedbacks.map(f => (
                      <div key={f.id} className="bg-muted/30 border border-border/60 rounded-xl p-3.5 space-y-3">
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="font-bold text-xs">{f.tester_name}</span>
                          <Badge className="bg-primary/10 text-primary border-none text-[9px] px-1.5 py-0">{f.pricing_tier} value</Badge>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-600 block mb-0.5">Favourite Feature</span>
                          <div className="text-xs font-medium text-foreground">{f.best_features}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-red-600 block mb-0.5">Pain Points</span>
                          <div className="text-xs font-medium text-foreground">{f.pain_points}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}