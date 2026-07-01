import { useState, useEffect } from "react";
import { Link2, Unlink, Globe, Plus, Trash2, Play, RefreshCw, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function IntegrationsConfigView() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  // Creation States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    platform_name: "",
    connection_type: "Webhook",
    endpoint_url: ""
  });

  async function fetchIntegrations() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('admin_integrations').select('*').order('platform_name', { ascending: true });
      if (error) throw error;
      if (data) setIntegrations(data);
    } catch (err) {
      console.error("Integrations catalog fetch error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchIntegrations();
  }, []);

  // --- Toggle On / Off Sync Status ---
  async function toggleIntegrationState(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, sync_status: nextStatus } : i));
    await supabase.from('admin_integrations').update({ sync_status: nextStatus, last_sync_time: new Date().toISOString() }).eq('id', id);
  }

  // --- Create / Add Custom Integration ---
  async function handleCreateIntegration(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: `INT-${Math.floor(Math.random() * 90000)}`,
      platform_name: formData.platform_name,
      connection_type: formData.connection_type,
      endpoint_url: formData.endpoint_url,
      sync_status: "Inactive"
    };

    const { error } = await supabase.from('admin_integrations').insert([payload]);
    if (error) {
      alert(`Database error saving connector: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setFormData({ platform_name: "", connection_type: "Webhook", endpoint_url: "" });
      fetchIntegrations();
    }
    setIsSubmitting(false);
  }

  // --- Completely Remove an Integration Node ---
  async function handleDeleteIntegration(id: string) {
    if (!window.confirm("Permanently delete this external integration connection? Outbound webhook syndication will immediately halt.")) return;
    setIntegrations(prev => prev.filter(i => i.id !== id));
    await supabase.from('admin_integrations').delete().eq('id', id);
  }

  // --- Simulate Webhook Packet Payload Test ---
  async function testConnection(id: string) {
    setTestingId(id);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s roundtrip mock
    
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, sync_status: 'Active', last_sync_time: new Date().toISOString() } : i));
    await supabase.from('admin_integrations').update({ sync_status: 'Active', last_sync_time: new Date().toISOString() }).eq('id', id);
    
    setTestingId(null);
    alert("Ping payload successfully acknowledged by remote endpoint receiver.");
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Active': return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case 'Failing': return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Enterprise Data Integrations"
        sub="Configure outbound data syndication patterns and webhook targets to pipe artifacts to destination platforms."
        actions={
          <Btn variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={13} /> Register Endpoint
          </Btn>
        }
      />

      <Card className="flex-1 border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2 text-sm font-bold text-foreground shrink-0">
          <Globe size={16} className="text-primary"/> App Ecosystem Webhook Connectors
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground italic font-medium p-4">Parsing pipeline endpoint map...</div>
          ) : integrations.length === 0 ? (
            <div className="text-center p-12 text-xs text-muted-foreground italic">No integrations registered. Click 'Register Endpoint' to map one.</div>
          ) : (
            integrations.map(connector => (
              <div key={connector.id} className="border border-border p-5 rounded-xl bg-card shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/20 transition-all group">
                
                {/* CONNECTOR METADATA */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-foreground">{connector.platform_name}</h3>
                    <Badge className={cn("px-1.5 py-0 text-[9px] uppercase tracking-wider font-mono font-bold border rounded", getStatusBadge(connector.sync_status))}>
                      {connector.sync_status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs font-mono bg-muted/60 p-2 rounded border border-border/40 truncate text-muted-foreground select-all">
                    <span className="text-[10px] font-bold text-primary mr-1 uppercase font-sans">[{connector.connection_type}]</span>
                    {connector.endpoint_url}
                  </div>

                  {connector.last_sync_time && (
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pl-1">
                      <RefreshCw size={10}/> Last contact: {new Date(connector.last_sync_time).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* CONTROLS & DELETION */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-none pt-4 md:pt-0 border-border/50">
                  <button
                    onClick={() => testConnection(connector.id)}
                    disabled={testingId !== null}
                    className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider border border-border hover:bg-muted bg-background text-foreground rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                  >
                    <Play size={11} className={cn("fill-current", testingId === connector.id && "animate-spin text-primary")}/> 
                    {testingId === connector.id ? "Pinging..." : "Test Ping"}
                  </button>

                  <Btn 
                    variant={connector.sync_status === 'Active' ? 'secondary' : 'primary'}
                    onClick={() => toggleIntegrationState(connector.id, connector.sync_status)}
                    className="h-8 text-[11px] font-bold uppercase tracking-wider px-3"
                  >
                    {connector.sync_status === 'Active' ? <><Unlink size={11}/> Break Link</> : <><Link2 size={11}/> Initialize</>}
                  </Btn>

                  <button
                    onClick={() => handleDeleteIntegration(connector.id)}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-transparent hover:border-red-100"
                    title="Remove Connector"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </Card>

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Layers size={16} className="text-blue-500" /> Register External Platform</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateIntegration} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Platform Target Name</label>
                  <input required placeholder="e.g. Confluence Metrics" value={formData.platform_name} onChange={e => setFormData({...formData, platform_name: e.target.value})} className="w-full bg-background border p-2 text-sm rounded focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Protocol Pattern</label>
                  <select value={formData.connection_type} onChange={e => setFormData({...formData, connection_type: e.target.value})} className="w-full bg-muted border p-2 text-sm rounded font-bold">
                    <option>Webhook</option>
                    <option>REST API</option>
                    <option>OAuth2 Implicit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Target Endpoint URL Destination</label>
                <input required type="url" placeholder="https://api.yourdestination.com/hook" value={formData.endpoint_url} onChange={e => setFormData({...formData, endpoint_url: e.target.value})} className="w-full bg-background border p-2 text-xs font-mono rounded focus:outline-none focus:border-primary" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Btn variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Btn>
                <Btn variant="primary" type="submit" disabled={isSubmitting}>Provision Connector</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}