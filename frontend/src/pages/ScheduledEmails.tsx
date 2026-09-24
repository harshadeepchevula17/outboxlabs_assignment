import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEmails, cancelEmail, fetchSenders } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { SkeletonRow } from '../components/common/Skeleton';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, XCircle, Eye, AlertCircle } from 'lucide-react';

export const ScheduledEmails: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [senderId, setSenderId] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
  });

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['emails-scheduled', page, search, senderId],
    queryFn: () =>
      fetchEmails({
        page,
        limit: 15,
        status: 'SCHEDULED',
        search,
        senderId: senderId || undefined,
      }),
    refetchInterval: 3000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelEmail(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emails-scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setToastMessage(`Email ${data.data?.id?.substring(0, 8)} cancelled successfully`);
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to cancel email');
    },
  });

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this scheduled email? The delayed job will be removed from BullMQ.')) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Clock className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Scheduled Emails</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Emails queued in BullMQ awaiting scheduled execution time.
          </p>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={senderId}
              onChange={(e) => {
                setSenderId(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Senders</option>
              {senders?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Recipient</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Sender</th>
                <th className="p-4">Scheduled For</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <>
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-rose-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    Failed to load scheduled emails.
                  </td>
                </tr>
              ) : result?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium">No scheduled emails found.</p>
                    <p className="text-xs text-slate-500 mt-1">Schedule a new email from the Compose page.</p>
                  </td>
                </tr>
              ) : (
                result?.data.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-medium text-white">{email.toEmail}</td>
                    <td className="p-4 text-slate-200 max-w-xs truncate">{email.subject}</td>
                    <td className="p-4 text-slate-400">
                      {email.sender ? `${email.sender.name} (${email.sender.email})` : 'Unknown'}
                    </td>
                    <td className="p-4 font-mono text-amber-400 font-medium">
                      {new Date(email.scheduledAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/emails/${email.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleCancel(email.id)}
                          disabled={cancelMutation.isPending}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Cancel Email Job"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {result && (
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            total={result.pagination.total}
            limit={result.pagination.limit}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
};
