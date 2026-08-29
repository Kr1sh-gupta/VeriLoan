import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Network, 
  Sliders, 
  Users, 
  Code2, 
  ShieldAlert, 
  Play, 
  Plus, 
  Check, 
  X, 
  Copy, 
  Sparkles, 
  RefreshCw, 
  Search, 
  Download, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import type { SystemConnector, ApiKeyItem, ValidationRuleItem, User, AuditEvent } from '../types';
import { fetchConnectors, fetchApiKeys, fetchValidationRules, fetchUsers, fetchAuditTrail } from '../lib/api';

export const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONNECTORS' | 'RULES' | 'USERS' | 'PLAYGROUND' | 'AUDIT'>('OVERVIEW');
  
  // Data State
  const [connectors, setConnectors] = useState<SystemConnector[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [rules, setRules] = useState<ValidationRuleItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  // Playground State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/summary');
  const [playgroundResponse, setPlaygroundResponse] = useState<any | null>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // New Connector Modal State
  const [newConnectorOpen, setNewConnectorOpen] = useState<boolean>(false);

  // New Rule Builder State
  const [newRuleOpen, setNewRuleOpen] = useState<boolean>(false);
  const [aiRulePrompt, setAiRulePrompt] = useState<string>('Flag any loan where days past due > 90 but payment status is marked CURRENT');
  const [ruleForm, setRuleForm] = useState({
    code: 'R15_CUSTOM_RULE',
    name: 'Severe Delinquency Inconsistency',
    description: 'If days past due > 90, payment status cannot be marked CURRENT',
    category: 'LOGICAL',
    severity: 'CRITICAL',
    field: 'days_past_due',
    operator: '>',
    targetValue: '90'
  });

  // Audit Search State
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      const [connData, keyData, ruleData, userData, audData] = await Promise.all([
        fetchConnectors(),
        fetchApiKeys(),
        fetchValidationRules(),
        fetchUsers(),
        fetchAuditTrail()
      ]);
      setConnectors(connData);
      setApiKeys(keyData);
      setRules(ruleData);
      setUsers(userData);
      setAuditEvents(audData);
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunPlayground = async (path: string) => {
    setSelectedEndpoint(path);
    try {
      setPlaygroundLoading(true);
      const res = await axios.get(`http://localhost:8000${path}`);
      setPlaygroundResponse(res.data);
    } catch (err: any) {
      setPlaygroundResponse({
        error: err?.response?.data || err.message,
        fallback_note: 'Backend running in local simulated mode'
      });
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Local Session Rule Tracking & Feedback
  const [ruleStatus, setRuleStatus] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [localRuleCodes, setLocalRuleCodes] = useState<Set<string>>(new Set());

  const handleGenerateRuleFromPrompt = (promptOverride?: string) => {
    const promptText = (promptOverride || aiRulePrompt).trim();
    const lower = promptText.toLowerCase();

    let generated: {
      code: string;
      name: string;
      description: string;
      category: 'SANITY' | 'MATHEMATICAL' | 'LOGICAL' | 'COMPLIANCE' | 'DOCUMENT';
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      field: string;
      operator: '>' | '<' | '==' | '!=' | '>=' | '<=' | 'IN' | 'NOT_NULL' | 'CUSTOM';
      targetValue: string;
    } = {
      code: `R${rules.length + 1}_CUSTOM_RULE`,
      name: 'Custom Parameter Rule',
      description: promptText,
      category: 'LOGICAL',
      severity: 'HIGH',
      field: 'current_balance',
      operator: '>',
      targetValue: '0'
    };

    if (lower.includes('dpd') || lower.includes('past due') || lower.includes('90')) {
      generated = {
        code: `R${rules.length + 1}_DPD_90_DEFAULT`,
        name: 'Severe DPD & Status Conflict',
        description: 'Auto-flag records where days_past_due > 90 with CURRENT payment status',
        category: 'LOGICAL',
        severity: 'CRITICAL',
        field: 'days_past_due',
        operator: '>',
        targetValue: '90'
      };
    } else if (lower.includes('rate') || lower.includes('interest') || lower.includes('36')) {
      generated = {
        code: `R${rules.length + 1}_INTEREST_RATE_CAP`,
        name: 'Statutory Interest Rate Limit',
        description: 'Auto-flag records where interest_rate exceeds statutory limit (36.0%)',
        category: 'SANITY',
        severity: 'CRITICAL',
        field: 'interest_rate',
        operator: '>',
        targetValue: '36.0'
      };
    } else if (lower.includes('balance') || lower.includes('principal')) {
      generated = {
        code: `R${rules.length + 1}_BALANCE_PRINCIPAL_CAP`,
        name: 'Balance Exceeds Principal Cap',
        description: 'Auto-flag records where current_balance exceeds original_principal',
        category: 'MATHEMATICAL',
        severity: 'HIGH',
        field: 'current_balance',
        operator: '>',
        targetValue: 'original_principal'
      };
    } else if (lower.includes('maturity') || lower.includes('origination') || lower.includes('date')) {
      generated = {
        code: `R${rules.length + 1}_MATURITY_ORIGINATION`,
        name: 'Maturity Origination Chronology',
        description: 'Maturity date must be chronologically after origination date',
        category: 'SANITY',
        severity: 'CRITICAL',
        field: 'maturity_date',
        operator: '<',
        targetValue: 'origination_date'
      };
    } else if (lower.includes('document') || lower.includes('doc') || lower.includes('missing')) {
      generated = {
        code: `R${rules.length + 1}_DOC_MANIFEST`,
        name: 'Mandatory Document Manifest',
        description: 'Document status must be verified and non-null',
        category: 'DOCUMENT',
        severity: 'MEDIUM',
        field: 'document_status',
        operator: 'NOT_NULL',
        targetValue: ''
      };
    }

    setRuleForm(generated);
  };

  const handleSaveRule = () => {
    const created: ValidationRuleItem = {
      code: ruleForm.code,
      name: ruleForm.name,
      description: ruleForm.description,
      category: ruleForm.category as any,
      severity: ruleForm.severity as any,
      field: ruleForm.field,
      operator: ruleForm.operator as any,
      targetValue: ruleForm.targetValue,
      enabled: true,
      version: 1,
      lastUpdatedBy: 'Alex Rivera (Admin)',
      lastUpdatedAt: 'Just now',
      affectedRecordsCount: 3
    };
    setRules([created, ...rules]);
    setLocalRuleCodes((prev) => new Set(prev).add(created.code));
    setRuleStatus({
      message: `Rule ${created.code} successfully added to Local Session Governance Table (${rules.length + 1} Active Rules).`,
      type: 'success'
    });
    setNewRuleOpen(false);
  };

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span>ADMINISTRATIVE GOVERNANCE • FULL SYSTEM TELEMETRY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Admin &amp; Integration Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl">
              Configure external system connectors, manage visual validation rules, oversee user roles, and monitor cryptographic compliance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-mono text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational (18/18)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'System Telemetry', icon: Activity },
            { id: 'CONNECTORS', label: 'Connectors & API Keys', icon: Network },
            { id: 'RULES', label: 'Validation Rule Builder', icon: Sliders },
            { id: 'USERS', label: 'Users & Permissions', icon: Users },
            { id: 'PLAYGROUND', label: 'REST API Playground', icon: Code2 },
            { id: 'AUDIT', label: 'Compliance Audit Search', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0b1c30] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SYSTEM OVERVIEW & HEALTH TELEMETRY */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start text-slate-500 text-xs font-mono uppercase font-bold">
                  <span>Ingestion Latency</span>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">42</span>
                  <span className="text-xs font-mono text-slate-500">ms / record</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> -8ms peak optimization
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start text-slate-500 text-xs font-mono uppercase font-bold">
                  <span>Anomaly Rate (1h)</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">5.6</span>
                  <span className="text-xs font-mono text-slate-500">%</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> -1.2% from yesterday
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start text-slate-500 text-xs font-mono uppercase font-bold">
                  <span>Active Connectors</span>
                  <Network className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">18</span>
                  <span className="text-xs font-mono text-slate-500">/ 18 Live</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Health Score
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start text-slate-500 text-xs font-mono uppercase font-bold">
                  <span>AI Inference Speed</span>
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">1.1</span>
                  <span className="text-xs font-mono text-slate-500">sec / explanation</span>
                </div>
                <div className="text-[11px] font-mono text-purple-700 font-bold flex items-center gap-1">
                  <span>Deterministic Gemini 1.5 Pro</span>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">
                  Real-Time Throughput Telemetry
                </h3>
                <div className="h-48 w-full bg-slate-50 rounded-xl p-4 flex items-end gap-2 border border-slate-200 relative">
                  <div className="w-full bg-blue-200 rounded-t h-[30%]" />
                  <div className="w-full bg-blue-300 rounded-t h-[45%]" />
                  <div className="w-full bg-blue-200 rounded-t h-[20%]" />
                  <div className="w-full bg-blue-400 rounded-t h-[60%]" />
                  <div className="w-full bg-blue-500 rounded-t h-[80%]" />
                  <div className="w-full bg-blue-400 rounded-t h-[55%]" />
                  <div className="w-full bg-blue-600 rounded-t h-[90%]" />
                  <div className="w-full bg-blue-500 rounded-t h-[70%]" />
                  <div className="w-full bg-blue-300 rounded-t h-[40%]" />
                  <div className="w-full bg-blue-400 rounded-t h-[65%]" />
                  <div className="w-full bg-blue-600 rounded-t h-[85%]" />
                  <div className="w-full bg-blue-700 rounded-t h-[100%]" title="Peak: 42k records/sec" />
                </div>
              </div>

              <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">
                  Critical System Events
                </h3>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-emerald-700 font-bold">
                      <span>CONNECTOR_SYNC</span>
                      <span>2m ago</span>
                    </div>
                    <p className="text-xs font-sans text-slate-800">
                      Encompass daily ingestion completed: 250 records.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-amber-700 font-bold">
                      <span>ANOMALY_SPIKE</span>
                      <span>15m ago</span>
                    </div>
                    <p className="text-xs font-sans text-slate-800">
                      Maturity boundary violation flagged in batch #001.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-blue-700 font-bold">
                      <span>CRYPTO_SEAL</span>
                      <span>1h ago</span>
                    </div>
                    <p className="text-xs font-sans text-slate-800">
                      Sealed 232 canonical records with SHA-256 signatures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONNECTORS & API KEYS */}
        {activeTab === 'CONNECTORS' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-sans text-slate-900">
                  Configured Inbound &amp; Outbound Connectors
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Automated synchronization pipelines from loan origination systems and servicer feeds.
                </p>
              </div>

              <button
                onClick={() => setNewConnectorOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Connector</span>
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="px-6 py-3.5 font-bold">Connector Name</th>
                    <th className="px-6 py-3.5 font-bold">Type</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                    <th className="px-6 py-3.5 font-bold">Cadence</th>
                    <th className="px-6 py-3.5 font-bold">Last Sync</th>
                    <th className="px-6 py-3.5 font-bold">Ingested Records</th>
                    <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {connectors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                        <Network className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div>{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{c.endpointUrl}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {c.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{c.cadence}</td>
                      <td className="px-6 py-4 text-slate-600">{c.lastSyncTime}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{c.recordsIngested.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold">
                          Sync Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* API Keys Section */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-sans text-slate-900">
                    Verified Records API Keys (External Consumers)
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Issue and manage tokens for institutional consumers accessing Verified Records programmatically.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {apiKeys.map((k) => (
                  <div key={k.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-bold text-slate-900 font-sans">{k.name}</div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                        {k.status}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-900 flex justify-between items-center">
                      <span>{k.keyPrefix}••••••••••••</span>
                      <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-800 cursor-pointer" />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>Scope: {k.scope}</span>
                      <span>Rate: {k.rateLimit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VALIDATION RULE BUILDER */}
        {activeTab === 'RULES' && (
          <div className="space-y-8 animate-fade-in">
            {ruleStatus && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-mono flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>{ruleStatus.message}</span>
                </div>
                <button onClick={() => setRuleStatus(null)}>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-xs font-mono text-purple-700 font-bold uppercase">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Natural Language Rule Generator (AI-Assisted)</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={aiRulePrompt}
                  onChange={(e) => setAiRulePrompt(e.target.value)}
                  placeholder="e.g. Flag any loan where interest rate exceeds 36.0% or days past due > 90"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                />
                <button
                  onClick={() => {
                    handleGenerateRuleFromPrompt();
                    setNewRuleOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Rule</span>
                </button>
              </div>

              {/* 1-Click Prompt Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Flag DPD > 90 with CURRENT status',
                  'Flag Interest Rate > 36.0% statutory ceiling',
                  'Flag Current Balance > Original Principal',
                  'Flag Document Status missing'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setAiRulePrompt(chip);
                      handleGenerateRuleFromPrompt(chip);
                      setNewRuleOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[10px] font-mono text-purple-700 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="px-6 py-3.5 font-bold">Rule Code &amp; Name</th>
                    <th className="px-6 py-3.5 font-bold">Description</th>
                    <th className="px-6 py-3.5 font-bold">Severity</th>
                    <th className="px-6 py-3.5 font-bold">Condition Logic</th>
                    <th className="px-6 py-3.5 font-bold">Version</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((r) => (
                    <tr key={r.code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="text-blue-700 font-bold flex items-center gap-2">
                          <span>{r.code}</span>
                          {localRuleCodes.has(r.code) && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                              Session Rule
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 font-sans text-[11px]">{r.name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-sans text-xs max-w-xs">{r.description}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-200' :
                          r.severity === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-mono">
                        <code>{r.field} {r.operator} {r.targetValue}</code>
                      </td>
                      <td className="px-6 py-4 text-slate-500">v{r.version}.0</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          localRuleCodes.has(r.code)
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {localRuleCodes.has(r.code) ? 'Enabled (Local Session)' : 'Enabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: USERS & ROLE MANAGEMENT */}
        {activeTab === 'USERS' && (
          <div className="space-y-8 animate-fade-in">
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="px-6 py-3.5 font-bold">Full Name</th>
                    <th className="px-6 py-3.5 font-bold">Username</th>
                    <th className="px-6 py-3.5 font-bold">Assigned Role</th>
                    <th className="px-6 py-3.5 font-bold">Email Address</th>
                    <th className="px-6 py-3.5 font-bold">Last Active</th>
                    <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {u.avatar_badge || 'US'}
                        </div>
                        <span>{u.full_name}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{u.username}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          u.role === 'REVIEWER' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          u.role === 'OPERATOR' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{u.email}</td>
                      <td className="px-6 py-4 text-slate-500">{u.last_active || 'Recently'}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">
                          Edit Perms
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: REST API PLAYGROUND */}
        {activeTab === 'PLAYGROUND' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            <div className="lg:col-span-4 space-y-2">
              <div className="text-xs font-mono uppercase text-slate-600 font-bold mb-2">
                Available REST Endpoints (Module H)
              </div>
              {[
                { path: '/api/summary', method: 'GET', desc: 'System summary metrics' },
                { path: '/api/loans?limit=5', method: 'GET', desc: 'List normalized loans' },
                { path: '/api/exceptions?severity=CRITICAL', method: 'GET', desc: 'Filter critical exceptions' },
                { path: '/api/verified-loans?limit=5', method: 'GET', desc: 'Sealed verified records' },
                { path: '/api/audit?limit=5', method: 'GET', desc: 'Global audit trail stream' },
                { path: '/api/summary/rules', method: 'GET', desc: '14 validation rules' },
              ].map((ep) => (
                <div
                  key={ep.path}
                  onClick={() => handleRunPlayground(ep.path)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    selectedEndpoint === ep.path
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {ep.method}
                    </span>
                    <Play className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900 truncate">{ep.path}</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">{ep.desc}</div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 font-mono text-xs text-blue-700 font-bold">
                  <span className="text-slate-900">GET</span>
                  <span>{selectedEndpoint}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(playgroundResponse, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1 rounded bg-slate-100 text-xs font-mono text-slate-700 hover:bg-slate-200 flex items-center gap-1 font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="flex-1 min-h-[300px] bg-slate-900 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-200 overflow-y-auto">
                {playgroundLoading ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    <span>Executing Request...</span>
                  </div>
                ) : playgroundResponse ? (
                  <pre>{JSON.stringify(playgroundResponse, null, 2)}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    Click any endpoint on the left to execute sandbox query.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: COMPLIANCE AUDIT SEARCH */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Search audit trail by Loan ID, actor, or event type..."
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <a
                href="http://localhost:8000/api/audit/export/json"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#0b1c30] hover:bg-slate-800 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit JSON</span>
              </a>
            </div>

            <div className="space-y-3">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-blue-700">{evt.event_type}</span>
                      {evt.loan_id && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200">
                          {evt.loan_id}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">{evt.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-sans">
                    {evt.summary}
                  </p>
                  <div className="text-[10px] font-mono text-slate-500">
                    Actor: <span className="text-slate-800 font-bold">{evt.actor_id}</span> ({evt.actor_role})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* New Rule Modal */}
      {newRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Confirm &amp; Save Validation Rule
              </h3>
              <button onClick={() => setNewRuleOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-600 uppercase font-bold mb-1">Rule Code</label>
                <input 
                  type="text"
                  value={ruleForm.code}
                  onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 uppercase font-bold mb-1">Rule Name</label>
                <input 
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 uppercase font-bold mb-1">Description</label>
                <textarea 
                  rows={2}
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 uppercase font-bold mb-1">Field</label>
                  <input 
                    type="text"
                    value={ruleForm.field}
                    onChange={(e) => setRuleForm({ ...ruleForm, field: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 uppercase font-bold mb-1">Operator</label>
                  <input 
                    type="text"
                    value={ruleForm.operator}
                    onChange={(e) => setRuleForm({ ...ruleForm, operator: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 uppercase font-bold mb-1">Target</label>
                  <input 
                    type="text"
                    value={ruleForm.targetValue}
                    onChange={(e) => setRuleForm({ ...ruleForm, targetValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setNewRuleOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRule}
                className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Connector Modal */}
      {newConnectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Add System Connector
              </h3>
              <button onClick={() => setNewConnectorOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-600 uppercase font-bold mb-1">Connector Name</label>
                <input 
                  type="text"
                  defaultValue="Custom Servicer Pull"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 uppercase font-bold mb-1">Provider Type</label>
                <select className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900">
                  <option>REST API</option>
                  <option>Webhook Inbound</option>
                  <option>SFTP Poller</option>
                  <option>Email Parser</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 uppercase font-bold mb-1">Endpoint URL</label>
                <input 
                  type="text"
                  defaultValue="https://api.servicer.com/v1/feed"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setNewConnectorOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => setNewConnectorOpen(false)}
                className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95"
              >
                Create Connector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
