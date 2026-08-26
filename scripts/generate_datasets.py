import os
import csv
import json
import random
from datetime import datetime, timedelta

os.makedirs("data", exist_ok=True)

random.seed(42)

STATES = ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI", "CO", "MN", "SC", "AL", "LA", "KY", "OR", "OK", "CT", "UT", "IA", "NV", "AR", "MS", "KS", "NM", "NE", "ID", "WV", "HI", "NH", "ME", "RI", "MT", "DE", "SD", "ND", "AK", "VT", "WY"]
INVALID_STATES = ["XX", "ZZ", "CAL", "TEX", "99", "AA", "OO"]

LOAN_TYPES = ["Conventional_30Y", "Conventional_15Y", "FHA_30Y", "VA_30Y", "Jumbo_30Y", "ARM_5_1", "Commercial_Mortgage", "Personal_Installment", "Auto_Loan"]
LOAN_PURPOSES = ["Purchase", "Refinance_CashOut", "Refinance_RateTerm", "Home_Improvement", "Debt_Consolidation"]
CREDIT_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "E"]
INCOME_BANDS = ["< $40k", "$40k - $75k", "$75k - $120k", "$120k - $200k", "> $200k"]
SERVICERS = ["Apex Mortgage Servicing", "Beacon Servicing Group", "Citadel Loan Partners", "Delta Servicing Co.", "Evergreen Capital Servicing"]
SOURCE_SYSTEMS = ["LOS_Encompass", "Empower_Origination", "BlackKnight_MSP", "Fiserv_Core", "Spreadsheet_Manual_Upload"]

START_DATE = datetime(2021, 1, 1)

def random_date(start, end):
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")

records = []
expected_exceptions = []

