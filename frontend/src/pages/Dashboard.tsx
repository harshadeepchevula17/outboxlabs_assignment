import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, fetchSenders } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { SkeletonCard } from '../components/common/Skeleton';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  Zap,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 3000,
  });

  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
    refetchInterval: 5000,
  });

  const chartData = [
    { name: 'Scheduled', count: stats?.scheduled || 0, color: '#f59e0b' },
    { name: 'Processing', count: stats?.processing || 0, color: '#3b82f6' },
    { name: 'Sent', count: stats?.sent || 0, color: '#10b981' },
    { name: 'Failed', count: stats?.failed || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Email Infrastructure Control</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              BullMQ Engine
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry, rate-limiting, and idempotency status across active queues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/compose"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all duration-150"
          >
            <Send className="w-4 h-4" />
            <span>Schedule Email</span>
          </Link>
        </div>
      </div>

      {/* Metrics Counter Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scheduled */}
          <Link
            to="/scheduled"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Scheduled Queue
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.scheduled || 0}
              </span>
              <span className="text-xs text-amber-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Processing */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Processing
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Zap className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.processing || 0}
              </span>
            </div>
          </div>

          {/* Sent */}
          <Link
            to="/sent"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Delivered / Sent
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.sent || 0}
              </span>
              <span className="text-xs text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Failed */}
          <Link
            to="/failed"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-rose-500/40 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Failed Attempts
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.failed || 0}
              </span>
              <span className="text-xs text-rose-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Main Grid: Chart + Senders overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Queue Status Breakdown</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Realtime updates</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sender Health & Hourly Rate Limits */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Sender Rate Limits</span>
            </h2>
            <Link to="/senders" className="text-xs text-blue-400 hover:underline">
              Manage
            </Link>
          </div>

          {!senders || senders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No sender accounts configured.
              <div className="mt-2">
                <Link
                  to="/senders"
                  className="text-xs bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-md border border-blue-500/30 font-medium inline-block hover:bg-blue-600/30"
                >
                  Add Sender Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {senders.map((sender) => {
                const sent = sender.rateLimit?.sentThisHour || 0;
                const max = sender.rateLimit?.maxLimitPerHour || 200;
                const pct = Math.min(100, Math.round((sent / max) * 100));

                return (
                  <div key={sender.id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate max-w-[140px]" title={sender.name}>
                        {sender.name}
                      </span>
                      <span className="font-mono text-slate-400">
                        {sent} / {max} sent/hr
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent System Activity Log Stream */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Recent Queue Events</span>
        </h2>

        {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">No recent events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">Event</th>
                  <th className="p-3">Email ID</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats.recentActivity.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <StatusBadge status={evt.event} />
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      <Link to={`/emails/${evt.emailId}`} className="hover:text-blue-400 hover:underline">
                        {evt.emailId.substring(0, 8)}...
                      </Link>
                    </td>
                    <td className="p-3 text-slate-200 font-medium">{evt.toEmail || 'N/A'}</td>
                    <td className="p-3 text-slate-300 truncate max-w-xs">{evt.subject || 'N/A'}</td>
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
