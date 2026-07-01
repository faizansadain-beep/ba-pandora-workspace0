import { useState, useEffect } from "react";
import { Bell, Check, AlertTriangle, MessageSquare, Info, Clock, CheckCircle2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn, SectionHeader, Btn, Card, Badge } from "./SharedUI";

// Added onViewChange prop to the view contract to support clickable hot-links!
export default function NotificationsView({ userEmail, onViewChange }: { userEmail?: string; onViewChange?: (v: string) => void }) {
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Unread">("All");

  async function fetchNotifications() {
    if (!userEmail) return;
    setLoading(true);
    
    let { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    // ─── HARD CRITICAL MOCK REMOVAL ───────────────────────────────────────────
    // Old if (!error && (!data || data.length === 0)) seeding block is stripped completely!

    if (error) console.error("Error fetching notifications:", error);
    else if (data) setDbNotifications(data);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchNotifications();
  }, [userEmail]);

  async function markAsRead(id: string) {
    setDbNotifications(dbNotifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllAsRead() {
    const unreadIds = dbNotifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    setDbNotifications(dbNotifications.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  }

  // --- Smart Navigation Trace Resolver ---
  function handleTraceNavigation(itemKey: string) {
    if (!onViewChange) return;
    const prefix = itemKey.toUpperCase().split("-")[0];
    
    if (prefix === "REQ" || prefix === "BR" || prefix === "FR" || prefix === "NFR") onViewChange("requirements");
    else if (prefix === "DEF") onViewChange("defects");
    else if (prefix === "US") onViewChange("user-stories");
    else alert(`Trace identifier token [${prefix}] could not be resolved to a parent module.`);
  }

  const unreadCount = dbNotifications.filter(n => !n.is_read).length;
  const filteredNotifs = filter === "All" ? dbNotifications : dbNotifications.filter(n => !n.is_read);

  const getIcon = (type: string) => {
    switch (type) {
      case "mention": return <MessageSquare size={16} className="text-blue-500" />;
      case "alert": return <AlertTriangle size={16} className="text-red-500" />;
      case "update": return <CheckCircle2 size={16} className="text-emerald-500" />;
      default: return <Info size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="p-6 space-y-5 relative max-w-[1000px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <SectionHeader
        title="Notifications"
        sub={unreadCount > 0 ? `You have ${unreadCount} unread system notifications` : "You're completely caught up!"}
        actions={
          <Btn variant="secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <Check size={13} /> Mark all as read
          </Btn>
        }
      />
      
      {/* FILTER CONTROLS BANNER */}
      <div className="flex gap-2 border-b border-border pb-2 shrink-0">
        {(["All", "Unread"] as const).map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors",
              filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {f} {f === "Unread" && unreadCount > 0 && <Badge className="ml-1.5 bg-primary-foreground/20 text-current border-0 text-[10px] px-1.5">{unreadCount}</Badge>}
          </button>
        ))}
      </div>

      {/* NOTIFICATION FEED BODY CONTAINER */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {loading ? (
          <div className="p-12 flex justify-center text-muted-foreground text-sm font-medium">Loading notifications...</div>
        ) : filteredNotifs.length === 0 ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 border shadow-sm">
              <Bell size={18} className="text-muted-foreground/60" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No alerts active</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">When you receive system updates, mentions, or launch gate alerts, they will index here.</p>
          </Card>
        ) : (
          filteredNotifs.map(notif => (
            <Card 
              key={notif.id} 
              className={cn(
                "p-4 transition-all hover:shadow-sm flex items-start gap-4 border border-border/80",
                !notif.is_read ? "bg-primary/5 border-l-2 border-l-primary shadow-sm" : "bg-card opacity-65"
              )}
            >
              <div className="mt-0.5 flex-shrink-0 bg-background p-2 rounded-xl border border-border shadow-sm">
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className={cn("text-xs font-bold tracking-tight", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                      {notif.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 whitespace-nowrap flex-shrink-0 bg-muted/40 px-1.5 py-0.5 rounded border">
                    <Clock size={10} />
                    {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : "Live"}
                  </div>
                </div>
                
                {/* FIXED: Operational Clickable Cross-Examine Hotlink Navigation Binding */}
                {notif.related_item && (
                  <button 
                    onClick={() => handleTraceNavigation(notif.related_item)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md transition-all shadow-sm"
                  >
                    Examine {notif.related_item} →
                  </button>
                )}
              </div>

              {!notif.is_read && (
                <button 
                  onClick={() => markAsRead(notif.id)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-border"
                  title="Mark as read"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}