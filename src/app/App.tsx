import LoginView from "./components/LoginView";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard, FolderOpen, Map, Rocket, Zap, Target,
  Search, X, Bell, Sun, Moon, ChevronRight, ChevronDown,
  TrendingUp, Users, FileText, Bug, AlertTriangle,
  CheckCircle2, Clock, Activity, BarChart3, Settings,
  ArrowUpRight, Package, Star, BookOpen,
  Layers, Shield, Lock, Database, Gauge, Workflow,
  Paintbrush, Eye, ClipboardList, Calendar, Award,
  Link2, CheckSquare, GitBranch, Info, Megaphone,
  TestTube, CircuitBoard, HelpCircle, RefreshCcw, ArrowRight,
  PieChart, ShieldAlert, UserCircle2
} from "lucide-react";
import { cn, Badge } from "./components/SharedUI";

// Component Imports
import ProjectsView from "./components/ProjectsView";
import RequirementsView from "./components/RequirementsView";
import UserStoriesView from "./components/UserStoriesView";
import DefectsView from "./components/DefectsView";
import RTMView from "./components/RTMView";
import ReleaseReadinessView from "./components/ReleaseReadinessView";
import DashboardView from "./components/DashboardView";
import MyTasksView from "./components/MyTasksView";
import NotificationsView from "./components/NotificationsView";
import CalendarView from "./components/CalendarView";
import RecentActivityView from "./components/RecentActivityView";
import TestCasesView from "./components/TestCasesView";
import RoadmapView from "./components/RoadmapView";
import ReleasesView from "./components/ReleasesView";
import SprintsView from "./components/SprintsView";
import MilestonesView from "./components/MilestonesView";
import BusinessCaseView from "./components/BusinessCaseView";
import ProblemStatementsView from "./components/ProblemStatementsView";
import GoalsObjectivesView from "./components/GoalsObjectivesView";
import CurrentStateView from "./components/CurrentStateView";
import FutureStateView from "./components/FutureStateView";
import GapAnalysisView from "./components/GapAnalysisView";
import StakeholdersView from "./components/StakeholdersView";
import BusinessRulesView from "./components/BusinessRulesView";
import AssumptionsView from "./components/AssumptionsView";
import ConstraintsView from "./components/ConstraintsView";
import DependenciesView from "./components/DependenciesView";
import RisksView from "./components/RisksView";
import MeetingNotesView from "./components/MeetingNotesView";
import DecisionLogView from "./components/DecisionLogView";
import AllRequirementsView from "./components/AllRequirementsView";
import UseCasesView from "./components/UseCasesView";
import AcceptanceCriteriaView from "./components/AcceptanceCriteriaView";
import DataRequirementsView from "./components/DataRequirementsView";
import IntegrationsView from "./components/IntegrationsView";
import SecurityView from "./components/SecurityView";
import ComplianceView from "./components/ComplianceView";
import ReportingRequirementsView from "./components/ReportingRequirementsView";
import TraceabilityMatrixView from "./components/TraceabilityMatrixView";
import VersionHistoryView from "./components/VersionHistoryView";
import ApprovalsView from "./components/ApprovalsView";
import ProductModulesView from "./components/ProductModulesView";
import FeaturesView from "./components/FeaturesView";
import EpicsView from "./components/EpicsView";
import BacklogView from "./components/BacklogView";
import ScopeView from "./components/ScopeView";
import FeaturePrioritizationView from "./components/FeaturePrioritizationView";
import ProductRoadmapView from "./components/ProductRoadmapView";
import ProcessMapsView from "./components/ProcessMapsView";
import SwimlanesView from "./components/SwimlanesView";
import WorkflowBuilderView from "./components/WorkflowBuilderView";
import AutomationOpportunitiesView from "./components/AutomationOpportunitiesView";
import ValueStreamMappingView from "./components/ValueStreamMappingView";
import WireframesView from "./components/WireframesView";
import FigmaLinksView from "./components/FigmaLinksView";
import PrototypeReviewsView from "./components/PrototypeReviewsView";
import UXFeedbackView from "./components/UXFeedbackView";
import UISignoffView from "./components/UISignoffView";
import TestStrategyView from "./components/TestStrategyView";
import TestPlanView from "./components/TestPlanView";
import TestExecutionView from "./components/TestExecutionView";
import TestCoverageView from "./components/TestCoverageView";
import AIConversationTestingView from "./components/AIConversationTestingView";
import FeatureAdoptionView from "./components/FeatureAdoptionView";
import GoNoGoView from "./components/GoNoGoView";
import SprintPlanningView from "./components/SprintPlanningView";
import SprintBoardView from "./components/SprintBoardView";
import ReleasePlanningView from "./components/ReleasePlanningView";
import DeploymentChecklistView from "./components/DeploymentChecklistView";
import ProductionReadinessView from "./components/ProductionReadinessView";
import ChangeRequestsView from "./components/ChangeRequestsView";
import ReleaseNotesView from "./components/ReleaseNotesView";
import PostDeploymentReviewView from "./components/PostDeploymentReviewView";
import LessonsLearnedView from "./components/LessonsLearnedView";
import ExecutiveDashboardView from "./components/ExecutiveDashboardView";
import BADashboardView from "./components/BADashboardView";
import RiskDashboardView from "./components/RiskDashboardView";
import QADashboardView from "./components/QADashboardView";
import ProjectHealthView from "./components/ProjectHealthView";
import ReleaseReadinessReportView from "./components/ReleaseReadinessReportView";
import AnalyticsView from "./components/AnalyticsView";
import TemplatesView from "./components/TemplatesView";
import StatusConfigView from "./components/StatusConfigView";
import RiskMatrixConfigView from "./components/RiskMatrixConfigView";
import RolesManagementView from "./components/RolesManagementView";
import PermissionsMatrixView from "./components/PermissionsMatrixView";
import IntegrationsConfigView from "./components/IntegrationsConfigView";
import WorkspaceSettingsView from "./components/WorkspaceSettingsView";

