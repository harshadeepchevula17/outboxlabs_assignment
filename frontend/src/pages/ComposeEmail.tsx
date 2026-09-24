import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSenders, scheduleEmail } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Send, Clock, AlertCircle, CheckCircle2, User, Mail, FileText, Calendar } from 'lucide-react';

export const ComposeEmail: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [senderId, setSenderId] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: senders, isLoading: sendersLoading } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
  });

  // Set default schedule time to current + 5 minutes
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);
    setScheduleDate(dateStr);
    setScheduleTime(timeStr);
  }, []);

  // Pre-select first sender when loaded
  useEffect(() => {
    if (senders && senders.length > 0 && !senderId) {
      setSenderId(senders[0].id);
    }
  }, [senders, senderId]);

  const scheduleMutation = useMutation({
    mutationFn: scheduleEmail,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emails-scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/scheduled');
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to schedule email. Please try again.'
      );
      setShowSummaryModal(false);
    },
  });

  const getCombinedScheduledAt = (): Date => {
    if (!scheduleDate || !scheduleTime) return new Date();
    return new Date(`${scheduleDate}T${scheduleTime}:00`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!senderId) {
      setErrorMessage('Please select a sender account.');
      return;
    }
    if (!toEmail) {
      setErrorMessage('Please provide a recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('Subject line cannot be empty.');
      return;
    }
    if (!body.trim()) {
      setErrorMessage('Email body cannot be empty.');
      return;
    }

    setShowSummaryModal(true);
  };

  const handleConfirmSchedule = () => {
    const scheduledAtDate = getCombinedScheduledAt();
    scheduleMutation.mutate({
      senderId,
      toEmail,
      subject,
      body,
      scheduledAt: scheduledAtDate.toISOString(),
    });
  };

  const selectedSender = senders?.find((s) => s.id === senderId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-400" />
          <span>Schedule New Email</span>
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Configure recipient, payload, and BullMQ delayed trigger time.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleFormSubmit} className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
        {/* Sender Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Select Sender Account</span>
          </label>
          {sendersLoading ? (
            <div className="h-10 bg-slate-900 rounded-lg animate-pulse"></div>
          ) : !senders || senders.length === 0 ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs">
              No active senders found. Please add a sender account first.
            </div>
          ) : (
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              required
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email}) — Rate Limit: {s.rateLimit?.sentThisHour || 0}/
                  {s.rateLimit?.maxLimitPerHour || 200} sent
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>Recipient Email</span>
          </label>
          <input
            type="email"
            placeholder="recipient@example.com"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Subject Line</span>
          </label>
          <input
            type="text"
            placeholder="Enter subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Email Body */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Email Content Body
          </label>
          <textarea
            rows={6}
            placeholder="Write your email body here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
            required
          ></textarea>
        </div>

        {/* Date & Time Picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Schedule Date</span>
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Schedule Time</span>
            </label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Form Footer Action */}
        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            disabled={!senders || senders.length === 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Review & Schedule</span>
          </button>
        </div>
      </form>

      {/* Confirmation Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <span>Confirm Email Dispatch</span>
            </h3>

            <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Sender:</span>
                <span className="font-semibold text-slate-200">{selectedSender?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-semibold text-slate-200">{toEmail}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Subject:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">{subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Schedule:</span>
                <span className="font-mono font-semibold text-amber-400">
                  {getCombinedScheduledAt().toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={scheduleMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {scheduleMutation.isPending ? 'Scheduling Job...' : 'Confirm & Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
