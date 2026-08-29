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
import { fetchSummary, STATIC_USERS, INITIAL_NOTIFICATIONS } from './lib/api';

const AUTH_STORAGE_KEY = 'veriloan_auth_user';
const TAB_STORAGE_KEY = 'veriloan_current_tab';
const ROLE_STORAGE_KEY = 'veriloan_current_role';

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
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
      if (storedRole && ['OPERATOR', 'REVIEWER', 'CONSUMER', 'ADMIN'].includes(storedRole)) {
        return storedRole;
      }
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        return JSON.parse(storedUser).role || 'REVIEWER';
      }
    } catch {
      // ignore
    }
    return 'REVIEWER';
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
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

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

  // Persist currentRole in localStorage whenever it changes
  const handleSetCurrentRole = (role: UserRole) => {
    setCurrentRole(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      // ignore
    }
  };

  const loadSummary = async () => {
    try {
      const data = await fetchSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load system summary', err);
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

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      
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
        <div className="flex-1 min-h-screen flex relative bg-[#f8f9fc]">
          
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
          />

          {/* Main Dashboard Workspace (Responsive pl-0 on mobile, offset on desktop) */}
          <main className={`flex-1 flex flex-col justify-between transition-all duration-300 pt-16 sm:pt-20 min-h-screen pl-0 ${
            currentTab === 'api' ? 'bg-[#060913] text-white' : 'bg-[#f8f9fc] text-slate-900'
          } ${
            sidebarOpen ? 'md:pl-64' : 'md:pl-16'
          }`}>
            <div className="flex-1">
              {currentTab === 'ingest' && (
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

              {currentTab === 'operator' && (
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

              {currentTab === 'reviewer' && (
                <ReviewerWorkbench
                  onRefreshSummary={loadSummary}
                  onNavigateToConsumer={() => {
                    handleSetCurrentRole('CONSUMER');
                    handleSetCurrentTab('consumer');
                  }}
                />
              )}

              {currentTab === 'consumer' && (
                <ConsumerExplorer
                  onNavigateToExport={() => handleSetCurrentTab('export')}
                />
              )}

              {currentTab === 'export' && (
                <ExportCenter />
              )}

              {currentTab === 'admin' && (
                <AdminConsole />
              )}

              {currentTab === 'api' && (
                <ApiExplorerView />
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
        onNavigate={(tab, role) => {
          if (role) handleSetCurrentRole(role);
          handleSetCurrentTab(tab);
        }}
      />

    </div>
  );
}

export default App;
