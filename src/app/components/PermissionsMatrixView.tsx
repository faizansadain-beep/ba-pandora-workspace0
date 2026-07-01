import { useState, useEffect } from "react";
import { Shield, ShieldAlert, CheckSquare, Lock, Save, Eye, Edit3, PlusSquare, Trash2, ShieldCheck, Activity, Info } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

// System modules that require granular permissions
const SYSTEM_MODULES = [
  { id: "requirements", name: "Requirements Matrix", category: "Core" },
  { id: "defects", name: "Defect Registry", category: "Core" },
  { id: "uat_management", name: "UAT Pilot Provisioning", category: "Testing" },
  { id: "uat_execution", name: "UAT Tester Desk", category: "Testing" },
  { id: "user_directory", name: "Team Directory", category: "Admin" }
];

export default function PermissionsMatrixView() {
  const [roles, setRoles] = useState<any[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Matrix State: Record<ModuleId, { view: boolean, create: boolean, edit: boolean, delete: boolean }>
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchRoles() {
      setLoading(true);
      const { data } = await supabase.from('admin_roles').select('*').order('clearance_level', { ascending: true });
      if (data) {
        setRoles(data);
        if (data.length > 0) setActiveRoleId(data[0].id);
      }
      setLoading(false);
    }
    fetchRoles();
  }, []);

  // Mock loading permissions when a role is selected (in production, fetch this from a role_permissions mapping table)
  useEffect(() => {
    if (activeRoleId) {
      const activeRole = roles.find(r => r.id === activeRoleId);
      const isHighClearance = activeRole?.clearance_level === "Administrator" || activeRole?.clearance_level === "Advanced";
      
      // Seed default toggle states based on clearance level
      const initialPerms: Record<string, any> = {};
      SYSTEM_MODULES.forEach(mod => {
        initialPerms[mod.id] = {
          view: true,
          create: isHighClearance,
          edit: isHighClearance,
          delete: activeRole?.clearance_level === "Administrator"
        };
      });
      setPermissions(initialPerms);
    }
  }, [activeRoleId, roles]);

  const handleToggle = (moduleId: string, action: string) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [action]: !prev[moduleId][action]
      }
    }));
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    // 💡 In production, write this JSON blob to your admin_roles table or a junction table
    await new Promise(resolve => setTimeout(resolve, 800)); 
    alert("Role permissions updated successfully!");
    setIsSaving(false);
  };

  if (loading) return <div className="p-6 text-center text-xs text-muted-foreground mt-10">Loading Identity Access Matrix...</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Role-Based Access Control (RBAC)"
        sub="Configure granular module-level permissions and capability bounds for your custom security profiles."
        actions={
          <button 
            onClick={handleSavePermissions}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? "Syncing..." : "Commit Matrix Changes"}
          </button>
        }
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* LEFT NAV: Profile Selector */}
        <Card className="lg:col-span-1 border-border shadow-sm overflow-hidden flex flex-col bg-card">
          <div className="p-4 border-b border-border bg-muted/10 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary"/> Target Security Profile
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setActiveRoleId(role.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5",
                  activeRoleId === role.id 
                    ? "bg-primary/5 border-primary shadow-sm" 
                    : "bg-background border-border/60 hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={cn("text-xs font-black truncate", activeRoleId === role.id ? "text-primary" : "text-foreground")}>{role.role_name}</span>
                </div>
                <Badge className={cn("text-[9px] px-1.5 py-0 uppercase border", activeRoleId === role.id ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border")}>
                  {role.clearance_level}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* RIGHT PANEL: The Granular Matrix */}
        <Card className="lg:col-span-3 border-border shadow-sm overflow-hidden flex flex-col bg-card">
          <div className="p-4 border-b border-border bg-muted/10 shrink-0 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <Lock size={15} className="text-primary"/> Capability Matrix Configurator
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 pl-6">System Module</th>
                    <th className="p-4 text-center">View <Eye size={12} className="inline ml-1 mb-0.5 opacity-50"/></th>
                    <th className="p-4 text-center">Create <PlusSquare size={12} className="inline ml-1 mb-0.5 opacity-50"/></th>
                    <th className="p-4 text-center">Edit <Edit3 size={12} className="inline ml-1 mb-0.5 opacity-50"/></th>
                    <th className="p-4 text-center">Delete <Trash2 size={12} className="inline ml-1 mb-0.5 opacity-50"/></th>
                  </tr>
                </thead>
                <tbody className="bg-background">
                  {SYSTEM_MODULES.map((mod, index) => (
                    <tr key={mod.id} className={cn("border-b border-border/50 hover:bg-muted/10 transition-colors", index === SYSTEM_MODULES.length - 1 && "border-none")}>
                      <td className="p-4 pl-6">
                        <div className="font-bold text-xs text-foreground">{mod.name}</div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">{mod.category} Module</div>
                      </td>
                      
                      {['view', 'create', 'edit', 'delete'].map((action) => {
                        const isChecked = permissions[mod.id]?.[action];
                        return (
                          <td key={action} className="p-4 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={isChecked || false}
                                onChange={() => handleToggle(mod.id, action)}
                              />
                              <div className="w-9 h-5 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors"></div>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-start gap-3">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                Changes to this matrix take effect immediately on the next user session refresh. Users with <strong>Administrator</strong> clearance automatically bypass this matrix and retain full platform access regardless of toggle states.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}