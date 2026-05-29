import { NavLink } from 'react-router';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, ClipboardCheck, FileText, Bell,
  Activity, CreditCard, Palette, Plug, Settings, ChevronLeft, Moon, Sun, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  onToggleTheme: () => void;
  isDark: boolean;
  alertCount?: number;
  accountCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: Building2,       label: 'Accounts',  to: '/monitoring' },
  { icon: ClipboardCheck,  label: 'Audits',    to: '/audits' },
  { icon: FileText,        label: 'Reports',   to: '/reports' },
  { icon: Bell,            label: 'Alerts',    to: '/alerts' },
  { icon: Activity,        label: 'Analytics', to: '/analytics' },
  { icon: CreditCard,      label: 'Billing',   to: '/billing' },
  { icon: Palette,         label: 'White-label', to: '/white-label' },
  { icon: Plug,            label: 'Integrations', to: '/integrations' },
  { icon: Settings,        label: 'Settings',  to: '/settings' },
];

export function Sidebar({ onToggleTheme, isDark, alertCount = 0, accountCount = 0, mobileOpen = false, onMobileClose = () => {} }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { workspace, workspaces, switchWorkspace } = useAuth();

  // Auto-collapse on tablet, expand on desktop, restore manual control on resize
  useEffect(() => {
    function sync() {
      const w = window.innerWidth;
      if (w >= 1024) setIsCollapsed(false);
      else if (w >= 768) setIsCollapsed(true);
    }
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  function getBadge(label: string): string | null {
    if (label === 'Alerts' && alertCount > 0) return String(alertCount);
    if (label === 'Accounts' && accountCount > 0) return String(accountCount);
    return null;
  }

  function SidebarInner({ collapsed, showClose }: { collapsed: boolean; showClose?: boolean }) {
    return (
      <div className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="h-[72px] flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <NavLink to="/" onClick={showClose ? onMobileClose : undefined} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-sidebar-foreground">TrackAudit</span>
            </NavLink>
          )}
          {collapsed && !showClose && (
            <NavLink to="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto hover:opacity-80 transition-opacity">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </NavLink>
          )}
          {showClose && (
            <NavLink to="/" onClick={onMobileClose} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-sidebar-foreground">TrackAudit</span>
            </NavLink>
          )}
          {showClose && (
            <button onClick={onMobileClose} className="p-1.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Workspace picker */}
        {!collapsed && workspaces.length > 1 && (
          <div className="px-3 pt-3">
            <select
              value={workspace?.id ?? ''}
              onChange={e => {
                const ws = workspaces.find(w => w.id === e.target.value);
                if (ws) switchWorkspace(ws);
              }}
              className="w-full text-xs bg-sidebar-accent text-sidebar-foreground rounded-lg px-3 py-2 border border-sidebar-border focus:outline-none"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const badge = getBadge(item.label);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={showClose ? onMobileClose : undefined}
                className={({ isActive }) =>
                  collapsed
                    ? `flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors duration-200 ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`
                    : `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    {badge && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={onToggleTheme}
            className={
              collapsed
                ? 'flex items-center justify-center w-10 h-10 rounded-lg mx-auto text-sidebar-foreground hover:bg-sidebar-accent transition-colors'
                : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors'
            }
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!collapsed && <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {!showClose && (
            <button
              onClick={() => setIsCollapsed(!collapsed)}
              className={
                collapsed
                  ? 'flex items-center justify-center w-10 h-10 rounded-lg mx-auto text-sidebar-foreground hover:bg-sidebar-accent transition-colors'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors'
              }
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">Collapse</span>}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop + tablet: in layout flow, hidden on mobile */}
      <div className="hidden md:block h-screen shrink-0">
        <SidebarInner collapsed={isCollapsed} />
      </div>

      {/* Mobile: slide-in overlay drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
        <div
          className={`absolute left-0 top-0 h-full transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarInner collapsed={false} showClose />
        </div>
      </div>
    </>
  );
}
