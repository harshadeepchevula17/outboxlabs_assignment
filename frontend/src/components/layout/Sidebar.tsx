import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  Terminal,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Scheduled', to: '/scheduled', icon: Clock },
  { name: 'Sent', to: '/sent', icon: CheckCircle2 },
  { name: 'Failed', to: '/failed', icon: AlertTriangle },
  { name: 'Compose Email', to: '/compose', icon: Send },
  { name: 'Sender Accounts', to: '/senders', icon: Users },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0E131F]/90 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shadow-lg shadow-blue-500/10">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base tracking-tight leading-none">
              OutboxLabs
            </h1>
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">
              Queue Engine v1.0
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer System Status Badge */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="glass-panel p-3 rounded-lg flex items-center gap-3">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="text-xs">
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <span>BullMQ + Redis Active</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">10 Workers Active</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
