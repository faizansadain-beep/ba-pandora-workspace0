import { useState, useEffect } from "react";
import { Download, Filter, AlertTriangle, ShieldAlert, ShieldCheck, Activity, Target, Shield } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";
import { exportToExcel, exportToWordBrief } from "../../lib/exportUtils";

export default function RiskDashboardView({ activeProject }: { activeProject: string }) {
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState("all");

  // Risk Metrics Data
  const [metrics, setMetrics] = useState({
    totalRisks: 0,
    activeRisks: 0,
    criticalRisks: 0,
    mitigatedRisks: 0,
    riskExposureScore: 0,
    recentRisks: [] as any[],
    matrix: {
      highHigh: 0, highMed: 0, highLow: 0,
      medHigh: 0, medMed: 0, medLow: 0,
      lowHigh: 0, lowMed: 0, lowLow: 0
    }
  });

  async function fetchRiskDashboardData() {
    setLoading(true);
    try {
      // Switched to 'risks' to match your actual schema
      const { data: risks } = await supabase
        .from('risks')
        .select('*')
        .eq('project_name', activeProject)
        .order('created_at', { ascending: false });

      const riskList = risks || [];

      let active = 0, critical = 0, mitigated = 0;
      let exposureScore = 0;
      
      const matrixCounts = {
        highHigh: 0, highMed: 0, highLow: 0,
        medHigh: 0, medMed: 0, medLow: 0,
        lowHigh: 0, lowMed: 0, lowLow: 0
      };

      riskList.forEach(r => {
        if (r.status === 'Mitigated' || r.status === 'Closed') {
          mitigated++;
        } else {
          active++;
          
          // 💡 FIXED: Replaced SQL comments (--) with TypeScript comments (//)
          // Calculate exposure (1-9 scale based on Impact x Probability)
          const impactVal = r.impact === 'High' ? 3 : r.impact === 'Medium' ? 2 : 1;
          const probVal = r.probability === 'High' ? 3 : r.probability === 'Medium' ? 2 : 1;
          const score = impactVal * probVal;
          exposureScore += score;

          if (score >= 6) critical++;

          // Matrix mapping
          if (r.impact === 'High' && r.probability === 'High') matrixCounts.highHigh++;
          else if (r.impact === 'High' && r.probability === 'Medium') matrixCounts.highMed++;
          else if (r.impact === 'High' && r.probability === 'Low') matrixCounts.highLow++;
          else if (r.impact === 'Medium' && r.probability === 'High') matrixCounts.medHigh++;
          else if (r.impact === 'Medium' && r.probability === 'Medium') matrixCounts.medMed++;
          else if (r.impact === 'Medium' && r.probability === 'Low') matrixCounts.medLow++;
          else if (r.impact === 'Low' && r.probability === 'High') matrixCounts.lowHigh++;
          else if (r.impact === 'Low' && r.probability === 'Medium') matrixCounts.lowMed++;
          else if (r.impact === 'Low' && r.probability === 'Low') matrixCounts.lowLow++;
        }
      });

      setMetrics({
        totalRisks: riskList.length,
        activeRisks: active,
        criticalRisks: critical,
        mitigatedRisks: mitigated,
        riskExposureScore: exposureScore,
        recentRisks: riskList.filter(r => r.status !== 'Mitigated' && r.status !== 'Closed').slice(0, 6),
        matrix: matrixCounts
      });

    } catch (error) {
      console.error("Risk Dashboard calculation error:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRiskDashboardData();
  }, [activeProject, dateRange]);

  // --- EXPORT UTILS TRIGGERS ---
  function handleExcelExport() {
    const formattedRows = [
      { "Risk Operational Metric": "Project Target Name", "Summary Value / Count": activeProject },
      { "Risk Operational Metric": "Total Cumulative Risk Exposure Score", "Summary Value / Count": metrics.riskExposureScore },
      { "Risk Operational Metric": "Total Tracked Risks Logged", "Summary Value / Count": metrics.totalRisks },
      { "Risk Operational Metric": "Active Blocker Risks Outstanding", "Summary Value / Count": metrics.activeRisks },
      { "Risk Operational Metric": "Critical Matrix Exposure Risks", "Summary Value / Count": metrics.criticalRisks },
      { "Risk Operational Metric": "Successfully Mitigated or Closed Risks", "Summary Value / Count": metrics.mitigatedRisks },
      { 
        "Risk Operational Metric": "Project Risk Mitigation Efficiency Rate", 
        "Summary Value / Count": metrics.totalRisks > 0 ? Math.round((metrics.mitigatedRisks / metrics.totalRisks) * 100) + "%" : "0%" 
      }
    ];

    const columnWidths = [
      { wch: 45 }, // Risk Operational Metric
      { wch: 25 }  // Summary Value / Count
    ];

    exportToExcel(formattedRows, "Risk Assessment Summary", `Risk_Dashboard_Summary_${activeProject}`, columnWidths);
  }

  function handleWordExport() {
    const mitigationRate = metrics.totalRisks > 0 ? Math.round((metrics.mitigatedRisks / metrics.totalRisks) * 100) + "%" : "0%";
    
    const structuredItems = [
      {
        id: "RISK-KPI",
        title: "Project Risk Profile KPI Dashboard Metrics",
        details: [
          { label: "Active Project Scope Workspace", value: activeProject, isMeta: true },
          { label: "Cumulative Risk Exposure Score", value: metrics.riskExposureScore.toString(), color: "A93226" },
          { label: "Active Outstanding Unresolved Threats", value: metrics.activeRisks.toString() },
          { label: "Critical Priority Boundaries", value: metrics.criticalRisks.toString(), color: "C0392B" },
          { label: "Total Closed/Mitigated Risks", value: `${metrics.mitigatedRisks} / ${metrics.totalRisks} (${mitigationRate} Resolution Efficiency Ratio)`, color: "27AE60" }
        ]
      }
    ];

    exportToWordBrief("Risk Management Exposure & Executive Summary Assessment Report", activeProject, structuredItems, `Risk_Analysis_Executive_Brief_${activeProject}`);
  }

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-y-auto custom-scrollbar">
      <SectionHeader
        title="Risk & Threat Dashboard"
        sub={`Monitor project vulnerabilities, mitigation progress, and overall risk exposure for ${activeProject}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={handleExcelExport}>
              <Download size={13} /> Excel
            </Btn>
            <Btn variant="secondary" onClick={handleWordExport}>
              <Download size={13} /> Word Brief
            </Btn>
          </div>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-3 bg-muted/30 border border-border flex flex-wrap gap-4 items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
          <Filter size={14} /> Filter Timeframe:
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
      </Card>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm font-medium">Calculating risk exposure...</div>
      ) : (
        <div className="space-y-6">
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Exposure Score */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Total Exposure Score</span>
                <Activity size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", metrics.riskExposureScore > 20 ? "text-red-500" : metrics.riskExposureScore > 10 ? "text-amber-500" : "text-emerald-500")}>
                  {metrics.riskExposureScore}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Cumulative Impact x Probability</p>
            </Card>

            {/* Active Risks */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Active Threats</span>
                <Target size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className="text-3xl font-black text-foreground">{metrics.activeRisks}</div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Unresolved Risks</div>
              </div>
            </Card>

            {/* Critical Risks */}
            <Card className={cn("p-5 flex flex-col gap-2 border shadow-sm transition-colors", 
              metrics.criticalRisks > 0 ? "border-red-200 bg-red-50/20" : "border-emerald-200"
            )}>
              <div className="flex items-center justify-between text-red-600 dark:text-red-500">
                <span className="text-xs font-bold uppercase tracking-wider">Critical Priority</span>
                <ShieldAlert size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className={cn("text-3xl font-black", metrics.criticalRisks > 0 ? "text-red-600" : "text-emerald-500")}>
                  {metrics.criticalRisks}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Require Action</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">High Impact & High Probability</p>
            </Card>

            {/* Mitigated Risks */}
            <Card className="p-5 flex flex-col gap-2 border-border shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-500">
                <span className="text-xs font-bold uppercase tracking-wider">Successfully Mitigated</span>
                <ShieldCheck size={16} />
              </div>
              <div className="flex items-end gap-3 mt-1">
                <div className="text-3xl font-black text-emerald-500">
                  {metrics.mitigatedRisks}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">/ {metrics.totalRisks} Total</div>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${metrics.totalRisks > 0 ? (metrics.mitigatedRisks/metrics.totalRisks)*100 : 0}%` }} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Heatmap Matrix */}
            <Card className="p-5 flex flex-col border-border shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-foreground border-b border-border/50 pb-3">
                <Activity size={16} className="text-primary"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Active Risk Heatmap</h3>
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="grid grid-cols-4 gap-1 text-xs font-bold text-center w-full max-w-md">
                  {/* Headers */}
                  <div className="col-span-1 flex items-end justify-center pb-2 opacity-50 -rotate-90 origin-bottom">IMPACT</div>
                  <div className="pb-2 opacity-50">LOW (Prob)</div>
                  <div className="pb-2 opacity-50">MED (Prob)</div>
                  <div className="pb-2 opacity-50">HIGH (Prob)</div>

                  {/* HIGH Impact Row */}
                  <div className="flex items-center justify-end pr-3 opacity-50">HIGH</div>
                  <div className="bg-amber-100 text-amber-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.highLow}</div>
                  <div className="bg-orange-100 text-orange-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.highMed}</div>
                  <div className="bg-red-100 text-red-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.highHigh}</div>

                  {/* MED Impact Row */}
                  <div className="flex items-center justify-end pr-3 opacity-50">MED</div>
                  <div className="bg-emerald-100 text-emerald-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.medLow}</div>
                  <div className="bg-amber-100 text-amber-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.medMed}</div>
                  <div className="bg-orange-100 text-orange-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.medHigh}</div>

                  {/* LOW Impact Row */}
                  <div className="flex items-center justify-end pr-3 opacity-50">LOW</div>
                  <div className="bg-slate-100 text-slate-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.lowLow}</div>
                  <div className="bg-emerald-100 text-emerald-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.lowMed}</div>
                  <div className="bg-amber-100 text-amber-800 p-6 rounded flex items-center justify-center text-lg">{metrics.matrix.lowHigh}</div>
                </div>
              </div>
            </Card>

            {/* Top Active Threats */}
            <Card className="p-5 flex flex-col border-border shadow-sm h-[350px]">
              <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 text-foreground">
                  <AlertTriangle size={16} className="text-amber-500"/>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Top Active Threats</h3>
                </div>
                <Badge className="bg-muted text-muted-foreground border-none text-[10px]">{metrics.activeRisks} Total</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {metrics.recentRisks.length === 0 ? (
                   <div className="text-center p-8 text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                     <Shield size={24} className="text-emerald-500/50" />
                     No active risks. Everything is running smoothly!
                   </div>
                ) : (
                  metrics.recentRisks.map((risk, i) => (
                    <div key={i} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex flex-col gap-1.5 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start gap-3">
                        <div className="text-xs font-semibold text-foreground truncate">{risk.title}</div>
                        <Badge className={cn("text-[9px] px-1.5 py-0 border-none", 
                          risk.impact === 'High' && risk.probability === 'High' ? 'bg-red-100 text-red-700' :
                          (risk.impact === 'High' || risk.probability === 'High') ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        )}>
                          I:{risk.impact} | P:{risk.probability}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{risk.description}</div>
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