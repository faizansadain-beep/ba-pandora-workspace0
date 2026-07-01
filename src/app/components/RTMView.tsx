import { useState, useEffect } from "react";
import { Download, Filter, Plus, Link as LinkIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge, STATUS_STYLES } from "./SharedUI";

export default function RTMView({ activeProject }: { activeProject: string }) {
  const [dbRtmData, setDbRtmData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    needTitle: "",
    reqId: "",
    storyId: "",
    status: "Covered"
  });

  async function fetchRtm() {
    setLoading(true);
    const { data, error } = await supabase
      .from('rtm_data')
      .select('*')
      .eq('project_name', activeProject)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching RTM data:", error);
    else if (data) setDbRtmData(data.map(row => ({ ...row, needTitle: row.need_title, testScenario: row.test_scenario, release: row.release_version })));
    
    setLoading(false);
  }

  useEffect(() => {
    fetchRtm();
  }, [activeProject]);

  async function handleCreateMapping(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newId = `BN-${Math.floor(Math.random() * 900) + 100}`;

    const newMapping = {
      id: newId,
      need: newId,
      need_title: formData.needTitle,
      req: formData.reqId || null,
      feature: "TBD",
      story: formData.storyId || null,
      design: null,
      test_scenario: null,
      defect: null,
      release_version: "TBD",
      status: formData.status,
      project_name: activeProject
    };

    const { error } = await supabase.from('rtm_data').insert([newMapping]);

    if (error) {
      console.error("Error saving mapping:", error);
      alert("Failed to save RTM mapping!");
    } else {
      setIsModalOpen(false);
      setFormData({ needTitle: "", reqId: "", storyId: "", status: "Covered" });
      fetchRtm(); 
    }
    setIsSubmitting(false);
  }

  const statusIcon = (val: string | null) => val ? <span className="font-mono text-xs text-primary">{val}</span> : <span className="text-muted-foreground text-xs">—</span>;
  const rtmStatus = (s: string) => <Badge className={STATUS_STYLES[s] ?? "bg-slate-100 text-slate-600"}>{s}</Badge>;

  return (
    <div className="p-6 space-y-5 relative">
      <SectionHeader
        title="Requirement Traceability Matrix"
        sub={`End-to-end traceability for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export RTM</Btn>
            <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={13} />New Mapping
            </Btn>
          </>
        }
      />
      
      {loading && dbRtmData.length === 0 ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading Traceability Matrix...</div>
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            {[["Covered","bg-emerald-100 text-emerald-700"], ["At Risk","bg-amber-100 text-amber-700"], ["In Progress","bg-blue-100 text-blue-700"], ["Gap","bg-red-100 text-red-700"]].map(([l, c]) => <Badge key={l} className={c}>{l}</Badge>)}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Business Need</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Requirement</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Feature</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">User Story</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Design</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Test Scenario</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Defect</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Release</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dbRtmData.length === 0 ? <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">No RTM data for {activeProject}.</td></tr> : dbRtmData.map((row, i) => (
                    <tr key={row.id} className={cn("border-b border-border hover:bg-muted/40 cursor-pointer", i % 2 === 0 ? "" : "bg-muted/10")}>
                      <td className="px-4 py-2.5"><div className="font-mono text-primary">{row.need}</div><div className="text-muted-foreground truncate max-w-[120px]">{row.needTitle}</div></td>
                      <td className="px-4 py-2.5">{statusIcon(row.req)}</td>
                      <td className="px-4 py-2.5">{statusIcon(row.feature)}</td>
                      <td className="px-4 py-2.5">{statusIcon(row.story)}</td>
                      <td className="px-4 py-2.5">{statusIcon(row.design)}</td>
                      <td className="px-4 py-2.5">{statusIcon(row.testScenario)}</td>
                      <td className="px-4 py-2.5">{row.defect ? <span className="font-mono text-red-500">{row.defect}</span> : <span className="text-emerald-500">✓</span>}</td>
                      <td className="px-4 py-2.5"><span className="font-mono text-muted-foreground">{row.release}</span></td>
                      <td className="px-4 py-2.5">{rtmStatus(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* NEW RTM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LinkIcon size={18} className="text-blue-500" /> New Traceability Mapping
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateMapping} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Need / Epic Title</label>
                <input 
                  required 
                  autoFocus 
                  value={formData.needTitle} 
                  onChange={e => setFormData({...formData, needTitle: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                  placeholder="e.g. Automate monthly reporting" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Linked Requirement ID</label>
                  <input 
                    value={formData.reqId} 
                    onChange={e => setFormData({...formData, reqId: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. REQ-104" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Linked User Story ID</label>
                  <input 
                    value={formData.storyId} 
                    onChange={e => setFormData({...formData, storyId: e.target.value})} 
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
                    placeholder="e.g. US-089" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mapping Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="Gap">Gap</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Covered">Covered</option>
                  <option value="At Risk">At Risk</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Add Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}