import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { OperatorView } from './components/OperatorView';
import { ReviewerWorkbench } from './components/ReviewerWorkbench';
import { ConsumerExplorer } from './components/ConsumerExplorer';
import { ApiExplorerView } from './components/ApiExplorerView';
import type { SystemSummary, UserRole } from './types';
import { fetchSummary } from './lib/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [currentRole, setCurrentRole] = useState<UserRole>('OPERATOR');
  const [summary, setSummary] = useState<SystemSummary | null>(null);

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

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        dataQualityScore={summary?.data_quality_score ?? 100.0}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            summary={summary}
            setCurrentTab={setCurrentTab}
            setCurrentRole={setCurrentRole}
          />
        )}

        {currentTab === 'operator' && (
          <OperatorView
            onRefreshSummary={loadSummary}
            onNavigateToReviewer={() => setCurrentTab('reviewer')}
          />
        )}

        {currentTab === 'reviewer' && (
          <ReviewerWorkbench
            onRefreshSummary={loadSummary}
            onNavigateToConsumer={() => setCurrentTab('consumer')}
          />
        )}

        {currentTab === 'consumer' && (
          <ConsumerExplorer />
        )}

        {currentTab === 'api' && (
          <ApiExplorerView />
        )}
      </main>

      {/* Minimal Clean Footer */}
      <footer className="w-full border-t border-white/[0.08] bg-[#060913] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-sans">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-white lowercase tracking-tight">veriloan</span>
            <span>— AI Diligence &amp; Cryptographic Verification Platform</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-500 font-mono text-[11px]">
            <span>FastAPI + React 18</span>
            <span>14-Rule Engine</span>
            <span>SHA-256 Canonical Seal</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
