import axios from 'axios';
import type { 
  LoanRecord, 
  ValidationException, 
  VerifiedLoan, 
  AuditEvent, 
  SystemSummary, 
  AIExplainResponse,
  User,
  SystemConnector,
  ValidationRuleItem,
  ApiKeyItem,
  NotificationItem,
  VerifiedLoanDetailResponse
} from '../types';
import {
  DEMO_SUMMARY,
  DEMO_RULES,
  DEMO_LOANS,
  DEMO_EXCEPTIONS,
  DEMO_VERIFIED_LOANS,
  DEMO_AUDIT_TRAIL
} from './demoFixtures';

export const isDemoBypassActive = (): boolean => {
  return typeof window !== 'undefined' && localStorage.getItem('veriloan_demo_bypass') === 'true';
};

export const setDemoBypassActive = (active: boolean) => {
  if (typeof window !== 'undefined') {
    if (active) {
      localStorage.setItem('veriloan_demo_bypass', 'true');
    } else {
      localStorage.removeItem('veriloan_demo_bypass');
    }
  }
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export const exportCsvUrl = () => `${API_BASE}/verified-loans/export/csv`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('veriloan_auth_token') || 'jwt-mock-token-usr-002-reviewer';
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Static Preconfigured Users for demo and testing
export const STATIC_USERS: (User & { password: string })[] = [
  {
    id: 'usr-001',
    username: 'operator',
    password: 'operator123',
    full_name: 'Elena Rostova',
    role: 'OPERATOR',
    email: 'elena.rostova@veriloan.io',
    avatar_badge: 'OP',
    last_active: '2m ago'
  },
  {
    id: 'usr-002',
    username: 'reviewer',
    password: 'reviewer123',
    full_name: 'Marcus Vance',
    role: 'REVIEWER',
    email: 'marcus.vance@veriloan.io',
    avatar_badge: 'RV',
    last_active: 'Just now'
  },
  {
    id: 'usr-003',
    username: 'consumer',
    password: 'consumer123',
    full_name: 'Sarah Chen',
    role: 'CONSUMER',
    email: 'sarah.chen@veriloan.io',
    avatar_badge: 'DC',
    last_active: '15m ago'
  },
  {
    id: 'usr-004',
    username: 'admin',
    password: 'admin123',
    full_name: 'Alex Rivera',
    role: 'ADMIN',
    email: 'alex.rivera@veriloan.io',
    avatar_badge: 'AD',
    last_active: 'Active now'
  }
];

// Fallback initial notifications
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Batch Import Completed',
    message: 'loan_tape_q3_2026.csv parsed: 250 records ingested with 14 anomalies routed.',
    category: 'INGESTION',
    severity: 'SUCCESS',
    timestamp: '5m ago',
    read: false,
    actionUrl: 'operator'
  },
  {
    id: 'notif-2',
    title: 'Critical Exception Assigned',
    message: 'LN-29384-A: Maturity date is before origination date requires immediate review.',
    category: 'EXCEPTION',
    severity: 'ERROR',
    timestamp: '12m ago',
    read: false,
    actionUrl: 'reviewer'
  },
  {
    id: 'notif-3',
    title: 'Connector Health Alert',
    message: 'Salesforce Auto-LOS webhook latency increased to 120ms.',
    category: 'CONNECTOR',
    severity: 'WARNING',
    timestamp: '1h ago',
    read: true,
    actionUrl: 'admin'
  },
  {
    id: 'notif-4',
    title: 'Compliance Export Ready',
    message: 'Verified_Records_Sealed_2026-08-29.csv is available for download.',
    category: 'EXPORT',
    severity: 'INFO',
    timestamp: '2h ago',
    read: true,
    actionUrl: 'export'
  }
];

// Authentication API
export const loginUser = async (username: string, password: string): Promise<{ user: User; token: string }> => {
  try {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  } catch {
    const found = STATIC_USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (found) {
      const { password: _, ...userObj } = found;
      return {
        user: userObj,
        token: `mock-jwt-token-${found.id}-${found.role.toLowerCase()}`
      };
    }
    throw new Error('Invalid credentials. (Try: operator/operator123, reviewer/reviewer123, consumer/consumer123, admin/admin123)');
  }
};

export const formatApiError = (err: any): Error => {
  if (err?.response?.data?.detail) {
    const detail = err.response.data.detail;
    return new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (err?.code === 'ERR_NETWORK' || !err?.response) {
    return new Error('Database and Backend API server are inaccessible at http://localhost:8000. Please ensure the server is running.');
  }
  return new Error(err?.message || 'An unexpected API communication error occurred.');
};

export const fetchSummary = async (): Promise<SystemSummary> => {
  try {
    const { data } = await api.get<SystemSummary>('/summary');
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn('[Offline Demo Bypass Active] Serving preloaded summary fixture.');
      return DEMO_SUMMARY;
    }
    console.error('[API Error: fetchSummary]', err);
    throw formatApiError(err);
  }
};

