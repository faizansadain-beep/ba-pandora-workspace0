import { useState, useEffect } from "react";
import { Download, Filter, Rocket, ShieldCheck, CheckSquare, AlertOctagon, Activity, CalendarClock, Layers, Info, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function ReleaseReadinessReportView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  const [dbReleases, setDbReleases] = useState<any[]>([]);
  const [activeRelease, setActiveRelease] = useState<string>("");

  // Report Metrics
  const [metrics, setMetrics] = useState({
    releaseDetails: null as any,
    daysToLaunch: 0,
    featuresCount: 0,
    checklist: { total: 0, completed: 0, percent: 0 },
    prr: { total: 0, green: 0, yellow: 0, red: 0, percent: 0 },
    blockers: [] as any[],
    recommendation: "Calculating..."
  });

  async function fetchReadinessReport() {
    setLoading(true);
    try {
      // 1. Fetch available releases
      const { data: releases } = await supabase.from('delivery_releases').select('*').eq('project_name', activeProject).order('target_date', { ascending: true });
      if (releases) setDbReleases(releases);

      const target = activeRelease || (releases?.[0]?.release_version) || "";
      if (!activeRelease && target) setActiveRelease(target);

      if (!target) {
        setLoading(false);
        return;
      }

      // 2. Fetch all converging data for this release
      const currentRelease = releases?.find(r => r.release_version === target);
      
      const [featRes, checkRes, prrRes] = await Promise.all([
        supabase.from('product_features').select('id').eq('project_name', activeProject).eq('release_version', target),
        supabase.from('delivery_deployment_checklists').select('task_name, status, phase').eq('project_name', activeProject).eq('release_version', target),
        supabase.from('delivery_production_readiness').select('criteria_name, status, category').eq('project_name', activeProject).eq('release_version', target)
      ]);

      const features = featRes.data || [];
      const checklists = checkRes.data || [];
      const prr = prrRes.data || [];

      // Calculate Timeline
      const today = new Date();
      const targetDate = new Date(currentRelease?.target_date || today);
      const diffTime = targetDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate Checklist Progress
      const chkTotal = checklists.length;
      const chkDone = checklists.filter(c => c.status === 'Completed').length;
      const chkPct = chkTotal === 0 ? 0 : Math.round((chkDone / chkTotal) * 100);

      // Calculate PRR Matrix
      const validPrr = prr.filter(p => p.status !== 'N/A');
      const prrTotal = validPrr.length;
      let prrGreen = 0, prrYellow = 0, prrRed = 0;
      const currentBlockers: any[] = [];

      validPrr.forEach(p => {
        if (p.status === 'Green') prrGreen++;
        else if (p.status === 'Yellow') prrYellow++;
        else if (p.status === 'Red') {
          prrRed++;
          currentBlockers.push({ type: 'PRR Deficit', desc: p.criteria_name, domain: p.category });
        }
      });

      // Add incomplete pre-deployment tasks as blockers if launch is < 3 days away
      if (daysDiff <= 3) {
        checklists.filter(c => c.status !== 'Completed' && c.phase === 'Pre-Deployment').forEach(c => {
          currentBlockers.push({ type: 'Pending Task', desc: c.task_name, domain: c.phase });
        });
      }

      const prrPct = prrTotal === 0 ? 0 : Math.round((prrGreen / prrTotal) * 100);

      // Algorithmic Go/No-Go Recommendation
      let rec = "ON TRACK";
      if (currentRelease?.status === 'Deployed') {
        rec = "DEPLOYED";
      } else if (prrRed > 0 || (daysDiff <= 1 && chkPct < 100)) {
        rec = "NO GO / AT RISK";
      } else if (daysDiff <= 3 && prrYellow > 0) {
        rec = "CAUTION / CONDITIONAL GO";
      } else if (daysDiff <= 0 && chkPct === 100 && prrPct === 100) {
        rec = "APPROVED FOR LAUNCH";
      }

      setMetrics({
        releaseDetails: currentRelease,
        daysToLaunch: daysDiff,
        featuresCount: features.length,
        checklist: { total: chkTotal, completed: chkDone, percent: chkPct },
        prr: { total: prrTotal, green: prrGreen, yellow: prrYellow, red: prrRed, percent: prrPct },
        blockers: currentBlockers,
        recommendation: rec
      });

    } catch (error) {
      console.error("Readiness calculation error:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReadinessReport();
  }, [activeProject, activeRelease]);

  // --- CSV Export ---
  const handleExportCSV = () => {
    const headers = ["Metric Category", "Details", "Status", "Date Generated"];
    const today = new Date().toISOString().split('T')[0];
    
    const rows = [
      ["Release Version", activeRelease, metrics.releaseDetails?.status || "Unknown", today],
      ["Go/No-Go Recommendation", metrics.recommendation, "-", today],
      ["Days to Launch", metrics.daysToLaunch.toString(), "-", today],
      ["Mapped Scope (Features)", metrics.featuresCount.toString(), "-", today],
      ["Checklist Completion", `${metrics.checklist.percent}%`, `${metrics.checklist.completed}/${metrics.checklist.total} Tasks`, today],
      ["PRR Readiness", `${metrics.prr.percent}%`, `${metrics.prr.green}/${metrics.prr.total} Criteria Green`, today],
      ["Active Launch Blockers", metrics.blockers.length.toString(), "Red PRR items or late tasks", today]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Release_Readiness_${activeRelease}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRecColors = (rec: string) => {
    if (rec === "APPROVED FOR LAUNCH" || rec === "DEPLOYED" || rec === "ON TRACK") return "text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20";
    if (rec.includes("CAUTION")) return "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-900/20";
    return "text-red-500 bg-red-50 border-red-200 dark:bg-red-900/20 animate-pulse";
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <SectionHeader
        title="Release Readiness Report"
        sub={`Aggregated view of deployment tasks, production readiness (PRR), and launch tracking for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={handleExportCSV} disabled={!activeRelease}>
            <Download size={13} /> Export Readiness
          </Btn>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-3 bg-muted/30 border border-border flex items-center gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
          <Filter size={14} /> Select Deployment Package:
        </div>
        <select 
          value={activeRelease} 
          onChange={(e) => setActiveRelease(e.target.value)}
          className="bg-background border border-border px-3 py-1.5 rounded-lg text-sm font-bold focus:outline-none min-w-[200px]"
        >
          {dbReleases.length === 0 ? <option>No Releases Found</option> : null}
          {dbReleases.map(r => (
            <option key={r.release_version} value={r.release_version}>{r.release_version} - {r.title}</option>
          ))}
        </select>
      </Card>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Aggregating launch criteria...</div>
      ) : dbReleases.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed bg-muted/10">
          <Rocket size={32} className="text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium text-foreground">No Releases Scheduled</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">You need to create a release package in Release Planning first.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          
          {/* GO / NO-GO BANNER */}
          <Card className={cn("p-6 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6", getRecColors(metrics.recommendation))}>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-background rounded-full shadow-inner border border-border/50">
                <Rocket size={40} className={getRecColors(metrics.recommendation).split(' ')[0]} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1 block">Algorithmic Launch Recommendation</span>
                <div className="text-3xl font-black">{metrics.recommendation}</div>
              </div>
            </div>
            
            <div className="flex gap-4 md:border-l md:border-black/10 md:dark:border-white/10 md:pl-6 text-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">Launch Window</div>
                <div className="text-xl font-black mt-1">
                  {metrics.daysToLaunch < 0 ? "Past" : metrics.daysToLaunch === 0 ? "Today" : `T-Minus ${metrics.daysToLaunch} Days`}
                </div>
              </div>
            </div>
          </Card>

          {/* 3 CORE HEALTH PILLARS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Scope Linked */}
            <Card className="p-5 flex flex-col border-border shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <Layers size={16} className="text-blue-500"/> Payload Scope
                </div>
              </div>
              <div className="flex items-end gap-3 mb-2">
                <div className="text-4xl font-black text-foreground">{metrics.featuresCount}</div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Features Mapped</div>
              </div>
              <p className="text-xs text-muted-foreground mt-auto bg-muted/50 p-2 rounded">Verified via Release Planning engine.</p>
            </Card>

            {/* Checklist Status */}
            <Card className="p-5 flex flex-col border-border shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <CheckSquare size={16} className="text-purple-500"/> Checklist Progress
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-4xl font-black">{metrics.checklist.percent}%</div>
                <div className="text-sm font-medium text-muted-foreground mb-1">{metrics.checklist.completed} / {metrics.checklist.total} Done</div>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-4">
                <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${metrics.checklist.percent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-auto bg-muted/50 p-2 rounded">Operational & Comm readiness tracking.</p>
            </Card>

            {/* PRR Matrix Status */}
            <Card className="p-5 flex flex-col border-border shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
                  <ShieldCheck size={16} className="text-emerald-500"/> PRR Health Matrix
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-4xl font-black">{metrics.prr.percent}%</div>
                <div className="flex gap-1 mb-1">
                  <Badge className="bg-emerald-100 text-emerald-700 px-1 border-none text-[10px]">{metrics.prr.green} G</Badge>
                  <Badge className="bg-amber-100 text-amber-700 px-1 border-none text-[10px]">{metrics.prr.yellow} Y</Badge>
                  <Badge className="bg-red-100 text-red-700 px-1 border-none text-[10px]">{metrics.prr.red} R</Badge>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex mb-4 bg-muted">
                <div className="bg-emerald-500 h-full" style={{ width: `${metrics.prr.percent}%` }} />
                <div className="bg-amber-500 h-full" style={{ width: `${metrics.prr.total ? (metrics.prr.yellow/metrics.prr.total)*100 : 0}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${metrics.prr.total ? (metrics.prr.red/metrics.prr.total)*100 : 0}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-auto bg-muted/50 p-2 rounded">Business & Infra preparedness.</p>
            </Card>

          </div>

          {/* BLOCKERS & DEFICITS */}
          <Card className="p-5 flex flex-col border-border shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <AlertOctagon size={16} className={metrics.blockers.length > 0 ? "text-red-500" : "text-emerald-500"}/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Active Launch Blockers</h3>
              </div>
              <Badge className="bg-muted text-muted-foreground border-none text-[10px]">{metrics.blockers.length} Identified</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {metrics.blockers.length === 0 ? (
                  <div className="text-center p-6 text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                    <CheckCircle2 size={24} className="text-emerald-500/50" />
                    No critical blockers detected. All PRR matrix items are green or yellow, and pre-deployment tasks are caught up.
                  </div>
              ) : (
                metrics.blockers.map((blocker, i) => (
                  <div key={i} className="p-3 bg-red-50/30 border border-red-100 dark:bg-red-900/10 dark:border-red-900/30 rounded-lg flex justify-between items-center gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-foreground mb-0.5">{blocker.desc}</div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase">{blocker.domain}</div>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-700 border-none text-[9px] shrink-0">{blocker.type}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}