// UAT Modules
import UatView from "./components/UatView";
import UatTesterWorkspaceView from "./components/UatTesterWorkspaceView";
import UatCoordinatorDashboardView from "./components/UatCoordinatorView";
import UatTesterManagementView from "./components/UatTesterManagementView";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Theme = "light" | "dark";
type View = string;
type UserRole = "admin" | "onboarding_agent" | "tester" | "viewer";

// ─── NAV STRUCTURE (REORGANIZED) ─────────────────────────────────────────────
const NAV_GROUPS = [
  { id: "workspace", label: "WORKSPACE", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { id: "my-tasks", label: "My Tasks", icon: CheckSquare, badge: 7 },
    { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
    { id: "calendar", label: "Calendar", icon: Calendar, badge: null },
  ]},
  { id: "project-initiation", label: "PROJECT INITIATION", items: [
    { id: "projects", label: "Projects", icon: FolderOpen, badge: null },
    { id: "stakeholders", label: "Stakeholders", icon: Users, badge: null },
    { id: "business-case", label: "Business Case", icon: BookOpen, badge: null },
  ]},
  { id: "discovery", label: "DISCOVERY", items: [
    { id: "meeting-notes", label: "Meeting Notes", icon: ClipboardList, badge: null },
    { id: "decision-log", label: "Decision Log", icon: CheckSquare, badge: null },
    { id: "problem-statements", label: "Problem Statements", icon: FileText, badge: null },
    { id: "goals-objectives", label: "Goals & Objectives", icon: Target, badge: null },
    { id: "current-state", label: "Current State (As-Is)", icon: Eye, badge: null },
    { id: "future-state", label: "Future State (To-Be)", icon: ArrowUpRight, badge: null },
    { id: "gap-analysis", label: "Gap Analysis", icon: GitBranch, badge: null },
  ]},
  { id: "business-analysis", label: "BUSINESS ANALYSIS", items: [
    { id: "business-rules", label: "Business Rules", icon: Layers, badge: null },
    { id: "assumptions", label: "Assumptions", icon: Info, badge: null },
    { id: "constraints", label: "Constraints", icon: Shield, badge: null },
    { id: "dependencies", label: "Dependencies", icon: Link2, badge: null },
    { id: "risks-discovery", label: "Risks", icon: AlertTriangle, badge: null },
  ]},
  { id: "scope-definition", label: "SCOPE DEFINITION", items: [
    { id: "scope", label: "Scope", icon: Target, badge: null },
    { id: "epics", label: "Epics", icon: Layers, badge: null },
    { id: "features", label: "Features", icon: Star, badge: null },
  ]},
  { id: "process-analysis", label: "PROCESS ANALYSIS", items: [
    { id: "value-stream", label: "Value Stream Mapping", icon: ArrowRight, badge: null },
    { id: "process-maps", label: "Process Maps", icon: Workflow, badge: null },
    { id: "swimlanes", label: "Swimlanes", icon: Layers, badge: null },
    { id: "workflow-builder", label: "Workflow Builder", icon: GitBranch, badge: null },
    { id: "automation", label: "Automation Opportunities", icon: Zap, badge: null },
  ]},
  { id: "requirements-engineering", label: "REQUIREMENTS", items: [
    { id: "requirements", label: "All Requirements", icon: FileText, badge: null },
    { id: "data-requirements", label: "Data Requirements", icon: Database, badge: null },
    { id: "security-reqs", label: "Security", icon: Shield, badge: null },
    { id: "compliance", label: "Compliance", icon: Award, badge: null },
    { id: "reporting-reqs", label: "Reporting Requirements", icon: BarChart3, badge: null },
    { id: "integrations", label: "Integrations", icon: CircuitBoard, badge: null },
    { id: "use-cases", label: "Use Cases", icon: Eye, badge: null },
    { id: "user-stories", label: "User Stories", icon: BookOpen, badge: null },
    { id: "acceptance-criteria", label: "Acceptance Criteria", icon: CheckCircle2, badge: null },
    { id: "rtm", label: "Traceability Matrix", icon: GitBranch, badge: null },
    { id: "version-history", label: "Version History", icon: Clock, badge: null },
    { id: "approvals", label: "Approvals", icon: CheckCircle2, badge: 4 },
  ]},
  { id: "solution-design", label: "SOLUTION DESIGN", items: [
    { id: "wireframes", label: "Wireframes", icon: Paintbrush, badge: null },
    { id: "figma-links", label: "Figma Links", icon: Link2, badge: null },
    { id: "prototype-reviews", label: "Prototype Reviews", icon: Eye, badge: null },
    { id: "ux-feedback", label: "UX Feedback", icon: Megaphone, badge: null },
    { id: "ui-signoff", label: "UI Sign-off", icon: CheckCircle2, badge: 2 },
  ]},
  { id: "product-management", label: "PRODUCT MANAGEMENT", items: [
    { id: "modules", label: "Modules", icon: Package, badge: null },
    { id: "backlog", label: "Backlog", icon: ClipboardList, badge: null },
    { id: "feature-prioritization", label: "Feature Prioritization", icon: BarChart3, badge: null },
    { id: "product-roadmap", label: "Product Roadmap", icon: Map, badge: null },
    { id: "roadmaps", label: "Roadmaps", icon: Map, badge: null },
  ]},
  { id: "delivery-planning", label: "DELIVERY PLANNING", items: [
    { id: "sprints", label: "Sprints", icon: Zap, badge: null },
    { id: "milestones", label: "Milestones", icon: Target, badge: null },
    { id: "sprint-planning", label: "Sprint Planning", icon: Calendar, badge: null },
    { id: "sprint-board", label: "Sprint Board", icon: Zap, badge: null },
    { id: "release-planning", label: "Release Planning", icon: Rocket, badge: null },
    { id: "releases", label: "Releases", icon: Rocket, badge: null },
  ]},
  { id: "testing", label: "TESTING", items: [
    { id: "test-strategy", label: "Test Strategy", icon: TestTube, badge: null },
    { id: "test-plan", label: "Test Plan", icon: ClipboardList, badge: null },
    { id: "test-cases", label: "Test Cases", icon: TestTube, badge: null },
    { id: "test-execution", label: "Test Execution", icon: Activity, badge: null },
    { id: "test-coverage", label: "Test Coverage", icon: BarChart3, badge: null },
    { id: "defects", label: "Defects", icon: Bug, badge: 43 },
    { id: "ai-testing", label: "AI Conversation Testing", icon: HelpCircle, badge: null },
  ]},
  { id: "uat", label: "UAT", items: [
    { id: "uat-management", label: "UAT Onboarding Desk", icon: Users, badge: null },
    { id: "uat-tester", label: "UAT Tester Desk", icon: ClipboardList, badge: null },
    { id: "uat", label: "UAT Log Matrix", icon: CheckSquare, badge: null },
    { id: "uat-coordinators", label: "UAT Release Gates", icon: ShieldAlert, badge: null },
  ]},
  { id: "release-management", label: "RELEASE MANAGEMENT", items: [
    { id: "release-readiness", label: "Production Readiness", icon: Gauge, badge: null },
    { id: "change-requests", label: "Change Requests", icon: GitBranch, badge: 5 },
    { id: "go-no-go", label: "Go / No-Go", icon: Gauge, badge: null },
    { id: "deployment-checklist", label: "Deployment Checklist", icon: CheckSquare, badge: null },
  ]},
  { id: "production", label: "PRODUCTION", items: [
    { id: "release-notes", label: "Release Notes", icon: FileText, badge: null },
  ]},
  { id: "post-implementation", label: "POST IMPLEMENTATION", items: [
    { id: "post-deployment", label: "Post Deployment Review", icon: RefreshCcw, badge: null },
    { id: "feature-adoption", label: "Feature Adoption", icon: TrendingUp, badge: null },
    { id: "lessons-learned", label: "Lessons Learned", icon: BookOpen, badge: null },
  ]},
  { id: "reports", label: "REPORTS", items: [
    { id: "executive-dashboard", label: "Executive Dashboard", icon: BarChart3, badge: null },
    { id: "ba-dashboard", label: "BA Dashboard", icon: PieChart, badge: null },
    { id: "qa-dashboard", label: "QA Dashboard", icon: TestTube, badge: null },
    { id: "risk-dashboard", label: "Risk Dashboard", icon: AlertTriangle, badge: null },
    { id: "project-health", label: "Project Health", icon: Activity, badge: null },
    { id: "release-readiness-report", label: "Release Readiness", icon: Rocket, badge: null },
    { id: "analytics", label: "Analytics", icon: BarChart3, badge: null },
  ]},
  { id: "admin", label: "ADMINISTRATION", items: [
    { id: "templates", label: "Templates", icon: FileText, badge: null },
    { id: "status-config", label: "Status Configuration", icon: Settings, badge: null },
    { id: "risk-matrix", label: "Risk Matrix", icon: AlertTriangle, badge: null },
    { id: "roles", label: "Roles", icon: Users, badge: null },
    { id: "permissions", label: "Permissions", icon: Lock, badge: null },
    { id: "integrations-admin", label: "Integrations", icon: CircuitBoard, badge: null },
    { id: "workspace-settings", label: "Workspace Settings", icon: Settings, badge: null },
  ]},
];