for i in range(1, 1201):
    loan_id = f"LN-{10000 + i}"
    borrower_id = f"BOR-{20000 + (i % 950)}"
    loan_type = random.choice(LOAN_TYPES)
    term_months = random.choice([180, 240, 360])
    
    orig_dt_obj = START_DATE + timedelta(days=random.randint(0, 1000))
    origination_date = orig_dt_obj.strftime("%Y-%m-%d")
    maturity_date = (orig_dt_obj + timedelta(days=term_months * 30)).strftime("%Y-%m-%d")
    
    original_principal = round(random.uniform(50000, 750000), 2)
    paid_ratio = random.uniform(0.05, 0.40)
    current_balance = round(original_principal * (1.0 - paid_ratio), 2)
    interest_rate = round(random.uniform(2.75, 8.50), 3)
    
    borrower_state = random.choice(STATES)
    loan_purpose = random.choice(LOAN_PURPOSES)
    credit_grade = random.choice(CREDIT_GRADES)
    employment_length = f"{random.randint(1, 18)} years"
    income_band = random.choice(INCOME_BANDS)
    
    payment_status = "CURRENT"
    days_past_due = 0
    if random.random() < 0.12:
        days_past_due = random.choice([30, 60, 90, 120])
        payment_status = f"DELINQUENT_{days_past_due}"
    elif random.random() < 0.04:
        payment_status = "PAID_OFF"
        current_balance = 0.0
        days_past_due = 0
        
    servicer_name = random.choice(SERVICERS)
    last_payment_date = (datetime.now() - timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
    last_updated_at = (datetime.now() - timedelta(days=random.randint(1, 45))).strftime("%Y-%m-%d %H:%M:%S")
    document_status = "VERIFIED"
    source_system = random.choice(SOURCE_SYSTEMS)
    
    # Intentional Anomalies
    if i in [15, 75, 150]:
        loan_id = ""
        expected_exceptions.append({"loan_id": f"ROW-{i}", "rule": "VAL-001", "desc": "Missing Loan ID", "severity": "CRITICAL"})
    elif i == 30:
        loan_id = "LN-10020"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-002", "desc": "Duplicate Loan ID", "severity": "CRITICAL"})
    elif i == 80:
        loan_id = "LN-10040"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-002", "desc": "Duplicate Loan ID", "severity": "CRITICAL"})
    elif i == 45:
        borrower_id = records[9]["borrower_id"]
        original_principal = records[9]["original_principal"]
        origination_date = records[9]["origination_date"]
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-003", "desc": "Duplicate Borrower + Principal + Origination Date", "severity": "HIGH"})
    elif i == 60:
        origination_date = "12/31/2022"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-004", "desc": "Invalid date format in origination_date", "severity": "HIGH"})
    elif i == 190:
        maturity_date = "2029-99-99"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-004", "desc": "Invalid date value in maturity_date", "severity": "HIGH"})
    elif i == 95:
        maturity_date = "2020-01-15"
        origination_date = "2023-05-10"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-005", "desc": "Maturity date precedes origination date", "severity": "CRITICAL"})
    elif i == 230:
        maturity_date = "2021-08-01"
        origination_date = "2022-01-01"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-005", "desc": "Maturity date precedes origination date", "severity": "CRITICAL"})
    elif i == 110:
        original_principal = -150000.00
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-006", "desc": "Negative original principal balance", "severity": "CRITICAL"})
    elif i == 260:
        current_balance = -4250.00
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-006", "desc": "Negative current balance", "severity": "CRITICAL"})
    elif i == 125:
        original_principal = 250000.00
        current_balance = 345000.00
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-007", "desc": "Current balance exceeds original principal", "severity": "HIGH"})
    elif i == 310:
        original_principal = 180000.00
        current_balance = 220000.00
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-007", "desc": "Current balance exceeds original principal", "severity": "HIGH"})
    elif i == 140:
        interest_rate = 48.50
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-008", "desc": "Interest rate exceeds max bound (48.50% > 36.00%)", "severity": "MEDIUM"})
    elif i == 360:
        interest_rate = -1.25
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-008", "desc": "Negative interest rate", "severity": "MEDIUM"})
    elif i == 165:
        payment_status = "CURRENT"
        days_past_due = 90
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-009", "desc": "Payment status is CURRENT but Days Past Due is 90", "severity": "HIGH"})
    elif i == 410:
        payment_status = "DELINQUENT_60"
        days_past_due = 0
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-009", "desc": "Payment status is DELINQUENT_60 but Days Past Due is 0", "severity": "HIGH"})
    elif i == 180:
        document_status = "MISSING"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-010", "desc": "Mandatory mortgage note document missing", "severity": "MEDIUM"})
    elif i == 450:
        document_status = "EXPIRED"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-010", "desc": "Required title policy document expired", "severity": "MEDIUM"})
    elif i == 210:
        last_updated_at = "2023-01-10 09:15:00"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-012", "desc": "Stale loan record (last updated > 180 days ago)", "severity": "LOW"})
    elif i == 520:
        last_updated_at = "2022-11-04 14:22:10"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-012", "desc": "Stale loan record (last updated > 180 days ago)", "severity": "LOW"})
    elif i == 225:
        borrower_state = "XX"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-013", "desc": "Invalid US state code: XX", "severity": "MEDIUM"})
    elif i == 560:
        borrower_state = "CAL"
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-013", "desc": "Invalid US state code format: CAL", "severity": "MEDIUM"})
    elif i == 245:
        payment_status = "PAID_OFF"
        current_balance = 54200.00
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-014", "desc": "Loan marked PAID_OFF but current balance is $54,200.00", "severity": "HIGH"})
    elif i == 600:
        payment_status = "CLOSED"
        current_balance = 12900.50
        expected_exceptions.append({"loan_id": loan_id, "rule": "VAL-014", "desc": "Loan marked CLOSED but current balance is $12,900.50", "severity": "HIGH"})

    rec = {
        "loan_id": loan_id,
        "borrower_id": borrower_id,
        "loan_type": loan_type,
        "origination_date": origination_date,
        "maturity_date": maturity_date,
        "original_principal": original_principal,
        "current_balance": current_balance,
        "interest_rate": interest_rate,
        "term_months": term_months,
        "borrower_state": borrower_state,
        "loan_purpose": loan_purpose,
        "credit_grade": credit_grade,
        "employment_length": employment_length,
        "income_band": income_band,
        "payment_status": payment_status,
        "days_past_due": days_past_due,
        "servicer_name": servicer_name,
        "last_payment_date": last_payment_date,
        "last_updated_at": last_updated_at,
        "document_status": document_status,
        "source_system": source_system
    }
    records.append(rec)

# Write loan_tape.csv
fieldnames = list(records[0].keys())
with open("data/loan_tape.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(records)

print(f"Generated data/loan_tape.csv with {len(records)} records.")

# Generate servicer_update.csv
servicer_records = []
for i in range(1, 401):
    tape_rec = records[i - 1]
    loan_id = tape_rec["loan_id"]
    if not loan_id:
        continue
    
    current_balance = tape_rec["current_balance"]
    payment_status = tape_rec["payment_status"]
    days_past_due = tape_rec["days_past_due"]
    servicer_name = tape_rec["servicer_name"]
    last_payment_date = tape_rec["last_payment_date"]
    
    if i in [50, 100, 200, 300, 350]:
        current_balance = round(float(tape_rec["current_balance"]) * 0.85, 2)
        payment_status = "CURRENT" if tape_rec["payment_status"] != "CURRENT" else "DELINQUENT_30"
        days_past_due = 0 if payment_status == "CURRENT" else 30
        expected_exceptions.append({
            "loan_id": loan_id,
            "rule": "VAL-011",
            "desc": f"Conflict with servicer update (Tape: ${tape_rec['current_balance']}, Servicer: ${current_balance})",
            "severity": "HIGH"
        })
    elif random.random() < 0.10:
        current_balance = round(max(0, float(tape_rec["current_balance"]) - 850.0), 2)
        
    servicer_records.append({
        "loan_id": loan_id,
        "current_balance": current_balance,
        "payment_status": payment_status,
        "days_past_due": days_past_due,
        "last_payment_date": last_payment_date,
        "servicer_name": servicer_name,
        "update_timestamp": (datetime.now() - timedelta(hours=random.randint(1, 24))).strftime("%Y-%m-%d %H:%M:%S")
    })

with open("data/servicer_update.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(servicer_records[0].keys()))
    writer.writeheader()
    writer.writerows(servicer_records)

print(f"Generated data/servicer_update.csv with {len(servicer_records)} records.")

# Generate document_manifest.csv
doc_records = []
for i in range(1, 601):
    tape_rec = records[i - 1]
    loan_id = tape_rec["loan_id"]
    if not loan_id:
        continue
    
    doc_status = "AVAILABLE"
    if tape_rec["document_status"] == "MISSING":
        doc_status = "MISSING"
    elif tape_rec["document_status"] == "EXPIRED":
        doc_status = "EXPIRED"
        
    doc_records.append({
        "loan_id": loan_id,
        "doc_type": "PROMISSORY_NOTE",
        "doc_status": doc_status,
        "file_hash_md5": f"md5-{random.randint(10000000, 99999999)}",
        "last_verified_at": (datetime.now() - timedelta(days=random.randint(5, 120))).strftime("%Y-%m-%d")
    })
    doc_records.append({
        "loan_id": loan_id,
        "doc_type": "TITLE_POLICY",
        "doc_status": "AVAILABLE" if doc_status != "EXPIRED" else "EXPIRED",
        "file_hash_md5": f"md5-{random.randint(10000000, 99999999)}",
        "last_verified_at": (datetime.now() - timedelta(days=random.randint(5, 120))).strftime("%Y-%m-%d")
    })

with open("data/document_manifest.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(doc_records[0].keys()))
    writer.writeheader()
    writer.writerows(doc_records)

print(f"Generated data/document_manifest.csv with {len(doc_records)} document entries.")

# Generate validation_rules.json
validation_rules = {
    "version": "1.0.0",
    "last_updated": "2026-08-26T00:00:00Z",
    "rules": [
        {
            "code": "VAL-001",
            "name": "Mandatory Loan ID",
            "category": "MANDATORY",
            "severity": "CRITICAL",
            "field": "loan_id",
            "description": "Each record must have a non-empty, non-null loan ID identifier."
        },
        {
            "code": "VAL-002",
            "name": "Unique Loan ID",
            "category": "INTEGRITY",
            "severity": "CRITICAL",
            "field": "loan_id",
            "description": "Loan ID must be strictly unique across the portfolio tape."
        },
        {
            "code": "VAL-003",
            "name": "Borrower & Principal Duplicate Check",
            "category": "INTEGRITY",
            "severity": "HIGH",
            "field": "borrower_id",
            "description": "Flags duplicate loans sharing same borrower ID, principal balance, and origination date."
        },
        {
            "code": "VAL-004",
            "name": "ISO-8601 Date Format Validation",
            "category": "FORMAT",
            "severity": "HIGH",
            "field": "origination_date, maturity_date",
            "description": "Dates must adhere strictly to standard YYYY-MM-DD format."
        },
        {
            "code": "VAL-005",
            "name": "Maturity Date Sequence",
            "category": "LOGIC",
            "severity": "CRITICAL",
            "field": "maturity_date",
            "description": "Maturity date must occur strictly after the origination date."
        },
        {
            "code": "VAL-006",
            "name": "Non-Negative Balance Rule",
            "category": "FINANCIAL",
            "severity": "CRITICAL",
            "field": "original_principal, current_balance",
            "description": "Original principal and current balance cannot be negative numbers."
        },
        {
            "code": "VAL-007",
            "name": "Balance Exceeds Principal Bound",
            "category": "FINANCIAL",
            "severity": "HIGH",
            "field": "current_balance",
            "description": "Current balance cannot exceed original principal without an authorized negative amortization rider."
        },
        {
            "code": "VAL-008",
            "name": "Interest Rate Bounds",
            "category": "FINANCIAL",
            "severity": "MEDIUM",
            "field": "interest_rate",
            "description": "Interest rate must fall between 0.0% and 36.0% statutory maximum."
        },
        {
            "code": "VAL-009",
            "name": "Payment Status vs. DPD Consistency",
            "category": "CONSISTENCY",
            "severity": "HIGH",
            "field": "payment_status, days_past_due",
            "description": "Days past due must logically correspond with the designated payment status classification."
        },
        {
            "code": "VAL-010",
            "name": "Document Availability",
            "category": "DOCUMENTATION",
            "severity": "MEDIUM",
            "field": "document_status",
            "description": "Required promissory notes and deeds of trust must be present in the document manifest."
        },
        {
            "code": "VAL-011",
            "name": "Cross-Source Servicer Conflict",
            "category": "RECONCILIATION",
            "severity": "HIGH",
            "field": "current_balance, payment_status",
            "description": "Balances and payment statuses in the primary tape must reconcile with the second-source servicer update."
        },
        {
            "code": "VAL-012",
            "name": "Data Staleness Threshold",
            "category": "FRESHNESS",
            "severity": "LOW",
            "field": "last_updated_at",
            "description": "Records updated more than 180 days ago are flagged as stale."
        },
        {
            "code": "VAL-013",
            "name": "Valid US State Code",
            "category": "FORMAT",
            "severity": "MEDIUM",
            "field": "borrower_state",
            "description": "Borrower state must be a valid 2-letter US postal state/territory abbreviation."
        },
        {
            "code": "VAL-014",
            "name": "Paid-Off Loan Balance Integrity",
            "category": "STATUS",
            "severity": "HIGH",
            "field": "payment_status, current_balance",
            "description": "Loans designated as PAID_OFF or CLOSED must carry a $0.00 current balance."
        }
    ]
}

with open("data/validation_rules.json", "w", encoding="utf-8") as f:
    json.dump(validation_rules, f, indent=2)

print("Generated data/validation_rules.json with 14 configured rules.")

users = [
    {
        "id": "usr-001",
        "username": "operator",
        "password": "operator123!",
        "full_name": "Elena Rostova",
        "role": "OPERATOR",
        "email": "operator@intain-copilot.internal",
        "avatar_badge": "OP"
    },
    {
        "id": "usr-002",
        "username": "reviewer",
        "password": "reviewer123!",
        "full_name": "Marcus Vance",
        "role": "REVIEWER",
        "email": "reviewer@intain-copilot.internal",
        "avatar_badge": "RV"
    },
    {
        "id": "usr-003",
        "username": "consumer",
        "password": "consumer123!",
        "full_name": "Sarah Chen",
        "role": "CONSUMER",
        "email": "consumer@intain-copilot.internal",
        "avatar_badge": "DC"
    }
]

with open("data/users.json", "w", encoding="utf-8") as f:
    json.dump(users, f, indent=2)

print("Generated data/users.json with test credentials.")

with open("data/expected_exception_sample.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["loan_id", "rule", "desc", "severity"])
    writer.writeheader()
    writer.writerows(expected_exceptions)

print(f"Generated data/expected_exception_sample.csv with {len(expected_exceptions)} sample expected exceptions.")
