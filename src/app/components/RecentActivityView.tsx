import { useState, useEffect } from "react";
import { Activity, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { SectionHeader, Card, Avatar } from "./SharedUI";

export default function RecentActivityView({ activeProject }: { activeProject: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_name', activeProject)
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else if (data) setLogs(data);
      setLoading(false);
    }
    fetchLogs();
  }, [activeProject]);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <SectionHeader title="Recent Activity" sub={`Audit trail for ${activeProject}`} />
      
      <Card className="p-6">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Loading activity...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12 flex flex-col items-center">
            <Activity size={32} className="mb-3 opacity-20" />
            No recent activity logged for this project.
          </div>
        ) : (
          <div className="relative border-l border-border ml-4 space-y-8 py-2">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-6">
                <div className="absolute -left-[17px] top-1 bg-background p-1 rounded-full border border-border">
                  <Avatar initials={log.user_email?.substring(0, 2).toUpperCase() || "SY"} size="xs" color="blue" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{log.user_email?.split('@')[0] || 'System'}</span>
                    <span className="text-muted-foreground mx-1.5">{log.action}</span>
                    <span className="font-medium text-foreground">{log.item_type} {log.item_id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                    <Clock size={11} /> {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}