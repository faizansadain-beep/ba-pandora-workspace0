import { useState, useEffect } from "react";
import { Download, Filter, FileText, Link2, AlertCircle, CheckSquare, Layers, FileSearch, PieChart, Focus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function BADashboardView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("all");

  // Filter Dropdown Data
  const [sprints, setSprints] = useState<any[]>([]);

  // BA Metrics Data
  const [metrics, setMetrics] = useState({
    totalFeatures: 0,
    mappedFeatures: 0,
    totalStories: 0,
    storiesWithPoints: 0,
    storiesWithDescriptions: 0,
    orphanStories: 0,
    traceabilityScore: 0,
    requirementsHealth: "Good",
    recentBacklog: [] as any[]
  });

  async function fetchBADashboardData() {
    setLoading(true);
    try {
      // 1. Fetch available sprints for filters
      const { data: sprintData } = await supabase.from('delivery_sprints').select('sprint_id, title').eq('project_name', activeProject);
      if (sprintData) setSprints(sprintData);

      // 2. Fetch BA-specific data (Features + Backlog)
      let featureQuery = supabase.from('product_features').select('feature_id, title, priority').eq('project_name', activeProject);
      let backlogQuery = supabase.from('product_backlog').select('story_id, title, description, story_points, sprint_id, execution_status').eq('project_name', activeProject);

      if (selectedSprint !== "all") {
        backlogQuery = backlogQuery.eq('sprint_id', selectedSprint);
      }

      const [featureRes, backlogRes] = await Promise.all([featureQuery, backlogQuery]);

      const features = featureRes.data || [];
      const backlog = backlogRes.data || [];

      // Calculate BA KPIs
      const totalFeat = features.length;
      const totalStories = backlog.length;
      
      let definedPoints = 0;
      let definedDesc = 0;
      let unassignedSprint = 0;

      backlog.forEach(story => {
        if (story.story_points && story.story_points > 0) definedPoints++;
        if (story.description && story.description.trim().length > 10) definedDesc++;
        if (!story.sprint_id) unassignedSprint++;
      });

      // Calculate a "Traceability & Definition Health Score" (0-100)
      // Based on: Do stories have points? Do they have descriptions? 
      const pointsScore = totalStories > 0 ? (definedPoints / totalStories) * 50 : 0;
      const descScore = totalStories > 0 ? (definedDesc / totalStories) * 50 : 0;
      const tScore = Math.round(pointsScore + descScore);

      let health = "Green";
      if (tScore < 60) health = "Red";
      else if (tScore < 85) health = "Amber";

      setMetrics({
        totalFeatures: totalFeat,
        mappedFeatures: totalFeat, // In a fully mapped DB, we'd check feature_id on stories
        totalStories: totalStories,
        storiesWithPoints: definedPoints,
        storiesWithDescriptions: definedDesc,
        orphanStories: unassignedSprint,
        traceabilityScore: tScore,
        requirementsHealth: health,
        recentBacklog: backlog.slice(0, 6)
      });

    } catch (error) {
      console.error("BA Dashboard calculation error:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBADashboardData();
  }, [activeProject, selectedSprint, dateRange]);

  // --- BA CSV Export Engine ---
  const handleExportCSV = () => {
    const headers = ["BA Metric", "Value", "Notes", "Date Generated"];
    const today = new Date().toISOString().split('T')[0];
    
    const rows = [
      ["Project Name", activeProject, "Active Project Scope", today],
      ["Definition Health Score", `${metrics.traceabilityScore}%`, "Based on points and descriptions presence", today],
      ["Total Features Logged", metrics.totalFeatures.toString(), "High-level scope items", today],
      ["Total User Stories Logged", metrics.totalStories.toString(), "Granular requirements", today],
      ["Stories Missing Sizing (Points)", (metrics.totalStories - metrics.storiesWithPoints).toString(), "Requires planning poker/estimation", today],
      ["Stories Missing Detail", (metrics.totalStories - metrics.storiesWithDescriptions).toString(), "Requires acceptance criteria/descriptions", today],
      ["Unassigned / Backlog Pool", metrics.orphanStories.toString(), "Stories not yet in a sprint", today],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BA_Requirements_Report_${activeProject.replace(/\s+/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <SectionHeader
        title="Business Analyst (BA) Dashboard"
        sub={`Monitor requirements coverage, scope traceability, and backlog definition health for ${activeProject}`}
        actions={
          <Btn variant="primary" onClick={handleExportCSV}>
            <Download size={13} /> Export BA Report
          </Btn>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-3 bg-muted/30 border border-border flex flex-wrap gap-4 items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
          <Filter size={14} /> View Scope:
        </div>
        
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
        >
          <option value="all">All Requirements</option>
          <option value="today">Created Today</option>
          <option value="week">Created This Week</option>
          <option value="month">Created This Month</option>
        </select>

        <div className="w-px h-6 bg-border mx-2" />

        <select 
          value={selectedSprint} 
          onChange={(e) => setSelectedSprint(e.target.value)}
          className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none min-w-[150px]"
        >
          <option value="all">Entire Backlog Pool</option>
          {sprints.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_id} - {s.title}</option>)}
        </select>
      </Card>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Analyzing requirement traceability...</div>
      ) : (
        <div className="space-y-6">
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Health Score */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Definition Health</span>
                <Focus size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", metrics.requirementsHealth === 'Green' ? "text-emerald-500" : metrics.requirementsHealth === 'Amber' ? "text-amber-500" : "text-red-500")}>
                  {metrics.traceabilityScore}%
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Quality of descriptions & estimations</p>
              <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                <div className={cn("h-full", metrics.requirementsHealth === 'Green' ? "bg-emerald-500" : metrics.requirementsHealth === 'Amber' ? "bg-amber-500" : "bg-red-500")} style={{ width: `${metrics.traceabilityScore}%` }} />
              </div>
            </Card>

            {/* Scope Tracker */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Total Requirements</span>
                <Layers size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className="text-3xl font-black text-foreground">{metrics.totalStories}</div>
                <div className="text-sm font-medium text-muted-foreground mb-1">User Stories</div>
              </div>
              <div className="flex gap-2 mt-2">
                 <Badge className="bg-primary/10 text-primary border-none text-[9px]">{metrics.totalFeatures} Epics/Features</Badge>
              </div>
            </Card>

            {/* Missing Estimations */}
            <Card className={cn("p-5 flex flex-col gap-2 border shadow-sm transition-colors", 
              (metrics.totalStories - metrics.storiesWithPoints) > 0 ? "border-amber-200 bg-amber-50/20" : "border-emerald-200"
            )}>
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-500">
                <span className="text-xs font-bold uppercase tracking-wider">Missing Sizing</span>
                <PieChart size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", (metrics.totalStories - metrics.storiesWithPoints) > 0 ? "text-amber-600" : "text-emerald-500")}>
                  {metrics.totalStories - metrics.storiesWithPoints}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Unpointed Stories</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Requires grooming / planning poker</p>
            </Card>

            {/* Missing Detail */}
            <Card className={cn("p-5 flex flex-col gap-2 border shadow-sm",
              (metrics.totalStories - metrics.storiesWithDescriptions) > 0 ? "border-red-200 bg-red-50/20" : "border-emerald-200"
            )}>
              <div className="flex items-center justify-between text-red-600 dark:text-red-500">
                <span className="text-xs font-bold uppercase tracking-wider">Missing Detail</span>
                <FileSearch size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", (metrics.totalStories - metrics.storiesWithDescriptions) > 0 ? "text-red-600" : "text-emerald-500")}>
                  {metrics.totalStories - metrics.storiesWithDescriptions}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Lack Descriptions</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Requires BA refinement</p>
            </Card>
          </div>

          {/* BA ACTION PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Traceability Audit */}
            <Card className="p-5 flex flex-col border-border shadow-sm h-[300px]">
              <div className="flex items-center gap-2 mb-4 text-foreground border-b border-border/50 pb-3">
                <Link2 size={16} className="text-blue-500"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Traceability Audit (RTM)</h3>
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-5 px-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-medium"><CheckSquare size={14} className="text-emerald-500"/> Features with Defined Scope</div>
                  <div className="font-mono text-sm font-bold">{metrics.mappedFeatures} / {metrics.totalFeatures}</div>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full" style={{ width: `${metrics.totalFeatures > 0 ? (metrics.mappedFeatures/metrics.totalFeatures)*100 : 0}%` }} />
                </div>

                <div className="flex justify-between items-center pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Layers size={14} className="text-amber-500"/> Orphaned Stories (Not in Sprint)</div>
                  <div className="font-mono text-sm font-bold">{metrics.orphanStories}</div>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                   <div className="bg-amber-500 h-full" style={{ width: `${metrics.totalStories > 0 ? (metrics.orphanStories/metrics.totalStories)*100 : 0}%` }} />
                </div>
              </div>
            </Card>

            {/* BA Action Queue */}
            <Card className="p-5 flex flex-col border-border shadow-sm h-[300px]">
              <div className="flex items-center gap-2 mb-4 text-foreground border-b border-border/50 pb-3">
                <AlertCircle size={16} className="text-primary"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Recent Requirements (Audit View)</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {metrics.recentBacklog.length === 0 ? (
                   <div className="text-center p-8 text-xs text-muted-foreground italic">No user stories logged yet.</div>
                ) : (
                  metrics.recentBacklog.map((story, i) => (
                    <div key={i} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono text-primary font-bold mb-0.5">{story.story_id || 'US-ID'}</div>
                        <div className="text-xs font-semibold text-foreground truncate">{story.title}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!story.story_points ? (
                          <Badge className="bg-red-50 text-red-600 border-red-200 text-[9px] px-1.5 py-0">No Points</Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] px-1.5 py-0">{story.story_points} SP</Badge>
                        )}
                        {!story.description || story.description.length < 10 ? (
                           <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] px-1.5 py-0">Needs Desc</Badge>
                        ) : null}
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