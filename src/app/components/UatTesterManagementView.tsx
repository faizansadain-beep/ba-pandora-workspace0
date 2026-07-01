import { useState, useEffect } from "react";
import { UserPlus, Users, Building2, Layers, Trash2, Briefcase, Activity, Hash, Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Card, Badge } from "./SharedUI";
import { exportToWordBrief } from "../../lib/exportUtils";

export default function UatTesterManagementView({ activeProject }: { activeProject: string }) {
  const [testers, setTesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields mapped straight from UAT Guidelines
  const [formData, setFormData] = useState({
    testerId: "",
    testerName: "",
    businessName: "",
    industry: "Accounting",
    businessSize: "Small",
    technicalLevel: "Low",
    currentReceptionMethod: "Human",
    avgCallsPerDay: 15
  });

  async function fetchTesters() {
    setLoading(true);
    const { data, error } = await supabase
      .from("uat_testers")
      .select("*")
      .eq("project_name", activeProject)
      .order("created_at", { ascending: false });

    if (data) setTesters(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchTesters();
  }, [activeProject]);

  const handleOnboardTester = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanId = formData.testerId.trim() || `USR-${Math.floor(Math.random() * 900) + 100}`;

    const { error } = await supabase.from("uat_testers").insert([{
      id: cleanId,
      project_name: activeProject,
      tester_name: formData.testerName.trim(),
      industry: formData.industry,
      business_size: formData.businessSize,
      technical_level: formData.technicalLevel,
      metadata: {
        business_name: formData.businessName.trim(),
        current_reception_method: formData.currentReceptionMethod,
        avg_calls_per_day: Number(formData.avgCallsPerDay)
      }
    }]);

    if (error) {
      alert(`Onboarding provision error: ${error.message}`);
    } else {
      await supabase.rpc('seed_uat_scenarios', { target_project_name: activeProject });
      
      setFormData({
        testerId: "", testerName: "", businessName: "", industry: "Accounting",
        businessSize: "Small", technicalLevel: "Low", currentReceptionMethod: "Human", avgCallsPerDay: 15
      });
      fetchTesters();
    }
    setIsSubmitting(false);
  };

  const handleOffboardTester = async (id: string) => {
    if (!window.confirm("Revoke this participant's access token and eliminate associated data records?")) return;
    const { error } = await supabase.from("uat_testers").delete().eq("id", id);
    if (!error) fetchTesters();
  };

  // --- EXPORT FUNCTION: WORD DOWNLOAD WITH GENERATED TIMESTAMPS ---
  const handleDownloadCohortDirectory = () => {
    const liveTimestamp = new Date().toLocaleString();
    const structuredItems = [
      {
        id: "COHORT-SUMMARY",
        title: "UAT Pilot Cohort Provisioning Brief",
        details: [
          { label: "Project Workspace Context", value: activeProject, isMeta: true },
          { label: "Compiled Timestamp", value: liveTimestamp, isMeta: true },
          { label: "Target Cohort Size", value: "10 Participants Validated", isMeta: true },
          { label: "Total Provisioned Testers", value: `${testers.length} active pilot profiles currently mapped to this environment.`, color: "27AE60" }
        ]
      },
      ...testers.map(t => ({
        id: t.id,
        title: `Tester Profile: ${t.tester_name}`,
        details: [
          { label: "Business Name Context", value: t.metadata?.business_name || "N/A", isMeta: true },
          { label: "Industry Vertical", value: t.industry },
          { label: "Operational Scale", value: t.business_size },
          { label: "Technical Skill Level", value: t.technical_level },
          { label: "Legacy Reception Architecture", value: t.metadata?.current_reception_method || "None" },
          { label: "Average Call Volume / Day", value: String(t.metadata?.avg_calls_per_day || 0) },
          { label: "Provisioning Timestamp", value: new Date(t.created_at).toLocaleString() }
        ]
      }))
    ];

    exportToWordBrief(
      "User Acceptance Testing (UAT) Pilot Cohort Directory",
      activeProject,
      structuredItems,
      `UAT_Cohort_Directory_${activeProject}`
    );
  };

  const isExportReady = testers.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader 
        title="UAT Tester Provisioning & Onboarding Hub"
        sub={`Register external pilot accounts, map workflow demographics, and allocate setup metrics parameters for ${activeProject}`}
        actions={
          <button
            onClick={handleDownloadCohortDirectory}
            disabled={!isExportReady}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider shadow-sm transition-all border",
              isExportReady
                ? "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
                : "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
            )}
            title={isExportReady ? "Export provisioned cohort to Word" : "Onboard at least one tester to export the directory"}
          >
            <Download size={16} /> Export Cohort Directory
          </button>
        }
      />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Guided Onboarding Registration Form */}
        <div className="xl:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-sm overflow-y-auto custom-scrollbar flex flex-col space-y-6 shrink-0">
          <div className="border-b border-border/60 pb-4">
            <h3 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <UserPlus size={18} className="text-primary" /> Profile Provisioning Entry
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Capture user operational metrics to validate cross-industry adoption goals.</p>
          </div>

          <form onSubmit={handleOnboardTester} className="space-y-6 flex-1">
            
            {/* Section 1: Identity & Business Context */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary mb-3">
                <Briefcase size={16} />
                <span className="text-xs uppercase tracking-widest font-black">Identity & Context</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tester ID String</label>
                  <input type="text" value={formData.testerId} onChange={e => setFormData({...formData, testerId: e.target.value})} placeholder="e.g. USR-001" className="w-full bg-muted/30 border border-border/80 px-3 py-2.5 rounded-lg text-foreground text-sm font-mono focus:outline-none focus:border-primary transition-colors hover:bg-muted/50" />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Participant Full Name</label>
                  <input required type="text" value={formData.testerName} onChange={e => setFormData({...formData, testerName: e.target.value})} placeholder="e.g. Alex Mercer" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2.5 text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors hover:border-border" />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Name Context</label>
                <input required type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} placeholder="e.g. Mercer Dental Care" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2.5 text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors hover:border-border" />
              </div>
            </div>

            {/* Section 2: Industry Demographics */}
            <div className="space-y-4 pt-4 border-t border-dashed border-border/60">
              <div className="flex items-center gap-2 text-primary mb-3">
                <Layers size={16} />
                <span className="text-xs uppercase tracking-widest font-black">Demographics</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Industry Vertical</label>
                  <select value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full bg-muted/30 border border-border/80 px-3 py-2.5 rounded-lg text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors hover:bg-muted/50">
                    <option>Home Services</option><option>Health & Welness</option><option>Accounting & Tax</option><option>Insurance</option><option>Real Estate</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Size</label>
                  <select value={formData.businessSize} onChange={e => setFormData({...formData, businessSize: e.target.value})} className="w-full bg-muted/30 border border-border/80 px-3 py-2.5 rounded-lg text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors hover:bg-muted/50">
                    <option value="Solo">Solo Practitioner</option><option value="Small">Small (1-10 staff)</option><option value="Medium">Medium (11-50 staff)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Technical Skill</label>
                  <select value={formData.technicalLevel} onChange={e => setFormData({...formData, technicalLevel: e.target.value})} className="w-full bg-muted/30 border border-border/80 px-3 py-2.5 rounded-lg text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors hover:bg-muted/50">
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Calls / Day</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="number" value={formData.avgCallsPerDay} onChange={e => setFormData({...formData, avgCallsPerDay: Number(e.target.value)})} className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-2.5 text-foreground text-sm font-mono focus:outline-none focus:border-primary transition-colors hover:border-border" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Operational State */}
            <div className="space-y-4 pt-4 border-t border-dashed border-border/60">
              <div className="flex items-center gap-2 text-primary mb-3">
                <Activity size={16} />
                <span className="text-xs uppercase tracking-widest font-black">Current Operations</span>
              </div>
              
              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Front Desk Method</label>
                <select value={formData.currentReceptionMethod} onChange={e => setFormData({...formData, currentReceptionMethod: e.target.value})} className="w-full bg-muted/30 border border-border/80 px-3 py-2.5 rounded-lg text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors hover:bg-muted/50">
                  <option value="Human">Dedicated Human Receptionist</option>
                  <option value="IVR">Automated IVR Key Tree Menu</option>
                  <option value="Voicemail">Direct to Voicemail Box</option>
                  <option value="None">None (Unmanaged Calls)</option>
                </select>
              </div>
            </div>

            <div className="pt-6">
              <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50">
                <UserPlus size={18} />
                {isSubmitting ? "Provisioning System Node..." : "Onboard Tester Account"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Cohort Directory Ledger Tracker */}
        <div className="xl:col-span-7 flex flex-col h-full min-h-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/10 shrink-0 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users size={18} className="text-primary" /> Registered Pilot Cohort Directory
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Manage actively provisioned participants across verification matrices.</p>
            </div>
            <div className="flex flex-col items-end">
              <Badge className="bg-primary/10 text-primary border-none font-mono text-sm font-bold px-3 py-1 mb-1">
                {testers.length} Active
              </Badge>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Target: 10 Testers</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-background/30">
            {loading ? (
              <div className="text-center py-16 text-sm font-mono text-muted-foreground">Reading portfolio ledger profiles...</div>
            ) : testers.length === 0 ? (
              <div className="text-center py-24 text-sm text-muted-foreground h-full flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Building2 size={32} className="text-muted-foreground/40" />
                </div>
                <p>No tester profiles registered yet.<br/>Use the form on the left to onboard your first pilot user.</p>
              </div>
            ) : (
              testers.map(t => (
                <div key={t.id} className="p-5 bg-card border border-border/80 rounded-xl flex items-start justify-between gap-5 group hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                  <div className="min-w-0 space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-0.5 rounded-md">{t.id}</span>
                      <h4 className="text-base font-black text-foreground">{t.tester_name}</h4>
                      <Badge className="bg-muted/60 text-foreground border-border/60 text-xs font-bold px-2.5 py-0.5">{t.industry}</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-5 text-xs text-muted-foreground font-medium p-4 bg-muted/30 rounded-xl border border-border/40">
                      <div className="col-span-2 sm:col-span-1 truncate space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Company</span>
                        <div className="text-foreground text-sm truncate" title={t.metadata?.business_name}>{t.metadata?.business_name || "TBD"}</div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Scale</span>
                        <div className="text-foreground text-sm">{t.business_size}</div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Skill Level</span>
                        <div className="text-foreground text-sm">{t.technical_level}</div>
                      </div>
                      <div className="col-span-2 truncate space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Legacy Setup</span>
                        <div className="text-foreground text-sm truncate" title={t.metadata?.current_reception_method}>{t.metadata?.current_reception_method || "None"}</div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Calls/Day</span>
                        <div className="text-foreground font-mono text-sm">{t.metadata?.avg_calls_per_day || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    <button 
                      onClick={() => handleOffboardTester(t.id)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                      title="Delete tester profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}