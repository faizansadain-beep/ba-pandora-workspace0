import { useState, useEffect } from "react";
import { Plus, Download, BarChart2, TrendingUp, Users, Smile, Frown, Edit, Trash2, X, Star, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function FeatureAdoptionView({ activeProject }: { activeProject: string }) {
  const [dbAdoption, setDbAdoption] = useState<any[]>([]);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & View States
  const [selectedAdoption, setSelectedAdoption] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    adoption_id: "",
    feature_reference: "",
    target_adoption_rate: 70,
    current_adoption_rate: 0,
    daily_active_users: 0,
    churn_dropoff_rate: 0,
    user_sentiment: "Neutral",
    blocker_notes: ""
  });

  async function fetchAdoptionData() {
    setLoading(true);
    try {
      const [adRes, featRes] = await Promise.all([
        supabase.from('analytics_feature_adoption').select('*').eq('project_name', activeProject).order('adoption_id', { ascending: true }),
        supabase.from('product_features').select('id, feature_id, title').eq('project_name', activeProject).order('feature_id', { ascending: true })
      ]);

      if (adRes.data) setDbAdoption(adRes.data);
      if (featRes.data) setDbFeatures(featRes.data);
    } catch (err) {
      console.error("Fetch exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAdoptionData();
  }, [activeProject]);

  // --- CRUD ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: isEditMode ? formData.id : `ADP-${Math.floor(Math.random() * 90000)}`,
      adoption_id: formData.adoption_id,
      feature_reference: formData.feature_reference,
      target_adoption_rate: Number(formData.target_adoption_rate),
      current_adoption_rate: Number(formData.current_adoption_rate),
      daily_active_users: Number(formData.daily_active_users),
      churn_dropoff_rate: Number(formData.churn_dropoff_rate),
      user_sentiment: formData.user_sentiment,
      blocker_notes: formData.blocker_notes,
      project_name: activeProject
    };

    let error;
    if (isEditMode) {
      const { error: updateError } = await supabase.from('analytics_feature_adoption').update(payload).eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('analytics_feature_adoption').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving adoption logs:", error);
      alert(`Failed to save! Database error: ${error.message}`);
    } else {
      closeForm();
      fetchAdoptionData();
      if (isEditMode && selectedAdoption) setSelectedAdoption(payload);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!window.confirm("Remove this feature adoption metric trace?")) return;
    setDbAdoption(dbAdoption.filter(a => a.id !== id));
    setSelectedAdoption(null);
    const { error } = await supabase.from('analytics_feature_adoption').delete().eq('id', id);
    if (error) fetchAdoptionData();
  }

  function openNewForm() {
    setIsEditMode(false);
    const nextNum = dbAdoption.length + 101;
    setFormData({ id: "", adoption_id: `AD-${nextNum}`, feature_reference: "", target_adoption_rate: 70, current_adoption_rate: 0, daily_active_users: 0, churn_dropoff_rate: 0, user_sentiment: "Neutral", blocker_notes: "" });
    setIsFormOpen(true);
  }

  function openEditForm(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setFormData({ ...item });
    setIsFormOpen(true);
    setSelectedAdoption(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsEditMode(false);
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return <Smile className="text-emerald-500" size={16} />;
      case "Frustrated": return <Frown className="text-red-500" size={16} />;
      default: return <Smile className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-6xl mx-auto">
      <SectionHeader
        title="Feature Adoption Analytics"
        sub={`Monitor end-user post-launch engagement data, funnel drop-offs, and product market fit tracking for ${activeProject}`}
        actions={
          <>
            <Btn variant="secondary"><Download size={13} />Export Metrics</Btn>
            <Btn variant="primary" onClick={openNewForm}>
              <Plus size={13} />Link Feature Analytics
            </Btn>
          </>
        }
      />

      {loading ? (
        <div className="p-12 flex justify-center text-muted-foreground text-sm">Loading telemetry metrics...</div>
      ) : dbAdoption.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <BarChart2 size={32} className="text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-medium text-foreground">Adoption Logs Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Connect newly shipped features to adoption metrics and user sentiment loops.</p>
          <Btn variant="secondary" onClick={openNewForm}>Track Feature Adoption</Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dbAdoption.map(ad => {
            const performanceGap = ad.current_adoption_rate - ad.target_adoption_rate;
            const isMeetingTarget = performanceGap >= 0;

            return (
              <div 
                key={ad.id} 
                onClick={() => setSelectedAdoption(ad)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full border-l-4"
                style={{ borderLefColor: isMeetingTarget ? '#10B981' : '#EF4444' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge className="bg-primary/10 text-primary font-mono text-[10px] border-primary/20">{ad.adoption_id}</Badge>
                  <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-foreground">
                    {getSentimentIcon(ad.user_sentiment)}
                    <span>{ad.user_sentiment} User Mood</span>
                  </div>
                </div>
                
                <h3 className="text-base font-bold text-foreground leading-tight mb-1 truncate">{ad.feature_reference.split(' - ')[1] || ad.feature_reference}</h3>
                <div className="text-[10px] text-muted-foreground font-mono mb-4">{ad.feature_reference.split(' - ')[0]}</div>

                {/* Micro Progress Metrics Bar */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Adoption Progress</span>
                    <span className={isMeetingTarget ? "text-emerald-600" : "text-red-600"}>{ad.current_adoption_rate}% / {ad.target_adoption_rate}% target</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", isMeetingTarget ? "bg-emerald-500" : "bg-amber-500")}
                      style={{ width: `${Math.min(ad.current_adoption_rate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[11px] bg-muted/20 border p-2 rounded-lg mt-auto">
                  <div>
                    <span className="text-muted-foreground font-medium block">Daily Actives</span>
                    <span className="font-bold text-foreground flex items-center justify-center gap-1"><Users size={12}/> {ad.daily_active_users} users</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block">Funnel Dropoff</span>
                    <span className="font-bold text-red-500 flex items-center justify-center gap-1"><TrendingUp size={12} className="rotate-45"/> {ad.churn_dropoff_rate}% rate</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* READ MODAL */}
      {selectedAdoption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary font-mono px-2 border-primary/20">{selectedAdoption.adoption_id}</Badge>
                <Badge className={selectedAdoption.current_adoption_rate >= selectedAdoption.target_adoption_rate ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                  {selectedAdoption.current_adoption_rate}% Active Adoption
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => openEditForm(selectedAdoption, e)} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit size={16} /></button>
                <button onClick={(e) => handleDelete(selectedAdoption.id, e)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedAdoption(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><X size={18} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Telemetry Analysis Target</span>
                <h2 className="text-base font-bold text-foreground">{selectedAdoption.feature_reference}</h2>
              </div>

              <section className="bg-muted/30 p-4 border rounded-lg space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><TrendingUp size={14}/> Usage Drop-off Diagnostics</h4>
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedAdoption.blocker_notes || <span className="italic text-muted-foreground">No structural adoption block comments recorded.</span>}
                </p>
              </section>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end rounded-b-xl shrink-0">
               <Btn variant="secondary" onClick={() => setSelectedAdoption(null)}>Close Analytics</Btn>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPDATE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl shadow-lg border border-border flex flex-col p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart2 size={18} className="text-blue-500" /> Track Adoption telemetry</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Trace ID</label>
                  <input required value={formData.adoption_id} onChange={e => setFormData({...formData, adoption_id: e.target.value})} className="w-full px-3 py-2 text-sm font-mono bg-muted border border-border rounded-md focus:outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Star size={12}/> Target shipped scope</label>
                  <select required value={formData.feature_reference} onChange={e => setFormData({...formData, feature_reference: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none">
                    <option value="">-- Select Deployed Feature Component --</option>
                    {dbFeatures.map(f => <option key={f.id} value={`${f.feature_id} - ${f.title}`}>{f.feature_id} - {f.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Adoption Rate (%)</label>
                  <input type="number" required value={formData.target_adoption_rate} onChange={e => setFormData({...formData, target_adoption_rate: Number(e.target.value)})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Adoption Rate (%)</label>
                  <input type="number" required value={formData.current_adoption_rate} onChange={e => setFormData({...formData, current_adoption_rate: Number(e.target.value)})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Daily Actives (DAU)</label>
                  <input type="number" required value={formData.daily_active_users} onChange={e => setFormData({...formData, daily_active_users: Number(e.target.value)})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Funnel Dropoff (%)</label>
                  <input type="number" required value={formData.churn_dropoff_rate} onChange={e => setFormData({...formData, churn_dropoff_rate: Number(e.target.value)})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">User Sentiment Mood</label>
                  <select value={formData.user_sentiment} onChange={e => setFormData({...formData, user_sentiment: e.target.value})} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-bold">
                    <option>Positive</option>
                    <option>Neutral</option>
                    <option>Frustrated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telemetry Notes / Friction Diagnostics</label>
                <textarea rows={4} value={formData.blocker_notes} onChange={e => setFormData({...formData, blocker_notes: e.target.value})} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md leading-relaxed" placeholder="Map user experience loop logs, friction metrics or training documentation demands..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
                <Btn variant="secondary" onClick={closeForm} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSubmitting ? "Locking..." : "Lock Telemetry Trace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}