export const fetchValidationRules = async (): Promise<ValidationRuleItem[]> => {
  try {
    const { data } = await api.get('/summary/rules');
    const rawList: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.rules) ? data.rules : []);

    if (rawList.length === 0) throw new Error('No rules found in API response');

    return rawList.map((rule: any, idx: number) => ({
      code: rule.code || `VAL-${String(idx + 1).padStart(3, '0')}`,
      name: rule.name || rule.code || 'Validation Rule',
      description: rule.description || 'Validation check',
      category: (rule.category || 'SANITY') as any,
      severity: (rule.severity || 'HIGH') as any,
      field: rule.field || 'loan_id',
      operator: rule.operator || (rule.max_value !== undefined ? '<=' : (rule.min_value !== undefined ? '>=' : (rule.max_loan_count !== undefined ? '<' : 'NOT_NULL'))),
      targetValue: rule.targetValue !== undefined 
        ? String(rule.targetValue) 
        : (rule.max_value !== undefined 
            ? `${rule.max_value}%` 
            : (rule.max_loan_count !== undefined 
                ? `< ${rule.max_loan_count} loans` 
                : (rule.max_age_days !== undefined ? `${rule.max_age_days} days` : ''))),
      enabled: rule.enabled !== undefined ? rule.enabled : true,
      version: rule.version || 1,
      lastUpdatedBy: 'System / FinTech Engine',
      lastUpdatedAt: '2026-08-30 00:00',
      affectedRecordsCount: 1 + (idx % 6)
    }));
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn('[Offline Demo Bypass Active] Serving preloaded validation rules fixture.');
      return DEMO_RULES;
    }
    console.error('[API Error: fetchValidationRules]', err);
    throw formatApiError(err);
  }
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const { data } = await api.get<User[]>('/auth/users');
    return data;
  } catch (err: any) {
    console.error('[API Warning: fetchUsers fallback to static users]', err);
    return STATIC_USERS.map(({ password: _, ...u }) => u);
  }
};

export const fetchLoans = async (status?: string, search?: string, limit: number = 100): Promise<LoanRecord[]> => {
  try {
    const params: any = { limit };
    if (status) params.status = status;
    if (search) params.search = search;
    const { data } = await api.get<LoanRecord[]>('/loans', { params });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn('[Offline Demo Bypass Active] Serving preloaded loans fixture.');
      let filtered = [...DEMO_LOANS];
      if (status && status !== 'ALL') filtered = filtered.filter(l => l.status === status);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(l => l.loan_id?.toLowerCase().includes(q) || l.borrower_id?.toLowerCase().includes(q));
      }
      return filtered;
    }
    console.error('[API Error: fetchLoans]', err);
    throw formatApiError(err);
  }
};

export const fetchLoanDetail = async (id: string): Promise<any> => {
  try {
    const { data } = await api.get(`/loans/${id}`);
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn(`[Offline Demo Bypass Active] Serving preloaded loan detail fixture for ${id}.`);
      const match = DEMO_LOANS.find(l => l.loan_id === id || l.id === id) || DEMO_LOANS[0];
      return {
        loan: match,
        servicer_update: { loan_id: match.loan_id, current_balance: match.current_balance, payment_status: match.payment_status, days_past_due: match.days_past_due, last_payment_date: '2026-08-01' },
        doc_manifest: { loan_id: match.loan_id, document_type: 'NOTE', document_status: 'VERIFIED', page_count: 14, ocr_confidence: 0.98 },
        exceptions: DEMO_EXCEPTIONS.filter(e => e.loan_id_code === match.loan_id)
      };
    }
    console.error(`[API Error: fetchLoanDetail(${id})]`, err);
    throw formatApiError(err);
  }
};

export const updateLoanFields = async (id: string, fields: Record<string, any>, reviewerName?: string): Promise<any> => {
  try {
    const { data } = await api.put(`/loans/${id}`, fields, { params: { reviewer_name: reviewerName } });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      return { success: true, message: `Loan fields for ${id} patched (Offline Demo Bypass).` };
    }
    console.error(`[API Error: updateLoanFields(${id})]`, err);
    throw formatApiError(err);
  }
};

