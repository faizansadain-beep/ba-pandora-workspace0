import { useState, useEffect } from "react";
import { Download, Plus, FolderOpen, FileText, BookOpen, AlertTriangle, Bug, CheckSquare, Rocket, Activity, Flame, ShieldAlert, ArrowRight, LayoutGrid, FilePlus, Settings } from "lucide-react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { supabase } from "../../lib/supabase";
import { cn, Btn, Card, Badge, Avatar, PriorityDot } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

const defectTrendData = [
  { week: "W1", opened: 12, closed: 8 },
  { week: "W2", opened: 15, closed: 10 },
  { week: "W3", opened: 8, closed: 14 },
  { week: "W4", opened: 5, closed: 18 },
];

export default function DashboardView({ activeProject, onViewChange }: { activeProject: string; onViewChange: (v: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [dbBlockers, setDbBlockers] = useState<any[]>([]);
  const [dbRisks, setDbRisks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [counts, setCounts] = useState({
    projects: 0,
    requirements: 0,
    approvedReqs: 0,
    stories: 0,
    doneStories: 0,
    activeRisks: 0,
    openDefects: 0,
    criticalDefects: 0,
    uatPassed: 0,
    uatTotal: 0,
    uatPct: 0,
    avgReadiness: 0,
    healthScore: 0
  });

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [
          { data: projects }, 
          { data: reqs },
          { data: stories },
          { data: risks },
          { data: defects },
          { data: uat },
          { data: readiness },
          { data: crossDependencies },
          { data: liveLogs }
        ] = await Promise.all([
          supabase.from('projects').select('*').eq('name', activeProject), 
          supabase.from('all_requirements').select('*').eq('project_name', activeProject),
          supabase.from('user_stories').select('*').eq('project_name', activeProject),
          supabase.from('risks').select('*').eq('project_name', activeProject),
          supabase.from('defects').select('*').eq('project_name', activeProject),
          supabase.from('uat_scenarios').select('*').eq('project_name', activeProject),
          supabase.from('readiness_items').select('*').eq('project_name', activeProject),
          supabase.from('dependencies')
            .select('*')
            .eq('project_name', activeProject)
            .neq('status', 'Resolved'),
          supabase.from('workspace_activities').select('*').eq('project_name', activeProject).order('created_at', { ascending: false }).limit(5)
        ]);

        const p = projects || [];
        const r = reqs || [];
        const s = stories || [];
        const d = defects || [];
        const u = uat || [];
        const readi = readiness || [];

        setDbBlockers(crossDependencies || []);
        setDbRisks(risks || []);
        setActivities(liveLogs || []);

        const avgHealth = p.length ? Math.round(p.reduce((acc, curr) => acc + curr.health, 0) / p.length) : 0;
        const avgReadiness = readi.length ? Math.round(readi.reduce((acc, curr) => acc + curr.score, 0) / readi.length) : 0;
        const passedUat = u.filter((x: any) => x.status === 'Passed').length;
        const uatPct = u.length ? Math.round((passedUat / u.length) * 100) : 0;
        const openDefects = d.filter((x: any) => x.status !== 'Closed');

        setCounts({
          projects: p.length,
          requirements: r.length,
          approvedReqs: r.filter((x: any) => x.status === 'Approved' || x.status === 'Implemented').length,
          stories: s.length,
          doneStories: s.filter((x: any) => x.status === 'Done').length,
          activeRisks: (risks || []).filter((x: any) => x.status !== 'Closed' && x.status !== 'Mitigated').length,
          openDefects: openDefects.length,
          criticalDefects: openDefects.filter((x: any) => x.severity === 'Critical' || x.severity === 'High').length,
          uatPassed: passedUat,
          uatTotal: u.length,
          uatPct,
          avgReadiness,
          healthScore: p.length ? p[0].health : avgHealth || 100
        });
      } catch (err) {
        console.error("Dashboard compilation crash:", err);
      }
      setLoading(false);
    }

    if (activeProject) fetchDashboardData();
  }, [activeProject]);

  const handleExcelExport = () => {
    const formattedRows = [{
      "Target Project Workspace": activeProject,
      "Total Requirements": counts.requirements,
      "Approved Baseline Requirements": counts.approvedReqs,
      "Total User Stories": counts.stories,
      "Completed Stories": counts.doneStories,
      "Active Project Risks": counts.activeRisks,
      "Open Quality Defects": counts.openDefects,
      "Critical Severity Defects": counts.criticalDefects,
      "UAT Pass Percentage": `${counts.uatPct}%`,
      "Overall Project Health Score": `${counts.healthScore}/100`
    }];

    const columnWidths = [
      { wch: 30 }, { wch: 20 }, { wch: 28 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 22 }, { wch: 25 }, { wch: 18 }, { wch: 26 }
    ];

    exportToExcel(formattedRows, "Workspace High Level Summary", `Project_Telemetry_Snapshot_${activeProject}`, columnWidths);
  };

  const handleWordExport = () => {
    const structuredItems = [{
      id: "METRICS-SNAPSHOT",
      title: "Workspace Consolidated Telemetry Log",
      details: [
        { label: "Active Project Scope Context", value: activeProject, isMeta: true },
        { label: "Requirements Matrix Status", value: `${counts.approvedReqs} of ${counts.requirements} items approved and baselined.` },
        { label: "Sprint Iteration Scope Progress", value: `${counts.doneStories} of ${counts.stories} user stories finalized.` },
        { label: "Active Vulnerability Count", value: `${counts.activeRisks} active profile threats currently tracked.` },
        { label: "QA Pipeline Density", value: `${counts.openDefects} active defects (${counts.criticalDefects} critical exceptions blocking release).`, color: counts.criticalDefects > 0 ? "C0392B" : "2C3E50" },
        { label: "User Acceptance Criteria Validation", value: `${counts.uatPct}% scenarios passed (${counts.uatPassed}/${counts.uatTotal} executed).`, color: "27AE60" },
        { label: "Consolidated Portfolio Health SLA Factor", value: `${counts.healthScore} out of 100 points.` }
      ]
    }];

    exportToWordBrief("Workspace Executive Status & Telemetry Briefing Report", activeProject, structuredItems, `Executive_Workspace_Brief_${activeProject}`);
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground text-sm font-medium">Assembling workspace context...</div>;

  const riskPieData = [
    { name: "Critical", value: dbRisks.filter(r => r.impact === 'High' && r.probability === 'High').length || 0, color: "#EF4444" },
    { name: "High", value: dbRisks.filter(r => (r.impact === 'High' && r.probability === 'Medium') || (r.impact === 'Medium' && r.probability === 'High')).length || 0, color: "#F59E0B" },
    { name: "Medium", value: dbRisks.filter(r => r.impact === 'Medium' && r.probability === 'Medium').length || 0, color: "#3B82F6" },
    { name: "Low", value: dbRisks.filter(r => r.impact === 'Low' || r.probability === 'Low').length || 0, color: "#10B981" },
  ].filter(cell => cell.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">Workspace Control Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Live operational telemetry context for <span className="font-bold text-foreground">{activeProject}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" onClick={handleExcelExport}><Download size={13} /> Excel</Btn>
          <Btn variant="secondary" onClick={handleWordExport}><Download size={13} /> Word Summary</Btn>
        </div>
      </div>

      {/* QUICK WORKSPACE LAUNCHPAD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <button onClick={() => onViewChange("requirements")} className="p-3 bg-card border border-border/70 hover:border-primary/40 rounded-xl transition-all text-left flex items-center gap-3 group shadow-sm">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"><FilePlus size={15}/></div>
          <div className="min-w-0"><div className="text-xs font-bold text-foreground truncate">Requirements</div><div className="text-[10px] text-muted-foreground">Draft specifications</div></div>
        </button>
        <button onClick={() => onViewChange("defects")} className="p-3 bg-card border border-border/70 hover:border-primary/40 rounded-xl transition-all text-left flex items-center gap-3 group shadow-sm">
          <div className="p-2 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"><Bug size={15}/></div>
          <div className="min-w-0"><div className="text-xs font-bold text-foreground truncate">Log Defect</div><div className="text-[10px] text-muted-foreground">File a QA/UAT bug</div></div>
        </button>
        {/* 💡 WORKSPACE LINK INJECTION: Points directly to your live interactive UAT Testing Scripts module */}
        <button onClick={() => onViewChange("uat-tester")} className="p-3 bg-card border border-border/70 hover:border-primary/40 rounded-xl transition-all text-left flex items-center gap-3 group shadow-sm">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"><CheckSquare size={15}/></div>
          <div className="min-w-0"><div className="text-xs font-bold text-foreground truncate">Run UAT Scripts</div><div className="text-[10px] text-muted-foreground">Execute pilot verification</div></div>
        </button>
        <button onClick={() => onViewChange("workspace-settings")} className="p-3 bg-card border border-border/70 hover:border-primary/40 rounded-xl transition-all text-left flex items-center gap-3 group shadow-sm">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"><Settings size={15}/></div>
          <div className="min-w-0"><div className="text-xs font-bold text-foreground truncate">Settings</div><div className="text-[10px] text-muted-foreground">Configure policies</div></div>
        </button>
      </div>

      {/* CORE HYPERLINKED METRIC MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div onClick={() => onViewChange("requirements")} className="cursor-pointer group">
          <Card className="p-5 border-border shadow-sm flex items-center justify-between gap-4 group-hover:border-primary/40 transition-all">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Requirements</span>
              <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{counts.requirements} Items</div>
              <p className="text-[11px] text-muted-foreground">{counts.approvedReqs} Approved</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-xl"><FileText size={20}/></div>
          </Card>
        </div>

        <div onClick={() => onViewChange("defects")} className="cursor-pointer group">
          <Card className="p-5 border-border shadow-sm flex items-center justify-between gap-4 group-hover:border-primary/40 transition-all">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Quality Signal</span>
              <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{counts.openDefects} Open Bugs</div>
              <p className="text-[11px] text-red-500 font-medium">{counts.criticalDefects} Unresolved</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl"><Bug size={20}/></div>
          </Card>
        </div>

        <div onClick={() => onViewChange("uat")} className="cursor-pointer group">
          <Card className="p-5 border-border shadow-sm flex items-center justify-between gap-4 group-hover:border-primary/40 transition-all">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">UAT Progress</span>
              <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{counts.uatPct}% Passed</div>
              <p className="text-[11px] text-muted-foreground">{counts.uatPassed}/{counts.uatTotal} Verified</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-xl"><CheckSquare size={20}/></div>
          </Card>
        </div>

        <div onClick={() => onViewChange("project-health")} className="cursor-pointer group">
          <Card className="p-5 border-border shadow-sm flex items-center justify-between gap-4 group-hover:border-primary/40 transition-all">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">System Health</span>
              <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{counts.healthScore}/100</div>
              <p className="text-[11px] text-amber-500 font-medium">Readiness: {counts.avgReadiness}%</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-xl"><Activity size={20}/></div>
          </Card>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 shrink-0">
        
        {/* LINE CHART */}
        <Card className="p-5 lg:col-span-2 border-border shadow-sm flex flex-col h-[340px]">
          <div className="border-b border-border/60 pb-3 mb-4 shrink-0">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Defect Stabilization Trend</h3>
            <p className="text-[11px] text-muted-foreground">Historical snapshot comparison of incoming defects vs closures</p>
          </div>
          <div className="flex-1 min-h-0 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={defectTrendData} margin={{ top: 5, right: 15, left: -20, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="week" dy={8} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="opened" stroke="#EF4444" strokeWidth={2.5} dot={false} name="Opened" />
                <Line type="monotone" dataKey="closed" stroke="#10B981" strokeWidth={2.5} dot={false} name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* PIE CHART */}
        <Card className="p-5 border-border shadow-sm flex flex-col h-[340px]">
          <div className="border-b border-border/60 pb-3 mb-4 shrink-0">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Threat & Risk Profiles</h3>
            <p className="text-[11px] text-muted-foreground">Live volume segmentation for active project threats</p>
          </div>
          
          {riskPieData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground italic gap-2">
              <ShieldAlert size={20} className="text-emerald-500/40"/> Zero active project threats logged.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between min-h-0 cursor-pointer pb-2" onClick={() => onViewChange("risk-dashboard")}>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={4} dataKey="value" nameKey="name">
                      {riskPieData.map((entry) => <Cell key={`pie-${entry.name}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border text-[11px] font-semibold hover:border-primary/30 transition-colors">
                {riskPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground truncate">{d.name}: <span className="font-mono font-bold text-foreground">{d.value}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* LOWER GRANULAR DATA SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 pb-4">
        
        {/* WORKSPACE AUDIT LOG */}
        <Card className="p-5 lg:col-span-2 border-border shadow-sm flex flex-col h-[280px]">
          <div className="border-b border-border/60 pb-3 mb-4 shrink-0 flex justify-between items-center">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Workspace Audit Log</h3>
            <button onClick={() => onViewChange("recent-activity")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5">Full Log <ArrowRight size={10}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {activities.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground italic h-full flex flex-col items-center justify-center">
                No recent workspace updates logged.
              </div>
            ) : (
              activities.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-1.5 hover:bg-muted/30 rounded-lg transition-colors">
                  <Avatar initials={a.user_initials || "ME"} color={a.avatar_color || "blue"} size="xs" />
                  <div className="flex-1 min-w-0 text-xs">
                    <span className="font-bold text-foreground">{a.user_name || "You"}</span>{" "}
                    <span className="text-muted-foreground">{a.action_type}</span>{" "}
                    <span className="font-mono font-medium text-primary bg-primary/5 px-1 rounded">
                      {a.target_item_id}{a.target_item_title ? `: ${a.target_item_title}` : ""}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* ACTIVE LAUNCH BLOCKERS */}
        <Card className="p-5 border-border shadow-sm flex flex-col h-[280px]">
          <div className="border-b border-border/60 pb-3 mb-4 shrink-0 flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Flame size={14} className="text-red-500" /> Active Blockers
            </h3>
            <Badge className="bg-red-100 text-red-700 border-none text-[10px] font-bold px-2">{dbBlockers.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
            {dbBlockers.length === 0 ? (
              <div className="text-center p-8 text-xs text-muted-foreground italic flex flex-col items-center gap-1.5 h-full justify-center">
                <CheckSquare size={20} className="text-emerald-500/40"/> Zero structural blockers active.
              </div>
            ) : (
              dbBlockers.map(b => (
                <div key={b.id} onClick={() => onViewChange("dependencies")} className="cursor-pointer rounded-xl border border-red-100 bg-red-50/20 p-3 shadow-sm hover:border-red-400 transition-all group/item">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-bold text-foreground group-hover/item:text-primary transition-colors leading-snug truncate">{b.title}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{b.description || "No qualitative analysis provided."}</div>
                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-muted-foreground">
                        <span>Owner: {b.owner || "Unassigned"}</span>
                        <span className="text-red-500 font-bold">Due: {b.target_date ? new Date(b.target_date).toLocaleDateString() : "TBD"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}