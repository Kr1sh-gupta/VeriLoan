import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { IngestionHub } from './components/IngestionHub';
import { OperatorView } from './components/OperatorView';
import { ReviewerWorkbench } from './components/ReviewerWorkbench';
import { ConsumerExplorer } from './components/ConsumerExplorer';
import { ExportCenter } from './components/ExportCenter';
import { AdminConsole } from './components/AdminConsole';
import { ApiExplorerView } from './components/ApiExplorerView';
import { LoginModal } from './components/LoginModal';
import { CommandPalette } from './components/CommandPalette';
import { NotificationCenter } from './components/NotificationCenter';
import { Footer } from './components/Footer';
import type { SystemSummary, UserRole, User, NotificationItem } from './types';
import { fetchSummary, STATIC_USERS, INITIAL_NOTIFICATIONS, isDemoBypassActive, setDemoBypassActive } from './lib/api';

const AUTH_STORAGE_KEY = 'veriloan_auth_user';
const TAB_STORAGE_KEY = 'veriloan_current_tab';
const ROLE_STORAGE_KEY = 'veriloan_current_role';
const NOTIFICATIONS_STORAGE_KEY = 'veriloan_notifications';

export function App() {
  // Initialize user from localStorage if present
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Initialize role from localStorage or user
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      if (stored && ['OPERATOR', 'REVIEWER', 'CONSUMER', 'ADMIN'].includes(stored)) {
        return stored as UserRole;
      }
    } catch {
      // ignore
    }
    return currentUser?.role || 'REVIEWER';
  });

  // Initialize currentTab: if user is logged in and storedTab exists, stay on that dashboard tab!
  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedTab = localStorage.getItem(TAB_STORAGE_KEY);
      if (storedUser && storedTab) {
        return storedTab;
      }
    } catch {
      // ignore
    }
    return 'landing';
  });

  const [summary, setSummary] = useState<SystemSummary | null>(null);

  // Sidebar State for Dashboard (defaults to true on desktop, false on mobile)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Modals & Cross-Cutting Drawers
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginInitialRole, setLoginInitialRole] = useState<UserRole>('REVIEWER');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);

  // Notifications State with localStorage persistence
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_NOTIFICATIONS;
  });

  const isLanding = currentTab === 'landing';

  // Persist currentTab in localStorage whenever it changes
  const handleSetCurrentTab = (tab: string) => {
    setCurrentTab(tab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore
    }
  };

  // Persist currentRole and sync currentUser and auth token in localStorage whenever it changes
  const handleSetCurrentRole = (role: UserRole) => {
    setCurrentRole(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      // ignore
    }
    const matchedUser = STATIC_USERS.find((u) => u.role === role);
    if (matchedUser) {
      const { password: _, ...u } = matchedUser;
      setCurrentUser(u);
      const token = `jwt-mock-token-${u.id}-${u.role.toLowerCase()}`;
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
        localStorage.setItem('veriloan_auth_token', token);
      } catch {
        // ignore
      }
    }
  };

  const saveNotifications = (newNotifications: NotificationItem[]) => {
    setNotifications(newNotifications);
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications));
    } catch {
      // ignore
    }
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleMarkNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isDemoBypass, setIsDemoBypass] = useState<boolean>(() => isDemoBypassActive());

  const handleToggleBypass = () => {
    const nextVal = !isDemoBypass;
    setDemoBypassActive(nextVal);
    setIsDemoBypass(nextVal);
    loadSummary();
  };

  const loadSummary = async () => {
    try {
      const data = await fetchSummary();
      setSummary(data);
      setBackendConnected(true);
      setBackendError(null);
    } catch (err: any) {
      console.error('Failed to load system summary from backend', err);
      setBackendConnected(false);
      setBackendError(err?.message || 'Database and Backend API server are inaccessible.');
    }
  };

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenLogin = (role?: UserRole) => {
    if (role) setLoginInitialRole(role);
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    handleSetCurrentRole(user.role);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem('veriloan_auth_token', token);
    } catch {
      // ignore
    }

    let defaultTab = 'reviewer';
    if (user.role === 'OPERATOR') defaultTab = 'ingest';
    else if (user.role === 'REVIEWER') defaultTab = 'reviewer';
    else if (user.role === 'CONSUMER') defaultTab = 'consumer';
    else if (user.role === 'ADMIN') defaultTab = 'admin';

    handleSetCurrentTab(defaultTab);
    setLoginModalOpen(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TAB_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
      localStorage.removeItem('veriloan_auth_token');
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setCurrentTab('landing');
    setLoginModalOpen(false);
    setCommandPaletteOpen(false);
    setNotificationCenterOpen(false);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={handleSetCurrentTab}
        currentRole={currentRole}
        setCurrentRole={(role) => {
          handleSetCurrentRole(role);
          const matchedUser = STATIC_USERS.find((u) => u.role === role);
          if (matchedUser) {
            const { password: _, ...u } = matchedUser;
            setCurrentUser(u);
            try {
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
            } catch {
              // ignore
            }
          }
        }}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenNotifications={() => setNotificationCenterOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Floating Glassmorphic Backend & Database Offline Alert Banner */}
      {!backendConnected && !isDemoBypass && (
        <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 py-2.5 rounded-2xl bg-[#13070b]/95 border border-rose-500/60 shadow-[0_10px_35px_rgba(244,63,94,0.35)] backdrop-blur-xl text-xs font-mono text-rose-200 max-w-[94vw] sm:max-w-2xl animate-fade-in">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <div className="truncate">
              <span className="font-bold text-white tracking-wide">
                Database &amp; Engine Inaccessible
              </span>
              <span className="hidden sm:inline text-rose-300/80 ml-2">
                {backendError ? `(${backendError})` : '(API at http://localhost:8000 unreachable)'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button 
              onClick={loadSummary} 
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Retry ⟳
            </button>
            <button 
              onClick={handleToggleBypass} 
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400/60 text-[11px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              title="Activate offline demo mode with verified preloaded financial fixtures"
            >
              Bypass DB ⚡
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {isLanding ? (
        /* Full width Landing Stage */
        <div className="flex-1 flex flex-col justify-between bg-[#060913]">
          <main className="flex-1">
            <LandingPage
              summary={summary}
              setCurrentTab={(tab) => {
                if (!currentUser) {
                  handleOpenLogin();
                } else {
                  handleSetCurrentTab(tab);
                }
              }}
              setCurrentRole={(role) => {
                handleSetCurrentRole(role);
                if (!currentUser) {
                  handleOpenLogin(role);
                } else {
                  const matchedUser = STATIC_USERS.find((u) => u.role === role);
                  if (matchedUser) {
                    const { password: _, ...u } = matchedUser;
                    setCurrentUser(u);
                  }
                }
              }}
            />
          </main>
          {/* Landing Stage Footer */}
          <Footer />
        </div>
      ) : (
        /* Dynamic Role-Based Dashboard with Left Sidebar */
        <div className="flex-1 min-h-screen flex relative bg-[#f8f9fc] w-full max-w-full min-w-0 overflow-x-hidden">
          
          {/* Left Burger Menu / Sidebar Navigation */}
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            currentRole={currentRole}
            setCurrentRole={(role) => {
              handleSetCurrentRole(role);
              const matchedUser = STATIC_USERS.find((u) => u.role === role);
              if (matchedUser) {
                const { password: _, ...u } = matchedUser;
                setCurrentUser(u);
                try {
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
                } catch {
                  // ignore
                }
              }
            }}
            currentTab={currentTab}
            setCurrentTab={handleSetCurrentTab}
            currentUser={currentUser}
            onLogout={handleLogout}
            isDemoBypass={isDemoBypass}
            onToggleBypass={handleToggleBypass}
          />

          {/* Main Dashboard Workspace (Responsive pl-0 on mobile, offset on desktop) */}
          <main className={`flex-1 flex flex-col justify-between transition-all duration-300 pt-16 sm:pt-20 min-h-screen pl-0 w-full max-w-full min-w-0 overflow-x-hidden ${
            currentTab === 'api' ? 'bg-[#060913] text-white' : 'bg-[#f8f9fc] text-slate-900'
          } ${
            sidebarOpen ? 'md:pl-64' : 'md:pl-16'
          }`}>
            <div className="flex-1 w-full max-w-full min-w-0">
              {(currentTab === 'ingest') && (
                <IngestionHub
                  onRefreshSummary={loadSummary}
                  onNavigateToReviewer={() => {
                    handleSetCurrentRole('REVIEWER');
                    handleSetCurrentTab('reviewer');
                  }}
                  onNavigateToOperator={() => {
                    handleSetCurrentRole('OPERATOR');
                    handleSetCurrentTab('operator');
                  }}
                />
              )}

              {(currentTab === 'operator' || currentTab === 'operator_records') && (
                <OperatorView
                  onRefreshSummary={loadSummary}
                  onNavigateToReviewer={() => {
                    handleSetCurrentRole('REVIEWER');
                    handleSetCurrentTab('reviewer');
                  }}
                  onNavigateToIngest={() => {
                    handleSetCurrentRole('OPERATOR');
                    handleSetCurrentTab('ingest');
                  }}
                />
              )}

              {(currentTab === 'reviewer' || currentTab === 'reviewer_conflicts' || currentTab === 'reviewer_copilot') && (
                <ReviewerWorkbench
                  onRefreshSummary={loadSummary}
                  onNavigateToConsumer={() => {
                    handleSetCurrentRole('CONSUMER');
                    handleSetCurrentTab('consumer');
                  }}
                />
              )}

              {(currentTab === 'consumer' || currentTab === 'consumer_quality') && (
                <ConsumerExplorer
                  onNavigateToExport={() => handleSetCurrentTab('export')}
                />
              )}

              {currentTab === 'export' && (
                <ExportCenter />
              )}

              {(currentTab === 'admin' || currentTab.startsWith('admin_')) && (
                <AdminConsole 
                  initialTab={
                    currentTab === 'admin_connectors' ? 'CONNECTORS' :
                    currentTab === 'admin_rules' ? 'RULES' :
                    currentTab === 'admin_users' ? 'USERS' :
                    currentTab === 'admin_audit' ? 'AUDIT' : 'OVERVIEW'
                  }
                />
              )}

              {currentTab === 'api' && (
                <ApiExplorerView />
              )}

              {/* Graceful Fallback if currentTab is completely unknown */}
              {!['ingest', 'operator', 'operator_records', 'reviewer', 'reviewer_conflicts', 'reviewer_copilot', 'consumer', 'consumer_quality', 'export', 'admin', 'api'].includes(currentTab) && !currentTab.startsWith('admin_') && (
                currentRole === 'OPERATOR' ? (
                  <IngestionHub
                    onRefreshSummary={loadSummary}
                    onNavigateToReviewer={() => {
                      handleSetCurrentRole('REVIEWER');
                      handleSetCurrentTab('reviewer');
                    }}
                    onNavigateToOperator={() => {
                      handleSetCurrentRole('OPERATOR');
                      handleSetCurrentTab('operator');
                    }}
                  />
                ) : currentRole === 'REVIEWER' ? (
                  <ReviewerWorkbench
                    onRefreshSummary={loadSummary}
                    onNavigateToConsumer={() => {
                      handleSetCurrentRole('CONSUMER');
                      handleSetCurrentTab('consumer');
                    }}
                  />
                ) : currentRole === 'CONSUMER' ? (
                  <ConsumerExplorer
                    onNavigateToExport={() => handleSetCurrentTab('export')}
                  />
                ) : (
                  <AdminConsole initialTab="OVERVIEW" />
                )
              )}
            </div>

            {/* In-Dashboard Workspace Footer */}
            <Footer />
          </main>
        </div>
      )}

      {/* Cross-Cutting Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialRole={loginInitialRole}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpen={() => setCommandPaletteOpen(true)}
        onNavigate={(tab, role) => {
          if (role) handleSetCurrentRole(role);
          handleSetCurrentTab(tab);
        }}
      />

      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onMarkAsRead={handleMarkNotificationRead}
        onNavigate={(tab, role) => {
          if (role) handleSetCurrentRole(role);
          handleSetCurrentTab(tab);
        }}
      />

    </div>
  );
}

export default App;
