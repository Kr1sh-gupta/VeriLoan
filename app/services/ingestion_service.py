import csv
import io
import uuid
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import Loan, ServicerUpdate, DocumentManifest, UploadBatch
from app.services.validation_service import ValidationService
from app.services.audit_service import AuditService

def clean_float(val: Any) -> Optional[float]:
    if val is None or str(val).strip() == "":
        return None
    try:
        cleaned = str(val).replace("$", "").replace(",", "").strip()
        return float(cleaned)
    except Exception:
        return None

def clean_int(val: Any) -> Optional[int]:
    if val is None or str(val).strip() == "":
        return None
    try:
        cleaned = str(val).replace(",", "").strip()
        return int(float(cleaned))
    except Exception:
        return None

class IngestionService:
    @classmethod
    def ingest_csv_content(
        cls,
        db: Session,
        csv_text: str,
        filename: str,
        file_type: str = "LOAN_TAPE",
        uploaded_by: str = "Elena Rostova (Operator)",
        actor_id: str = "usr-001",
        run_validation: bool = True
    ) -> Dict[str, Any]:
        """
        Ingests CSV content, stores raw data, normalizes records, creates batch, and runs validation.
        """
        batch_id = f"bat-{uuid.uuid4().hex[:12]}"
        reader = csv.DictReader(io.StringIO(csv_text))
        rows = list(reader)
        
        batch = UploadBatch(
            id=batch_id,
            filename=filename,
            file_type=file_type,
            total_rows=len(rows),
            valid_rows=0,
            exception_count=0,
            uploaded_by=uploaded_by,
            status="PROCESSING",
            created_at=datetime.datetime.utcnow()
        )
        db.add(batch)
        db.commit()

        if file_type == "LOAN_TAPE":
            for idx, row in enumerate(rows, start=1):
                loan_id = (row.get("loan_id") or "").strip()
                loan_pk = f"row-{batch_id}-{idx}"
                
                loan = Loan(
                    id=loan_pk,
                    loan_id=loan_id if loan_id else None,
                    borrower_id=(row.get("borrower_id") or "").strip() or None,
                    loan_type=(row.get("loan_type") or "").strip() or None,
                    origination_date=(row.get("origination_date") or "").strip() or None,
                    maturity_date=(row.get("maturity_date") or "").strip() or None,
                    original_principal=clean_float(row.get("original_principal")),
                    current_balance=clean_float(row.get("current_balance")),
                    interest_rate=clean_float(row.get("interest_rate")),
                    term_months=clean_int(row.get("term_months")),
                    borrower_state=(row.get("borrower_state") or "").strip() or None,
                    loan_purpose=(row.get("loan_purpose") or "").strip() or None,
                    credit_grade=(row.get("credit_grade") or "").strip() or None,
                    employment_length=(row.get("employment_length") or "").strip() or None,
                    income_band=(row.get("income_band") or "").strip() or None,
                    payment_status=(row.get("payment_status") or "").strip() or None,
                    days_past_due=clean_int(row.get("days_past_due")) or 0,
                    servicer_name=(row.get("servicer_name") or "").strip() or None,
                    last_payment_date=(row.get("last_payment_date") or "").strip() or None,
                    last_updated_at=(row.get("last_updated_at") or "").strip() or None,
                    document_status=(row.get("document_status") or "").strip() or None,
                    source_system=(row.get("source_system") or "").strip() or "CSV_UPLOAD",
                    batch_id=batch_id,
                    status="PENDING",
                    raw_data=dict(row)
                )
                db.add(loan)

        elif file_type == "SERVICER_UPDATE":
            for row in rows:
                loan_id = (row.get("loan_id") or "").strip()
                if not loan_id:
                    continue
                su = ServicerUpdate(
                    loan_id=loan_id,
                    current_balance=clean_float(row.get("current_balance")),
                    payment_status=(row.get("payment_status") or "").strip() or None,
                    days_past_due=clean_int(row.get("days_past_due")) or 0,
                    last_payment_date=(row.get("last_payment_date") or "").strip() or None,
                    servicer_name=(row.get("servicer_name") or "").strip() or None,
                    update_timestamp=(row.get("update_timestamp") or "").strip() or datetime.datetime.utcnow().isoformat(),
                    batch_id=batch_id
                )
                db.add(su)

        elif file_type == "DOC_MANIFEST":
            for row in rows:
                loan_id = (row.get("loan_id") or "").strip()
                if not loan_id:
                    continue
                dm = DocumentManifest(
                    loan_id=loan_id,
                    doc_type=(row.get("doc_type") or "NOTE").strip(),
                    doc_status=(row.get("doc_status") or "AVAILABLE").strip(),
                    file_hash_md5=(row.get("file_hash_md5") or "").strip() or None,
                    last_verified_at=(row.get("last_verified_at") or "").strip() or None,
                    batch_id=batch_id
                )
                db.add(dm)

        db.commit()

        # Log audit event
        AuditService.log_event(
            db=db,
            event_type="FILE_UPLOADED",
            actor_id=actor_id,
            actor_role="OPERATOR",
            summary=f"Uploaded file '{filename}' ({file_type}) with {len(rows)} records. Batch ID: {batch_id}",
            metadata_json={"batch_id": batch_id, "filename": filename, "total_rows": len(rows), "file_type": file_type}
        )

        # Log record imported audit event
        AuditService.log_event(
            db=db,
            event_type="RECORD_IMPORTED",
            actor_id=actor_id,
            actor_role="OPERATOR",
            summary=f"Imported {len(rows)} {file_type} records into staging table for batch {batch_id}",
            metadata_json={"batch_id": batch_id, "record_count": len(rows), "file_type": file_type, "filename": filename}
        )

        validation_stats = None
        if run_validation and file_type in ["LOAN_TAPE", "SERVICER_UPDATE"]:
            validation_stats = ValidationService.run_all_validations(db)
            batch.valid_rows = validation_stats["total_loans"] - validation_stats["flagged_loans"]
            batch.exception_count = validation_stats["exceptions_raised"]
            batch.status = "PROCESSED"
        else:
            batch.valid_rows = len(rows)
            batch.status = "PROCESSED"

        db.commit()

        return {
            "batch_id": batch_id,
            "filename": filename,
            "file_type": file_type,
            "total_rows": len(rows),
            "valid_rows": batch.valid_rows,
            "exception_count": batch.exception_count,
            "validation_stats": validation_stats,
            "status": "SUCCESS"
        }
