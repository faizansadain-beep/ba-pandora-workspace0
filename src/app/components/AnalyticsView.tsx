import { useState, useEffect } from "react";
import { Download, Filter, BarChart2, TrendingUp, Users, Bug, Zap, GitCommit, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function AnalyticsView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  const [metrics, setMetrics] = useState({
    velocityTrend: [] as { sprint: string, points: number, defects: number }[],
    workload: [] as { owner: string, points: number, count: number }[],
    totalDeliveredPoints: 0,
    averageVelocity: 0,
    defectDensity: 0
  });

  async function fetchAnalytics() {
    setLoading(true);
    try {
      // Fetch core datasets
      const [backlogRes, sprintRes, defectsRes] = await Promise.all([
        supabase.from('product_backlog').select('sprint_id, story_points, execution_status, owner').eq('project_name', activeProject),
        supabase.from('delivery_sprints').select('sprint_id, title').eq('project_name', activeProject).order('created_at', { ascending: true }),
        supabase.from('testing_defects').select('sprint_id').eq('project_name', activeProject)
      ]);

      const backlog = backlogRes.data || [];
      const sprints = sprintRes.data || [];
      const defects = defectsRes.data || [];

      // 1. Calculate Velocity & Defect Density per Sprint
      let totalPoints = 0;
      const sprintData: Record<string, { points: number, defects: number }> = {};
      
      sprints.forEach(s => {
        sprintData[s.sprint_id] = { points: 0, defects: 0 };
      });

      backlog.forEach(item => {
        if (item.execution_status === 'Done' && item.sprint_id) {
          if (!sprintData[item.sprint_id]) sprintData[item.sprint_id] = { points: 0, defects: 0 };
          sprintData[item.sprint_id].points += (item.story_points || 0);
          totalPoints += (item.story_points || 0);
        }
      });

      defects.forEach(d => {
        if (d.sprint_id && sprintData[d.sprint_id]) {
          sprintData[d.sprint_id].defects += 1;
        }
      });

      const velocityArray = Object.keys(sprintData).map(key => ({
        sprint: key,
        points: sprintData[key].points,
        defects: sprintData[key].defects
      }));

      // 2. Calculate Workload Distribution (Who is doing the work?)
      const ownerData: Record<string, { points: number, count: number }> = {};
      backlog.forEach(item => {
        const owner = item.owner || "Unassigned";
        if (!ownerData[owner]) ownerData[owner] = { points: 0, count: 0 };
        ownerData[owner].points += (item.story_points || 0);
        ownerData[owner].count += 1;
      });

      const workloadArray = Object.keys(ownerData)
        .map(key => ({ owner: key, points: ownerData[key].points, count: ownerData[key].count }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5); // Top 5

      // 3. Overall Averages
      const activeSprintsCount = velocityArray.filter(v => v.points > 0).length || 1;
      const avgVelocity = Math.round(totalPoints / activeSprintsCount);
      const avgDensity = totalPoints > 0 ? (defects.length / totalPoints).toFixed(2) : 0;

      setMetrics({
        velocityTrend: velocityArray,
        workload: workloadArray,
        totalDeliveredPoints: totalPoints,
        averageVelocity: avgVelocity,
        defectDensity: Number(avgDensity)
      });

    } catch (error) {
      console.error("Analytics fetch error:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAnalytics();
  }, [activeProject, dateRange]);

  // --- CSV Export Engine ---
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Create multi-section CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Section 1: Top Line Metrics
    csvContent += "--- AGILE ANALYTICS SUMMARY ---\n";
    csvContent += `Project Name,${activeProject}\n`;
    csvContent += `Total Delivered Points,${metrics.totalDeliveredPoints}\n`;
    csvContent += `Average Sprint Velocity,${metrics.averageVelocity}\n`;
    csvContent += `Defect Density (Bugs/Point),${metrics.defectDensity}\n\n`;

    // Section 2: Sprint Velocity Trend
    csvContent += "--- SPRINT VELOCITY TREND ---\n";
    csvContent += "Sprint ID,Delivered Points,Defects Logged\n";
    metrics.velocityTrend.forEach(v => {
      csvContent += `${v.sprint},${v.points},${v.defects}\n`;
    });
    csvContent += "\n";

    // Section 3: Workload
    csvContent += "--- WORKLOAD DISTRIBUTION ---\n";
    csvContent += "Owner/Assignee,Total Points Assigned,Items Count\n";
    metrics.workload.forEach(w => {
      csvContent += `${w.owner},${w.points},${w.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Delivery_Analytics_${activeProject.replace(/\s+/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find max values for charting relative heights
  const maxVelocity = Math.max(...metrics.velocityTrend.map(v => v.points), 10); // Floor of 10 for visuals
  const maxWorkload = Math.max(...metrics.workload.map(w => w.points), 10);

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <SectionHeader
        title="Delivery Analytics & Trends"
        sub={`Deep dive into team velocity, workload distribution, and historical defect trends for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={handleExportCSV}>
            <Download size={13} /> Export Analytics Data
          </Btn>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-3 bg-muted/30 border border-border flex flex-wrap gap-4 items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
          <Filter size={14} /> Analytics Timeframe:
        </div>
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
        >
          <option value="all">All Time History</option>
          <option value="quarter">Current Quarter</option>
          <option value="trailing">Trailing 6 Sprints</option>
        </select>
      </Card>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Crunching historical data...</div>
      ) : (
        <div className="space-y-6">
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-primary/10 text-primary rounded-full shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Average Velocity</span>
                <div className="text-3xl font-black text-foreground mt-1">{metrics.averageVelocity} <span className="text-sm font-bold text-muted-foreground">pts/sprint</span></div>
              </div>
            </Card>

            <Card className="p-6 border border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full shrink-0">
                <Zap size={24} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Delivered</span>
                <div className="text-3xl font-black text-foreground mt-1">{metrics.totalDeliveredPoints} <span className="text-sm font-bold text-muted-foreground">story pts</span></div>
              </div>
            </Card>

            <Card className="p-6 border border-border shadow-sm flex items-center gap-5">
              <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full shrink-0">
                <GitCommit size={24} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Defect Density</span>
                <div className="text-3xl font-black text-foreground mt-1">{metrics.defectDensity} <span className="text-sm font-bold text-muted-foreground">bugs/pt</span></div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* VELOCITY BAR CHART (Span 2) */}
            <Card className="col-span-1 lg:col-span-2 p-6 border-border shadow-sm h-[400px] flex flex-col">
              <div className="flex items-center gap-2 mb-6 text-foreground border-b border-border/50 pb-3 shrink-0">
                <BarChart2 size={16} className="text-primary"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Historical Sprint Velocity</h3>
              </div>
              
              {metrics.velocityTrend.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground italic">No completed sprints recorded yet.</div>
              ) : (
                <div className="flex-1 flex items-end justify-around gap-2 px-2 pt-8 relative">
                  {/* Y-Axis visual guides */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-20">
                    <div className="border-b border-border w-full h-0"></div>
                    <div className="border-b border-border w-full h-0"></div>
                    <div className="border-b border-border w-full h-0"></div>
                    <div className="border-b border-border w-full h-0"></div>
                  </div>

                  {metrics.velocityTrend.map((v, i) => {
                    const heightPct = Math.max((v.points / maxVelocity) * 100, 5); // min 5% height for visibility
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 group w-full max-w-[60px] relative z-10 h-full justify-end">
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded transition-opacity whitespace-nowrap z-20">
                          {v.points} Pts | {v.defects} Bugs
                        </div>
                        <div 
                          className="w-full bg-primary hover:bg-primary/80 rounded-t-md transition-all duration-500 relative flex items-end justify-center pb-2"
                          style={{ height: `${heightPct}%` }}
                        >
                          {v.points > 0 && <span className="text-[10px] font-bold text-primary-foreground rotate-[-90deg] mb-2">{v.points}</span>}
                        </div>
                        <div className="text-[9px] font-mono text-muted-foreground mt-1 truncate w-full text-center">{v.sprint}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* WORKLOAD DISTRIBUTION (Span 1) */}
            <Card className="col-span-1 p-6 border-border shadow-sm h-[400px] flex flex-col">
              <div className="flex items-center gap-2 mb-6 text-foreground border-b border-border/50 pb-3 shrink-0">
                <Users size={16} className="text-blue-500"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Top Workload by Owner</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-2">
                {metrics.workload.length === 0 ? (
                  <div className="text-center p-8 text-sm text-muted-foreground italic">No workload assigned.</div>
                ) : (
                  metrics.workload.map((w, i) => {
                    const pct = Math.max((w.points / maxWorkload) * 100, 2);
                    return (
                      <div key={i} className="space-y-1.5 group">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px]" title={w.owner}>{w.owner}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{w.points} pts ({w.count} items)</span>
                        </div>
                        <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000 group-hover:bg-blue-400" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}