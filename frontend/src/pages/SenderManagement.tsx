import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSenders,
  createSender,
  autoGenerateSender,
  deleteSender,
} from '../services/api';
import {
  Users,
  Plus,
  Zap,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const SenderManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);

  // Manual Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.ethereal.email');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  // Auto Form State
  const [autoName, setAutoName] = useState('Ethereal Test Sender');
  const [autoEmail, setAutoEmail] = useState(`test-${Math.floor(Math.random() * 10000)}@ethereal.email`);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [etherealWebUrl, setEtherealWebUrl] = useState<string | null>(null);

  const { data: senders, isLoading } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: createSender,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senders'] });
      setShowAddModal(false);
      resetManualForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to create sender');
    },
  });

  const autoMutation = useMutation({
    mutationFn: autoGenerateSender,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['senders'] });
      setEtherealWebUrl(data.etherealWebUrl || null);
      setShowAutoModal(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to auto-generate sender');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSender,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senders'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to delete sender');
    },
  });

  const resetManualForm = () => {
    setName('');
    setEmail('');
    setSmtpUser('');
    setSmtpPassword('');
    setErrorMessage(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createMutation.mutate({
      name,
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
    });
  };

  const handleAutoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    autoMutation.mutate({
      name: autoName,
      email: autoEmail,
    });
  };

  const handleDelete = (id: string, senderName: string) => {
    if (confirm(`Are you sure you want to delete sender "${senderName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Sender Accounts & Rate Controls</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure SMTP dispatch accounts and inspect hourly limit usage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setErrorMessage(null);
              setShowAutoModal(true);
            }}
            className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-medium text-xs rounded-lg flex items-center gap-2 transition-colors"
          >
            <Zap className="w-4 h-4 text-purple-400" />
            <span>Auto-Generate Ethereal Sender</span>
          </button>

          <button
            onClick={() => {
              setErrorMessage(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Sender</span>
          </button>
        </div>
      </div>

      {/* Auto Generation Web URL Alert */}
      {etherealWebUrl && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>New Ethereal test account generated successfully!</span>
          </div>
          <a
            href={etherealWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-1 hover:bg-blue-500"
          >
            <span>Open Ethereal Web Inbox</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Senders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-6 rounded-xl animate-pulse h-40"></div>
          <div className="glass-panel p-6 rounded-xl animate-pulse h-40"></div>
        </div>
      ) : !senders || senders.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl text-center border border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Sender Accounts Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add your own SMTP credentials or click "Auto-Generate Ethereal Sender" to get instant test credentials.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAutoModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold"
            >
              Auto-Generate Test Account
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {senders.map((sender) => {
            const sent = sender.rateLimit?.sentThisHour || 0;
            const max = sender.rateLimit?.maxLimitPerHour || 200;
            const pct = Math.min(100, Math.round((sent / max) * 100));

            return (
              <div
                key={sender.id}
                className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{sender.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{sender.email}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(sender.id, sender.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Sender"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">SMTP Host</span>
                    <span className="font-mono text-slate-200">{sender.smtpHost}:{sender.smtpPort}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">SMTP User</span>
                    <span className="font-mono text-slate-200 truncate block">{sender.smtpUser}</span>
                  </div>
                </div>

                {/* Rate limit usage bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Hourly Rate Limit</span>
                    <span className="text-slate-200 font-semibold">
                      {sent} / {max} emails
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Passwords Encrypted & Hidden</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Auto Generate Ethereal Test Account */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <span>Auto-Generate Ethereal Account</span>
            </h3>

            <p className="text-xs text-slate-400">
              Instantly creates a sandbox Ethereal SMTP test account with real web inbox access.
            </p>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAutoSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sender Display Name</label>
                <input
                  type="text"
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sender Email Address</label>
                <input
                  type="email"
                  value={autoEmail}
                  onChange={(e) => setAutoEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={autoMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {autoMutation.isPending ? 'Creating...' : 'Generate Sandbox Sender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Custom Sender */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              <span>Add Custom Sender SMTP</span>
            </h3>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="Outbox Sales Team"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sender Email</label>
                  <input
                    type="email"
                    placeholder="sales@outboxlabs.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">SMTP Username</label>
                <input
                  type="text"
                  placeholder="ethereal_user_key"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">SMTP Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Sender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
