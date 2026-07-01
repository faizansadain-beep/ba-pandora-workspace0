import { useState, useEffect } from "react";
import { Settings2, ShieldCheck, ToggleLeft, ToggleRight, Clock, Gauge, Sliders, Save, ShieldAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Card, Btn, Badge } from "./SharedUI";

export default function WorkspaceSettingsView() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function fetchWorkspaceSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_workspace_settings')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      if (data) setSettings(data);
    } catch (err) {
      console.error("Workspace configuration load exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWorkspaceSettings();
  }, []);

  // --- Update Setting Value in Component Local Memory ---
  function handleLocalValueChange(key: string, value: string) {
    setSettings(prev => prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s));
  }

  // --- Flush Configuration States directly to Supabase ---
  async function handleSaveSettings() {
    setIsSaving(true);
    try {
      // Loop through and perform concurrent updates for modified rows
      const updatePromises = settings.map(setting => 
        supabase
          .from('admin_workspace_settings')
          .update({ setting_value: setting.setting_value, updated_at: new Date().toISOString() })
          .eq('setting_key', setting.setting_key)
      );

      await Promise.all(updatePromises);
      alert("Workspace governance architecture policies re-indexed successfully.");
    } catch (err) {
      console.error("Settings flush exception:", err);
      alert("Failed to synchronize project governance configurations.");
    }
    setIsSaving(false);
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Governance': return <ShieldCheck size={16} className="text-red-500" />;
      case 'Velocity': return <Gauge size={16} className="text-blue-500" />;
      case 'Change Management': return <Sliders size={16} className="text-amber-500" />;
      default: return <Clock size={16} className="text-purple-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Global Workspace Settings"
        sub="Establish workspace governance parameters, enforce validation policies, and tweak capacity ceilings."
        actions={
          <Btn variant="primary" onClick={handleSaveSettings} disabled={isSaving || loading}>
            <Save size={13} /> {isSaving ? "Applying Rules..." : "Commit Settings"}
          </Btn>
        }
      />

      <Card className="flex-1 border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2 text-sm font-bold text-foreground shrink-0">
          <Settings2 size={16} className="text-primary"/> Global Business Logic Guardrails
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {loading ? (
            <div className="text-sm text-muted-foreground italic font-medium">Extracting environment config dictionary...</div>
          ) : (
            settings.map((setting) => (
              <div key={setting.id} className="border border-border/80 p-5 rounded-xl bg-card shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/10 transition-all">
                
                {/* SETTING DOCUMENTATION CARD */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(setting.category)}
                    <h3 className="text-sm font-bold text-foreground">{setting.display_name}</h3>
                    <Badge className="bg-muted text-muted-foreground text-[9px] border-none font-mono tracking-wider font-semibold px-1.5 py-0">
                      {setting.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {setting.description}
                  </p>
                </div>

                {/* DYNAMIC FIELD RENDERING BASE ON VALUE TYPE */}
                <div className="shrink-0 w-full md:w-auto flex justify-end">
                  
                  {/* TYPE A: Toggle Switch Boolean */}
                  {(setting.setting_value === "true" || setting.setting_value === "false") && (
                    <button
                      type="button"
                      onClick={() => handleLocalValueChange(setting.setting_key, setting.setting_value === "true" ? "false" : "true")}
                      className={cn(
                        "transition-colors rounded-lg",
                        setting.setting_value === "true" ? "text-primary hover:text-primary/80" : "text-muted-foreground/30 hover:text-muted-foreground/50"
                      )}
                    >
                      {setting.setting_value === "true" ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                    </button>
                  )}

                  {/* TYPE B: Numeric Threshold Slider/Input */}
                  {setting.setting_key === 'max_sprint_velocity_cap' && (
                    <div className="flex items-center gap-3 bg-muted/50 border border-border/60 p-2 rounded-lg">
                      <input 
                        type="range" 
                        min="20" 
                        max="200" 
                        step="5"
                        value={setting.setting_value} 
                        onChange={(e) => handleLocalValueChange(setting.setting_key, e.target.value)}
                        className="w-32 accent-primary cursor-pointer h-1.5 bg-muted rounded-lg appearance-none" 
                      />
                      <span className="text-xs font-mono font-black text-foreground bg-background border px-2 py-0.5 rounded shadow-sm w-16 text-center">
                        {setting.setting_value} SP
                      </span>
                    </div>
                  )}

                  {/* TYPE C: Localization Dropdown menu */}
                  {setting.setting_key === 'workspace_timezone' && (
                    <select
                      value={setting.setting_value}
                      onChange={(e) => handleLocalValueChange(setting.setting_key, e.target.value)}
                      className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none min-w-[180px] shadow-sm"
                    >
                      <option>UTC (GMT+00:00)</option>
                      <option>EST (GMT-05:00)</option>
                      <option>PST (GMT-08:00)</option>
                      <option>PKT (GMT+05:00)</option>
                    </select>
                  )}

                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}