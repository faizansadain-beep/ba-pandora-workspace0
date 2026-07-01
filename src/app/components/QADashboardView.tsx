
import { useState, useEffect } from "react";
import { Download, Filter, Bug, ShieldCheck, AlertTriangle, FileWarning, Activity, CheckCircle2, XCircle, MinusCircle, ListChecks } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function QADashboardView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("all");

  const [sprints, setSprints] = useState<any[]>([]);

  // QA Metrics Data
  const [metrics, setMetrics] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    untestedTests: 0,
    activeDefects: 0,
    criticalDefects: 0,
    resolvedDefects: 0,
    qualityHealth: "Good",
    recentDefects: [] as any[]
  });

  async function fetchQADashboardData() {
    setLoading(true);
    try {
      const { data: sprintData } = await supabase.from('delivery_sprints').select('sprint_id, title').eq('project_name', activeProject);
      if (sprintData) setSprints(sprintData);

      let testsQuery = supabase.from('testing_cases').select('status, sprint_id').eq('project_name', activeProject);
      let defectsQuery = supabase.from('testing_defects').select('defect_id, title, severity, status, sprint_id').eq('project_name', activeProject);

      if (selectedSprint !== "all") {
        testsQuery = testsQuery.eq('sprint_id', selectedSprint);
        defectsQuery = defectsQuery.eq('sprint_id', selectedSprint);
      }

      const [testsRes, defectsRes] = await Promise.all([testsQuery, defectsQuery]);

      const tests = testsRes.data || [];
      const defects = defectsRes.data || [];

      // Calculate Test Metrics
      let passed = 0, failed = 0, untested = 0;
      tests.forEach(t => {
        if (t.status === 'Passed') passed++;
        else if (t.status === 'Failed' || t.status === 'Blocked') failed++;
        else untested++;
      });

      // Calculate Defect Metrics
      let active = 0, critical = 0, resolved = 0;
      const recentActiveDefects: any[] = [];
      
      defects.forEach(d => {
        if (d.status === 'Resolved' || d.status === 'Closed') {
          resolved++;
        } else {
          active++;
          if (d.severity === 'Critical' || d.severity === 'High') critical++;
          recentActiveDefects.push(d);
        }
      });

      // Determine Quality Health
      const executionRate = tests.length > 0 ? (passed / tests.length) * 100 : 0;
      let health = "Green";
      if (critical > 0 || executionRate < 50) health = "Red";
      else if (active > 5 || executionRate < 80) health = "Amber";

      setMetrics({
        totalTests: tests.length,
        passedTests: passed,
        failedTests: failed,
        untestedTests: untested,
        activeDefects: active,
        criticalDefects: critical,
        resolvedDefects: resolved,
        qualityHealth: health,
        recentDefects: recentActiveDefects.slice(0, 6)
      });

    } catch (error) {
      console.error("QA Dashboard error:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchQADashboardData();
  }, [activeProject, selectedSprint, dateRange]);

  // --- QA CSV Export Engine ---
  const handleExportCSV = () => {
    const headers = ["QA Metric", "Value", "Date Generated"];
    const today = new Date().toISOString().split('T')[0];
    
    const rows = [
      ["Project Name", activeProject, today],
      ["Quality Health Status", metrics.qualityHealth, today],
      ["Total Test Cases", metrics.totalTests.toString(), today],
      ["Passed Tests", metrics.passedTests.toString(), today],
      ["Failed/Blocked Tests", metrics.failedTests.toString(), today],
      ["Untested", metrics.untestedTests.toString(), today],
      ["Test Execution Rate", metrics.totalTests > 0 ? Math.round((metrics.passedTests / metrics.totalTests) * 100) + "%" : "0%", today],
      ["Active Defects (Open/In Progress)", metrics.activeDefects.toString(), today],
      ["Critical/High Severity Defects", metrics.criticalDefects.toString(), today],
      ["Resolved/Closed Defects", metrics.resolvedDefects.toString(), today],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QA_Quality_Report_${activeProject.replace(/\s+/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executionPercent = metrics.totalTests > 0 ? Math.round(((metrics.passedTests + metrics.failedTests) / metrics.totalTests) * 100) : 0;
  const passPercent = metrics.totalTests > 0 ? Math.round((metrics.passedTests / metrics.totalTests) * 100) : 0;

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <SectionHeader
        title="Quality Assurance (QA) Dashboard"
        sub={`Monitor test execution, defect triage, and overall software stability for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={handleExportCSV}>
            <Download size={13} /> Export QA Report
          </Btn>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-3 bg-muted/30 border border-border flex flex-wrap gap-4 items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
          <Filter size={14} /> Filter Execution:
        </div>
        
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <div className="w-px h-6 bg-border mx-2" />

        <select 
          value={selectedSprint} 
          onChange={(e) => setSelectedSprint(e.target.value)}
          className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none min-w-[150px]"
        >
          <option value="all">All Sprints / Global</option>
          {sprints.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_id} - {s.title}</option>)}
        </select>
      </Card>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Compiling test results...</div>
      ) : (
        <div className="space-y-6">
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Build Health */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Build Stability</span>
                <ShieldCheck size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", metrics.qualityHealth === 'Green' ? "text-emerald-500" : metrics.qualityHealth === 'Amber' ? "text-amber-500" : "text-red-500")}>
                  {metrics.qualityHealth}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Based on test pass rate & active blockers</p>
            </Card>

            {/* Test Execution Rate */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Test Coverage / Passed</span>
                <ListChecks size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className="text-3xl font-black text-foreground">{passPercent}%</div>
                <div className="text-sm font-medium text-muted-foreground mb-1">{metrics.passedTests} / {metrics.totalTests}</div>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${passPercent}%` }} />
              </div>
            </Card>

            {/* Active Defects */}
            <Card className={cn("p-5 flex flex-col gap-2 border shadow-sm", metrics.activeDefects > 0 ? "border-amber-200 bg-amber-50/10" : "border-emerald-200")}>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Active Defects</span>
                <Bug size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", metrics.activeDefects > 0 ? "text-amber-600" : "text-emerald-500")}>
                  {metrics.activeDefects}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Unresolved Bugs</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{metrics.resolvedDefects} bugs resolved historically</p>
            </Card>

            {/* Critical Blockers */}
            <Card className={cn("p-5 flex flex-col gap-2 border shadow-sm", metrics.criticalDefects > 0 ? "border-red-200 bg-red-50/20" : "border-emerald-200")}>
              <div className="flex items-center justify-between text-red-600 dark:text-red-500">
                <span className="text-xs font-bold uppercase tracking-wider">Critical Blockers</span>
                <FileWarning size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", metrics.criticalDefects > 0 ? "text-red-600" : "text-emerald-500")}>
                  {metrics.criticalDefects}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">High Severity</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Requires immediate dev attention</p>
            </Card>
          </div>

          {/* QA ACTION PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Test Execution Status */}
            <Card className="p-5 flex flex-col border-border shadow-sm h-[300px]">
              <div className="flex items-center gap-2 mb-6 text-foreground border-b border-border/50 pb-3">
                <Activity size={16} className="text-blue-500"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Test Execution Progress</h3>
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-5 px-4">
                {[
                  { label: "Passed", count: metrics.passedTests, icon: <CheckCircle2 size={14} className="text-emerald-500"/>, color: "bg-emerald-500" },
                  { label: "Failed / Blocked", count: metrics.failedTests, icon: <XCircle size={14} className="text-red-500"/>, color: "bg-red-500" },
                  { label: "Untested / Queued", count: metrics.untestedTests, icon: <MinusCircle size={14} className="text-slate-400"/>, color: "bg-slate-300" }
                ].map(stat => {
                  const pct = metrics.totalTests === 0 ? 0 : Math.round((stat.count / metrics.totalTests) * 100);
                  return (
                    <div key={stat.label} className="flex items-center gap-4">
                      <div className="w-36 flex items-center gap-2 text-xs font-bold text-muted-foreground truncate">
                        {stat.icon} {stat.label}
                      </div>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex items-center">
                        <div className={cn("h-full transition-all duration-1000", stat.color)} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <div className="w-12 text-right text-xs font-bold font-mono">{stat.count}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Active Defects Queue */}
            <Card className="p-5 flex flex-col border-border shadow-sm h-[300px]">
              <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 text-foreground">
                  <AlertTriangle size={16} className="text-amber-500"/>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Recent Active Defects</h3>
                </div>
                <Badge className="bg-muted text-muted-foreground border-none text-[10px]">{metrics.activeDefects} Total</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {metrics.recentDefects.length === 0 ? (
                   <div className="text-center p-8 text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                     <ShieldCheck size={24} className="text-emerald-500/50" />
                     No active defects. The build is perfectly clean!
                   </div>
                ) : (
                  metrics.recentDefects.map((defect, i) => (
                    <div key={i} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex justify-between items-center gap-3 hover:border-primary/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono text-primary font-bold mb-0.5">{defect.defect_id}</div>
                        <div className="text-xs font-semibold text-foreground truncate">{defect.title}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={cn("text-[9px] px-1.5 py-0 border-none", 
                          defect.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                          defect.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                          defect.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        )}>
                          {defect.severity}
                        </Badge>
                        <span className="text-[9px] font-medium text-muted-foreground uppercase">{defect.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}