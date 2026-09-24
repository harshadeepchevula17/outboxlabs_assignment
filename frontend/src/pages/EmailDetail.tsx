import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEmailById, cancelEmail } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  XCircle,
  Mail,
  User,
  AlertCircle,
  History,
  FileText,
} from 'lucide-react';

export const EmailDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: email, isLoading, isError } = useQuery({
    queryKey: ['email-detail', id],
    queryFn: () => fetchEmailById(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const cancelMutation = useMutation({
    mutationFn: (emailId: string) => cancelEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['emails-scheduled'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to cancel email');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4"></div>
        <div className="h-32 bg-slate-800/80 rounded-xl"></div>
        <div className="h-48 bg-slate-800/80 rounded-xl"></div>
      </div>
    );
  }

  if (isError || !email) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Email Record Not Found</h2>
        <p className="text-slate-400 text-sm">The requested email ID does not exist in the database.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="flex items-center gap-3">
          {email.etherealPreviewUrl && (
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-colors"
            >
              <span>Open Ethereal Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {email.status === 'SCHEDULED' && (
            <button
              onClick={() => cancelMutation.mutate(email.id)}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Scheduled Send</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Info Panel */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <StatusBadge status={email.status} />
              <span className="font-mono text-xs text-slate-500">ID: {email.id}</span>
            </div>
            <h1 className="text-xl font-bold text-white">{email.subject}</h1>
          </div>
          <div className="text-right font-mono text-xs text-slate-400">
            <div>Attempts: <span className="text-slate-200 font-bold">{email.attempts}</span></div>
            <div>Created: {new Date(email.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              Recipient
            </span>
            <p className="font-semibold text-slate-100 text-sm">{email.toEmail}</p>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              Sender Account
            </span>
            <p className="font-semibold text-slate-100 text-sm">
              {email.sender ? `${email.sender.name} (${email.sender.email})` : 'Unknown Sender'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Scheduled Time
            </span>
            <p className="font-mono font-semibold text-amber-400 text-sm">
              {new Date(email.scheduledAt).toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Sent Time / Status Time
            </span>
            <p className="font-mono font-semibold text-emerald-400 text-sm">
              {email.sentAt
                ? new Date(email.sentAt).toLocaleString()
                : email.failedAt
                ? `Failed: ${new Date(email.failedAt).toLocaleString()}`
                : 'Pending Execution'}
            </p>
          </div>
        </div>

        {/* Failure Error Banner */}
        {email.error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono space-y-1">
            <span className="font-semibold flex items-center gap-1.5 text-rose-300 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              Execution Failure Log
            </span>
            <p>{email.error}</p>
          </div>
        )}

        {/* Email Body Content */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Email Payload Body
          </h3>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
            {email.body}
          </div>
        </div>
      </div>

      {/* Audit Event Timeline */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>Audit Event Timeline</span>
        </h3>

        {!email.events || email.events.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No audit events recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Metadata</th>
                  <th className="p-3">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {email.events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <StatusBadge status={evt.event} />
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {evt.metadata ? JSON.stringify(evt.metadata) : '-'}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
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
