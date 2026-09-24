import React from 'react';
import { Search, RotateCw, Calendar } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const period = searchParams.get('period') || 'all';

  const isScheduledPage = location.pathname.includes('scheduled') || location.pathname.includes('dashboard');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('q', val);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      newParams.set('period', val);
    } else {
      newParams.delete('period');
    }
    setSearchParams(newParams);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <header className="h-[72px] px-8 flex items-center justify-between bg-white border-b border-transparent sticky top-0 z-10 select-none gap-4">
      {/* Search bar and Time Filter side by side */}
      <div className="flex items-center gap-3 flex-1 max-w-[720px]">
        {/* Compact Search Bar */}
        <div className="relative w-[300px] shrink-0">
          <Search className="w-4 h-4 text-[#a0aec0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={handleSearchChange}
            className="w-full h-[38px] pl-10 pr-4 bg-[#f4f6f5] text-[0.85rem] text-[#2d3748] placeholder-[#a0aec0] rounded-full focus:outline-none focus:bg-[#edf2f0] transition-colors"
          />
        </div>

        {/* Time Period Filter */}
        <div className="relative flex items-center">
          <Calendar className="w-3.5 h-3.5 text-[#a0aec0] absolute left-3 pointer-events-none" />
          <select
            value={period}
            onChange={handlePeriodChange}
            className="h-[38px] pl-8 pr-3 bg-[#f4f6f5] text-[0.82rem] font-medium text-[#2d3748] rounded-full border border-transparent hover:border-[#e2e8f0] focus:outline-none cursor-pointer transition-all"
          >
            <option value="all">All Time</option>
            {isScheduledPage ? (
              <>
                <option value="12h">Next 12 Hours</option>
                <option value="24h">Next 24 Hours</option>
                <option value="2d">Next 2 Days</option>
              </>
            ) : (
              <>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Refresh control */}
      <div className="flex items-center gap-3 text-[#a0aec0]">
        <button
          onClick={handleRefresh}
          className="p-2 hover:text-[#4a5568] transition-colors rounded-full hover:bg-[#f4f6f5]"
          title="Refresh Data"
        >
          <RotateCw className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
};