// ─── SIDEBAR WITH RBAC FILTERING ─────────────────────────────────────────────
function Sidebar({ activeView, onViewChange, currentRole }: { activeView: any; onViewChange: (v: any) => void, currentRole: UserRole }) {
  const [expanded, setExpanded] = useState(new Set([
    "workspace", "project-initiation", "discovery", "business-analysis", "scope-definition", 
    "process-analysis", "requirements-engineering", "solution-design", "product-management", 
    "delivery-planning", "testing", "uat", "release-management", "production", 
    "post-implementation", "reports", "admin"
  ]));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleGroup = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const isSearching = searchQuery.trim().length > 0;
  
  // 💡 RBAC LOGIC: Hard filter the navigation items based on the active persona profile
  const roleFilteredGroups = NAV_GROUPS.map(group => {
    const roleMatchedItems = group.items.filter(item => {
      if (currentRole === "admin") return true; 
      if (currentRole === "viewer") return group.id !== "admin"; 
      if (currentRole === "tester") return item.id === "uat-tester"; 
      if (currentRole === "onboarding_agent") return item.id === "uat-management" || item.id === "dashboard"; 
      return false;
    });

    const searchMatchedItems = roleMatchedItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return { ...group, items: searchMatchedItems };
  }).filter(group => group.items.length > 0);

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full flex-shrink-0 z-10 hidden md:flex">
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center shadow-sm text-primary-foreground text-xs">
            N
          </div>
          BA's Pandora
        </div>
      </div>

      {(currentRole === "admin" || currentRole === "viewer") && (
        <div className="p-3 border-b border-border/60 bg-muted/5 shrink-0">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Quick search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border/80 rounded-lg pl-9 pr-8 py-1.5 text-xs font-semibold placeholder:text-muted-foreground/30 text-foreground transition-all focus:outline-none focus:border-primary focus:bg-background"
            />
            {isSearching && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 p-0.5 text-muted-foreground/60 hover:text-foreground rounded transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {roleFilteredGroups.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground italic">
            No modules match query
          </div>
        ) : (
          roleFilteredGroups.map(group => {
            const isGroupOpen = isSearching || expanded.has(group.id) || currentRole !== "admin";

            return (
              <div key={group.id}>
                {(currentRole === "admin" || currentRole === "viewer") && (
                  <button 
                    onClick={() => !isSearching && toggleGroup(group.id)}
                    disabled={isSearching}
                    className={cn(
                      "flex items-center justify-between w-full mb-2 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider transition-colors",
                      !isSearching && "hover:text-foreground cursor-pointer"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {group.label}
                      {isSearching && <span className="font-mono text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full lowercase font-normal tracking-normal">{group.items.length} hit</span>}
                    </span>
                    {!isSearching && (isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                  </button>
                )}
                
                {isGroupOpen && (
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onViewChange(item.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
                            isActive 
                          ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon size={16} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                          <span className="truncate flex-1">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
function TopBar({ activeView, theme, onToggleTheme, activeProject, onProjectChange, userEmail, onViewChange, currentRole, onRoleChange }: {
  activeView: View; theme: Theme; onToggleTheme: () => void; activeProject: string; onProjectChange: (p: string) => void; userEmail?: string; onViewChange: (v: string) => void; currentRole: UserRole; onRoleChange: (r: UserRole) => void;
}) {
  const [showProjects, setShowProjects] = useState(false);
  const [projectList, setProjectList] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  
  const navLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeView)?.label ?? "Dashboard";
  const group = NAV_GROUPS.find(g => g.items.some(i => i.id === activeView));

  useEffect(() => {
    async function fetchProjectNames() {
      const { data } = await supabase.from('projects').select('name');
      if (data) {
        setProjectList(data.map(p => p.name));
        if (!activeProject && data.length > 0) onProjectChange(data[0].name);
      }
    }
    fetchProjectNames();
  }, [activeProject, onProjectChange]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b border-border bg-card flex-shrink-0 relative">
      <div className="flex items-center gap-1 text-sm min-w-0">
        {(currentRole === "admin" || currentRole === "viewer") && (
          <>
            <span className="text-muted-foreground text-xs">{group?.label}</span>
            <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
          </>
        )}
        <span className="font-medium text-foreground truncate">{navLabel}</span>
      </div>

      {(currentRole === "admin" || currentRole === "viewer") && (
        <div className="relative">
          <button onClick={() => setShowProjects(!showProjects)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-secondary text-sm hover:bg-muted transition-colors">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="max-w-[160px] truncate">{activeProject || "Select Project"}</span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
          {showProjects && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
              {projectList.map(p => (
                <button key={p} onClick={() => { onProjectChange(p); setShowProjects(false); }} className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors", p === activeProject ? "text-primary font-medium" : "text-foreground")}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {(currentRole === "admin" || currentRole === "viewer") && (
        <div className="flex-1 max-w-xl relative">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              value={query}
              onFocus={() => setIsMegaOpen(true)}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-14 py-1.5 text-sm bg-muted border border-border rounded-lg placeholder-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50" 
              placeholder="Search workspace components... (Ctrl + K)" 
            />
          </div>
        </div>
      )}
      
      {currentRole !== "admin" && currentRole !== "viewer" && <div className="flex-1" />}

      <div className="flex items-center gap-2 ml-auto">
        <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors">
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        
        <div className="flex items-center gap-2 ml-2 pl-4 border-l border-border">
          <div className="flex flex-col items-end hidden sm:flex pl-2">
            <span className="text-[10px] text-muted-foreground leading-none mb-1">Session</span>
            <button 
              onClick={handleSignOut}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
function renderView(
  view: View, 
  activeProject: string, 
  onViewChange: (v: string) => void, 
  onProjectChange: (p: string) => void, 
  userEmail?: string
) {
  switch (view) {
    case "dashboard": return <DashboardView activeProject={activeProject} onViewChange={onViewChange} />;
    case "my-tasks": return <MyTasksView activeProject={activeProject} userEmail={userEmail} onViewChange={onViewChange} />;
    case "notifications": return <NotificationsView userEmail={userEmail} onViewChange={onViewChange} />;
    case "calendar": return <CalendarView activeProject={activeProject} onViewChange={onViewChange} />;
    case "recent-activity": return <RecentActivityView activeProject={activeProject} />;
    case "projects": return <ProjectsView activeProject={activeProject} onProjectChange={onProjectChange} onViewChange={onViewChange} />;
    case "roadmaps": return <RoadmapView activeProject={activeProject} />;
    case "milestones":
    case "project-milestones": return <MilestonesView activeProject={activeProject} />;
    case "business-case": return <BusinessCaseView activeProject={activeProject} />;
    case "problem-statements": return <ProblemStatementsView activeProject={activeProject} />;
    case "goals-objectives": return <GoalsObjectivesView activeProject={activeProject} />;
    case "current-state": return <CurrentStateView activeProject={activeProject} />;
    case "future-state": return <FutureStateView activeProject={activeProject} />;
    case "gap-analysis": return <GapAnalysisView activeProject={activeProject} />;
    case "stakeholder-map":
    case "stakeholders": return <StakeholdersView activeProject={activeProject} />;
    case "business-rules": return <BusinessRulesView activeProject={activeProject} />;
    case "assumptions": return <AssumptionsView activeProject={activeProject} />;
    case "constraints": return <ConstraintsView activeProject={activeProject} />;
    case "dependencies": return <DependenciesView activeProject={activeProject} />;
    case "risks": 
    case "risks-discovery": return <RisksView activeProject={activeProject} />;
    case "meeting-notes": return <MeetingNotesView activeProject={activeProject} />;
    case "decision-log": return <DecisionLogView activeProject={activeProject} />;
    case "requirements":
    case "all-requirements": return <AllRequirementsView activeProject={activeProject} />;
    case "acceptance-criteria": return <AcceptanceCriteriaView activeProject={activeProject} />;
    case "integrations": return <IntegrationsView activeProject={activeProject} />;
    case "functional-reqs":
    case "non-functional-reqs":
    case "data-requirements": return <DataRequirementsView activeProject={activeProject} />;
    case "security-reqs": 
    case "security": return <SecurityView activeProject={activeProject} />;
    case "compliance": return <ComplianceView activeProject={activeProject} />;
    case "reporting-reqs": return <ReportingRequirementsView activeProject={activeProject} />;
    case "process-flows": return <RequirementsView activeProject={activeProject} />;
    case "use-cases": return <UseCasesView activeProject={activeProject} />;
    case "user-stories": return <UserStoriesView activeProject={activeProject} />;
    case "product-backlog":
    case "backlog": return <BacklogView activeProject={activeProject} />;
    case "traceability-matrix": return <TraceabilityMatrixView activeProject={activeProject} />;
    case "rtm": return <RTMView activeProject={activeProject} />;
    case "version-history": return <VersionHistoryView activeProject={activeProject} />;
    case "approvals": return <ApprovalsView activeProject={activeProject} />;
    case "modules": return <ProductModulesView activeProject={activeProject} />;
    case "features": return <FeaturesView activeProject={activeProject} />;
    case "epics": return <EpicsView activeProject={activeProject} />;
    case "scope": return <ScopeView activeProject={activeProject} />;
    case "feature-prioritization": return <FeaturePrioritizationView activeProject={activeProject} />;
    case "product-roadmap": return <ProductRoadmapView activeProject={activeProject} />;
    case "wireframes": return <WireframesView activeProject={activeProject} />;
    case "figma-links": return <FigmaLinksView activeProject={activeProject} />;
    case "prototype-reviews": return <PrototypeReviewsView activeProject={activeProject} />;
    case "ux-feedback": return <UXFeedbackView activeProject={activeProject} />;
    case "ui-signoff": return <UISignoffView activeProject={activeProject} />;
    case "process-maps": return <ProcessMapsView activeProject={activeProject} />;
    case "swimlanes": return <SwimlanesView activeProject={activeProject} />;
    case "workflow-builder": return <WorkflowBuilderView activeProject={activeProject} />;
    case "automation": return <AutomationOpportunitiesView activeProject={activeProject} />;
    case "value-stream": return <ValueStreamMappingView activeProject={activeProject} />;
    case "sprint-planning": return <SprintPlanningView activeProject={activeProject} />;
    case "sprint-board": return <SprintBoardView activeProject={activeProject} />;
    case "release-planning": return <ReleasePlanningView activeProject={activeProject} />;
    case "deployment-checklist": return <DeploymentChecklistView activeProject={activeProject} />;
    case "post-deployment":
    case "post-deployment-review": return <PostDeploymentReviewView activeProject={activeProject} />;
    case "lessons-learned": return <LessonsLearnedView activeProject={activeProject} />;
    case "production-readiness": 
    case "release-readiness": return <ProductionReadinessView activeProject={activeProject} />;
    case "change-requests": return <ChangeRequestsView activeProject={activeProject} />;
    case "releases":
    case "release-notes": return <ReleaseNotesView activeProject={activeProject} />;
    case "test-strategy": return <TestStrategyView activeProject={activeProject} />;
    case "test-plan": return <TestPlanView activeProject={activeProject} />;
    case "test-cases": return <TestCasesView activeProject={activeProject} userEmail={userEmail} />;
    case "test-execution": return <TestExecutionView activeProject={activeProject} />;
    case "test-coverage": return <TestCoverageView activeProject={activeProject} />;
    case "defects": return <DefectsView activeProject={activeProject} />;
    case "uat": return <UatView activeProject={activeProject} />;
    case "uat-tester": return <UatTesterWorkspaceView activeProject={activeProject} />;
    case "uat-management": return <UatTesterManagementView activeProject={activeProject} />;
    case "uat-coordinators": return <UatCoordinatorDashboardView activeProject={activeProject} />;
    case "ai-testing":
    case "ai-conversation-testing": return <AIConversationTestingView activeProject={activeProject} />;
    case "feature-adoption": return <FeatureAdoptionView activeProject={activeProject} />;
    case "go-no-go":
    case "go-/-no-go": return <GoNoGoView activeProject={activeProject} />;
    case "executive-dashboard":
    case "exec-dashboard": return <ExecutiveDashboardView activeProject={activeProject} />;
    case "ba-dashboard": return <BADashboardView activeProject={activeProject} />;
    case "qa-dashboard": return <QADashboardView activeProject={activeProject} />;
    case "risk-dashboard": return <RiskDashboardView activeProject={activeProject} />;
    case "project-health": return <ProjectHealthView activeProject={activeProject} />;
    case "release-readiness-report": return <ReleaseReadinessReportView activeProject={activeProject} />;
    case "analytics": return <AnalyticsView activeProject={activeProject} />;
    case "templates": return <TemplatesView />;
    case "status-config": return <StatusConfigView />;
    case "risk-matrix": return <RiskMatrixConfigView />;
    case "roles": return <RolesManagementView />;
    case "permissions": return <PermissionsMatrixView />;
    case "integrations-admin": return <IntegrationsConfigView />;
    case "workspace-settings": return <WorkspaceSettingsView />;

    default: 
      return (
        <div className="flex items-center justify-center h-full flex-col text-muted-foreground p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border shadow-sm">
            <span className="text-2xl">🚧</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Module Under Construction</h2>
          <p className="text-sm max-w-md">
            The <strong>{view}</strong> module is currently being built. Please navigate to Dashboard, Requirements, Stories, Tasks, or Testing to see the functional components.
          </p>
        </div>
      );
  }
}

// ─── APP MASTER ROOT ──────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activeProject, setActiveProject] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole>("admin"); 
  
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // 💡 FORCE ROUTE BASED ON ACTIVE ROLE OVERRIDE
  useEffect(() => {
    if (userRole === "tester") setActiveView("uat-tester");
    else if (userRole === "onboarding_agent") setActiveView("uat-management");
    else if (userRole === "viewer") setActiveView("dashboard");
    else setActiveView("dashboard");
  }, [userRole]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading BA's Pandora...</div>;
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        currentRole={userRole}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar 
          activeView={activeView} 
          theme={theme} 
          onToggleTheme={() => setTheme(t => t === "light" ? "dark" : "light")} 
          activeProject={activeProject}
          onProjectChange={setActiveProject}
          userEmail={session.user.email}
          onViewChange={setActiveView}
          currentRole={userRole}
          onRoleChange={setUserRole}
        />
        <main className="flex-1 overflow-y-auto relative bg-background">
          {renderView(activeView, activeProject, setActiveView, setActiveProject, session.user.email)}
        </main>
      </div>
    </div>
  );
}