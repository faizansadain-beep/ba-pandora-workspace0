import { useState, useEffect } from "react";
import { Download, Plus, MoreHorizontal } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { 
  cn, SectionHeader, Btn, Card, StatusBadge, 
  ProgressBar, Avatar, PriorityDot, PRIORITY_STYLES 
} from "./SharedUI";

export default function RequirementsView({ activeProject }: { activeProject: string }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [dbRequirements, setDbRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "Functional",
    priority: "Medium",
    status: "Draft",
    owner: "Sarah Chen"
  });

  const types = ["All", "Business", "Functional", "Non-Functional", "Data", "Integration", "Security", "Compliance", "Reporting"];

  async function fetchRequirements() {
    setLoading(true);
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching requirements:", error);
    } else if (data) {
      setDbRequirements(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequirements();
  }, [activeProject]);

  async function handleCreateRequirement(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newId = `REQ-${Math.floor(Math.random() * 900) + 100}`;

    const newRequirement = {
      id: newId,
      title: formData.title,
      type: formData.type,
      priority: formData.priority,
      status: formData.status,
      owner: formData.owner,
      version: "1.0",
      coverage: 0,
      project_name: activeProject 
    };

    const { error } = await supabase.from('requirements').insert([newRequirement]);

    if (error) {
      console.error("Error saving requirement:", error);
      alert("Failed to save requirement!");
    } else {
      setIsModalOpen(false);
      setFormData({ title: "", type: "Functional", priority: "Medium", status: "Draft", owner: "Sarah Chen" });
      fetchRequirements(); 
    }
    setIsSubmitting(false);
  }

  const filtered = typeFilter === "All" ? dbRequirements : dbRequirements.filter(r => r.type === typeFilter);

  return (
    <div className="p-6 space-y-5 relative">
      <SectionHeader
        title="Requirements"
        sub={`${dbRequirements.length} requirements loaded for ${activeProject || "Selected Project"}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export</Btn>
            <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={13} />New Requirement
            </Btn>
          </>
        }
      />
      
      {loading && dbRequirements.length === 0 ? (
        <div className="p-12 flex items-center justify-center text-muted-foreground text-sm">
          Loading {activeProject} requirements...
        </div>
      ) : (
        <>
          <div className="flex gap-1 flex-wrap">
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                {t}
              </button>
            ))}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ID", "Title", "Type", "Priority", "Status", "Owner", "Version", "Coverage", ""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                        No requirements found for {activeProject}.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id} className={cn("border-b border-border hover:bg-muted/50 transition-colors cursor-pointer", i % 2 === 0 ? "" : "bg-muted/20")}>
                        <td className="px-4 py-3"><span className="font-mono text-xs text-primary">{r.id}</span></td>
                        <td className="px-4 py-3"><div className="font-medium text-foreground max-w-xs truncate">{r.title}</div></td>
                        <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{r.type}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <PriorityDot priority={r.priority} />
                            <span className={cn("text-xs font-medium", PRIORITY_STYLES[r.priority])}>{r.priority}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Avatar initials={r.owner.split(" ").map((n: string) => n[0]).join("")} size="xs" color="slate" />
                            <span className="text-xs text-muted-foreground">{r.owner}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs font-mono text-muted-foreground">v{r.version}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1">
                              <ProgressBar value={r.coverage} color={r.coverage === 100 ? "emerald" : r.coverage > 50 ? "blue" : r.coverage > 0 ? "amber" : "red"} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{r.coverage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-muted-foreground hover:text-foreground p-1 rounded">
                            <MoreHorizontal size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Create Requirement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateRequirement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
                <input required autoFocus value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="e.g. Export table to CSV" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50">
                    {types.filter(t => t !== "All").map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Initial Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option>Draft</option>
                  <option>In Review</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}