import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmails, fetchSenders } from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, CheckCircle2, ExternalLink, Star } from 'lucide-react';
import { format } from 'date-fns';

export const SentEmails: React.FC = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const [page, setPage] = useState(1);
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
      {/* Email Row List */}
      {isLoading ? (
        <div className="space-y-3 py-4">
          <div className="h-10 bg-[#f7fafc] rounded-lg animate-pulse"></div>
          <div className="h-10 bg-[#f7fafc] rounded-lg animate-pulse"></div>
        </div>
      ) : sortedEmails.length === 0 ? (
        <div className="py-20 text-center text-[#a0aec0]">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#cbd5e0] mb-2" />
          <p className="text-sm font-semibold text-[#4a5568]">No sent emails recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f0f2f1]">
          {sortedEmails.map((email) => {
            const isPinned = pinnedIds.includes(email.id);
            const dateObj = email.sentAt ? new Date(email.sentAt) : new Date(email.createdAt);
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

                  {/* Sent Green Pill Badge */}
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#d1fae5] text-[#059669] text-[0.74rem] font-bold shrink-0 border border-[#a7f3d0]">
                    <CheckCircle2 className="w-3 h-3 text-[#059669]" />
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

                {/* Ethereal Preview & Star Action */}
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {email.etherealPreviewUrl && (
                    <a
                      href={email.etherealPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-[#20c997] hover:underline font-bold"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <Link
                    to={`/emails/${email.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#a0aec0] hover:text-[#2d3748] text-xs font-semibold p-1 transition-colors"
                  >
                    Details
                  </Link>
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
