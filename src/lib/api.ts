import axios from 'axios';
import type { 
  LoanRecord, 
  ValidationException, 
  VerifiedLoan, 
  AuditEvent, 
  SystemSummary, 
  AIExplainResponse,
  User 
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchSummary = async (): Promise<SystemSummary> => {
  const { data } = await api.get<SystemSummary>('/summary');
  return data;
};

export const fetchValidationRules = async (): Promise<any> => {
  const { data } = await api.get('/summary/rules');
  return data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/auth/users');
  return data;
};

export const fetchLoans = async (status?: string, search?: string, limit: number = 100): Promise<LoanRecord[]> => {
  const params: any = { limit };
  if (status) params.status = status;
  if (search) params.search = search;
  const { data } = await api.get<LoanRecord[]>('/loans', { params });
  return data;
};

export const fetchLoanDetail = async (id: string): Promise<any> => {
  const { data } = await api.get(`/loans/${id}`);
  return data;
};

export const updateLoanFields = async (id: string, fields: Record<string, any>, reviewerName?: string): Promise<any> => {
  const { data } = await api.put(`/loans/${id}`, fields, { params: { reviewer_name: reviewerName } });
  return data;
};

export const fetchExceptions = async (severity?: string, status: string = 'OPEN', search?: string): Promise<ValidationException[]> => {
  const params: any = { status, limit: 200 };
  if (severity && severity !== 'ALL') params.severity = severity;
  if (search) params.search = search;
  const { data } = await api.get<ValidationException[]>('/exceptions', { params });
  return data;
};

export const requestAIExplanation = async (exceptionId: string, customInstruction?: string): Promise<AIExplainResponse> => {
  const { data } = await api.post<AIExplainResponse>('/ai/explain', {
    exception_id: exceptionId,
    custom_instruction: customInstruction,
  });
  return data;
};

export const resolveException = async (
  exceptionId: string, 
  action: 'ACCEPT_AI' | 'MANUAL_EDIT' | 'REJECT' | 'DISMISS', 
  correctedData?: Record<string, any>, 
  notes?: string,
  reviewerName?: string
): Promise<any> => {
  const { data } = await api.post(`/exceptions/${exceptionId}/resolve`, {
    action,
    corrected_data: correctedData,
    notes,
    reviewer_name: reviewerName || 'Marcus Vance (Reviewer)',
  });
  return data;
};

export const fetchVerifiedLoans = async (search?: string, limit: number = 100): Promise<VerifiedLoan[]> => {
  const params: any = { limit };
  if (search) params.search = search;
  const { data } = await api.get<VerifiedLoan[]>('/verified-loans', { params });
  return data;
};

export const fetchVerifiedLoanDetail = async (id: string): Promise<any> => {
  const { data } = await api.get(`/verified-loans/${id}`);
  return data;
};

export const verifyAllCleanLoans = async (verifiedBy?: string): Promise<any> => {
  const { data } = await api.post('/verified-loans/verify-all-clean', null, {
    params: { verified_by: verifiedBy }
  });
  return data;
};

export const fetchAuditTrail = async (loanId?: string, limit: number = 50): Promise<AuditEvent[]> => {
  if (loanId) {
    const { data } = await api.get<AuditEvent[]>(`/audit/${loanId}`);
    return data;
  }
  const { data } = await api.get<AuditEvent[]>('/audit', { params: { limit } });
  return data;
};

export const uploadCsvFile = async (file: File, fileType: string, uploadedBy?: string): Promise<any> => {
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
};
