import type { 
  LoanRecord, 
  ValidationException, 
  VerifiedLoan, 
  AuditEvent, 
  SystemSummary, 
  ValidationRuleItem
} from '../types';

import rawLoans from '../sample/sample_loans.json';
import rawExceptions from '../sample/sample_exceptions.json';
import rawVerifiedLoans from '../sample/sample_verified_loans.json';
import rawAuditTrail from '../sample/sample_audit_trail.json';

export const DEMO_LOANS: LoanRecord[] = rawLoans as unknown as LoanRecord[];
export const DEMO_EXCEPTIONS: ValidationException[] = rawExceptions as unknown as ValidationException[];
export const DEMO_VERIFIED_LOANS: VerifiedLoan[] = rawVerifiedLoans as unknown as VerifiedLoan[];
export const DEMO_AUDIT_TRAIL: AuditEvent[] = rawAuditTrail as unknown as AuditEvent[];

export const DEMO_SUMMARY: SystemSummary = {
  total_loans: 1200,
  total_exceptions: DEMO_EXCEPTIONS.length,
  open_exceptions: DEMO_EXCEPTIONS.length,
  resolved_exceptions: 0,
  verified_loans: 1114,
  critical_exceptions: DEMO_EXCEPTIONS.filter(e => e.severity === 'CRITICAL').length,
  high_exceptions: DEMO_EXCEPTIONS.filter(e => e.severity === 'HIGH').length,
  medium_exceptions: DEMO_EXCEPTIONS.filter(e => e.severity === 'MEDIUM').length,
  low_exceptions: DEMO_EXCEPTIONS.filter(e => e.severity === 'LOW').length,
  data_quality_score: 92.83,
  recent_batches: [
    {
      batch_id: 'bat-75fe02bd81d6',
      filename: 'loan_tape.csv',
      file_type: 'LOAN_TAPE',
      total_rows: 1200,
      valid_rows: 1114,
      exception_count: DEMO_EXCEPTIONS.length,
      status: 'PROCESSED',
      created_at: '2026-08-30T10:00:00Z'
    }
  ]
};

export const DEMO_RULES: ValidationRuleItem[] = [
  { code: 'VAL-001', name: 'Missing Required Loan ID', description: 'Loan record must have a non-empty loan_id identifier', category: 'COMPLIANCE', severity: 'CRITICAL', field: 'loan_id', operator: 'NOT_NULL', targetValue: '', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 2 },
  { code: 'VAL-002', name: 'Interest Rate Out of Range', description: 'Interest rate must be between 0.5% and 36.0%', category: 'SANITY', severity: 'CRITICAL', field: 'interest_rate', operator: '<=', targetValue: '36.0%', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 6 },
  { code: 'VAL-003', name: 'Original Principal Non-Positive', description: 'Original principal amount must be strictly greater than $0', category: 'MATHEMATICAL', severity: 'CRITICAL', field: 'original_principal', operator: '>', targetValue: '$0', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 4 },
  { code: 'VAL-004', name: 'Invalid ISO-8601 Date Format', description: 'Date fields (origination, maturity, last_payment, last_updated) must conform to ISO-8601 YYYY-MM-DD', category: 'COMPLIANCE', severity: 'HIGH', field: 'maturity_date', operator: 'CUSTOM', targetValue: 'YYYY-MM-DD', enabled: true, version: 2, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 5 },
  { code: 'VAL-005', name: 'Maturity Date Precedes Origination', description: 'Maturity date must be chronologically after origination date', category: 'SANITY', severity: 'CRITICAL', field: 'maturity_date', operator: '>', targetValue: 'origination_date', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 8 },
  { code: 'VAL-006', name: 'Invalid US State Postal Abbreviation', description: 'Borrower state must be a valid 2-letter US postal abbreviation', category: 'COMPLIANCE', severity: 'LOW', field: 'borrower_state', operator: 'IN', targetValue: 'US_STATES', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 4 },
  { code: 'VAL-007', name: 'Current Balance Exceeds Original Principal', description: 'Current balance cannot exceed original principal without negative amortization', category: 'MATHEMATICAL', severity: 'HIGH', field: 'current_balance', operator: '<=', targetValue: 'original_principal', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 9 },
  { code: 'VAL-008', name: 'DPD Non-Negative Sanity Check', description: 'Days past due cannot be negative', category: 'SANITY', severity: 'HIGH', field: 'days_past_due', operator: '>=', targetValue: '0', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 3 },
  { code: 'VAL-009', name: 'Negative Current Balance Anomaly', description: 'Current balance cannot be negative unless an escrow credit is documented', category: 'MATHEMATICAL', severity: 'HIGH', field: 'current_balance', operator: '>=', targetValue: '$0', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 2 },
  { code: 'VAL-010', name: 'Unrealistic Loan Term Span', description: 'Term months must be between 6 and 480 months (40 years)', category: 'SANITY', severity: 'MEDIUM', field: 'term_months', operator: 'CUSTOM', targetValue: '6 - 480', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 5 },
  { code: 'VAL-011', name: 'Unrecognized Payment Status Enum', description: 'Payment status must be one of CURRENT, 30_DPD, 60_DPD, 90_PLUS, DEFAULT, PAID_OFF, CLOSED', category: 'COMPLIANCE', severity: 'MEDIUM', field: 'payment_status', operator: 'IN', targetValue: 'PAYMENT_STATUS_ENUM', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 4 },
  { code: 'VAL-012', name: 'Missing Required Servicer Name', description: 'Servicer name must be provided for loan administration', category: 'COMPLIANCE', severity: 'MEDIUM', field: 'servicer_name', operator: 'NOT_NULL', targetValue: '', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 3 },
  { code: 'VAL-013', name: 'DPD vs Payment Status Inconsistency', description: 'If DPD > 30, payment status cannot be CURRENT; if CURRENT, DPD must be <= 30', category: 'LOGICAL', severity: 'HIGH', field: 'days_past_due', operator: '<=', targetValue: '30 when CURRENT', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 12 },
  { code: 'VAL-014', name: 'Paid Off / Closed Loan with Non-Zero Balance', description: 'Loans marked PAID_OFF or CLOSED must have a current balance of $0.00', category: 'MATHEMATICAL', severity: 'HIGH', field: 'current_balance', operator: '==', targetValue: '$0.00', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 7 },
  { code: 'VAL-015', name: 'Repeated Borrower Concentration Risk', description: 'Same borrower ID cannot appear in more than 3 active loan obligations without manual underwriting approval', category: 'COMPLIANCE', severity: 'MEDIUM', field: 'borrower_id', operator: '<', targetValue: '< 4 loans', enabled: true, version: 1, lastUpdatedBy: 'FinTech Rule Engine', lastUpdatedAt: '2026-08-30 00:00', affectedRecordsCount: 9 }
];
