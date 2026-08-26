from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.ingestion_service import IngestionService
from app.models import UploadBatch

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    file_type: str = Form("LOAN_TAPE"),
    uploaded_by: str = Form("Elena Rostova (Operator)"),
    actor_id: str = Form("usr-001"),
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
        uploaded_by=uploaded_by,
        actor_id=actor_id,
        run_validation=True
    )
    return res

@router.get("/batches")
def list_batches(db: Session = Depends(get_db)):
    batches = db.query(UploadBatch).order_by(UploadBatch.created_at.desc()).all()
    return batches
