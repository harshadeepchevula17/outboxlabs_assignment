import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Clock, Send, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser, fetchDashboardStats } from '../../services/api';
import profileAvatar from '../../assets/profile_avatar.svg';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const handleLogout = () => {
    localStorage.removeItem('outboxlabs_token');
    navigate('/login');
  };

  const userName = currentUser?.name || 'Oliver Brown';
  const userEmail = currentUser?.email || 'oliver.brown@domain.io';

  return (
    <aside className="w-[250px] bg-white border-r border-transparent flex flex-col justify-between shrink-0 h-screen sticky top-0 p-6 select-none">
      <div className="space-y-6">
        {/* ONG Brand Logo */}
        <div className="pt-1 px-1">
          <span className="font-logo font-extrabold text-[2.2rem] tracking-[-0.05em] text-[#000000] leading-none block">
            ONG
          </span>
        </div>

        {/* User Card Pill */}
        <div
          onClick={handleLogout}
          title="Click to logout"
          className="bg-[#f2f4f3] hover:bg-[#e8ebe9] rounded-[16px] px-3.5 py-3 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200">
              <img
                src={currentUser?.avatarUrl || profileAvatar}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = profileAvatar;
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[0.85rem] font-bold text-[#2d3748] truncate leading-snug">
                {userName}
              </h4>
              <p className="text-[0.72rem] text-[#8fa099] truncate leading-none mt-0.5">
                {userEmail}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#a0aec0] shrink-0 ml-1" />
        </div>

        {/* Compose Pill Button */}
        <NavLink
          to="/compose"
          className="w-full h-[44px] rounded-full border-2 border-[#20c997] bg-white text-[#20c997] hover:bg-[#20c997] hover:text-white font-bold text-[0.92rem] flex items-center justify-center transition-all duration-150"
        >
          Compose
        </NavLink>

        {/* CORE Navigation Menu */}
        <div className="space-y-3 pt-2">
          <div className="text-[0.68rem] font-bold tracking-[0.08em] text-[#a0aec0] uppercase px-2">
            CORE
          </div>

          <nav className="space-y-1.5">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-[0.92rem] font-bold transition-all ${
                  isActive
                    ? 'bg-[#e6f7f2] text-[#1a202c]'
                    : 'text-[#4a5568] hover:bg-[#f7fafc]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Clock className="w-[18px] h-[18px] text-[#2d3748]" />
                <span>Scheduled</span>
              </div>
              <span className="text-[0.82rem] font-semibold text-[#718096]">
                {stats?.scheduled || 12}
              </span>
            </NavLink>

            <NavLink
              to="/sent"
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-[0.92rem] font-medium transition-all ${
                  isActive
                    ? 'bg-[#e6f7f2] text-[#1a202c] font-bold'
                    : 'text-[#4a5568] hover:bg-[#f7fafc]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Send className="w-[18px] h-[18px] text-[#718096]" />
                <span>Sent</span>
              </div>
              <span className="text-[0.82rem] font-normal text-[#a0aec0]">
                {stats?.sent || 785}
              </span>
            </NavLink>
          </nav>
        </div>
      </div>
    </aside>
  );
};


