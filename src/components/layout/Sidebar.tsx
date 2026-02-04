import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Mail,
  Users,
  FileCode,
  Calendar,
  Settings,
  Send,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmailStats } from '@/hooks/useEmailStats';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Send, label: 'Campaigns', path: '/campaigns' },
  { icon: Users, label: 'Recipients', path: '/recipients' },
  { icon: Mail, label: 'Compose', path: '/compose' },
  { icon: FileCode, label: 'Templates', path: '/templates' },
  { icon: Calendar, label: 'Scheduler', path: '/scheduler' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

export function Sidebar({ className, onLinkClick }: SidebarProps) {
  const location = useLocation();
  const { stats } = useEmailStats();

  return (
    <aside className={cn("fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col", className)}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">MailFlow</h1>
            <p className="text-xs text-sidebar-foreground/60">Email Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onLinkClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-8 bg-sidebar-primary rounded-r-full"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-4">
        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium transition-all duration-200 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>

        <div className="bg-sidebar-accent rounded-lg p-4">
          <p className="text-xs text-sidebar-foreground/60 mb-2">Quick Stats</p>
          <p className="text-2xl font-bold text-sidebar-foreground">{stats.totalSent.toLocaleString()}</p>
          <p className="text-xs text-sidebar-primary">Total emails sent</p>
          <div className="mt-2 pt-2 border-t border-sidebar-border/50 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-sidebar-foreground/60">Recipients</p>
              <p className="font-semibold text-sidebar-foreground">{stats.totalRecipients}</p>
            </div>
            <div>
              <p className="text-sidebar-foreground/60">Failed</p>
              <p className="font-semibold text-destructive">{stats.totalFailed}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
