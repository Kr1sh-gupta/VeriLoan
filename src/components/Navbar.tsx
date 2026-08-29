import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight,
  Hexagon,
  Search,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import type { User, UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: User | null;
  onOpenLogin: (initialRole?: UserRole) => void;
  onLogout: () => void;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenCommandPalette,
  onOpenNotifications,
  unreadNotificationsCount,
  onToggleSidebar,
  sidebarOpen = true,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement | null>(null);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  const isLanding = currentTab === 'landing';

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabels: Record<UserRole, { label: string; name: string; badge: string; defaultTab: string }> = {
    OPERATOR: { label: 'Data Operator', name: 'Elena Rostova', badge: 'OP', defaultTab: 'ingest' },
    REVIEWER: { label: 'Senior Reviewer', name: 'Marcus Vance', badge: 'RV', defaultTab: 'reviewer' },
    CONSUMER: { label: 'Data Consumer', name: 'Sarah Chen', badge: 'DC', defaultTab: 'consumer' },
    ADMIN: { label: 'System Admin', name: 'Alex Rivera', badge: 'AD', defaultTab: 'admin' },
  };

  const currentRoleInfo = roleLabels[currentRole] || roleLabels.REVIEWER;

  // Render LANDING PAGE NAVBAR
  if (isLanding) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060913] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Left: Brand Logo */}
            <div 
              onClick={() => setCurrentTab('landing')}
              className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-900/60 text-slate-200 group-hover:border-slate-500 group-hover:text-white transition-colors">
                <Hexagon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-white font-sans lowercase">
                veriloan
              </span>
            </div>

            {/* Right: Overview + Sign In / Launch Dashboard */}
            <div className="flex items-center space-x-3 sm:space-x-6">
              <button
                onClick={() => setCurrentTab('landing')}
                className="hidden sm:inline-block text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
              >
                Overview
              </button>

              {currentUser ? (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={() => setCurrentTab(currentRoleInfo.defaultTab)}
                    className="flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Launch Dashboard</span>
                    <span className="xs:hidden">Dashboard</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onOpenLogin(currentRole)}
                  className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      </header>
    );
  }

  // Render DASHBOARD HEADER
  return (
    <header className={`fixed top-0 right-0 z-40 h-16 sm:h-20 bg-[#060913] text-white border-b border-slate-800/80 flex items-center justify-between px-3 sm:px-6 transition-all duration-300 left-0 ${
      sidebarOpen ? 'md:left-64' : 'md:left-16'
    }`}>
      
      {/* Left: Hamburger Toggle + Role Breadcrumb */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Toggle Sidebar"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-mono text-slate-400 truncate max-w-[140px] sm:max-w-none">
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-medium truncate">{currentRoleInfo.label}</span>
        </div>
      </div>

      {/* Center: Fast Dashboard Module Quick Navigation */}
      <nav className="hidden xl:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
        {[
          { id: 'ingest', label: 'Ingest', role: 'OPERATOR' as UserRole },
          { id: 'operator', label: 'Lineage', role: 'OPERATOR' as UserRole },
          { id: 'reviewer', label: 'Reviewer', role: 'REVIEWER' as UserRole },
          { id: 'consumer', label: 'Records', role: 'CONSUMER' as UserRole },
          { id: 'export', label: 'Export', role: 'CONSUMER' as UserRole },
          { id: 'admin', label: 'Admin', role: 'ADMIN' as UserRole },
          { id: 'api', label: 'API', role: 'ADMIN' as UserRole },
        ].map((mod) => (
          <button
            key={mod.id}
            onClick={() => {
              setCurrentRole(mod.role);
              setCurrentTab(mod.id);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              currentTab === mod.id
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            {mod.label}
          </button>
        ))}
      </nav>

      {/* Right: Search, Notifications, Role Switcher, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Global Search trigger (Cmd+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all font-mono"
          title="Search (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline text-[11px]">Search...</span>
          <kbd className="hidden lg:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 border border-[#060913]" />
          )}
        </button>

        {/* Role Switcher Pill (Compact on mobile) */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all font-sans"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">{currentRoleInfo.label}</span>
            <span className="sm:hidden font-mono font-semibold">{currentRoleInfo.badge}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 sm:w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-50 animate-fade-in">
              <div className="px-3 py-1 text-[10px] uppercase font-mono text-slate-500 font-semibold">
                Switch Active Persona
              </div>
              {Object.entries(roleLabels).map(([roleKey, r]) => (
                <button
                  key={roleKey}
                  onClick={() => {
                    const rKey = roleKey as UserRole;
                    setCurrentRole(rKey);
                    setRoleDropdownOpen(false);
                    setCurrentTab(r.defaultTab);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-800 transition-colors ${
                    currentRole === roleKey ? 'text-white font-semibold bg-slate-800/80' : 'text-slate-300'
                  }`}
                >
                  <div>
                    <div>{r.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{r.name}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {r.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile & Auth Trigger */}
        {currentUser && (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold font-mono text-xs flex items-center justify-center border border-slate-700">
                {currentUser.avatar_badge || 'US'}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 border-b border-slate-800">
                  <div className="text-xs font-bold text-white">{currentUser.full_name}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{currentUser.email}</div>
                </div>
                <button
                  onClick={() => {
                    setCurrentTab('landing');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  <span>Landing Overview</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-xs text-rose-300 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