export const fetchExceptions = async (severity?: string, status: string = 'OPEN', search?: string): Promise<ValidationException[]> => {
  try {
    const params: any = { status, limit: 200 };
    if (severity && severity !== 'ALL') params.severity = severity;
    if (search) params.search = search;
    const { data } = await api.get<ValidationException[]>('/exceptions', { params });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn('[Offline Demo Bypass Active] Serving preloaded exceptions fixture.');
      let filtered = [...DEMO_EXCEPTIONS];
      if (severity && severity !== 'ALL') filtered = filtered.filter(e => e.severity === severity);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(e => e.loan_id_code?.toLowerCase().includes(q) || e.rule_code?.toLowerCase().includes(q));
      }
      return filtered;
    }
    console.error('[API Error: fetchExceptions]', err);
    throw formatApiError(err);
  }
};

export const requestAIExplanation = async (exceptionId: string, customInstruction?: string): Promise<AIExplainResponse> => {
  try {
    const { data } = await api.post<AIExplainResponse>('/ai/explain', {
      exception_id: exceptionId,
      custom_instruction: customInstruction,
    });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      return {
        exception_id: exceptionId,
        explanation: 'Offline FinTech Heuristic Analysis: Cross-field chronological and mathematical boundary comparison confirms transcription transposition error.',
        suggested_patch: { maturity_date: '2053-01-10', interest_rate: 4.25 },
        confidence: 0.97,
        model: 'Offline FinTech Heuristic Copilot (Demo Bypass)',
        prompt: 'System rule boundary check',
        timestamp: new Date().toISOString()
      };
    }
    console.error(`[API Error: requestAIExplanation(${exceptionId})]`, err);
    throw formatApiError(err);
  }
};

export const resolveException = async (
  exceptionId: string, 
  action: 'ACCEPT_AI' | 'MANUAL_EDIT' | 'REJECT' | 'DISMISS' | 'REQUEST_CORRECTION', 
  correctedData?: Record<string, any>, 
  notes?: string,
  reviewerName?: string
): Promise<any> => {
  try {
    const { data } = await api.post(`/exceptions/${exceptionId}/resolve`, {
      action,
      corrected_data: correctedData,
      notes,
      reviewer_name: reviewerName || 'Marcus Vance (Reviewer)',
    });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      return { success: true, message: `Exception ${exceptionId} resolved with action ${action} (Demo Bypass).` };
    }
    console.error(`[API Error: resolveException(${exceptionId})]`, err);
    throw formatApiError(err);
  }
};

export const addExceptionComment = async (
  exceptionId: string,
  comment: string,
  reviewerName?: string
): Promise<{ message: string; exception_id: string; resolution_notes: string }> => {
  try {
    const { data } = await api.post(`/exceptions/${exceptionId}/comment`, {
      comment,
      reviewer_name: reviewerName || 'Marcus Vance (Reviewer)',
    });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      return { message: 'Comment appended (Demo Bypass)', exception_id: exceptionId, resolution_notes: comment };
    }
    console.error(`[API Error: addExceptionComment(${exceptionId})]`, err);
    throw formatApiError(err);
  }
};

export const fetchVerifiedLoans = async (search?: string, limit: number = 100): Promise<VerifiedLoan[]> => {
  try {
    const params: any = { limit };
    if (search) params.search = search;
    const { data } = await api.get<VerifiedLoan[]>('/verified-loans', { params });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn('[Offline Demo Bypass Active] Serving preloaded verified loans fixture.');
      let filtered = [...DEMO_VERIFIED_LOANS];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(v => v.loan_id.toLowerCase().includes(q) || v.record_hash.toLowerCase().includes(q));
      }
      return filtered;
    }
    console.error('[API Error: fetchVerifiedLoans]', err);
    throw formatApiError(err);
  }
};

export const fetchVerifiedLoanDetail = async (id: string): Promise<VerifiedLoanDetailResponse> => {
  try {
    const { data } = await api.get<VerifiedLoanDetailResponse>(`/verified-loans/${id}`);
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      const match = DEMO_VERIFIED_LOANS.find(v => v.id === id || v.loan_id === id) || DEMO_VERIFIED_LOANS[0];
      return {
        verified_record: match,
        hash_verification: {
          is_valid: true,
          stored_hash: match.record_hash,
          recalculated_hash: match.record_hash,
          tamper_detected: false
        }
      };
    }
    console.error(`[API Error: fetchVerifiedLoanDetail(${id})]`, err);
    throw formatApiError(err);
  }
};

export const fetchAuditTrail = async (loanId?: string, limit: number = 50): Promise<AuditEvent[]> => {
  try {
    if (loanId) {
      const { data } = await api.get<AuditEvent[]>(`/audit/${loanId}`);
      return data;
    }
    const { data } = await api.get<AuditEvent[]>('/audit', { params: { limit } });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      console.warn('[Offline Demo Bypass Active] Serving preloaded audit trail fixture.');
      return DEMO_AUDIT_TRAIL;
    }
    console.error('[API Error: fetchAuditTrail]', err);
    throw formatApiError(err);
  }
};

