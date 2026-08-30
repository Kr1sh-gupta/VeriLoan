import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal, init_db_schema
from app.models import User, UploadBatch, Loan, VerifiedLoan
from app.services.ingestion_service import IngestionService
from app.services.verification_service import VerificationService
from app.api import auth, ingest, loans, exceptions, verified_loans, audit, summary, ai

# Initialize Database Schema & Migrations
init_db_schema()

def seed_initial_data_if_empty():
    db = SessionLocal()
    try:
        # Seed Users from data/users.json
        if db.query(User).count() == 0:
            users_path = os.path.join(os.path.dirname(__file__), "../../data/users.json")
            if os.path.exists(users_path):
                with open(users_path, "r", encoding="utf-8") as f:
                    users_data = json.load(f)
                    for u in users_data:
                        db.add(User(
                            id=u["id"],
                            username=u["username"],
                            password_hash=u["password"],
                            full_name=u["full_name"],
                            role=u["role"],
                            email=u.get("email"),
                            avatar_badge=u.get("avatar_badge")
                        ))
                    db.commit()

        # If no batches exist, automatically ingest document manifest, servicer update, and loan tape
        if db.query(UploadBatch).count() == 0:
            doc_path = os.path.join(os.path.dirname(__file__), "../../data/document_manifest.csv")
            if os.path.exists(doc_path):
                with open(doc_path, "r", encoding="utf-8") as f:
                    IngestionService.ingest_csv_content(
                        db=db,
                        csv_text=f.read(),
                        filename="document_manifest.csv",
                        file_type="DOC_MANIFEST",
                        run_validation=False
                    )

            servicer_path = os.path.join(os.path.dirname(__file__), "../../data/servicer_update.csv")
            if os.path.exists(servicer_path):
                with open(servicer_path, "r", encoding="utf-8") as f:
                    IngestionService.ingest_csv_content(
                        db=db,
                        csv_text=f.read(),
                        filename="servicer_update.csv",
                        file_type="SERVICER_UPDATE",
                        run_validation=False
                    )

            tape_path = os.path.join(os.path.dirname(__file__), "../../data/loan_tape.csv")
            if os.path.exists(tape_path):
                with open(tape_path, "r", encoding="utf-8") as f:
                    IngestionService.ingest_csv_content(
                        db=db,
                        csv_text=f.read(),
                        filename="loan_tape.csv",
                        file_type="LOAN_TAPE",
                        run_validation=True
                    )

        # Ensure verified loans table is populated with all clean loans
        if db.query(VerifiedLoan).count() == 0 and db.query(Loan).count() > 0:
            VerificationService.verify_clean_loans_batch(db=db)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_initial_data_if_empty()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI Copilot platform for loan tape ingestion, 14-rule validation, AI-assisted exception resolution, and cryptographic SHA-256 verification.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(ingest.router, prefix=settings.API_PREFIX)
app.include_router(loans.router, prefix=settings.API_PREFIX)
app.include_router(exceptions.router, prefix=settings.API_PREFIX)
app.include_router(verified_loans.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
app.include_router(summary.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "HEALTHY",
        "docs": "/docs"
    }
