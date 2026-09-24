import React from 'react';

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="border-b border-slate-800/60 animate-pulse">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="p-4">
          <div className="h-4 bg-slate-800/80 rounded w-3/4"></div>
        </td>
      ))}
    </tr>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="glass-panel p-5 rounded-xl border border-slate-800 animate-pulse space-y-3">
      <div className="h-4 bg-slate-800/80 rounded w-1/3"></div>
      <div className="h-8 bg-slate-800/80 rounded w-2/3"></div>
    </div>
  );
};
