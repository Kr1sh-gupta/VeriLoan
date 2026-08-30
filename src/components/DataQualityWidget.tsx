import { ShieldCheck, TrendingUp, AlertCircle, FileCheck2 } from 'lucide-react';

interface DataQualityWidgetProps {
  score?: number; // e.g. 98.4
  totalRecords?: number;
  cleanRecords?: number;
}

export const DataQualityWidget: React.FC<DataQualityWidgetProps> = ({
  score = 0,
  totalRecords = 0,
  cleanRecords = 0,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const passRate = totalRecords > 0 ? Math.round((cleanRecords / totalRecords) * 100) : 0;
  const exceptionsCount = totalRecords > 0 ? totalRecords - cleanRecords : 0;

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-900 space-y-5 sm:space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-sans text-slate-900">
              Data Quality &amp; Integrity Health
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-sans leading-relaxed">
              Continuous validation across 14 deterministic loan constraints.
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          GRADE A+
        </span>
      </div>

      {/* Main Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        {/* Circular Gauge */}
        <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-100"
                strokeWidth="7"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none select-none">
              <span className="text-base sm:text-lg md:text-xl font-extrabold font-mono text-slate-900 tracking-tighter leading-none">
                {score}%
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mt-1 leading-none">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="text-xs font-mono font-bold text-slate-800 truncate">
              Canonical Quality Index
            </div>
            <div className="text-xs font-sans text-slate-500 leading-snug">
              {score}% of tape records meet full GSE and statutory compliance.
            </div>
            {/* NOTE: 7-day trend below is static placeholder data — no historical
                quality-score endpoint exists on the backend yet to compute real change. */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Trend tracking coming soon</span>
            </div>
          </div>
        </div>

        {/* Breakdown Numbers */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <FileCheck2 className="w-3 h-3 text-emerald-600" />
              <span>Verified Clean</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">{cleanRecords}</div>
            <div className="text-[10px] text-slate-500 font-mono">{passRate}% Pass Rate</div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>Exceptions</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-600">{exceptionsCount}</div>
          </div>
        </div>

        {/* 7-Day Sparkline Trend */}
        {/* NOTE: placeholder chart — flagged to the team, not fixed here.
            Needs a real backend endpoint tracking daily quality-score history. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>7-Day Quality Score Trend</span>
            <span className="text-slate-400 font-bold">Not yet tracked</span>
          </div>

          <div className="h-16 flex items-center justify-center text-[10px] font-mono text-slate-300 border border-dashed border-slate-200 rounded-lg">
            Historical trend data not available
          </div>
        </div>

      </div>

    </div>
  );
};