import { useState, useEffect } from "react";
import { Filter, Plus, Calendar, Rocket, ChevronDown, ChevronRight, FileText, BookOpen, Bug, CheckSquare, Flame, ArrowUpRight, FolderOpen, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, StatusBadge, ProgressBar, Badge, Avatar } from "./SharedUI";

export default function ProjectsView({ activeProject, onProjectChange, onViewChange }: { 
  activeProject: string; 
  onProjectChange: (name: string) => void; 
  onViewChange?: (view: string) => void; 
}) {
  const [filter, setFilter] = useState("All");
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track which accordion row is currently open/expanded
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", product: "", client: "", status: "On Track", health: 100, priority: "Medium", ba: "Faizan Sadain" });

  const statuses = ["All", "On Track", "At Risk", "Delayed", "Blocked"];

  async function fetchProjects() {
    setLoading(true);
    try {
      // 1. Fetch root project records
      const { data: projects, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      
      if (error) throw error;

      if (projects) {
        // 2. Fetch cross-dashboard sub-metrics for every project to create accurate summaries
        const populatedProjects = await Promise.all(projects.map(async (p) => {
          const [reqs, stories, defects, uat, crossDependencies] = await Promise.all([
            // 💡 TABLE ALIGNMENT: Swapped from 'requirements' to 'all_requirements'
            supabase.from('all_requirements').select('id, status').eq('project_name', p.name),
            supabase.from('user_stories').select('id, status').eq('project_name', p.name),
            supabase.from('defects').select('id, status, severity').eq('project_name', p.name),
            supabase.from('uat_scenarios').select('id, status').eq('project_name', p.name),
            // 💡 TABLE ALIGNMENT: Swapped from 'blockers' to 'dependencies'
            supabase.from('dependencies').select('id').eq('project_name', p.name)
          ]);

          const rData = reqs.data || [];
          const sData = stories.data || [];
          const dData = defects.data || [];
          const uData = uat.data || [];
          const depData = crossDependencies.data || [];
          
          const passedUat = uData.filter(x => x.status === 'Passed').length;

          return {
            ...p,
            reqCount: rData.length,
            reqApproved: rData.filter(x => x.status === 'Approved' || x.status === 'Implemented').length,
            storyCount: sData.length,
            storyDone: sData.filter(x => x.status === 'Done').length,
            defectCount: dData.filter(x => x.status !== 'Closed').length,
            criticalDefects: dData.filter(x => (x.severity === 'Critical' || x.severity === 'High') && x.status !== 'Closed').length,
            uatPct: uData.length ? Math.round((passedUat / uData.length) * 100) : 0,
            blockerCount: depData.length
          };
        }));

        setDbProjects(populatedProjects);
        
        // Auto-expand the active project on load so the BA sees it immediately
        const currentActive = populatedProjects.find(p => p.name === activeProject);
        if (currentActive) setExpandedProjectId(currentActive.id);
      }
    } catch (err) {
      console.error("Portfolio aggregation engine exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  const toggleAccordion = (id: string) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  const handleLaunchWorkspace = (projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onProjectChange(projectName);
    if (onViewChange) onViewChange("dashboard");
  };

  const handleMetricRedirect = (projectName: string, viewTarget: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onProjectChange(projectName);
    if (onViewChange) onViewChange(viewTarget);
  };

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newId = `PRJ-${Math.floor(Math.random() * 900) + 100}`;
    const newProject = {
      id: newId,
      name: formData.name.trim(),
      product: formData.product.trim(),
      client: formData.client.trim(),
      status: formData.status,
      health: Number(formData.health),
      priority: formData.priority,
      ba: formData.ba,
      pm: "Unassigned",
      release: "TBD",
      sprint: "Backlog",
      completion: 0
    };

    const { error } = await supabase.from('projects').insert([newProject]);

    if (error) {
      alert(`Failed to deploy anchor node: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setFormData({ name: "", product: "", client: "", status: "On Track", health: 100, priority: "Medium", ba: "Faizan Sadain" });
      fetchProjects();
    }
    setIsSubmitting(false);
  }

  const filtered = filter === "All" ? dbProjects : dbProjects.filter(p => p.status === filter);

  if (loading && dbProjects.length === 0) {
    return <div className="p-6 flex items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground text-xs font-semibold tracking-wider">Compiling Portfolio Ledger Context...</div>;
  }

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Portfolio Workspace Registry"
        sub="Expand an operational scope layer below to view centralized cross-module metric summaries"
        actions={
          <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={13} /> New Project Anchor
          </Btn>
        }
      />

      {/* FILTER CONTROLS */}
      <div className="flex gap-1.5 border-b pb-2 shrink-0 select-none">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors", filter === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {s}
          </button>
        ))}
      </div>
      
      {/* ACCORDION CANVAS GRID */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
        {filtered.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
            <FolderOpen size={32} className="text-muted-foreground/30 mb-2"/>
            <div className="text-xs font-bold text-foreground">No portfolio entries match the active criteria filters.</div>
          </Card>
        ) : (
          filtered.map(p => {
            const isExpanded = expandedProjectId === p.id;
            const isCurrentlySelectedGlobalProfile = activeProject === p.name;
            const hColor = p.health >= 80 ? "emerald" : p.health >= 60 ? "amber" : "red";

            return (
              <div 
                key={p.id} 
                className={cn(
                  "border rounded-xl overflow-hidden transition-all bg-card shadow-sm",
                  isCurrentlySelectedGlobalProfile ? "border-primary/50 ring-1 ring-primary/20" : "border-border/80"
                )}
              >
                {/* ACCORDION ROW TRIGGER ROW */}
                <div 
                  onClick={() => toggleAccordion(p.id)}
                  className={cn(
                    "p-4 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors",
                    isExpanded ? "bg-muted/40" : "hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground">{p.id}</span>
                        <h3 className="text-sm font-bold text-foreground truncate max-w-[300px]">{p.name}</h3>
                        {isCurrentlySelectedGlobalProfile && <Badge className="bg-primary/10 text-primary border-none text-[9px] font-extrabold px-1.5 h-4 flex items-center">Active Target</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">{p.product} · {p.client}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-foreground font-mono">{p.completion}%</div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase">Traceability</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </div>

                {/* INLINE EXTENDED ACCORDION EXPANSION PANEL */}
                {isExpanded && (
                  <div className="p-5 border-t border-border/60 bg-background/50 space-y-5 animate-fade-in">
                    
                    {/* TOP SUMMARY BAR */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 text-xs select-none">
                      <div><span className="text-muted-foreground font-medium block mb-0.5">Assigned BA Anchor</span><span className="font-bold text-foreground flex items-center gap-1.5"><Avatar initials={p.ba.split(" ").map((n: string) => n[0]).join("")} color="blue" size="xs" /> {p.ba}</span></div>
                      <div><span className="text-muted-foreground font-medium block mb-0.5">Active Milestone</span><span className="font-bold text-foreground font-mono">{p.sprint}</span></div>
                      <div><span className="text-muted-foreground font-medium block mb-0.5">Target Release Window</span><span className="font-bold text-foreground font-mono">{p.release}</span></div>
                      <div><span className="text-muted-foreground font-medium block mb-0.5">SLA Weight Level</span><span className="font-bold text-foreground">{p.priority}</span></div>
                    </div>

                    {/* DYNAMIC PROGRESS BLOCK */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-muted-foreground">Functional Traceability Matrix Closure Rate</span>
                        <span className="text-foreground font-mono">{p.completion}%</span>
                      </div>
                      <ProgressBar value={p.completion} color={hColor} />
                    </div>

                    {/* INTERACTIVE HUB DEEP GRID TILES */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 text-xs">
                      
                      {/* Requirements Module Integration */}
                      <div onClick={(e) => handleMetricRedirect(p.name, "requirements", e)} className="p-3 bg-card border border-border/80 hover:border-primary/40 transition-all rounded-xl cursor-pointer group shadow-sm">
                        <div className="flex items-center justify-between text-muted-foreground mb-2"><FileText size={14}/><span className="text-[10px] font-mono font-bold">{p.reqApproved}/{p.reqCount}</span></div>
                        <div className="font-black text-foreground group-hover:text-primary transition-colors">Requirements</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">All functional blocks</div>
                      </div>

                      {/* User Stories Integration */}
                      <div onClick={(e) => handleMetricRedirect(p.name, "user-stories", e)} className="p-3 bg-card border border-border/80 hover:border-primary/40 transition-all rounded-xl cursor-pointer group shadow-sm">
                        <div className="flex items-center justify-between text-muted-foreground mb-2"><BookOpen size={14}/><span className="text-[10px] font-mono font-bold">{p.storyDone}/{p.storyCount}</span></div>
                        <div className="font-black text-foreground group-hover:text-primary transition-colors">User Stories</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Sprint task breakdowns</div>
                      </div>

                      {/* Defects Integration */}
                      <div onClick={(e) => handleMetricRedirect(p.name, "defects", e)} className="p-3 bg-card border border-border/80 hover:border-primary/40 transition-all rounded-xl cursor-pointer group shadow-sm">
                        <div className="flex items-center justify-between text-red-500 mb-2"><Bug size={14}/><span className="text-[10px] font-mono font-bold">{p.criticalDefects} Crit</span></div>
                        <div className="font-black text-foreground group-hover:text-primary transition-colors">{p.defectCount} Active Bugs</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Unresolved backlog Density</div>
                      </div>

                      {/* UAT Verification Validation Tile */}
                      <div onClick={(e) => handleMetricRedirect(p.name, "uat", e)} className="p-3 bg-card border border-border/80 hover:border-primary/40 transition-all rounded-xl cursor-pointer group shadow-sm">
                        <div className="flex items-center justify-between text-emerald-500 mb-2"><CheckSquare size={14}/><span className="text-[10px] font-mono font-bold">{p.uatPct}%</span></div>
                        <div className="font-black text-foreground group-hover:text-primary transition-colors">UAT Testing</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Scenarios execution math</div>
                      </div>

                      {/* Change Requests / Launch Gate Blockers Module Tile */}
                      <div onClick={(e) => handleMetricRedirect(p.name, "dependencies", e)} className="p-3 bg-card border border-border/80 hover:border-primary/40 transition-all rounded-xl cursor-pointer col-span-2 sm:col-span-1 group shadow-sm">
                        <div className="flex items-center justify-between text-amber-500 mb-2"><Flame size={14}/><span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/20 px-1 rounded">{p.blockerCount}</span></div>
                        <div className="font-black text-foreground group-hover:text-primary transition-colors">Launch Blockers</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Unmitigated project dependencies</div>
                      </div>

                    </div>

                    {/* EXPANSION CONTROL ACTIONS ROW */}
                    <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-muted-foreground">Portfolio Health SLA Matrix Factor:</span>
                        <span className={cn("font-mono px-2 py-0.5 rounded border shadow-inner", p.health >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : p.health >= 60 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100")}>{p.health}/100</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Btn variant="primary" onClick={(e) => handleLaunchWorkspace(p.name, e)} className="text-xs font-bold uppercase tracking-wider px-4 gap-1">Open Selected Workspace <ArrowRight size={12}/></Btn>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 max-h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <FolderOpen size={16} className="text-primary" /> Create Project Profile
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-bold text-muted-foreground">
              <div>
                <label className="block uppercase tracking-wider mb-1.5">Project Scope Name</label>
                <input required autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 text-xs bg-background border rounded-lg focus:outline-none focus:border-primary text-foreground font-semibold" placeholder="e.g. AI Content Strategy Redesign" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Product Family Parent</label>
                  <input required value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} className="w-full px-3 py-2 text-xs bg-background border rounded-lg focus:outline-none focus:border-primary text-foreground" placeholder="e.g. BA's Pandora Core Suite" />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Client Unit Accounts Sponsor</label>
                  <input required value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="w-full px-3 py-2 text-xs bg-background border rounded-lg focus:outline-none focus:border-primary text-foreground" placeholder="e.g. Corporate Finance" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">Initial Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-muted border rounded-lg focus:outline-none text-foreground">
                    <option>On Track</option><option>At Risk</option><option>Delayed</option><option>Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-1.5">SLA Priority Layer</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-muted border rounded-lg focus:outline-none text-foreground">
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/60">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
                  {isSubmitting ? "Deploying..." : "Deploy Workspace Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}