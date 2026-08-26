import csv
import sys
import os

def convert_fannie_to_copilot(input_path: str, output_path: str):
    """
    Converts Fannie Mae Single-Family CRT pipe-delimited format to VeriLoan Copilot schema.
    """
    records = []
    seen_loans = set()

    with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split("|")
            if len(parts) < 25:
                continue
            
            # Extract standard Fannie Mae CRT positions
            loan_seq = parts[1].strip() if len(parts) > 1 else ""
            if not loan_seq or loan_seq in seen_loans:
                continue
            seen_loans.add(loan_seq)

            orig_rate = parts[7].strip() if len(parts) > 7 else "5.0"
            orig_upb = parts[9].strip() if len(parts) > 9 else "100000"
            curr_upb = parts[11].strip() if len(parts) > 11 else orig_upb
            term = parts[12].strip() if len(parts) > 12 else "360"
            orig_dt = parts[13].strip() if len(parts) > 13 else "012022"  # MMYYYY
            mat_dt = parts[18].strip() if len(parts) > 18 else "012052"   # MMYYYY
            prop_state = parts[23].strip() if len(parts) > 23 else "CA"
            servicer = parts[4].strip() if len(parts) > 4 else "Fannie Mae Servicing"

            # Format MMYYYY to YYYY-MM-DD
            def format_mmyyyy(val: str, default_day="01"):
                if len(val) == 6:
                    return f"{val[2:]}-{val[:2]}-{default_day}"
                return "2022-01-01"

            records.append({
                "loan_id": f"FNMA-{loan_seq}",
                "borrower_id": f"BOR-FNMA-{loan_seq[-6:]}",
                "loan_type": "Conventional_30Y",
                "origination_date": format_mmyyyy(orig_dt),
                "maturity_date": format_mmyyyy(mat_dt),
                "original_principal": orig_upb,
                "current_balance": curr_upb if curr_upb and float(curr_upb) > 0 else orig_upb,
                "interest_rate": orig_rate,
                "term_months": term,
                "borrower_state": prop_state,
                "loan_purpose": "Purchase",
                "credit_grade": "A",
                "employment_length": "5 years",
                "income_band": "$75k - $120k",
                "payment_status": "CURRENT",
                "days_past_due": 0,
                "servicer_name": servicer or "Fannie Mae Approved Servicer",
                "last_payment_date": "2026-08-01",
                "last_updated_at": "2026-08-26 12:00:00",
                "document_status": "VERIFIED",
                "source_system": "FannieMae_DataDynamics"
            })

    if records:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
            writer.writeheader()
            writer.writerows(records)
        print(f"Successfully converted {len(records)} Fannie Mae records to {output_path}")

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "sf-loan-performance-data-sample.csv"
    dest = sys.argv[2] if len(sys.argv) > 2 else "main/data/fannie_mae_imported_tape.csv"
    convert_fannie_to_copilot(src, dest)
