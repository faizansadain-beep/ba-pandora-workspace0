import React from "react";

// ─── UTILITIES ────────────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export const STATUS_STYLES: Record<string, string> = {
  "Approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "In Review": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Draft": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Rejected": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "On Track": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "At Risk": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Delayed": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Blocked": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Active": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Monitoring": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Mitigated": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Covered": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Gap": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Ready": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Passed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Failed": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Not Started": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export const PRIORITY_STYLES: Record<string, string> = {
  "Critical": "text-red-600 dark:text-red-400",
  "High": "text-amber-600 dark:text-amber-400",
  "Medium": "text-blue-600 dark:text-blue-400",
  "Low": "text-slate-500 dark:text-slate-400",
  "P1": "text-red-600 dark:text-red-400",
  "P2": "text-amber-600 dark:text-amber-400",
  "P3": "text-blue-600 dark:text-blue-400",
  "P4": "text-slate-500 dark:text-slate-400",
};

const SEVERITY_DOT: Record<string, string> = {
  "Critical": "bg-red-500",
  "High": "bg-amber-500",
  "Medium": "bg-blue-500",
  "Low": "bg-slate-400",
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}>
      {status}
    </Badge>
  );
}

export function PriorityDot({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", SEVERITY_DOT[priority] ?? "bg-slate-400")} />
  );
}

export function Avatar({ initials, color = "blue", size = "sm" }: { initials: string; color?: string; size?: "xs" | "sm" | "md" }) {
  const sizeClass = size === "xs" ? "w-6 h-6 text-[10px]" : size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    slate: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  return (
    <span className={cn("rounded-full flex items-center justify-center font-semibold flex-shrink-0", sizeClass, colorMap[color] ?? colorMap.slate)}>
      {initials}
    </span>
  );
}

export function ProgressBar({ value, max = 100, color = "blue" }: { value: number; max?: number; color?: string }) {
  const pct = Math.round((value / max) * 100);
  const colorClass = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : color === "red" ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function Btn({ children, variant = "primary", className, onClick, type = "button" }: { children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; className?: string; onClick?: () => void; type?: "button" | "submit" | "reset" }) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
  };
  return <button type={type} className={cn(base, variants[variant], className)} onClick={onClick}>{children}</button>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card rounded-lg border border-border shadow-sm", className)}>
      {children}
    </div>
  );
}