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
    <div className="min-h-screen bg-[#070B14] cyber-grid-bg text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      
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

      {/* Institutional Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#05080F]/90 backdrop-blur-md py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Intain Campus FinTech Challenge 2026 — Loan Data Verification Copilot</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>FastAPI + React/TypeScript + SQLite + Gemini AI</span>
            <span>SHA-256 Verified</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
