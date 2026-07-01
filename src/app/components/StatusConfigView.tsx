import { useState, useEffect } from "react";
import { Plus, Sliders, ToggleLeft, ToggleRight, ArrowRight, Layers, Bug, GitPullRequest, Eye } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function StatusConfigView() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("User Stories");

  const WORKFLOW_TYPES = [
    { name: "User Stories", icon: <Layers size={14} /> },
    { name: "Defects", icon: <Bug size={14} /> },
    { name: "Change Requests", icon: <GitPullRequest size={14} /> }
  ];

  async function fetchStatusConfigs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_status_config')
        .select('*')
        .order('workflow_type', { ascending: true })
        .order('display_order', { ascending: true });
      if (error) throw error;
      if (data) setConfigs(data);
    } catch (err) {
      console.error("Status configuration fetch failure:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStatusConfigs();
  }, []);

  async function toggleStatusActive(id: string, currentVal: boolean) {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentVal } : c));
    await supabase.from('admin_status_config').update({ is_active: !currentVal }).eq('id', id);
  }

  const getColorClass = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'amber': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const filteredConfigs = configs.filter(c => c.workflow_type === activeTab);

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Workflow Status Configuration"
        sub="Audit and configure step lifecycles, states, and RAG colors across delivery streams."
      />

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT MENU: Target Stream */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 pl-2">Tracked Lifecycles</div>
          {WORKFLOW_TYPES.map(wf => (
            <button
              key={wf.name}
              onClick={() => setActiveTab(wf.name)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2.5",
                activeTab === wf.name 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              {wf.icon}
              {wf.name}
            </button>
          ))}
        </div>

        {/* MAIN CONTROLS: Workflow Map */}
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          
          {/* PIPELINE PREVIEW TRACK */}
          <Card className="p-5 bg-muted/20 border-border shadow-sm shrink-0">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Eye size={13}/> Pipeline Sequence Preview
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {filteredConfigs.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <Badge className={cn("px-2.5 py-1 text-xs font-bold border rounded-md uppercase tracking-wider shadow-sm", getColorClass(step.color_code), !step.is_active && "opacity-40 line-through")}>
                    {step.status_name}
                  </Badge>
                  {index < filteredConfigs.length - 1 && <ArrowRight size={14} className="text-muted-foreground/40" />}
                </div>
              ))}
            </div>
          </Card>

          {/* EDITABLE DETAIL TABLE */}
          <Card className="flex-1 border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2 text-sm font-bold text-foreground shrink-0">
              <Sliders size={16} className="text-primary"/> Step Configurations
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground font-medium">Reading system configuration dictionary...</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase bg-muted/30 tracking-wider">
                      <th className="p-4 pl-6 w-20">Sequence</th>
                      <th className="p-4">Status Label</th>
                      <th className="p-4">Color Mapping</th>
                      <th className="p-4 text-right pr-6 w-32">Tracking State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConfigs.map((config) => (
                      <tr key={config.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-muted-foreground">0{config.display_order}</td>
                        <td className="p-4 font-bold text-foreground">{config.status_name}</td>
                        <td className="p-4">
                          <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 border rounded font-mono", getColorClass(config.color_code))}>
                            {config.color_code}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => toggleStatusActive(config.id, config.is_active)}
                            className={cn("transition-colors", config.is_active ? "text-primary hover:text-primary/80" : "text-muted-foreground/40 hover:text-muted-foreground/60")}
                          >
                            {config.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}