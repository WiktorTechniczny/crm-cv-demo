import { Ban, BarChart3, BriefcaseBusiness, GitBranch, LogOut, PanelLeftClose, PanelLeftOpen, RefreshCcw, Settings, Users } from "lucide-react";
import type { User } from "../types.js";

export type AppSection = "candidates" | "blacklist" | "jobs" | "sync" | "processes" | "reports" | "settings";

const navItems = [
  ["candidates", "Kandydaci", Users],
  ["jobs", "Ogłoszenia", BriefcaseBusiness],
  ["blacklist", "Czarna lista", Ban],
  ["sync", "Synchronizacja", RefreshCcw],
  ["processes", "Procesy", GitBranch],
  ["reports", "Raporty", BarChart3],
  ["settings", "Ustawienia", Settings]
] as const;

export const roleSections: Record<User["role"], AppSection[]> = {
  ADMIN: ["candidates", "blacklist", "jobs", "sync", "processes", "reports", "settings"],
  MANAGER: ["candidates", "blacklist", "jobs", "sync", "processes", "reports"],
  RECRUITER: ["candidates", "blacklist", "jobs"],
  VIEWER: ["candidates", "blacklist", "jobs", "reports"]
};
export function visibleSectionsForRole(role: User["role"]) {
  return roleSections[role] ?? [];
}

interface SidebarProps {
  user: User;
  activeSection: AppSection;
  collapsed?: boolean;
  onNavigate: (section: AppSection) => void;
  onLogout: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ user, activeSection, collapsed = false, onNavigate, onLogout, onToggleCollapsed }: SidebarProps) {
  const visibleNavItems = navItems.filter(([id]) => visibleSectionsForRole(user.role).includes(id));

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="logo">CV</div>
        <div className="sidebar-brand-text">
          <strong>CRM Rekrutacje</strong>
          <span>Fullstack Studio</span>
        </div>
        <button
          aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          title={collapsed ? "Rozwiń menu" : "Zwiń menu"}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>
      <nav>
        {visibleNavItems.map(([id, label, Icon]) => (
          <button className={activeSection === id ? "active" : ""} key={id} onClick={() => onNavigate(id)} title={collapsed ? label : undefined}>
            <Icon size={18} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <strong className="sidebar-user-name">{user.name}</strong>
        <span className="sidebar-user-role">{user.role}</span>
        <button onClick={onLogout} title={collapsed ? "Wyloguj" : undefined}>
          <LogOut size={16} />
          <span className="nav-label">Wyloguj</span>
        </button>
      </div>
    </aside>
  );
}
