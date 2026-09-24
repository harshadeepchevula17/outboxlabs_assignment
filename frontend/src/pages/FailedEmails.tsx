import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmails } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { SkeletonRow } from '../components/common/Skeleton';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, Eye } from 'lucide-react';

export const FailedEmails: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: result, isLoading } = useQuery({
    queryKey: ['emails-failed', page, search],
    queryFn: () =>
      fetchEmails({
        page,
        limit: 15,
        status: 'FAILED',
        search,
      }),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Failed Email Attempts</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Emails that exceeded maximum retry attempts or encountered unrecoverable SMTP errors.
          </p>
        </div>

        {/* Search */}
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
                <th className="p-4">Attempts</th>
                <th className="p-4">Failure Reason</th>
                <th className="p-4">Failed At</th>
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
                    <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium">No failed emails found.</p>
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
                    <td className="p-4 font-mono text-amber-400 font-semibold">{email.attempts} / 3</td>
                    <td className="p-4 text-rose-400 max-w-xs truncate font-mono text-[11px]">
                      {email.error || 'Unknown error'}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {email.failedAt ? new Date(email.failedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/emails/${email.id}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors inline-block"
                        title="Inspect Error & Audit Trail"
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
