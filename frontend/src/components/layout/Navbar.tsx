import React from 'react';
import { ShieldCheck, Server, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const Navbar: React.FC = () => {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0E131F]/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          <span>PostgreSQL + BullMQ</span>
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Idempotent Execution</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
          title="Refresh All Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
