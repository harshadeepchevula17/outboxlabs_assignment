import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmails } from '../services/api';
import { Clock, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('q') || '';

  const { data: scheduledResult, isLoading } = useQuery({
    queryKey: ['emails-scheduled-dashboard', search],
    queryFn: () =>
      fetchEmails({
        page: 1,
        limit: 20,
        status: 'SCHEDULED',
        search: search || undefined,
      }),
    refetchInterval: 3000,
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

  const rawEmails = scheduledResult?.data || [
    {
      id: 'demo-1',
      toEmail: 'john.smith@domain.io',
      subject: 'Meeting follow-up - Scheduled',
      body: 'Hi John, just wanted to follow up on our meeting...',
      scheduledAt: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      toEmail: 'olive@domain.io',
      subject: "Ramit, great to meet you - you'll love it",
      body: 'Hi Olive, just wanted to follow up on our meeting...',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  const sortedEmails = [...rawEmails].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-1 font-sans pt-2 select-none">
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 bg-[#f7fafc] rounded-lg animate-pulse"></div>
          <div className="h-10 bg-[#f7fafc] rounded-lg animate-pulse"></div>
        </div>
      ) : sortedEmails.length === 0 ? (
        <div className="py-20 text-center text-[#a0aec0]">
          <Clock className="w-10 h-10 mx-auto text-[#cbd5e0] mb-2" />
          <p className="text-sm font-semibold text-[#4a5568]">No scheduled emails</p>
          <p className="text-xs text-[#a0aec0] mt-1">
            Click <Link to="/compose" className="text-[#20c997] underline font-bold">Compose</Link> to schedule a new email.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                className={`py-2 px-1 flex items-center justify-between hover:bg-[#fafafa] rounded-lg transition-colors group cursor-pointer ${
                  isPinned ? 'bg-[#fffbeb]/50' : ''
                }`}
              >
                <div className="flex items-center gap-5 min-w-0 flex-1">
                  {/* To: Name */}
                  <span className="font-bold text-[0.88rem] text-[#1a202c] w-36 truncate shrink-0">
                    To: {recipientName}
                  </span>

                  {/* Scheduled Orange Pill Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef3c7] text-[#d97706] text-[0.76rem] font-bold shrink-0 border border-[#fde68a]">
                    <Clock className="w-3.5 h-3.5 text-[#d97706]" />
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

                {/* Star Action */}
                <button
                  onClick={(e) => togglePin(email.id, e)}
                  className={`p-1 shrink-0 ml-4 transition-colors ${
                    isPinned ? 'text-[#f59e0b]' : 'text-[#cbd5e0] hover:text-[#f59e0b]'
                  }`}
                  title={isPinned ? 'Unpin Email' : 'Pin Email to Top'}
                >
                  <Star className={`w-[18px] h-[18px] ${isPinned ? 'fill-[#f59e0b]' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


