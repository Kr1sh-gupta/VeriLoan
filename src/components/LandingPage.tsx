import React from 'react';
import { 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Activity
} from 'lucide-react';
import { HeroAnimation } from './HeroAnimation';
import type { SystemSummary, UserRole } from '../types';

interface LandingPageProps {
  summary: SystemSummary | null;
  setCurrentTab: (tab: string) => void;
  setCurrentRole: (role: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  summary,
  setCurrentTab,
  setCurrentRole,
}) => {
  const roles = [
    {
      role: 'OPERATOR' as UserRole,
      tab: 'operator',
      title: 'Data Operator',
      name: 'Elena Rostova',
      desc: 'Ingest multi-source loan tapes, servicer updates, and doc manifests. Inspect raw schemas and trigger 14-rule validation.',
      icon: UploadCloud,
      color: 'from-cyan-500 to-blue-600',
      borderHover: 'hover:border-cyan-500/50',
      badge: 'Module A & B',
      action: 'Launch Ingestion Console',
    },
    {
      role: 'REVIEWER' as UserRole,
      tab: 'reviewer',
      title: 'Reviewer Workbench',
      name: 'Marcus Vance',
      desc: 'Investigate exception queue, run explainable AI Copilot, compare tape conflicts, and 1-click accept or edit suggested fixes.',
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      borderHover: 'hover:border-amber-500/50',
      badge: 'Module C & D',
      action: 'Open Exception Queue',
    },
    {
      role: 'CONSUMER' as UserRole,
      tab: 'consumer',
      title: 'Data Consumer',
      name: 'Sarah Chen',
      desc: 'Explore cryptographically sealed verified records, verify SHA-256 integrity, inspect full audit lineage, and export clean data.',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      borderHover: 'hover:border-emerald-500/50',
      badge: 'Module E & F',
      action: 'View Verified Records',
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Title & Subheading */}
      <div className="text-center max-w-3xl mx-auto pt-6 px-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intain Campus FinTech Challenge 2026</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-none font-sans">
          Turn Messy Loan Tapes Into <span className="shimmer-text">Cryptographically Trusted</span> Data
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
          AI-assisted diligence copilot featuring multi-source ingestion, a 14-rule validation engine, transparent human-in-the-loop AI exception resolution, and immutable SHA-256 verified records.
        </p>
      </div>

      {/* Dynamic Animated Visual Core */}
      <HeroAnimation />

      {/* Live System Metrics Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-4 rounded-2xl glass-panel text-center">
            <div className="text-xs font-mono text-slate-400 uppercase">Total Loans</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
              {summary.total_loans.toLocaleString()}
            </div>
            <div className="text-[11px] text-cyan-400 mt-1">1,200 Ingested Records</div>
          </div>

          <div className="p-4 rounded-2xl glass-panel text-center">
            <div className="text-xs font-mono text-slate-400 uppercase">Exceptions Detected</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1">
              {summary.total_exceptions}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1">14 Anomaly Categories</div>
          </div>

          <div className="p-4 rounded-2xl glass-panel text-center">
            <div className="text-xs font-mono text-slate-400 uppercase">Verified Records</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1">
              {summary.verified_loans}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">SHA-256 Cryptosealed</div>
          </div>

          <div className="p-4 rounded-2xl glass-panel text-center">
            <div className="text-xs font-mono text-slate-400 uppercase">Data Quality Score</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 mt-1">
              {summary.data_quality_score.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Portfolio Health Index</div>
          </div>
        </div>
      )}

      {/* Role-Based Launcher Cards */}
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-sans">Role-Based Diligence Workflows</h2>
          <span className="text-xs font-mono text-slate-400">Select a persona to start</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                onClick={() => {
                  setCurrentRole(item.role);
                  setCurrentTab(item.tab);
                }}
                className={`group cursor-pointer rounded-2xl glass-panel-interactive p-6 flex flex-col justify-between ${item.borderHover}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-tr ${item.color} text-white shadow-lg`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors font-sans">
                    {item.title}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mb-2">Persona: {item.name}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>{item.action}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Minute Demo Flow Quick Guide */}
      <div className="max-w-5xl mx-auto p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-sans">End-to-End Five-Minute Demo Walkthrough</h3>
            <p className="text-xs text-slate-400">Step-by-step evaluation guide for judges</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-mono text-cyan-400 font-bold mb-1">STEP 1: INGESTION</div>
            <h4 className="text-sm font-semibold text-slate-200">Upload Messy Tape</h4>
            <p className="text-xs text-slate-400 mt-1">
              Log in as <strong>Operator</strong>. Ingest <code>loan_tape.csv</code> and review the 14-rule validation summary.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-mono text-amber-400 font-bold mb-1">STEP 2: AI REVIEW</div>
            <h4 className="text-sm font-semibold text-slate-200">Explain &amp; Reconcile</h4>
            <p className="text-xs text-slate-400 mt-1">
              Log in as <strong>Reviewer</strong>. Open exception queue. Use AI Copilot to analyze balance &amp; servicer conflicts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-mono text-emerald-400 font-bold mb-1">STEP 3: VERIFICATION</div>
            <h4 className="text-sm font-semibold text-slate-200">Accept Patch &amp; Seal</h4>
            <p className="text-xs text-slate-400 mt-1">
              Click <strong>Accept AI Patch</strong> or edit manually. Record is sealed into canonical form with a SHA-256 hash.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-mono text-indigo-400 font-bold mb-1">STEP 4: AUDIT &amp; API</div>
            <h4 className="text-sm font-semibold text-slate-200">Trace Lineage &amp; Export</h4>
            <p className="text-xs text-slate-400 mt-1">
              Log in as <strong>Data Consumer</strong>. Recalculate SHA-256 hash, inspect event timeline, and export verified CSV.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
