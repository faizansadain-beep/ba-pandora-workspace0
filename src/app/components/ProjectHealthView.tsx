import { useState, useEffect } from "react";
import { Download, Filter, HeartPulse, Clock, Layers, ShieldAlert, Bug, AlertTriangle, CheckCircle2, XCircle, Activity, TrendingDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ProjectHealthView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState("all");
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [sprints, setSprints] = useState<any[]>([]);

  // Health Metrics Data
  const [metrics, setMetrics] = useState({
    overallHealth: "Green",
    pillars: {
      scope: { status: "Green", score: 100, metric: "0 Scope Creep" },
      schedule: { status: "Green", score: 100, metric: "0% Variance" },
      quality: { status: "Green", score: 100, metric: "0 Critical Bugs" },
      risk: { status: "Green", score: 100, metric: "0 High Risks" }
    },
    rawStats: {
      totalPoints: 0,
      completedPoints: 0,
      activeBugs: 0,
      criticalBugs: 0,
      activeRisks: 0,
      highRisks: 0,
      orphanStories: 0
    }
  });

  async function fetchHealthData() {
    setLoading(true);
    try {
      const { data: sprintData } = await supabase.from('delivery_sprints').select('sprint_id, title').eq('project_name', activeProject);
      if (sprintData) setSprints(sprintData);

      // Fetch all project signals concurrently
      let backlogQuery = supabase.from('product_backlog').select('story_points, execution_status, sprint_id').eq('project_name', activeProject);
      let defectsQuery = supabase.from('testing_defects').select('severity, status').eq('project_name', activeProject);
      let risksQuery = supabase.from('discovery_risks').select('impact, probability, status').eq('project_name', activeProject);

      if (selectedSprint !== "all") {
        backlogQuery = backlogQuery.eq('sprint_id', selectedSprint);
        // Defects and Risks might not strictly tie to sprints depending on how they were logged, but we filter if possible
      }

      const [backlogRes, defectsRes, risksRes] = await Promise.all([backlogQuery, defectsQuery, risksQuery]);

      const backlog = backlogRes.data || [];
      const defects = defectsRes.data || [];
      const risks = risksRes.data || [];

      // 1. Calculate Scope & Schedule (Using Backlog data)
      let totalPts = 0;
      let completedPts = 0;
      let orphanStories = 0;

      backlog.forEach(item => {
        totalPts += (item.story_points || 0);
        if (item.execution_status === 'Done') completedPts += (item.story_points || 0);
        if (!item.sprint_id) orphanStories++;
      });
      
      const completionPct = totalPts > 0 ? (completedPts / totalPts) * 100 : 0;

      // 2. Calculate Quality (Using Defects)
      let activeBugs = 0;
      let criticalBugs = 0;
      defects.forEach(d => {
        if (d.status !== 'Resolved' && d.status !== 'Closed') {
          activeBugs++;
          if (d.severity === 'Critical' || d.severity === 'High') criticalBugs++;
        }
      });

      // 3. Calculate Risk (Using Risks)
      let activeRisks = 0;
      let highRisks = 0;
      risks.forEach(r => {
        if (r.status !== 'Mitigated' && r.status !== 'Closed') {
          activeRisks++;
          if (r.impact === 'High' && r.probability === 'High') highRisks++;
        }
      });

      // --- ALGORITHMIC HEALTH SCORING ---
      
      // SCOPE HEALTH
      let scopeStatus = "Green";
      const scopeScore = 100 - (totalPts > 0 ? (orphanStories / backlog.length) * 100 : 0);
      if (scopeScore < 70) scopeStatus = "Red";
      else if (scopeScore < 90) scopeStatus = "Amber";

      // SCHEDULE HEALTH (Simplified: Based on completion % vs expectations. We'll use a static threshold for mockup)
      let scheduleStatus = "Green";
      let scheduleScore = completionPct;
      if (scheduleScore < 40 && totalPts > 0) scheduleStatus = "Amber";
      if (scheduleScore < 20 && totalPts > 0) scheduleStatus = "Red";

      // QUALITY HEALTH
      let qualityStatus = "Green";
      let qualityScore = 100 - (criticalBugs * 15) - (activeBugs * 2);
      if (criticalBugs > 2 || qualityScore < 50) qualityStatus = "Red";
      else if (criticalBugs > 0 || qualityScore < 80) qualityStatus = "Amber";

      // RISK HEALTH
      let riskStatus = "Green";
      let riskScore = 100 - (highRisks * 20) - (activeRisks * 5);
      if (highRisks > 1 || riskScore < 60) riskStatus = "Red";
      else if (highRisks > 0 || riskScore < 85) riskStatus = "Amber";

      // OVERALL HEALTH (Takes the worst status)
      let overall = "Green";
      if (scopeStatus === "Red" || scheduleStatus === "Red" || qualityStatus === "Red" || riskStatus === "Red") overall = "Red";
      else if (scopeStatus === "Amber" || scheduleStatus === "Amber" || qualityStatus === "Amber" || riskStatus === "Amber") overall = "Amber";

      setMetrics({
        overallHealth: overall,
        pillars: {
          scope: { status: scopeStatus, score: Math.max(0, Math.round(scopeScore)), metric: `${orphanStories} Unplanned Items` },
          schedule: { status: scheduleStatus, score: Math.max(0, Math.round(scheduleScore)), metric: `${Math.round(completionPct)}% Burned` },
          quality: { status: qualityStatus, score: Math.max(0, Math.round(qualityScore)), metric: `${criticalBugs} Critical Bugs` },
          risk: { status: riskStatus, score: Math.max(0, Math.round(riskScore)), metric: `${highRisks} Severe Risks` }
        },
        rawStats: { totalPoints: totalPts, completedPoints: completedPts, activeBugs, criticalBugs, activeRisks, highRisks, orphanStories }
      });

    } catch (error) {
      console.error("Health Dashboard error:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchHealthData();
  }, [activeProject, selectedSprint, dateRange]);

  const handleExportCSV = () => {
    const headers = ["Pillar", "Status", "Health Score", "Key Metric", "Date Generated"];
    const today = new Date().toISOString().split('T')[0];
    
    const rows = [
      ["OVERALL HEALTH", metrics.overallHealth, "-", "-", today],
      ["Scope Definition", metrics.pillars.scope.status, metrics.pillars.scope.score.toString(), metrics.pillars.scope.metric, today],
      ["Schedule / Velocity", metrics.pillars.schedule.status, metrics.pillars.schedule.score.toString(), metrics.pillars.schedule.metric, today],
      ["Quality & Testing", metrics.pillars.quality.status, metrics.pillars.quality.score.toString(), metrics.pillars.quality.metric, today],
      ["Risk Exposure", metrics.pillars.risk.status, metrics.pillars.risk.score.toString(), metrics.pillars.risk.metric, today]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Health_RAG_${activeProject.replace(/\s+/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRAGColors = (status: string) => {
    switch(status) {
      case 'Green': return "text-emerald-500 bg-emerald-50/20 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30";
      case 'Amber': return "text-amber-500 bg-amber-50/20 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30";
      case 'Red': return "text-red-500 bg-red-50/20 border-red-200 dark:bg-red-900/10 dark:border-red-900/30";
      default: return "text-slate-500 bg-slate-50 border-slate-200";
    }
  };

  const getRAGIcon = (status: string, size = 16) => {
    switch(status) {
      case 'Green': return <CheckCircle2 size={size} className="text-emerald-500"/>;
      case 'Amber': return <AlertTriangle size={size} className="text-amber-500"/>;
      case 'Red': return <XCircle size={size} className="text-red-500"/>;
      default: return <Activity size={size} className="text-slate-500"/>;
    }
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <SectionHeader
        title="Project Health Dashboard (RAG)"
        sub={`Real-time automated RAG scoring based on scope, schedule, quality, and risk for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={handleExportCSV}>
            <Download size={13} /> Export RAG Report
          </Btn>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-3 bg-muted/30 border border-border flex flex-wrap gap-4 items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
          <Filter size={14} /> Filter Status By:
        </div>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none">
          <option value="all">Project Lifetime</option>
          <option value="today">Today's Snapshot</option>
          <option value="week">Trailing 7 Days</option>
        </select>
        <div className="w-px h-6 bg-border mx-2" />
        <select value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)} className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none min-w-[150px]">
          <option value="all">Entire Project Backlog</option>
          {sprints.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_id} - {s.title}</option>)}
        </select>
      </Card>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Calculating algorithmic health...</div>
      ) : (
        <div className="space-y-6">
          {/* OVERALL HEALTH BANNER */}
          <Card className={cn("p-8 border shadow-sm flex flex-col md:flex-row items-center gap-8", getRAGColors(metrics.overallHealth))}>
            <div className="shrink-0 p-6 bg-background rounded-full shadow-inner border border-border/50">
              <HeartPulse size={48} className={cn(
                metrics.overallHealth === 'Green' ? "text-emerald-500" :
                metrics.overallHealth === 'Amber' ? "text-amber-500 animate-pulse" : "text-red-500 animate-bounce"
              )} />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Algorithmic Project Status</h2>
              <div className="text-4xl font-black mb-2">{metrics.overallHealth.toUpperCase()}</div>
              <p className="text-sm opacity-90 max-w-2xl">
                {metrics.overallHealth === 'Green' ? "Project parameters are nominal. Scope, velocity, and quality are tracking well within acceptable bounds." :
                 metrics.overallHealth === 'Amber' ? "Caution required. One or more pillars are showing early warning signs of degradation. Review the amber metrics below." :
                 "Critical intervention required. Severe deviations detected in schedule, quality, or risk. Immediate PM/Leadership review recommended."}
              </p>
            </div>
          </Card>

          {/* THE 4 PILLARS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Scope */}
            <Card className="p-5 flex flex-col border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <Layers size={16} className="text-blue-500"/> Scope
                </div>
                {getRAGIcon(metrics.pillars.scope.status)}
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-black">{metrics.pillars.scope.score}/100</div>
                <Badge className={cn("border-none text-[10px]", getRAGColors(metrics.pillars.scope.status))}>{metrics.pillars.scope.status}</Badge>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full", getRAGColors(metrics.pillars.scope.status).split(' ')[0].replace('text', 'bg'))} style={{ width: `${metrics.pillars.scope.score}%` }} />
              </div>
              <p className="text-xs font-mono font-bold text-muted-foreground mt-auto bg-muted/50 p-2 rounded">{metrics.pillars.scope.metric}</p>
            </Card>

            {/* Schedule */}
            <Card className="p-5 flex flex-col border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <Clock size={16} className="text-purple-500"/> Schedule
                </div>
                {getRAGIcon(metrics.pillars.schedule.status)}
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-black">{metrics.pillars.schedule.score}/100</div>
                <Badge className={cn("border-none text-[10px]", getRAGColors(metrics.pillars.schedule.status))}>{metrics.pillars.schedule.status}</Badge>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full", getRAGColors(metrics.pillars.schedule.status).split(' ')[0].replace('text', 'bg'))} style={{ width: `${metrics.pillars.schedule.score}%` }} />
              </div>
              <p className="text-xs font-mono font-bold text-muted-foreground mt-auto bg-muted/50 p-2 rounded">{metrics.pillars.schedule.metric}</p>
            </Card>

            {/* Quality */}
            <Card className="p-5 flex flex-col border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <Bug size={16} className="text-orange-500"/> Quality
                </div>
                {getRAGIcon(metrics.pillars.quality.status)}
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-black">{metrics.pillars.quality.score}/100</div>
                <Badge className={cn("border-none text-[10px]", getRAGColors(metrics.pillars.quality.status))}>{metrics.pillars.quality.status}</Badge>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full", getRAGColors(metrics.pillars.quality.status).split(' ')[0].replace('text', 'bg'))} style={{ width: `${metrics.pillars.quality.score}%` }} />
              </div>
              <p className="text-xs font-mono font-bold text-muted-foreground mt-auto bg-muted/50 p-2 rounded">{metrics.pillars.quality.metric}</p>
            </Card>

            {/* Risk */}
            <Card className="p-5 flex flex-col border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <ShieldAlert size={16} className="text-pink-500"/> Risk
                </div>
                {getRAGIcon(metrics.pillars.risk.status)}
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-black">{metrics.pillars.risk.score}/100</div>
                <Badge className={cn("border-none text-[10px]", getRAGColors(metrics.pillars.risk.status))}>{metrics.pillars.risk.status}</Badge>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full", getRAGColors(metrics.pillars.risk.status).split(' ')[0].replace('text', 'bg'))} style={{ width: `${metrics.pillars.risk.score}%` }} />
              </div>
              <p className="text-xs font-mono font-bold text-muted-foreground mt-auto bg-muted/50 p-2 rounded">{metrics.pillars.risk.metric}</p>
            </Card>
          </div>

          {/* DIAGNOSTIC RECOMMENDATIONS */}
          {metrics.overallHealth !== 'Green' && (
            <Card className="p-6 border border-border shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                <TrendingDown size={16} className="text-primary"/> System Diagnostics & Recommendations
              </h3>
              <div className="space-y-3">
                {metrics.pillars.scope.status !== 'Green' && (
                  <div className="p-3 bg-muted/30 border border-border rounded flex gap-3 text-sm">
                    {getRAGIcon(metrics.pillars.scope.status)}
                    <div>
                      <strong className="block mb-0.5 text-foreground">Scope Variance Detected</strong>
                      <span className="text-muted-foreground text-xs">There are {metrics.rawStats.orphanStories} orphan stories not assigned to any sprint. Recommend prioritizing backlog refinement and mapping.</span>
                    </div>
                  </div>
                )}
                {metrics.pillars.quality.status !== 'Green' && (
                  <div className="p-3 bg-muted/30 border border-border rounded flex gap-3 text-sm">
                    {getRAGIcon(metrics.pillars.quality.status)}
                    <div>
                      <strong className="block mb-0.5 text-foreground">Quality Threshold Breached</strong>
                      <span className="text-muted-foreground text-xs">{metrics.rawStats.criticalBugs} critical bugs are currently open. Recommend halting feature development and executing a bug crush sprint.</span>
                    </div>
                  </div>
                )}
                {metrics.pillars.risk.status !== 'Green' && (
                  <div className="p-3 bg-muted/30 border border-border rounded flex gap-3 text-sm">
                    {getRAGIcon(metrics.pillars.risk.status)}
                    <div>
                      <strong className="block mb-0.5 text-foreground">Severe Risk Exposure</strong>
                      <span className="text-muted-foreground text-xs">{metrics.rawStats.highRisks} Severe risks (High Impact x High Probability) are active. Immediate mitigation plans must be logged and approved by stakeholders.</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}