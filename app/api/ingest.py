from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.ingestion_service import IngestionService
from app.models import UploadBatch, User
from app.api.auth import require_role

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    file_type: str = Form("LOAN_TAPE"),
    uploaded_by: Optional[str] = Form(None),
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    content = await file.read()
    csv_text = content.decode("utf-8", errors="ignore")

    res = IngestionService.ingest_csv_content(
        db=db,
        csv_text=csv_text,
        filename=file.filename,
        file_type=file_type,
        uploaded_by=uploaded_by or current_user.full_name,
        actor_id=current_user.id,
        run_validation=True
    )
    return res

@router.get("/batches")
def list_batches(db: Session = Depends(get_db)):
    batches = db.query(UploadBatch).order_by(UploadBatch.created_at.desc()).all()
    return batches
