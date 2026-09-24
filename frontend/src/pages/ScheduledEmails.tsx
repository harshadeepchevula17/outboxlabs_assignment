import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEmails, cancelEmail, fetchSenders } from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Clock, Star, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export const ScheduledEmails: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const [page, setPage] = useState(1);
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
    if (confirm('Are you sure you want to cancel this scheduled email?')) {
      cancelMutation.mutate(id);
    }
  };

  const [pinnedIds, setPinnedIds] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('outboxlabs_pinned_emails') || '[]');
    } catch {
      return [];
    }
  });

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      localStorage.setItem('outboxlabs_pinned_emails', JSON.stringify(updated));
      return updated;
    });
  };

  const rawEmails = result?.data || [];
  const sortedEmails = [...rawEmails].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2d3748] border border-[#20c997] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#20c997]" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Email Row List */}
      {isLoading ? (
        <div className="space-y-3 py-4">
          <div className="h-10 bg-[#f7fafc] rounded-lg animate-pulse"></div>
          <div className="h-10 bg-[#f7fafc] rounded-lg animate-pulse"></div>
        </div>
      ) : isError ? (
        <div className="p-12 text-center text-rose-500 text-xs">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          Failed to load scheduled emails.
        </div>
      ) : sortedEmails.length === 0 ? (
        <div className="py-20 text-center text-[#a0aec0]">
          <Clock className="w-10 h-10 mx-auto text-[#cbd5e0] mb-2" />
          <p className="text-sm font-semibold text-[#4a5568]">No scheduled emails found.</p>
          <p className="text-xs text-[#a0aec0] mt-1">
            Schedule a new email from the <Link to="/compose" className="text-[#20c997] underline font-bold">Compose</Link> page.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#f0f2f1]">
          {sortedEmails.map((email) => {
            const isPinned = pinnedIds.includes(email.id);
            const dateObj = new Date(email.scheduledAt);
            const badgeText = format(dateObj, 'eee h:mm:ss a');
            const recipientName = email.toEmail.includes('@')
              ? email.toEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
              : email.toEmail;

            return (
              <div
                key={email.id}
                className={`py-3 px-2 flex items-center justify-between hover:bg-[#f8faf9] rounded-xl transition-colors group cursor-pointer ${
                  isPinned ? 'bg-[#fffbeb]/50' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* To: Name */}
                  <span className="font-bold text-[0.88rem] text-[#1a202c] w-36 truncate shrink-0">
                    To: {recipientName}
                  </span>

                  {/* Scheduled Orange Pill Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef3c7] text-[#d97706] text-[0.74rem] font-bold shrink-0 border border-[#fde68a]">
                    <Clock className="w-3 h-3 text-[#d97706]" />
                    <span>{badgeText}</span>
                  </span>

                  {/* Subject & Preview snippet */}
                  <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[0.88rem] truncate">
                    <span className="font-bold text-[#2d3748] truncate">
                      {email.subject}
                    </span>
                    <span className="text-[#a0aec0] truncate font-normal">
                      - {email.body.replace(/<[^>]+>/g, '')}
                    </span>
                  </div>
                </div>

                {/* Actions: Cancel & Star */}
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(email.id);
                    }}
                    disabled={cancelMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 text-xs font-semibold p-1 transition-opacity"
                    title="Cancel Email Job"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => togglePin(email.id, e)}
                    className={`p-1 transition-colors ${
                      isPinned ? 'text-[#f59e0b]' : 'text-[#cbd5e0] hover:text-[#f59e0b]'
                    }`}
                    title={isPinned ? 'Unpin Email' : 'Pin Email to Top'}
                  >
                    <Star className={`w-[18px] h-[18px] ${isPinned ? 'fill-[#f59e0b]' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
  );
};
