import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmails, fetchSenders } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { SkeletonRow } from '../components/common/Skeleton';
import { Link } from 'react-router-dom';
import { Search, Filter, CheckCircle2, ExternalLink, Eye } from 'lucide-react';

export const SentEmails: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [senderId, setSenderId] = useState('');

  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['emails-sent', page, search, senderId],
    queryFn: () =>
      fetchEmails({
        page,
        limit: 15,
        status: 'SENT',
        search,
        senderId: senderId || undefined,
      }),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Sent Emails Log</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Delivered emails with Ethereal SMTP preview links.
          </p>
        </div>

        {/* Filter / Search */}
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

      {/* Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Recipient</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Sender</th>
                <th className="p-4">Sent At</th>
                <th className="p-4">Attempts</th>
                <th className="p-4">Preview</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <>
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                </>
              ) : result?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium">No sent emails recorded yet.</p>
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
                    <td className="p-4 font-mono text-emerald-400">
                      {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 font-mono text-slate-300">{email.attempts}</td>
                    <td className="p-4">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline"
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/emails/${email.id}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors inline-block"
                        title="Inspect Detail & Audit Logs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
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