export const uploadCsvFile = async (file: File, fileType: string, uploadedBy?: string): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    if (uploadedBy) formData.append('uploaded_by', uploadedBy);

    const { data } = await api.post('/ingest/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      return {
        filename: file.name,
        file_type: fileType,
        total_rows: 1200,
        valid_rows: 1114,
        exception_count: 86,
        status: 'PROCESSED (Demo Bypass)'
      };
    }
    console.error('[API Error: uploadCsvFile]', err);
    throw formatApiError(err);
  }
};

export const verifyAllCleanLoans = async (verifiedBy?: string): Promise<any> => {
  try {
    const { data } = await api.post('/verified-loans/verify-all-clean', null, {
      params: { verified_by: verifiedBy }
    });
    return data;
  } catch (err: any) {
    if (isDemoBypassActive()) {
      return { success: true, message: '1,114 clean loans verified and sealed with SHA-256 (Demo Bypass Mode).' };
    }
    console.error('[API Error: verifyAllCleanLoans]', err);
    throw formatApiError(err);
  }
};

// Connectors API
export const fetchConnectors = async (): Promise<SystemConnector[]> => {
  return [
    {
      id: 'conn-01',
      name: 'Encompass LOS Daily Sync',
      type: 'REST_API',
      provider: 'Encompass',
      status: 'ACTIVE',
      endpointUrl: 'https://api.ice.com/encompass/v1/loans/export',
      cadence: 'HOURLY',
      lastSyncTime: '12m ago',
      nextScheduledRun: 'in 48m',
      recordsIngested: 14208,
      errorCount: 0,
      authType: 'OAUTH2',
      maskedSecret: 'enc_oauth_sec_••••••••4f92'
    },
    {
      id: 'conn-02',
      name: 'Salesforce Financial Cloud Webhook',
      type: 'WEBHOOK',
      provider: 'Salesforce',
      status: 'ACTIVE',
      endpointUrl: 'https://api.veriloan.io/v1/webhooks/salesforce-inbound',
      cadence: 'REALTIME',
      lastSyncTime: 'Just now',
      nextScheduledRun: 'Continuous',
      recordsIngested: 8412,
      errorCount: 2,
      authType: 'API_KEY',
      maskedSecret: 'sf_wh_key_••••••••91a7'
    },
    {
      id: 'conn-03',
      name: 'Plaid Asset & Income Verification Feed',
      type: 'REST_API',
      provider: 'Plaid',
      status: 'ACTIVE',
      endpointUrl: 'https://production.plaid.com/credit/bank_income/get',
      cadence: 'REALTIME',
      lastSyncTime: '3m ago',
      nextScheduledRun: 'Continuous',
      recordsIngested: 3290,
      errorCount: 0,
      authType: 'API_KEY',
      maskedSecret: 'plaid_sec_••••••••b810'
    },
    {
      id: 'conn-04',
      name: 'Black Knight Servicing SFTP Poll',
      type: 'SFTP',
      provider: 'BlackKnight',
      status: 'PAUSED',
      endpointUrl: 'sftp://feeds.blackknightinc.com:22/servicing/daily/',
      cadence: 'DAILY',
      lastSyncTime: 'Yesterday 23:00',
      nextScheduledRun: 'Paused',
      recordsIngested: 45190,
      errorCount: 1,
      authType: 'BASIC',
      maskedSecret: 'sftp_user:••••••••'
    }
  ];
};

export const fetchApiKeys = async (): Promise<ApiKeyItem[]> => {
  return [
    {
      id: 'key-01',
      name: 'BlackRock Audit Downstream Integration',
      keyPrefix: 'vl_live_blk_7a9f',
      scope: 'READ_ONLY',
      createdAt: '2026-06-15',
      lastUsed: '4m ago',
      requestCount: 184520,
      rateLimit: '1,000 req/min',
      status: 'ACTIVE'
    },
    {
      id: 'key-02',
      name: 'Fannie Mae Verified Records Feed',
      keyPrefix: 'vl_live_fnm_3c81',
      scope: 'READ_ONLY',
      createdAt: '2026-07-01',
      lastUsed: '12m ago',
      requestCount: 92340,
      rateLimit: '2,500 req/min',
      status: 'ACTIVE'
    },
    {
      id: 'key-03',
      name: 'Internal Batch Migration Pipeline',
      keyPrefix: 'vl_adm_int_90aa',
      scope: 'READ_WRITE',
      createdAt: '2026-08-10',
      lastUsed: '2d ago',
      requestCount: 14200,
      rateLimit: '5,000 req/min',
      status: 'ACTIVE'
    }
  ];
};
