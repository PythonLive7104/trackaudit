import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Search, User, ChevronDown, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useApi';

interface AppShellProps {
  children: ReactNode;
  alertCount?: number;
  accountCount?: number;
}

export function AppShell({ children, alertCount = 0, accountCount = 0 }: AppShellProps) {
  const { isDark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        onToggleTheme={toggle}
        isDark={isDark}
        alertCount={alertCount}
        accountCount={accountCount}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <div className="h-[72px] bg-card border-b border-border px-4 sm:px-6 lg:px-8 flex items-center gap-3 justify-between shrink-0">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {/* Search — hidden on small mobile */}
          <div className="hidden sm:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search accounts, audits, reports..."
                className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                readOnly
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => navigate('/alerts')}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>

            <div className="relative group">
              <button className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4 border-l border-border">
                {/* Name + role — hidden on small screens */}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{user?.full_name ?? 'User'}</p>
                  <p className="text-xs text-muted-foreground">Agency Admin</p>
                </div>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 space-y-1">
                  <button onClick={() => navigate('/settings')} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors">Settings</button>
                  <button onClick={() => navigate('/billing')} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors">Billing</button>
                  <hr className="border-border my-1" />
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-destructive">Sign out</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
