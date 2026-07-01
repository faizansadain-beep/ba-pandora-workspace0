import { useState, useEffect } from "react";
import { Plus, Users, Shield, Eye, Trash2, Mail, UserPlus, Key, Fingerprint, Lock, Copy, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

export default function RolesManagementView() {
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Submissions
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [roleForm, setRoleForm] = useState({ role_name: "", clearance_level: "Standard", description: "" });
  const [userForm, setUserForm] = useState({ 
    login_id: "", 
    full_name: "", 
    email: "", 
    assigned_role_id: "", 
    system_role: "tester", // Core application routing role
    temporary_password: "" 
  });

  async function fetchRosterWorkspace() {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        supabase.from('admin_roles').select('*').order('clearance_level', { ascending: true }),
        supabase.from('admin_user_directory').select('*, admin_roles(role_name)').order('created_at', { ascending: false })
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (err) {
      console.error("Master roster fetch handling exception:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRosterWorkspace();
  }, []);

  // --- Provision a New Custom Role Profile ---
  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: `ROLE-${Math.floor(Math.random() * 90000)}`,
      role_name: roleForm.role_name,
      clearance_level: roleForm.clearance_level,
      description: roleForm.description,
      user_count: 0
    };

    const { error } = await supabase.from('admin_roles').insert([payload]);
    if (error) alert(`Error creating role: ${error.message}`);
    else {
      setIsRoleModalOpen(false);
      setRoleForm({ role_name: "", clearance_level: "Standard", description: "" });
      fetchRosterWorkspace();
    }
    setIsSubmitting(false);
  }

  // --- Open Add User Modal ---
  const triggerAddUserModal = () => {
    setUserForm({
      login_id: "", 
      full_name: "", 
      email: "", 
      assigned_role_id: roles.length > 0 ? roles[0].id : "",
      system_role: "tester",
      temporary_password: ""
    });
    setIsUserModalOpen(true);
  };

  // --- Generate Random Secure Password helper ---
  const handleGeneratePassword = () => {
    const randomPwd = `Nxs${Math.floor(Math.random() * 90000)}!`;
    setUserForm({ ...userForm, temporary_password: randomPwd });
  };

  // --- Save New Human User to the Team Roster ---
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanId = userForm.login_id.trim() || `USR-${Math.floor(Math.random() * 90000) + 10000}`;

    const payload = {
      id: cleanId,
      full_name: userForm.full_name,
      email: userForm.email,
      assigned_role_id: userForm.assigned_role_id || null,
      system_role: userForm.system_role,
      temporary_password: userForm.temporary_password,
      status: "Active"
    };

    const { error: userError } = await supabase.from('admin_user_directory').insert([payload]);
    
    if (userError) {
      alert(`Error provisioning team member: ${userError.message}`);
    } else {
      if (userForm.assigned_role_id) {
        const targetRole = roles.find(r => r.id === userForm.assigned_role_id);
        const currentCount = targetRole ? targetRole.user_count : 0;
        await supabase.from('admin_roles').update({ user_count: currentCount + 1 }).eq('id', userForm.assigned_role_id);
      }
      setIsUserModalOpen(false);
      fetchRosterWorkspace();
    }
    setIsSubmitting(false);
  }

  async function handleDeleteUser(userId: string, roleId: string) {
    if (!window.confirm("Remove this individual's access and wipe credentials from your workspace?")) return;
    
    const { error } = await supabase.from('admin_user_directory').delete().eq('id', userId);
    if (!error) {
      if (roleId) {
        const targetRole = roles.find(r => r.id === roleId);
        if (targetRole && targetRole.user_count > 0) {
          await supabase.from('admin_roles').update({ user_count: targetRole.user_count - 1 }).eq('id', roleId);
        }
      }
      fetchRosterWorkspace();
    }
  }

  const handleCopyCredentials = (id: string, pwd: string) => {
    navigator.clipboard.writeText(`Login ID: ${id}\nPassword: ${pwd}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getClearanceBadge = (level: string) => {
    switch(level) {
      case 'Administrator': return "bg-red-100 text-red-800 border-red-200";
      case 'Advanced': return "bg-purple-100 text-purple-800 border-purple-200";
      case 'Standard': return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getSystemRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return "text-red-600 bg-red-50 border-red-200";
      case 'onboarding_agent': return "text-blue-600 bg-blue-50 border-blue-200";
      case 'tester': return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case 'viewer': return "text-slate-600 bg-slate-50 border-slate-200";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="p-6 space-y-6 relative max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Identity & Access Management (IAM)"
        sub="Manage team access bounds, role classification maps, and full team roster tracking layouts."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setIsRoleModalOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-secondary text-foreground hover:bg-muted border border-border shadow-sm transition-all">
              <Plus size={14} /> Create Custom Role
            </button>
            <button onClick={triggerAddUserModal} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all">
              <UserPlus size={14} /> Add Teammate
            </button>
          </div>
        }
      />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
        
        {/* LEFT TWO COLUMNS: Custom Role Profiles Map */}
        <Card className="xl:col-span-2 border-border shadow-sm overflow-hidden flex flex-col h-full bg-card">
          <div className="p-5 border-b border-border bg-muted/10 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Shield size={16} className="text-primary"/> Custom Security Groups
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Define operational bounds and system capabilities for granular assignments.</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {loading ? (
              <div className="text-center py-12 text-xs font-mono text-muted-foreground">Syncing security profiles...</div>
            ) : roles.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground italic bg-muted/20 border border-dashed rounded-xl">
                No custom roles defined. You can rely on core system roles or create specific groups.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map(role => (
                  <div key={role.id} className="p-4 border border-border/80 rounded-xl hover:shadow-sm hover:border-primary/30 transition-all bg-background space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-black text-sm text-foreground">{role.role_name}</div>
                        <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{role.id}</div>
                      </div>
                      <Badge className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border", getClearanceBadge(role.clearance_level))}>
                        {role.clearance_level}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {role.description}
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Roster</span>
                      <span className="font-mono text-xs font-black text-foreground bg-muted px-2 py-0.5 rounded-md border">{role.user_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT COLUMN: Active Team Roster Directory */}
        <Card className="col-span-1 border-border shadow-sm overflow-hidden flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20">
          <div className="p-5 border-b border-border bg-background flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users size={16} className="text-blue-500"/> Team Directory
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active workspace identities & credentials.</p>
            </div>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
            {users.length === 0 ? (
              <div className="text-center p-8 text-xs text-muted-foreground italic flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center"><Users size={20} className="text-muted-foreground/40"/></div>
                Roster empty. Click Add Teammate to populate the grid.
              </div>
            ) : (
              users.map(u => (
                <div key={u.id} className="p-4 bg-card border border-border/80 rounded-xl shadow-sm space-y-3 group hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-foreground truncate flex items-center gap-2">
                        {u.full_name}
                        <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border", getSystemRoleColor(u.system_role))}>
                          {u.system_role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5 truncate"><Mail size={11} className="text-primary"/> {u.email}</div>
                    </div>
                    <button onClick={() => handleDeleteUser(u.id, u.assigned_role_id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 p-2.5 bg-muted/40 rounded-lg border border-border/50 text-[10px] font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1"><Fingerprint size={11}/> ID:</span>
                      <strong className="text-foreground">{u.id}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1"><Key size={11}/> Pass:</span>
                      <strong className="text-foreground">{u.temporary_password || "********"}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {u.admin_roles?.role_name ? (
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-none text-[9px] px-2 py-0.5 font-bold truncate max-w-[140px]">
                        Group: {u.admin_roles.role_name}
                      </Badge>
                    ) : <span className="text-[10px] text-muted-foreground italic">No Custom Group</span>}
                    <button onClick={() => handleCopyCredentials(u.id, u.temporary_password)} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                      {copiedId === u.id ? <><CheckCircle2 size={11}/> Copied!</> : <><Copy size={11}/> Copy Login</>}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* MODAL 1: PROVISION ROLE */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2"><Shield size={16} className="text-primary"/> Create Custom Profile</h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Profile Name</label>
                <input required placeholder="e.g. Lead Dev Architect" value={roleForm.role_name} onChange={e => setRoleForm({...roleForm, role_name: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Clearance Tier</label>
                <select value={roleForm.clearance_level} onChange={e => setRoleForm({...roleForm, clearance_level: e.target.value})} className="w-full bg-muted/50 border border-border/80 px-3 py-2 text-sm rounded-lg font-bold focus:outline-none focus:border-primary transition-colors">
                  <option>Administrator</option>
                  <option>Advanced</option>
                  <option>Standard</option>
                  <option>Read-Only</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Operational Summary Bounds</label>
                <textarea required rows={3} placeholder="Summary parameters..." value={roleForm.description} onChange={e => setRoleForm({...roleForm, description: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                <Btn variant="secondary" onClick={() => setIsRoleModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PROVISION USER WITH MANUAL/AUTO CREDENTIALS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2"><UserPlus size={16} className="text-primary"/> Add Human Teammate</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Full Corporate Name</label>
                  <input required placeholder="Jane Doe" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Enterprise Email</label>
                  <input required type="email" placeholder="jane.d@company.com" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><ShieldCheck size={12} className="text-primary"/> System Access Level</label>
                  <select value={userForm.system_role} onChange={e => setUserForm({...userForm, system_role: e.target.value})} className="w-full bg-muted/50 border border-border/80 px-3 py-2 text-sm rounded-lg font-bold focus:outline-none focus:border-primary">
                    <option value="admin">Administrator</option>
                    <option value="onboarding_agent">Onboarding Agent</option>
                    <option value="tester">UAT Tester</option>
                    <option value="viewer">Viewer (All Modules)</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Shield size={12}/> Custom Sub-Group</label>
                  <select value={userForm.assigned_role_id} onChange={e => setUserForm({...userForm, assigned_role_id: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-sm rounded-lg font-medium focus:outline-none focus:border-primary">
                    <option value="">-- No Group Assignment --</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5"><Lock size={12} className="text-amber-500"/> Account Credentials</span>
                  <button type="button" onClick={handleGeneratePassword} className="text-[9px] text-primary hover:underline">Auto-Generate Password</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Login ID (Optional)</label>
                    <input placeholder="Leave blank to auto-generate" value={userForm.login_id} onChange={e => setUserForm({...userForm, login_id: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono text-foreground rounded-md outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Initial Password</label>
                    <input required placeholder="Enter password..." value={userForm.temporary_password} onChange={e => setUserForm({...userForm, temporary_password: e.target.value})} className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono font-bold text-foreground rounded-md outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Btn variant="secondary" onClick={() => setIsUserModalOpen(false)} type="button">Cancel</Btn>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50">Inject into Roster</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}