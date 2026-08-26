export type UserRole = 'OPERATOR' | 'REVIEWER' | 'CONSUMER';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  email?: string;
  avatar_badge?: string;
}

export interface LoanRecord {
  id: string;
  loan_id?: string;
  borrower_id?: string;
  loan_type?: string;
  origination_date?: string;
  maturity_date?: string;
  original_principal?: number;
  current_balance?: number;
  interest_rate?: number;
  term_months?: number;
  borrower_state?: string;
  loan_purpose?: string;
  credit_grade?: string;
  employment_length?: string;
  income_band?: string;
  payment_status?: string;
  days_past_due?: number;
  servicer_name?: string;
  last_payment_date?: string;
  last_updated_at?: string;
  document_status?: string;
  source_system?: string;
  status: 'PENDING' | 'FLAGGED' | 'RESOLVED' | 'VERIFIED' | 'REJECTED';
  batch_id?: string;
  created_at?: string;
}

export interface ValidationException {
  id: string;
  loan_id_ref: string;
  loan_id_code?: string;
  rule_code: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  field_name?: string;
  error_message: string;
  actual_value?: string;
  expected_condition?: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  ai_explanation?: string;
  ai_suggested_patch?: Record<string, any>;
  ai_confidence?: number;
  ai_model?: string;
  ai_prompt?: string;
  ai_generated_at?: string;
  resolution_action?: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface VerifiedLoan {
  id: string;
  loan_id_ref: string;
  loan_id: string;
  canonical_data: Record<string, any>;
  record_hash: string;
  raw_hash: string;
  source_file: string;
  verified_by: string;
  verified_at: string;
  resolution_notes?: string;
  ai_assisted: boolean;
}

export interface AuditEvent {
  id: string;
  loan_id?: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  summary: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  metadata_json?: Record<string, any>;
  timestamp: string;
}

export interface IngestionBatch {
  batch_id: string;
  filename: string;
  file_type: string;
  total_rows: number;
  valid_rows: number;
  exception_count: number;
  status: string;
  created_at: string;
}

export interface SystemSummary {
  total_loans: number;
  total_exceptions: number;
  open_exceptions: number;
  resolved_exceptions: number;
  verified_loans: number;
  critical_exceptions: number;
  high_exceptions: number;
  medium_exceptions: number;
  low_exceptions: number;
  data_quality_score: number;
  recent_batches: IngestionBatch[];
}

export interface AIExplainResponse {
  exception_id: string;
  explanation: string;
  suggested_patch: Record<string, any>;
  confidence: number;
  model: string;
  prompt: string;
  timestamp: string;
}
