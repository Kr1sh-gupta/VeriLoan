import React, { useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  ArrowRight
} from 'lucide-react';
import type { NotificationItem, UserRole } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead?: (id: string) => void;
  onNavigate: (tab: string, role?: UserRole) => void;
}

const TAB_TO_ROLE: Record<string, UserRole> = {
  ingest: 'OPERATOR',
  operator: 'OPERATOR',
  reviewer: 'REVIEWER',
  consumer: 'CONSUMER',
  export: 'CONSUMER',
  admin: 'ADMIN',
  api: 'ADMIN',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onNavigate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md h-full bg-[#0c1220] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-sans">
                Notifications &amp; Activity
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 text-xs text-slate-400 font-mono">
            <span>System Telemetry &amp; Alerts</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-cyan-400 hover:underline transition-all"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-white/[0.04]">
          {notifications.map((item) => {
            const isError = item.severity === 'ERROR';
            const isWarning = item.severity === 'WARNING';
            const isSuccess = item.severity === 'SUCCESS';
            const targetRole = item.actionUrl ? TAB_TO_ROLE[item.actionUrl] : undefined;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (onMarkAsRead) {
                    onMarkAsRead(item.id);
                  }
                  if (item.actionUrl) {
                    onNavigate(item.actionUrl, targetRole);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  item.read
                    ? 'bg-white/[0.02] border-white/[0.06] opacity-75'
                    : 'bg-white/[0.05] border-white/15 hover:border-cyan-400/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {isError && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {!isError && !isWarning && !isSuccess && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans mt-2 leading-relaxed">
                  {item.message}
                </p>

                {item.actionUrl && (
                  <div className="mt-3 flex items-center justify-end text-[11px] font-mono text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>VeriLoan Stream Engine v2.4</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live WebSockets Connected
          </span>
        </div>
      </div>
    </div>
  );
};
